"""Conversions between detector labels, ASL gloss strings and English text.

This module has no dependencies (standard library only) so the exact same code
is used by the backend, the dataset builder, the Colab training notebook and
the evaluation script. Changing a mapping here means retraining the model.

Conventions follow the ASLG-PC12 corpus the gloss-to-text model is trained on:
- glosses are upper case, pronouns are written X-I, X-YOU, X-MY, ...
- English text is lower case with punctuation split off ("what is your name ?")
"""

import re
from typing import Iterable

# Detector class name -> gloss tokens. Where ASLG-PC12 has an established
# spelling (e.g. "thank you" -> THANK X-YOU) we reuse it so the model can build
# on what it learned during pre-training.
LABEL_TO_GLOSS = {
    "Call": "CALL",
    "Deaf": "DEAF",
    "Doctor": "DOCTOR",
    "Drink": "DRINK",
    "Eat": "EAT",
    "Hello": "HELLO",
    "Help": "HELP",
    "House": "HOUSE",
    "How": "HOW",
    "I": "X-I",
    "I love you": "X-I LOVE X-YOU",
    "My": "X-MY",
    "Name": "NAME",
    "No": "NO",
    "Pain": "PAIN",
    "Thank you": "THANK X-YOU",
    "Thirsty": "THIRSTY",
    "What": "WHAT",
    "Where": "WHERE",
    "Yes": "YES",
    "You": "X-YOU",
    "Your": "X-YOUR",
}

_PUNCTUATION = ".,?!;:"
_PUNCT_TOKEN = re.compile(rf"^[{re.escape(_PUNCTUATION)}]+$")


def label_to_gloss(label: str) -> str:
    return LABEL_TO_GLOSS.get(label, label.strip().upper().replace(" ", "-"))


def labels_to_gloss(labels: Iterable[str]) -> str:
    """["Your", "Name", "What"] -> "X-YOUR NAME WHAT"."""
    return " ".join(label_to_gloss(label) for label in labels if label)


def clean_gloss(gloss: str) -> str:
    """Normalise an ASLG-PC12 gloss line to the model's input format.

    Our glosses come from detected signs and never contain punctuation, so it
    is stripped from the corpus too and the model learns to add it itself.
    """
    gloss = gloss.replace("﻿", "")
    tokens = [t for t in gloss.split() if not _PUNCT_TOKEN.match(t)]
    return " ".join(tokens)


def normalize_text(text: str) -> str:
    """English sentence -> model target format: "What's up?" -> "what's up ?"."""
    text = text.replace("﻿", "").strip().lower()
    text = re.sub(rf"\s*([{re.escape(_PUNCTUATION)}])", r" \1", text)
    return re.sub(r"\s+", " ", text).strip()


def prettify(text: str) -> str:
    """Model output -> display sentence: "what is your name ?" -> "What is your name?"."""
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return ""
    text = re.sub(rf"\s+([{re.escape(_PUNCTUATION)}])", r"\1", text)
    text = re.sub(r"\bi\b", "I", text)
    # Capitalise the first letter of every sentence.
    text = re.sub(
        r"(^|[.?!]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), text
    )
    if text[-1] not in _PUNCTUATION:
        text += "."
    return text
