import { Uploader } from "./fileUploader/Uploader";
import { Result } from "./UI/Result";

export function UploadSection() {
    return (
        <div className="p-4 grid grid-cols-2 gap-4">
            <div className="bg-gray-100 p-10 items-center gap-2 flex flex-col rounded-md">
                <Uploader />
            </div>
            <div className="bg-gray-100 p-10 gap-2 flex flex-col rounded-md">
                <Result />
            </div>
        </div>
    )
}