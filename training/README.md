# Gloss → English sentence model

Turns the sign sequence detected in an uploaded video into an English sentence, e.g.
`Your, Name, What` → *"What is your name?"*. The backend works without it (it then
shows only the sign sequence); this folder trains, installs and evaluates the model.

```
training/
├── data/
│   ├── eval_pairs.txt          # hand-written sign sequences + reference sentences (edit this)
│   ├── dev.jsonl               # ~30% of eval_pairs, for tuning
│   ├── test.jsonl              # ~70% of eval_pairs, report final scores on it
│   └── indomain_train.jsonl    # template-generated training pairs (22 signs)
├── build_dataset.py            # eval_pairs.txt -> dev/test, and builds indomain_train
├── train_gloss2text.ipynb      # Colab notebook: two-stage fine-tuning
├── evaluate.py                 # scores a backend on dev/test (BLEU, chrF, ROUGE-L, latency)
└── requirements.txt            # sacrebleu, for evaluate.py
```

Text conventions (gloss spelling such as `X-YOU`, `THANK X-YOU`, and text normalisation)
live in `backend/app/services/gloss_text.py`, shared by every script here and by the
backend. If you change `LABEL_TO_GLOSS`, re-run `build_dataset.py` and retrain.

## 1. Build the datasets

```bash
python training/build_dataset.py
```

- **Evaluation set**: `data/eval_pairs.txt` holds hand-written pairs (one sign sequence,
  1–2 reference sentences). It is split with a fixed seed into `dev.jsonl` and
  `test.jsonl`. Extend it towards 150–300 pairs and check every reference yourself.
- **In-domain training set**: generated from grammar templates over the 22 signs
  (statements, questions, negation, openers like *Hello*/*Thank you*, two-clause
  sentences). Any sign sequence present in dev/test is excluded, so scores measure
  generalisation to unseen combinations.

Commit the regenerated files and push before training: the notebook clones the repo.

## 2. Train in Colab

1. Open `training/train_gloss2text.ipynb` in Colab (*File → Upload notebook*, or from GitHub).
2. *Runtime → Change runtime type → T4 GPU*, then *Runtime → Run all*.
3. The notebook downloads ASLG-PC12, trains, prints dev scores after each stage and
   downloads `gloss2text.zip`.

| Stage | Data | Default |
|---|---|---|
| 1 | ASLG-PC12, ~81k unique gloss/English pairs (synthetic, European Parliament domain) | 1 epoch, lr 3e-4 |
| 2 | In-domain pairs + 3k ASLG "replay" pairs | 8 epochs, lr 1e-4 |

Settings to vary for the thesis ablations are in the notebook's configuration cell:
`MODEL_NAME` (`google/flan-t5-small` / `flan-t5-base` / `facebook/bart-base`),
`RUN_STAGE1`, `RUN_STAGE2`, epochs and `ASLG_REPLAY`. `training_info.json` inside the
zip records the settings and dev scores of each run.

## 3. Install the model

Extract the zip so the files are in `backend/models/gloss2text/`:

```
backend/models/gloss2text/
├── config.json
├── model.safetensors
├── tokenizer files (spiece.model, tokenizer.json, ...)
└── training_info.json
```

Restart the backend. With `SENTENCE_BACKEND = "seq2seq"` (the default in
`app/config/config.py`) uploaded videos now get a *Translation* above the sign sequence.
`SENTENCE_BACKEND=none` (environment variable) turns it off.

## 4. Evaluate

```bash
cd backend && .venv\Scripts\activate          # backend virtualenv
pip install -r ../training/requirements.txt
cd ..
python training/evaluate.py --backend none --noisy        # baseline: raw sign sequence
python training/evaluate.py --noisy --show 10 --out results.json
```

Metrics are computed on normalised text (lower case, punctuation split off) with all
references: corpus BLEU and chrF (sacrebleu), ROUGE-L F1, exact match and per-sentence
latency. `--noisy` repeats the test with one sign dropped or inserted per sequence, to
measure robustness to detector mistakes. Tune on `--split dev`; report `test` once.

Baseline on the current test set (73 pairs): BLEU 9.55, chrF 47.03 (clean);
BLEU 4.21, chrF 35.84 (noisy).

**Latency:** generation runs once per video, after detection. On a CPU-only machine
expect roughly 0.3–0.5 s per sentence for `flan-t5-small` and 1–2 s for
`flan-t5-base` with 4 beams; `SENTENCE_NUM_BEAMS = 1` is about twice as fast.

## Notes

- ASLG-PC12's licence is listed as unknown on Hugging Face; cite it as
  Othman & Jemni (2012), *English-ASL Gloss Parallel Corpus 2012: ASLG-PC12*.
- The model can only use the signs it receives. With a 22-sign vocabulary, missing
  words (e.g. a fingerspelled name after *My Name*) cannot be recovered, so the app
  always shows the raw sign sequence next to the generated sentence.
