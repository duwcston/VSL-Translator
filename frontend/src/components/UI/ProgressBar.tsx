interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
}

export default function ProgressBar({
  progress,
  className = "",
}: ProgressBarProps) {
  const normalizedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={normalizedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* scaleX instead of width keeps the animation off the layout path */}
        <div
          className="h-full origin-left rounded-full bg-blue-600 transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${normalizedProgress / 100})` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-semibold tabular-nums text-slate-700">
        {normalizedProgress.toFixed(0)}%
      </span>
    </div>
  );
}
