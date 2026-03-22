interface PerformanceSettingsProps {
  returnImage: boolean;
  setReturnImage: (value: boolean) => void;
  isStreaming: boolean;
}

function PerformanceSettings({
  returnImage,
  setReturnImage,
  isStreaming,
}: PerformanceSettingsProps) {
  return (
    <>
      <div className="flex items-center gap-2 mt-2">
        <input
          id="returnImage"
          type="checkbox"
          checked={returnImage}
          onChange={() => setReturnImage(!returnImage)}
          disabled={isStreaming}
        />
        <label
          htmlFor="returnImage"
          title="Show processed frames with detection boxes. Disabling this improves performance significantly."
        >
          Show processed frames
        </label>
      </div>
    </>
  );
}

export default PerformanceSettings;
