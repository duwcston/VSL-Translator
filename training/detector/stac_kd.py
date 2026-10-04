"""STAC self-training with knowledge distillation for the YOLO11 ASL sign detector.

Each cycle:
  1. The teacher pseudo-labels the unlabeled images (confidence threshold rises per cycle).
  2. A fresh student is trained on labeled + pseudo-labeled images. Besides the usual
     YOLO loss it matches the teacher's class scores and box distributions on every
     anchor (logit distillation), so it also learns from the teacher's uncertainty.
  3. The student becomes the next cycle's teacher.

Cycle 0's teacher is trained on the labeled set only. Every model is validated on the
labeled dataset's own val split, so mAP numbers are comparable across cycles.

    python training/detector/stac_kd.py --labeled-data path/to/data.yaml \
        --unlabeled-dir path/to/unlabeled --output-root runs/stac_kd

Every Config field is a command-line flag (underscores -> dashes). Finished steps are
recorded in history.json and skipped when the same command is run again, so an
interrupted run (e.g. a Colab disconnect) resumes from the last completed model.
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import os
import shutil
from dataclasses import dataclass, field
from pathlib import Path

import torch
import torch.nn.functional as F
from ultralytics import YOLO
from ultralytics.data.utils import check_det_dataset
from ultralytics.utils import LOGGER

HERE = Path(__file__).resolve().parent
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}


@dataclass
class Config:
    labeled_data: str = ""  # Ultralytics data.yaml of the labeled set (train/val[/test])
    unlabeled_dir: str = ""  # folder of unlabeled images
    output_root: str = "runs/stac_kd"

    # Model: a .yaml is built and initialised from `pretrained` (COCO weights,
    # matching layers only); a .pt is used as-is.
    model: str = str(HERE / "yolo11s-p2.yaml")
    pretrained: str = "yolo11s.pt"

    # STAC
    num_cycles: int = 3
    conf_schedule: list[float] = field(default_factory=lambda: [0.35, 0.45, 0.55])
    pseudo_iou: float = 0.55
    pseudo_max_det: int = 300

    # Knowledge distillation (0 disables a term; kd_weight 0 disables KD)
    kd_weight: float = 1.0
    kd_temperature: float = 2.0
    kd_box_weight: float = 0.5  # relative weight of the box-distribution term

    # Training
    teacher_epochs: int = 150
    student_epochs: int = 200
    imgsz: int = 320  # matches the backend's REALTIME_INPUT_SIZE
    batch: int = 16
    patience: int = 30
    lr0: float = 0.01
    weight_decay: float = 0.0005
    workers: int = 8
    cache: str = "false"  # "ram" / "disk" speed up epochs if memory allows
    device: str = "0" if torch.cuda.is_available() else "cpu"
    seed: int = 42

    export_onnx: bool = True

    def conf_for(self, cycle: int) -> float:
        return self.conf_schedule[min(cycle, len(self.conf_schedule) - 1)]


# --------------------------------------------------------------------------- KD loss


def _split_head(feats: list[torch.Tensor], reg_max: int, nc: int) -> tuple[torch.Tensor, torch.Tensor]:
    """Raw Detect outputs -> box logits (B, 4, reg_max, A) and class logits (B, nc, A)."""
    b = feats[0].shape[0]
    x = torch.cat([f.view(b, 4 * reg_max + nc, -1) for f in feats], 2).float()
    box, cls = x.split((4 * reg_max, nc), 1)
    return box.view(b, 4, reg_max, -1), cls


class DistillationCriterion:
    """Wraps the student's detection loss and adds a distillation term from a frozen teacher.

    Class scores: per-class binary KL between temperature-scaled sigmoids (YOLO uses
    independent sigmoids, not a softmax). Boxes: KL between the DFL distributions of
    each box side. Both are averaged over anchors weighted by the teacher's best class
    score, so confident (object) anchors dominate over background.
    """

    def __init__(self, base, teacher: torch.nn.Module, weight: float, temperature: float, box_weight: float):
        self.base = base
        self.teacher = teacher
        self.weight = weight
        self.t = temperature
        self.box_weight = box_weight
        head = teacher.model[-1]
        self.reg_max, self.nc = head.reg_max, head.nc
        self.reset_stats()

    def reset_stats(self):
        self.kd_sum, self.steps = 0.0, 0

    @property
    def kd_mean(self) -> float:
        return self.kd_sum / max(self.steps, 1)

    def __call__(self, preds, batch):
        loss, items = self.base(preds, batch)
        if self.weight <= 0 or not isinstance(preds, list):  # list = training-mode head outputs
            return loss, items

        with torch.no_grad():
            t_out = self.teacher(batch["img"])
        t_feats = t_out[1] if isinstance(t_out, tuple) else t_out
        s_box, s_cls = _split_head(list(preds), self.reg_max, self.nc)
        t_box, t_cls = _split_head(list(t_feats), self.reg_max, self.nc)
        if s_cls.shape != t_cls.shape:
            raise RuntimeError(f"Teacher/student heads differ: {tuple(t_cls.shape)} vs {tuple(s_cls.shape)}")

        t = self.t
        w = t_cls.sigmoid().amax(1)  # (B, A) teacher confidence per anchor
        w_sum = w.sum().clamp(min=1.0)

        p = (t_cls / t).sigmoid()
        cls_kl = F.binary_cross_entropy_with_logits(s_cls / t, p, reduction="none") - F.binary_cross_entropy_with_logits(
            t_cls / t, p, reduction="none"
        )  # = KL(teacher || student) per class
        kd_cls = (cls_kl.sum(1) * w).sum() / w_sum

        t_dist = (t_box / t).log_softmax(2)
        box_kl = F.kl_div((s_box / t).log_softmax(2), t_dist, reduction="none", log_target=True).sum(2).mean(1)
        kd_box = (box_kl * w).sum() / w_sum

        kd = (kd_cls + self.box_weight * kd_box) * t * t
        self.kd_sum += float(kd.detach())
        self.steps += 1

        # Ultralytics returns either a scalar or a per-component vector that is summed later.
        extra = self.weight * kd * batch["img"].shape[0]
        loss = loss + (extra if loss.ndim == 0 else extra / loss.numel())
        return loss, items


def attach_teacher(student: YOLO, teacher_path: str, cfg: Config, kd_log: list):
    """Install DistillationCriterion on the student's training model once training starts."""

    def on_train_start(trainer):
        model = trainer.model.module if hasattr(trainer.model, "module") else trainer.model
        teacher = YOLO(teacher_path).model.to(trainer.device).float().eval()
        for p in teacher.parameters():
            p.requires_grad_(False)
        model.criterion = DistillationCriterion(
            model.init_criterion(), teacher, cfg.kd_weight, cfg.kd_temperature, cfg.kd_box_weight
        )
        LOGGER.info(f"KD: teacher {teacher_path}, weight {cfg.kd_weight}, T {cfg.kd_temperature}")

    def on_train_epoch_end(trainer):
        model = trainer.model.module if hasattr(trainer.model, "module") else trainer.model
        crit = getattr(model, "criterion", None)
        if isinstance(crit, DistillationCriterion):
            kd_log.append(round(crit.kd_mean, 5))
            LOGGER.info(f"KD loss (epoch mean): {crit.kd_mean:.4f}")
            crit.reset_stats()

    student.add_callback("on_train_start", on_train_start)
    student.add_callback("on_train_epoch_end", on_train_epoch_end)


