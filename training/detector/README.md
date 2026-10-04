# ASL sign detector: STAC + knowledge distillation

Trains the YOLO11s-P2 sign detector semi-supervised: the labeled ASL images plus
pseudo-labels on unlabeled images, with a teacher → student distillation loss.

```
training/detector/
├── stac_kd.py            # the pipeline (importable, and a CLI)
├── train_stac_kd.ipynb   # Colab notebook: clone, download dataset, train, download
├── yolo11-p2.yaml        # YOLO11 + P2 (stride-4) head; load as "yolo11s-p2.yaml"
└── requirements.txt
```

## How it works

```
labeled ──► teacher (cycle 0) ──► pseudo-label unlabeled @ conf 0.35 ──► student 0 ──┐
                                                                   (labeled + pseudo, │
                                                                    KD from teacher)  │
        ┌─────────────────────────────────────────────────────────────────────────────┘
        └► student 0 = teacher ──► pseudo-label @ 0.45 ──► student 1 ──► … ──► best.pt / best.onnx
```

- **Pseudo-labels**: teacher detections above the cycle's confidence threshold, with
  implausible boxes (tiny, near full-frame, extreme aspect ratio) dropped. Images with no
  detection are left out.
- **Distillation**: the student matches the teacher on every anchor, in two terms. The
  class term is a binary KL between temperature-scaled sigmoids. The box term is a KL
  between the DFL distributions of each box side. Both are weighted by the teacher's
  confidence so object anchors count more than background.
  `loss = YOLO loss + kd_weight · T² · (cls_KL + kd_box_weight · box_KL)`.
- **Evaluation**: every teacher and student is validated on the labeled set's **val**
  split, and the final model on **test** if the data.yaml has one. Results go to
  `history.json` and `stac_kd_summary.png`.

## Run

Colab: open `train_stac_kd.ipynb` from GitHub, choose a GPU runtime, then *Run all*.

Locally:

```bash
pip install -r training/detector/requirements.txt
python training/detector/stac_kd.py \
    --labeled-data path/to/labeled/data.yaml \
    --unlabeled-dir path/to/unlabeled \
    --output-root runs/stac_kd
```

Every field of `Config` is a flag (`--kd-weight 0`, `--conf-schedule 0.4 0.5 0.6`,
`--imgsz 640`, ...). Re-running the same command resumes: models and pseudo-label sets
already listed in `history.json` are reused. Use a new `--output-root` for a fresh run.

To start from the original `yolo11s-p2.pt` instead of building the YAML with COCO
`yolo11s.pt` weights, pass `--model training/detector/yolo11s-p2.pt`. Both give the same
architecture.

## Ablations

| Run | Flags |
|---|---|
| Supervised baseline | `--num-cycles 0` |
| STAC without KD | `--kd-weight 0` |
| STAC + KD (default) | — |
| KD terms | `--kd-box-weight 0`, `--kd-temperature 1/2/4` |

## Use the model in the app

Copy `best.onnx` to `backend/models/` and set `DEFAULT_MODEL_PATH` in
`backend/app/config/config.py`. Training and the ONNX export use 320×320 by default,
the backend's `REALTIME_INPUT_SIZE`. Training at a larger size (`--imgsz 640`) helps
small hands but costs latency, and the app would need its input size raised to match.

## Changes from the original notebook (`STAC-YOLO11-With-KD.ipynb`)

- **KD now runs.** In the notebook, the KD/feature losses were defined but never
  called, and the saved soft labels were never read. Its "KD" student was plain
  training on pseudo-labels.
- **Honest validation.** The combined datasets had no val folder, so they validated
  on their own training images. The inflated mAP also made early stopping
  ineffective. Now all models use the labeled val split.
- **Less redundant work.** For cycles after the first, the notebook retrained the
  previous student as a "teacher" on the same data (2 × 150 extra epochs). That student
  is now used directly. Labeled images are no longer copied every cycle (the YAML lists
  both folders), and pseudo images are hard-linked. Pseudo-labelling is batched.
- Resumable runs, the P2 architecture as a YAML in the repo, dataset paths taken from
  `kagglehub` instead of a hard-coded cache version, and ONNX export at the end.
