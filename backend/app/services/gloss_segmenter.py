"""Turn per-frame video detections into an ordered sequence of signs (glosses).

A sign held for one second shows up in ~30 consecutive frames, usually with a
few flickers (missed frames or a brief wrong label). This module collapses
those frames into one segment per sign so a language model can later build a
sentence from e.g. ["YOUR", "NAME", "WHAT"].
"""

from dataclasses import dataclass
from typing import Dict, List, Optional

from app.config.config import GLOSS_MAX_GAP_SECONDS, GLOSS_MIN_DURATION_SECONDS


@dataclass
class _Run:
    label: Optional[str]
    start: int  # first frame index (inclusive)
    end: int  # last frame index (inclusive)
    confidences: List[float]

    @property
    def length(self) -> int:
        return self.end - self.start + 1


def _top_detection(frame: Dict):
    detections = frame.get("detections") or []
    if not detections:
        return None, 0.0
    best = max(detections, key=lambda d: d["confidence"])
    return best["class_name"], best["confidence"]


def _build_runs(frame_detections: List[Dict]) -> List[_Run]:
    """Group consecutive frames with the same top label (None = no sign)."""
    runs: List[_Run] = []
    for index, frame in enumerate(frame_detections):
        label, confidence = _top_detection(frame)
        if runs and runs[-1].label == label:
            runs[-1].end = index
            if label is not None:
                runs[-1].confidences.append(confidence)
        else:
            confidences = [confidence] if label is not None else []
            runs.append(_Run(label, index, index, confidences))
    return runs


def _merge_adjacent(runs: List[_Run]) -> List[_Run]:
    merged: List[_Run] = []
    for run in runs:
        if merged and merged[-1].label == run.label:
            merged[-1].end = run.end
            merged[-1].confidences.extend(run.confidences)
        else:
            merged.append(run)
    return merged


def segment_glosses(
    frame_detections: List[Dict],
    fps: float,
    min_duration: float = GLOSS_MIN_DURATION_SECONDS,
    max_gap: float = GLOSS_MAX_GAP_SECONDS,
) -> List[Dict]:
    """Collapse per-frame detections into sign segments.

    1. Runs of a label shorter than `min_duration` are treated as noise.
    2. Two runs of the same label separated by at most `max_gap` seconds of
       no sign (including removed noise) are one sign held through a flicker.
    3. The same label separated by a longer gap stays two separate signs, so
       repeats like "YOU HELP YOU" are preserved in order.

    Returns segments ordered by time:
        {"label", "start", "end", "confidence", "frames"}
    where start/end are seconds and confidence is the mean over the segment.
    """
    if not frame_detections:
        return []

    fps = fps or 30
    min_frames = max(1, round(min_duration * fps))
    max_gap_frames = round(max_gap * fps)

    runs = _build_runs(frame_detections)

    # Bridge short gaps first, so a sign interrupted by a few missed frames
    # still counts as one long run in the duration check below.
    def bridge(runs: List[_Run]) -> List[_Run]:
        result: List[_Run] = []
        i = 0
        while i < len(runs):
            run = runs[i]
            if (
                run.label is None
                and result
                and i + 1 < len(runs)
                and run.length <= max_gap_frames
                and result[-1].label is not None
                and result[-1].label == runs[i + 1].label
            ):
                nxt = runs[i + 1]
                result[-1].end = nxt.end
                result[-1].confidences.extend(nxt.confidences)
                i += 2
                continue
            result.append(run)
            i += 1
        return _merge_adjacent(result)

    runs = bridge(runs)

    # Short runs are flickers/misdetections: turn them into "no sign"...
    for run in runs:
        if run.label is not None and run.length < min_frames:
            run.label = None
            run.confidences = []

    # ...which may reveal more same-label runs separated only by a short gap.
    runs = bridge(_merge_adjacent(runs))

    return [
        {
            "label": run.label,
            "start": run.start / fps,
            "end": (run.end + 1) / fps,
            "confidence": sum(run.confidences) / len(run.confidences),
            "frames": run.length,
        }
        for run in runs
        if run.label is not None and run.confidences
    ]