# --------------------------------------------------------------------------- pipeline


def _link_or_copy(src: Path, dst: Path):
    if dst.exists():
        return
    try:
        os.link(src, dst)  # free on the same filesystem
    except OSError:
        shutil.copy2(src, dst)


def _valid_box(x, y, w, h) -> bool:
    return 0 <= x <= 1 and 0 <= y <= 1 and 0.01 <= w <= 0.95 and 0.01 <= h <= 0.95 and 0.1 <= w / h <= 10


class STACKD:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.out = Path(cfg.output_root).resolve()
        self.out.mkdir(parents=True, exist_ok=True)
        cfg.labeled_data = str(Path(cfg.labeled_data).resolve())
        self.data = check_det_dataset(cfg.labeled_data)  # resolves train/val/test to absolute paths
        self.unlabeled = sorted(p for p in Path(cfg.unlabeled_dir).rglob("*") if p.suffix.lower() in IMAGE_SUFFIXES)
        if not self.unlabeled:
            raise FileNotFoundError(f"No images in {cfg.unlabeled_dir}")
        self.history_path = self.out / "history.json"
        self.history = json.loads(self.history_path.read_text()) if self.history_path.exists() else {}

    def _save_history(self):
        self.history["config"] = dataclasses.asdict(self.cfg)
        self.history_path.write_text(json.dumps(self.history, indent=2))

    def _new_model(self) -> YOLO:
        if self.cfg.model.endswith(".pt"):
            return YOLO(self.cfg.model)
        return YOLO(self.cfg.model).load(self.cfg.pretrained)

    def _train(self, name: str, data: str, epochs: int, teacher: str | None = None) -> dict:
        """Train (or reuse) a model; returns its record with best.pt path and val metrics."""
        if name in self.history and Path(self.history[name]["weights"]).exists():
            LOGGER.info(f"Skipping {name}: already trained")
            return self.history[name]

        model, kd_log = self._new_model(), []
        if teacher and self.cfg.kd_weight > 0:
            attach_teacher(model, teacher, self.cfg, kd_log)
        c = self.cfg
        model.train(
            data=data, epochs=epochs, imgsz=c.imgsz, batch=c.batch, patience=c.patience, lr0=c.lr0,
            weight_decay=c.weight_decay, workers=c.workers, device=c.device, seed=c.seed,
            cache={"false": False, "true": True}.get(c.cache.lower(), c.cache),
            project=str(self.out / "models"), name=name, exist_ok=True, plots=True,
        )  # fmt: skip
        save_dir = Path(model.trainer.save_dir)
        weights = save_dir / "weights" / "best.pt"
        # Validate best.pt on the labeled val split (the student trained on pseudo data).
        m = YOLO(str(weights)).val(data=c.labeled_data, imgsz=c.imgsz, batch=c.batch, device=c.device,
                                   project=str(self.out / "val"), name=name, exist_ok=True, plots=False)  # fmt: skip
        record = {
            "weights": str(weights),
            "mAP50": round(float(m.box.map50), 4),
            "mAP50-95": round(float(m.box.map), 4),
            "precision": round(float(m.box.mp), 4),
            "recall": round(float(m.box.mr), 4),
            "kd_loss_per_epoch": kd_log,
        }
        self.history[name] = record
        self._save_history()
        LOGGER.info(f"{name}: mAP50 {record['mAP50']}, mAP50-95 {record['mAP50-95']}")
        return record

    def pseudo_label(self, teacher: str, cycle: int) -> Path:
        """Write teacher detections as YOLO labels; returns the pseudo images folder."""
        key = f"pseudo_cycle_{cycle}"
        root = self.out / "pseudo" / f"cycle_{cycle}"
        images, labels = root / "images", root / "labels"
        if key in self.history and images.exists():
            return images
        shutil.rmtree(root, ignore_errors=True)
        images.mkdir(parents=True)
        labels.mkdir(parents=True)

        conf = self.cfg.conf_for(cycle)
        model = YOLO(teacher)
        n_images = n_boxes = 0
        confs = []
        chunk = 256  # bounded memory; each chunk is one batched, streamed predict call
        for i in range(0, len(self.unlabeled), chunk):
            for r in model.predict(
                [str(p) for p in self.unlabeled[i : i + chunk]], stream=True, conf=conf, iou=self.cfg.pseudo_iou,
                imgsz=self.cfg.imgsz, max_det=self.cfg.pseudo_max_det, batch=self.cfg.batch,
                device=self.cfg.device, half=self.cfg.device != "cpu", verbose=False,
            ):  # fmt: skip
                lines = []
                for (x, y, w, h), c, k in zip(r.boxes.xywhn.tolist(), r.boxes.conf.tolist(), r.boxes.cls.tolist()):
                    if _valid_box(x, y, w, h):
                        lines.append(f"{int(k)} {x:.6f} {y:.6f} {w:.6f} {h:.6f}")
                        confs.append(c)
                if not lines:
                    continue  # images without confident detections are left out
                src = Path(r.path)
                stem = f"{n_images:06d}_{src.stem}"  # unique even if subfolders repeat names
                _link_or_copy(src, images / f"{stem}{src.suffix}")
                (labels / f"{stem}.txt").write_text("\n".join(lines) + "\n")
                n_images += 1
                n_boxes += len(lines)

        stats = {
            "conf_threshold": conf,
            "images": n_images,
            "unlabeled_total": len(self.unlabeled),
            "boxes": n_boxes,
            "mean_conf": round(sum(confs) / len(confs), 4) if confs else None,
        }
        LOGGER.info(f"Pseudo-labels cycle {cycle}: {stats}")
        if n_images == 0:
            raise RuntimeError("Teacher produced no pseudo-labels; lower conf_schedule.")
        self.history[key] = stats
        self._save_history()
        return images

    def combined_yaml(self, pseudo_images: Path, cycle: int) -> str:
        train = self.data["train"]
        train = train if isinstance(train, list) else [train]
        d = {
            "train": [str(t) for t in train] + [str(pseudo_images)],
            "val": self.data["val"],
            "names": self.data["names"],
        }
        if self.data.get("test"):
            d["test"] = self.data["test"]
        path = pseudo_images.parent / f"data_cycle_{cycle}.yaml"
        path.write_text(json.dumps(d, indent=2))  # JSON is valid YAML
        return str(path)

    def run(self) -> str:
        c = self.cfg
        LOGGER.info(f"Labeled: {c.labeled_data} | unlabeled images: {len(self.unlabeled)} | cycles: {c.num_cycles}")
        teacher = self._train("teacher_cycle_0", c.labeled_data, c.teacher_epochs)["weights"]
        for cycle in range(c.num_cycles):
            pseudo = self.pseudo_label(teacher, cycle)
            data = self.combined_yaml(pseudo, cycle)
            teacher = self._train(f"student_cycle_{cycle}", data, c.student_epochs, teacher=teacher)["weights"]

        final = self.out / "best.pt"
        shutil.copy2(teacher, final)
        self.history["final"] = {"weights": str(final)}
        if self.data.get("test"):
            m = YOLO(str(final)).val(data=c.labeled_data, split="test", imgsz=c.imgsz, batch=c.batch,
                                     device=c.device, project=str(self.out / "val"), name="final_test", exist_ok=True)  # fmt: skip
            self.history["final"].update(test_mAP50=round(float(m.box.map50), 4), test_mAP50_95=round(float(m.box.map), 4))
        if c.export_onnx:
            self.history["final"]["onnx"] = str(YOLO(str(final)).export(format="onnx", imgsz=c.imgsz))
        self._save_history()
        self.plot()
        return str(final)

    def plot(self):
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        names = [k for k in self.history if k.startswith(("teacher_cycle", "student_cycle"))]
        fig, ax = plt.subplots(1, 2, figsize=(11, 4))
        for metric in ("mAP50", "mAP50-95"):
            ax[0].plot(range(len(names)), [self.history[n][metric] for n in names], "o-", label=metric)
        ax[0].set_xticks(range(len(names)), [n.replace("_cycle_", " ") for n in names], rotation=20)
        ax[0].set_title("Labeled val split")
        ax[0].legend()
        ax[0].grid(alpha=0.3)
        pseudo = [self.history[k] for k in self.history if k.startswith("pseudo_cycle")]
        ax[1].bar(range(len(pseudo)), [p["images"] for p in pseudo], color="tab:orange")
        ax[1].set_xticks(range(len(pseudo)), [f"cycle {i}\nconf {p['conf_threshold']}" for i, p in enumerate(pseudo)])
        ax[1].set_title("Pseudo-labeled images")
        fig.tight_layout()
        fig.savefig(self.out / "stac_kd_summary.png", dpi=150)
        plt.close(fig)


def parse_args() -> Config:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    for f in dataclasses.fields(Config):
        default = f.default_factory() if f.default_factory is not dataclasses.MISSING else f.default
        flag = "--" + f.name.replace("_", "-")
        if isinstance(default, bool):
            parser.add_argument(flag, type=lambda s: s.lower() in ("1", "true", "yes"), default=default)
        elif isinstance(default, list):
            parser.add_argument(flag, type=float, nargs="+", default=default)
        else:
            parser.add_argument(flag, type=type(default), default=default)
    cfg = Config(**vars(parser.parse_args()))
    if not cfg.labeled_data or not cfg.unlabeled_dir:
        parser.error("--labeled-data and --unlabeled-dir are required")
    return cfg


if __name__ == "__main__":
    print("Final model:", STACKD(parse_args()).run())
