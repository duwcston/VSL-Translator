import React from "react"
import Button from "../UI/Button";
import { EUploadStatus } from "../../types/FileIntermediate";
import useImagesApi from "../../api/imagesApi";
import { DetectionResponse } from "../../api/model/DetectionResponse";

const ALLOWED_FILE_TYPES = ['video/quicktime', 'video/mp4', 'image/jpeg', 'image/png']

export function Uploader() {
    const [file, setFile] = React.useState<File | null>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    const [status, setStatus] = React.useState<EUploadStatus>(EUploadStatus.Idle)
    const [uploadProgress, setUploadProgress] = React.useState(0)
    const [results, setResults] = React.useState<Record<string, DetectionResponse>>({})
    const [resultImagesURL, setResultImagesURL] = React.useState<string | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const url = import.meta.env.VITE_BACKEND_URL

    const imageApi = useImagesApi()

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (event.target.files) {
            const acceptedFiles = Array.from(event.target.files).filter((file) => ALLOWED_FILE_TYPES.includes(file.type))
            setStatus(EUploadStatus.Idle)
            setFile(acceptedFiles[0])
        }
    }

    const onDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setIsDragging(true)
        event.dataTransfer.dropEffect = 'copy'
    }

    const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
    }

    const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragging(false)
    }

    const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDragging(false)
        if (event.dataTransfer.files.length) {
            const acceptedFiles = Array.from(event.dataTransfer.files).filter((file) => ALLOWED_FILE_TYPES.includes(file.type))
            setFile(acceptedFiles[0])
        }
    }

    const onClick = () => {
        if (!inputRef.current) return
        inputRef.current.click()
    }

    function handleClear() {
        setFile(null)
        setStatus(EUploadStatus.Idle)
        setResults({})
        setResultImagesURL(null)
        // setUploadProgress(0)
    }

    function convertFileSize(size: number) {
        return (size / 1024 / 1024).toFixed(1) + ' MB'
    }

    async function handleFileUpload() {
        if (!file) {
            setStatus(EUploadStatus.Error)
            return
        }
        setStatus(EUploadStatus.Uploading)
        // setUploadProgress(0)
        try {
            const res = await imageApi.uploadImage(file)
            //           onUploadProgress: (progressEvent) => {
            //                 const progress = progressEvent.total
            //                     ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
            //                     : 0
            //                 setUploadProgress(progress)
            //             }
            setResults({ ...results, [file.name]: { ...res } })
            // results[file.name] = res
            // console.log(results)
            // console.log(res)
            setStatus(EUploadStatus.Success)
            setResultImagesURL(`${url}/yolo/get_predict`)
            setUploadProgress(100)
        } catch (err) {
            setStatus(EUploadStatus.Error)
            // setUploadProgress(0)
            console.error(err)
        }
    }

    return (
        <div className="p-4 grid grid-cols-2 gap-4">
            <div className="bg-gray-100 p-10 items-center gap-2 flex flex-col rounded-md">
                <div className="w-full h-full flex flex-col items-center gap-4 overflow-auto">
                    <div
                        className={`
                            lg:h-[300px] lg:w-[500px] 
                            md:h-[300px] md:w-[300px]
                            border-dashed border-2 rounded-md ${isDragging ? `border-blue-600` : `border-black`}`}
                    >
                        <div
                            className="h-full w-full flex justify-center items-center hover:cursor-pointer"
                            onDragEnter={onDragEnter}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={onClick}
                        >
                            {isDragging ? (
                                <div>Drop file here</div>
                            ) : (
                                <div className="flex gap-1">
                                    <span>Drop your file here or</span>
                                    <span className="hover:underline hover:cursor-pointer font-semibold text-[#0074EF]">
                                        Choose
                                    </span>
                                    <input
                                        ref={inputRef}
                                        className="hidden"
                                        type="file"
                                        accept=".mp4, .mov, .jpeg, .png"
                                        multiple
                                        onChange={(event) => handleFileChange(event)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    {file && (
                        <div className="text-sm">
                            <p>File name: {file.name}</p>
                            <p>File size: {convertFileSize(file.size)}</p>
                            <p>File.type: {file.type}</p>
                        </div>
                    )}

                    {status === EUploadStatus.Uploading && (
                        <div className="space-y-2">
                            <div className="w-full h-2.5 bg-gray-200 rounded-full">
                                <div className="h-2.5 bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}>
                                </div>
                            </div>
                            <p className="text-sm">{uploadProgress}%</p>
                        </div>
                    )}
                    {status === EUploadStatus.Success && <p className="text-sm text-green-500">File uploaded successfully</p>}
                    {status === EUploadStatus.Error && <p className="text-sm text-red-500">Error uploading file</p>}
                    <Button width="full" height="auto" label="Upload" onClick={handleFileUpload}></Button>
                    <Button width="full" height="auto" label="Clear" onClick={handleClear}></Button>
                </div>
            </div>

            {/* OUTPUT VIDEOS WITH PREDICTION LABELS AT THE BOTTOM */}
            <div className="bg-gray-100 p-10 gap-2 flex flex-col rounded-md">
                <div className="w-full h-full flex flex-col items-center gap-4 overflow-auto">
                    <div className="bg-gray-200 rounded-md h-full w-full flex items-center justify-center">
                        {status === EUploadStatus.Idle ? (
                            <span className="flex items-center justify-center">📷</span>
                        ) : status === EUploadStatus.Uploading ? (
                            <div className="flex items-center justify-center">
                                <div className="size-10 animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"></div>
                            </div>
                        ) : status === EUploadStatus.Success && resultImagesURL ? (
                            <img
                                src={resultImagesURL}
                                className="max-h-full max-w-full object-contain"
                            />
                        ) : null}
                    </div>
                    <div className="w-full border py-2 px-2 rounded bg-white">
                        {Object.keys(results).length > 0 ? (
                            <span>
                                <div>
                                    {Object.entries(results).map(([key, value]) => (
                                        <div key={key}>
                                            <div>
                                                {Array.isArray(value.detections) ? (
                                                    value.detections.map((detection) => (
                                                        <div key={detection.class_name}>
                                                            <p>{detection.class_name}: {(detection.confidence).toFixed(2)}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div>
                                                        <p>{value.detections.class_name}: {(value.detections.confidence).toFixed(2)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </span>
                        ) : (
                            <h5 className="text-gray-400">No predictions available</h5>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
