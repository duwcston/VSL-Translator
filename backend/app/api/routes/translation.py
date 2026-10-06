import time
from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.services.gloss_text import LABEL_TO_GLOSS, labels_to_gloss
from app.services.sentence_generator import get_sentence_generator

router = APIRouter(tags=["Translation"])

# Longer than any realistic signed sentence; keeps requests cheap.
MAX_SIGNS = 20


class TranslationRequest(BaseModel):
    labels: List[str] = Field(..., min_length=1, max_length=MAX_SIGNS)


@router.get("/translations/signs")
def get_supported_signs():
    """Signs the sentence model knows, with the gloss each one maps to."""
    generator = get_sentence_generator()
    return {
        "signs": [
            {"label": label, "gloss": gloss} for label, gloss in LABEL_TO_GLOSS.items()
        ],
        "backend": generator.name,
    }


@router.post("/translations")
async def translate_signs(request: TranslationRequest):
    """Translate a sign sequence (detector labels) into an English sentence."""
    unknown = [label for label in request.labels if label not in LABEL_TO_GLOSS]
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown signs: {', '.join(unknown)}",
        )

    generator = get_sentence_generator()
    start = time.perf_counter()
    sentence = await run_in_threadpool(generator.generate, request.labels)
    latency_ms = (time.perf_counter() - start) * 1000

    return {
        "labels": request.labels,
        "gloss": labels_to_gloss(request.labels),
        "sentence": sentence,
        "backend": generator.name,
        "latency_ms": round(latency_ms, 1),
    }
