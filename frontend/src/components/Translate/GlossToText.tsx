import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Delete,
  Hand,
  ListOrdered,
  Loader2,
  MessageSquare,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import Button from "../UI/Button";
import Card from "../UI/Card";
import useTranslationApi from "../../api/translationApi";
import { SupportedSign, TranslationResponse } from "../../types/Translation";

// Sequences from training/data/test.jsonl, so the demo shows held-out inputs.
const EXAMPLES: string[][] = [
  ["Hello", "How", "You"],
  ["Your", "Doctor", "Where"],
  ["I", "Thirsty"],
  ["How", "Call", "Doctor"],
  ["No", "I", "Deaf"],
  ["You", "Eat", "What"],
  ["Thank you"],
];

const MAX_SIGNS = 20;

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "detail" in error) {
    const detail = (error as { detail: unknown }).detail;
    return typeof detail === "string" ? detail : "Invalid sign sequence";
  }
  return "Could not reach the backend. Is it running?";
}

// Build a sign sequence by hand and run it through the gloss-to-text model,
// without needing a video. This is the last step of the video pipeline.
function GlossToText() {
  const { getSupportedSigns, translate } = useTranslationApi();
  const [signs, setSigns] = useState<SupportedSign[]>([]);
  const [modelAvailable, setModelAvailable] = useState(true);
  const [sequence, setSequence] = useState<string[]>([]);
  const [result, setResult] = useState<TranslationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupportedSigns()
      .then((response) => {
        setSigns(response.signs);
        setModelAvailable(response.backend !== "none");
      })
      .catch((e) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glossOf = (label: string) =>
    signs.find((sign) => sign.label === label)?.gloss ?? label.toUpperCase();

  const updateSequence = (next: string[]) => {
    setSequence(next);
    setResult(null);
    setError(null);
  };

  const runTranslation = async (labels: string[]) => {
    if (labels.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await translate(labels));
    } catch (e) {
      setResult(null);
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const runExample = (labels: string[]) => {
    updateSequence(labels);
    runTranslation(labels);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Sign palette */}
      <Card className="space-y-5 lg:col-span-3">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Hand className="h-4 w-4 text-slate-400" />
            Supported Signs
            <span className="font-normal text-slate-400">
              · click to add to the sequence
            </span>
          </div>
          {signs.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {signs.map((sign) => (
                <button
                  key={sign.label}
                  type="button"
                  disabled={sequence.length >= MAX_SIGNS || loading}
                  onClick={() => updateSequence([...sequence, sign.label])}
                  className="flex flex-col items-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors duration-150 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {sign.label}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {sign.gloss}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            !error && (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading signs...
              </p>
            )
          )}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Sparkles className="h-4 w-4 text-slate-400" />
            Try an Example
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example.join("-")}
                type="button"
                disabled={loading || signs.length === 0 || !modelAvailable}
                onClick={() => runExample(example)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-600 transition-colors duration-150 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {example.map(glossOf).join(" ")}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Sequence and translation */}
      <div className="space-y-4 lg:col-span-2">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ListOrdered className="h-4 w-4 text-slate-400" />
              Sign Sequence
            </div>
            <span className="text-xs text-slate-400 tabular-nums">
              {sequence.length}/{MAX_SIGNS}
            </span>
          </div>

          <div className="min-h-[44px]">
            {sequence.length > 0 ? (
              <ol className="flex flex-wrap gap-2">
                {sequence.map((label, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      title="Remove"
                      disabled={loading}
                      onClick={() =>
                        updateSequence(sequence.filter((_, i) => i !== index))
                      }
                      className="group flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-900 transition-colors duration-150 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    >
                      <span className="text-xs text-blue-400 tabular-nums group-hover:text-red-400">
                        {index + 1}
                      </span>
                      {label}
                      <X className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-2 text-sm text-slate-500">
                Add signs from the list, or pick an example.
              </p>
            )}
          </div>

          {sequence.length > 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-600">
              {sequence.map(glossOf).join(" ")}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              label="Undo"
              variant="secondary"
              fullWidth
              icon={<Delete className="h-4 w-4" />}
              disabled={sequence.length === 0 || loading}
              onClick={() => updateSequence(sequence.slice(0, -1))}
            />
            <Button
              label="Clear"
              variant="secondary"
              fullWidth
              icon={<X className="h-4 w-4" />}
              disabled={sequence.length === 0 || loading}
              onClick={() => updateSequence([])}
            />
          </div>
          <Button
            label={loading ? "Translating..." : "Translate"}
            fullWidth
            icon={
              loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )
            }
            disabled={sequence.length === 0 || loading || !modelAvailable}
            onClick={() => runTranslation(sequence)}
          />
        </Card>

        {!modelAvailable && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            No sentence model is loaded on the backend. See training/README.md
            to train one into backend/models/gloss2text.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="animate-fade-in rounded-xl border border-blue-100 bg-blue-50 p-5">
            <div className="mb-1 flex items-center justify-between text-sm font-semibold text-blue-900">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Translation
              </span>
              <span className="flex items-center gap-1 text-xs font-normal text-blue-700 tabular-nums">
                <Timer className="h-3.5 w-3.5" />
                {result.latency_ms.toFixed(0)} ms
              </span>
            </div>
            <p className="text-xl leading-relaxed font-medium text-slate-900">
              {result.sentence ?? "—"}
            </p>
            <p className="mt-2 font-mono text-xs text-blue-700/70">
              {result.gloss}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GlossToText;
