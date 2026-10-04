"""Build the evaluation sets and the in-domain training set.

    python training/build_dataset.py

Reads   training/data/eval_pairs.txt   (hand-written, edit freely)
Writes  training/data/dev.jsonl        (for tuning, ~30% of eval_pairs)
        training/data/test.jsonl       (held out, report final scores on it)
        training/data/indomain_train.jsonl  (template-generated training pairs)

The training set never contains a sign sequence that appears in dev or test,
so the scores measure generalisation to unseen combinations of signs.
Uses only the standard library plus backend/app/services/gloss_text.py.
"""

import itertools
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / "backend"))

from app.services.gloss_text import (  # noqa: E402
    LABEL_TO_GLOSS,
    labels_to_gloss,
    normalize_text,
)

DATA_DIR = ROOT / "data"
SEED = 13
DEV_FRACTION = 0.3
NUM_COMBINED = 600  # two-clause examples, for videos with several phrases


# --------------------------------------------------------------------------
# Evaluation sets
# --------------------------------------------------------------------------


def read_eval_pairs(path: Path):
    pairs = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        glosses_part, refs_part = line.split("|", 1)
        labels = [label.strip() for label in glosses_part.split(",")]
        unknown = [label for label in labels if label not in LABEL_TO_GLOSS]
        if unknown:
            raise ValueError(f"{path.name}:{line_no}: unknown label(s) {unknown}")
        references = [ref.strip() for ref in refs_part.split("||") if ref.strip()]
        pairs.append({"labels": labels, "references": references})

    seen = set()
    for pair in pairs:
        key = tuple(pair["labels"])
        if key in seen:
            raise ValueError(f"Duplicate sign sequence in {path.name}: {key}")
        seen.add(key)
    return pairs


# --------------------------------------------------------------------------
# Template-generated in-domain training pairs
# Targets are written in the model's normalised style (see normalize_text).
# --------------------------------------------------------------------------

# label sequence -> (subject, "be" verb, object pronoun, possessive)
SUBJECTS = {
    ("I",): ("i", "am", "me"),
    ("You",): ("you", "are", "you"),
    ("Doctor",): ("the doctor", "is", "the doctor"),
    ("My", "Doctor"): ("my doctor", "is", "my doctor"),
    ("Your", "Doctor"): ("your doctor", "is", "your doctor"),
}
POSSESSIVES = {("My",): "my", ("Your",): "your"}
STATES = {("Deaf",): "deaf", ("Thirsty",): "thirsty", ("Pain",): "in pain"}
ACTIONS = {("Eat",): ("eat", "eating"), ("Drink",): ("drink", "drinking")}
TRANSITIVE = {("Call",): "call", ("Help",): "help"}
PLACES = {("House",): "house", ("Doctor",): "doctor"}
OPENERS = {
    ("Hello",): "hello",
    ("Yes",): "yes",
    ("No",): "no",
    ("Thank you",): "thank you",
}
STANDALONE = {
    ("Hello",): "hello .",
    ("Yes",): "yes .",
    ("No",): "no .",
    ("Thank you",): "thank you .",
    ("I love you",): "i love you .",
    ("Help",): "help !",
    ("Eat",): "eat .",
    ("Drink",): "drink .",
}


def _question(subject, be, rest):
    return f"{be} {subject} {rest} ?"


