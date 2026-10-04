import Uploader from "../components/Upload/Uploader";

export default function UploadSection() {
  return (
    <div className="p-4">
      <div className="mb-4 text-center">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">
          Upload Your File
        </h2>
        <p className="text-slate-500">
          Upload an image or video containing sign language and let the model
          translate it for you
        </p>
      </div>
      <Uploader />
    </div>
  );
}
