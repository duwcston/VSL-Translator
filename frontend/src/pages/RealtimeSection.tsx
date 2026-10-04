import Realtime from "../components/Realtime/Realtime";

function RealtimeSection() {
  return (
    <div className="p-4">
      <div className="mb-4 text-center">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">
          Real-time Detection
        </h2>
        <p className="text-slate-500">
          Use your camera for live sign language detection
        </p>
      </div>
      <Realtime />
    </div>
  );
}

export default RealtimeSection;