def core_templates():
    """Yield (labels, text) for single-clause sentences."""
    yield from STANDALONE.items()

    for (s_lab, (subj, be, _)), (a_lab, adj) in itertools.product(
        SUBJECTS.items(), STATES.items()
    ):
        # "You Deaf" reads as a question; others as statements.
        if s_lab == ("You",):
            yield s_lab + a_lab, _question(subj, be, adj)
            yield a_lab + s_lab, _question(subj, be, adj)
        else:
            yield s_lab + a_lab, f"{subj} {be} {adj} ."
        yield ("Yes",) + s_lab + a_lab, f"yes , {subj} {be} {adj} ."
        yield ("No",) + s_lab + a_lab, f"no , {subj} {be} not {adj} ."

    for (s_lab, (subj, be, _)), (v_lab, (verb, ing)) in itertools.product(
        SUBJECTS.items(), ACTIONS.items()
    ):
        if s_lab == ("You",):
            yield s_lab + v_lab, f"are you {ing} ?"
            yield s_lab + v_lab + ("What",), f"what are you {ing} ?"
            yield ("What",) + s_lab + v_lab, f"what are you {ing} ?"
        else:
            yield s_lab + v_lab, f"{subj} {be} {ing} ."
            yield s_lab + v_lab + ("What",), f"what {be} {subj} {ing} ?"
        yield s_lab + ("Eat", "Drink"), (
            "are you eating and drinking ?"
            if s_lab == ("You",)
            else f"{subj} {be} eating and drinking ."
        )

    for (s_lab, (subj, _, _)), (v_lab, verb), (o_lab, (_, _, obj)) in itertools.product(
        SUBJECTS.items(), TRANSITIVE.items(), SUBJECTS.items()
    ):
        if s_lab == o_lab:
            continue
        if s_lab == ("You",):
            yield s_lab + v_lab + o_lab, f"can you {verb} {obj} ?"
        else:
            yield s_lab + v_lab + o_lab, f"{subj} will {verb} {obj} ."

    for v_lab, verb in TRANSITIVE.items():
        for o_lab, (_, _, obj) in SUBJECTS.items():
            if o_lab != ("You",):
                yield v_lab + o_lab, f"{verb} {obj} ."
        yield v_lab + ("Doctor",), f"{verb} the doctor ."

    for (p_lab, poss), (n_lab, noun) in itertools.product(
        POSSESSIVES.items(), PLACES.items()
    ):
        yield p_lab + n_lab, f"{poss} {noun} ."
        yield p_lab + n_lab + ("Where",), f"where is {poss} {noun} ?"
        yield ("Where",) + p_lab + n_lab, f"where is {poss} {noun} ?"
        yield ("How",) + p_lab + ("Pain",), f"how is {poss} pain ?"
        yield p_lab + ("Pain", "Where"), f"where is {poss} pain ?"
        yield p_lab + ("Name",), f"{poss} name ."
        yield p_lab + ("Name", "What"), f"what is {poss} name ?"
        yield ("What",) + p_lab + ("Name",), f"what is {poss} name ?"

    for n_lab, noun in PLACES.items():
        yield n_lab + ("Where",), f"where is the {noun} ?"
        yield ("Where",) + n_lab, f"where is the {noun} ?"
    for s_lab, (subj, be, _) in SUBJECTS.items():
        yield ("Where",) + s_lab, f"where {be} {subj} ?"
        yield ("How",) + s_lab, f"how {be} {subj} ?"
        if s_lab != ("You",):
            yield s_lab + ("House",), f"{subj} {be} at home ."
    yield ("You", "House"), "are you at home ?"
    for v_lab, (verb, _) in ACTIONS.items():
        yield ("Where",) + v_lab, f"where can i {verb} ?"
        yield ("Yes",) + v_lab, f"yes , {verb} ."
        yield ("No",) + v_lab, f"do not {verb} ."
        yield ("What",) + v_lab, f"what do you want to {verb} ?"


def with_openers(base):
    """Prefix single clauses with Hello / Yes / No / Thank you."""
    for labels, text in base:
        yield labels, text
        if labels[0] in ("Hello", "Yes", "No", "Thank you"):
            continue
        for o_lab, opener in OPENERS.items():
            if o_lab == ("Thank you",) and not text.endswith("?"):
                yield o_lab + labels, f"{opener} , {text}"
            elif o_lab == ("Hello",):
                yield o_lab + labels, f"{opener} , {text}"


def _unique(pairs, excluded):
    result = {}
    for labels, text in pairs:
        labels = tuple(labels)
        if labels not in excluded and labels not in result:
            result[labels] = text
    return result


def build_training_pairs(excluded):
    single = _unique(with_openers(core_templates()), excluded)

    # Two-clause examples join plain clauses (no Hello/Thank you prefixes) so
    # they teach sentence boundaries without over-weighting the openers.
    rng = random.Random(SEED)
    items = sorted(_unique(core_templates(), excluded).items())
    combined = {}
    attempts = 0
    while len(combined) < NUM_COMBINED and attempts < NUM_COMBINED * 20:
        attempts += 1
        (a_lab, a_text), (b_lab, b_text) = rng.sample(items, 2)
        labels = a_lab + b_lab
        if labels in excluded or labels in single or len(labels) > 7:
            continue
        combined[labels] = f"{a_text} {b_text}"

    pairs = [
        {
            "labels": list(labels),
            "gloss": labels_to_gloss(labels),
            "text": normalize_text(text),
        }
        for labels, text in itertools.chain(single.items(), combined.items())
    ]
    rng.shuffle(pairs)
    return pairs, len(single), len(combined)


def write_jsonl(path: Path, rows):
    with path.open("w", encoding="utf-8", newline="\n") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def main():
    eval_pairs = read_eval_pairs(DATA_DIR / "eval_pairs.txt")
    rng = random.Random(SEED)
    shuffled = eval_pairs[:]
    rng.shuffle(shuffled)
    n_dev = round(len(shuffled) * DEV_FRACTION)
    dev, test = shuffled[:n_dev], shuffled[n_dev:]
    for split in (dev, test):
        for pair in split:
            pair["gloss"] = labels_to_gloss(pair["labels"])
    write_jsonl(DATA_DIR / "dev.jsonl", dev)
    write_jsonl(DATA_DIR / "test.jsonl", test)

    excluded = {tuple(pair["labels"]) for pair in eval_pairs}
    train, n_single, n_combined = build_training_pairs(excluded)
    write_jsonl(DATA_DIR / "indomain_train.jsonl", train)

    print(f"dev: {len(dev)}  test: {len(test)}")
    print(
        f"in-domain train: {len(train)} ({n_single} single-clause, {n_combined} two-clause)"
    )


if __name__ == "__main__":
    main()
