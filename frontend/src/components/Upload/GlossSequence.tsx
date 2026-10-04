import { ListOrdered } from "lucide-react";
import { GlossSegment } from "../../types/DetectionResponse";

interface GlossSequenceProps {
  glosses: GlossSegment[];
  currentTime: number;
  onSeek: (time: number) => void;
}

// The video's signs in order. The sign under the playhead is highlighted and
// clicking one jumps the video to it.
function GlossSequence({ glosses, currentTime, onSeek }: GlossSequenceProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <ListOrdered className="h-4 w-4 text-slate-400" />
        Sign Sequence
      </div>

      {glosses.length > 0 ? (
        <>
          <ol className="flex flex-wrap gap-2">
            {glosses.map((gloss, index) => {
              const active =
                currentTime >= gloss.start && currentTime < gloss.end;
              return (
                <li key={`${gloss.label}-${gloss.start}`}>
                  <button
                    type="button"
                    onClick={() => onSeek(gloss.start)}
                    title={`${gloss.start.toFixed(1)}s – ${gloss.end.toFixed(1)}s · ${(gloss.confidence * 100).toFixed(0)}% confidence`}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <span
                      className={`text-xs tabular-nums ${active ? "text-blue-100" : "text-slate-400"}`}
                    >
                      {index + 1}
                    </span>
                    {gloss.label}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-600">
            {glosses.map((gloss) => gloss.label.toUpperCase()).join(" ")}
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-500">
          No signs were held long enough to form a sequence.
        </p>
      )}
    </div>
  );
}

export default GlossSequence;
