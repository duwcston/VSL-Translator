"""Turn a sequence of detected signs into an English sentence.

Backends (chosen with SENTENCE_BACKEND in config.py):
- "seq2seq": a T5/BART model fine-tuned on gloss -> English pairs
             (trained with training/train_gloss2text.ipynb)
- "none":    no sentence; the UI shows only the sign sequence

New backends (e.g. a few-shot LLM) only need a `generate(labels)` method.
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Protocol

from app.config.config import (
    SENTENCE_BACKEND,
    SENTENCE_MAX_NEW_TOKENS,
    SENTENCE_MODEL_DIR,
    SENTENCE_NUM_BEAMS,
)
from app.services.gloss_text import labels_to_gloss, prettify


class SentenceGenerator(Protocol):
    name: str

    def generate(self, labels: List[str]) -> Optional[str]: ...


class NoSentenceGenerator:
    name = "none"

    def generate(self, labels: List[str]) -> Optional[str]:
        return None


class Seq2SeqSentenceGenerator:
    name = "seq2seq"

    def __init__(
        self,
        model_dir: Path,
        num_beams: int = SENTENCE_NUM_BEAMS,
        max_new_tokens: int = SENTENCE_MAX_NEW_TOKENS,
    ):
        # Imported lazily so the "none" backend doesn't pay for loading torch
        # and transformers.
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        self._torch = torch
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_dir)
        self.model.to(self.device).eval()
        self.num_beams = num_beams
        self.max_new_tokens = max_new_tokens
        print(f"Sentence model loaded from: {model_dir} ({self.device})")

    def generate_from_gloss(self, gloss: str) -> str:
        """Raw model output (normalised text) for a gloss string."""
        inputs = self.tokenizer(gloss, return_tensors="pt").to(self.device)
        with self._torch.inference_mode():
            output = self.model.generate(
                **inputs,
                num_beams=self.num_beams,
                max_new_tokens=self.max_new_tokens,
            )
        return self.tokenizer.decode(output[0], skip_special_tokens=True)

    def generate(self, labels: List[str]) -> Optional[str]:
        gloss = labels_to_gloss(labels)
        if not gloss:
            return None
        return prettify(self.generate_from_gloss(gloss)) or None


def create_sentence_generator(
    backend: str = SENTENCE_BACKEND, model_dir: Path = SENTENCE_MODEL_DIR
) -> SentenceGenerator:
    if backend == "seq2seq":
        if not (Path(model_dir) / "config.json").exists():
            print(
                f"Warning: no sentence model found in {model_dir}; "
                "sentences are disabled. See training/README.md to train one."
            )
            return NoSentenceGenerator()
        return Seq2SeqSentenceGenerator(Path(model_dir))
    if backend == "none":
        return NoSentenceGenerator()
    raise ValueError(f"Unknown SENTENCE_BACKEND: {backend!r}")


@lru_cache(maxsize=1)
def get_sentence_generator() -> SentenceGenerator:
    return create_sentence_generator()


def generate_sentence(labels: List[str]) -> Optional[str]:
    return get_sentence_generator().generate(labels)
