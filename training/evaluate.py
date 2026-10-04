"""Score a sentence backend on the hand-written evaluation set.

    python training/evaluate.py                       # seq2seq model in backend/models/gloss2text
    python training/evaluate.py --backend none        # baseline: the raw sign sequence
    python training/evaluate.py --split dev --show 10 # tune on dev, print examples
    python training/evaluate.py --noisy               # also score with one sign dropped/inserted

Metrics (computed on normalised text, so casing/punctuation spacing don't matter):
BLEU and chrF (sacrebleu, multi-reference), ROUGE-L F1, exact match, latency.
Run with the backend virtualenv after `pip install -r training/requirements.txt`.
"""

import argparse
import json
import random
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / "backend"))

import sacrebleu  # noqa: E402

from app.services.gloss_text import LABEL_TO_GLOSS, normalize_text  # noqa: E402

DATA_DIR = ROOT / "data"
DEFAULT_MODEL_DIR = ROOT.parent / "backend" / "models" / "gloss2text"


def load_split(name):
    path = DATA_DIR / f"{name}.jsonl"
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def add_noise(pairs, seed=0):
    """Simulate detector mistakes: drop one sign or insert a random one."""
    rng = random.Random(seed)
    vocabulary = sorted(LABEL_TO_GLOSS)
    noisy = []
    for pair in pairs:
        labels = list(pair["labels"])
        if len(labels) > 1 and rng.random() < 0.5:
            labels.pop(rng.randrange(len(labels)))
        else:
            labels.insert(rng.randrange(len(labels) + 1), rng.choice(vocabulary))
        noisy.append({**pair, "labels": labels})
    return noisy


def rouge_l(hypothesis, reference):
    h, r = hypothesis.split(), reference.split()
    if not h or not r:
        return 0.0
    # Longest common subsequence via dynamic programming.
    prev = [0] * (len(r) + 1)
    for token in h:
        cur = [0]
        for j, ref_token in enumerate(r):
            cur.append(prev[j] + 1 if token == ref_token else max(prev[j + 1], cur[j]))
        prev = cur
    lcs = prev[-1]
    if lcs == 0:
        return 0.0
    precision, recall = lcs / len(h), lcs / len(r)
    return 2 * precision * recall / (precision + recall)


def make_backend(name, model_dir):
    if name == "none":
        return lambda labels: " ".join(labels)
    if name == "seq2seq":
        from app.services.sentence_generator import Seq2SeqSentenceGenerator

        if not (Path(model_dir) / "config.json").exists():
            sys.exit(
                f"No model in {model_dir}. Train one with train_gloss2text.ipynb first."
            )
        generator = Seq2SeqSentenceGenerator(Path(model_dir))
        return lambda labels: generator.generate(labels) or ""
    sys.exit(f"Unknown backend {name!r}")


def score(pairs, generate):
    hypotheses, latencies = [], []
    for pair in pairs:
        start = time.perf_counter()
        hypotheses.append(generate(pair["labels"]))
        latencies.append((time.perf_counter() - start) * 1000)

    hyps = [normalize_text(h) for h in hypotheses]
    refs = [[normalize_text(r) for r in pair["references"]] for pair in pairs]
    # sacrebleu wants one stream per reference position; pad shorter lists by
    # repeating the first reference (doesn't change BLEU/chrF, which take the
    # best match per sentence).
    n_refs = max(len(r) for r in refs)
    streams = [[r[i] if i < len(r) else r[0] for r in refs] for i in range(n_refs)]

    metrics = {
        "BLEU": sacrebleu.corpus_bleu(hyps, streams).score,
        "chrF": sacrebleu.corpus_chrf(hyps, streams).score,
        "ROUGE-L": 100
        * statistics.mean(max(rouge_l(h, r) for r in rs) for h, rs in zip(hyps, refs)),
        "ExactMatch": 100 * statistics.mean(h in rs for h, rs in zip(hyps, refs)),
        "Latency ms (mean)": statistics.mean(latencies),
        "Latency ms (p95)": sorted(latencies)[int(0.95 * (len(latencies) - 1))],
    }
    return metrics, hypotheses


def print_metrics(title, metrics):
    print(f"\n{title}")
    for name, value in metrics.items():
        print(f"  {name:<18} {value:8.2f}")


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--split", default="test", choices=["test", "dev"])
    parser.add_argument("--backend", default="seq2seq", choices=["seq2seq", "none"])
    parser.add_argument("--model-dir", default=str(DEFAULT_MODEL_DIR))
    parser.add_argument(
        "--noisy",
        action="store_true",
        help="also evaluate with simulated detector errors",
    )
    parser.add_argument("--show", type=int, default=0, help="print N example outputs")
    parser.add_argument("--out", help="write metrics and outputs to this JSON file")
    args = parser.parse_args()

    pairs = load_split(args.split)
    generate = make_backend(args.backend, args.model_dir)
    report = {"backend": args.backend, "split": args.split, "n": len(pairs)}

    metrics, hypotheses = score(pairs, generate)
    print_metrics(f"{args.backend} on {args.split} ({len(pairs)} pairs)", metrics)
    report["clean"] = {"metrics": metrics, "outputs": hypotheses}

    for pair, hyp in list(zip(pairs, hypotheses))[: args.show]:
        print(
            f"\n  signs: {', '.join(pair['labels'])}\n  model: {hyp}\n  refs:  {' | '.join(pair['references'])}"
        )

    if args.noisy:
        noisy = add_noise(pairs)
        metrics, hypotheses = score(noisy, generate)
        print_metrics(
            f"{args.backend} on {args.split}, one sign dropped/inserted", metrics
        )
        report["noisy"] = {
            "metrics": metrics,
            "outputs": hypotheses,
            "labels": [p["labels"] for p in noisy],
        }

    if args.out:
        Path(args.out).write_text(
            json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"\nSaved to {args.out}")


if __name__ == "__main__":
    main()
