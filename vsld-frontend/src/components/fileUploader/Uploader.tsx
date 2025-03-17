import React from "react"
import Button from "../UI/Button";
import { EUploadStatus } from "../../types/FileIntermediate";
import axios from "axios";

const ALLOWED_FILE_TYPES = ['video/quicktime', 'video/mp4']

export function Uploader() {
    const [file, setFile] = React.useState<File | null>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    const [status, setStatus] = React.useState<EUploadStatus>(EUploadStatus.Idle)
    const [uploadProgress, setUploadProgress] = React.useState(0)
    const inputRef = React.useRef<HTMLInputElement>(null)

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
        setUploadProgress(0)
    }

    function convertSizeToMb(size: number) {
        return (size / 1024 / 1024).toFixed(0)
    }

    async function handleFileUpload() {
        if (!file) {
            setStatus(EUploadStatus.Error)
            return
        }
        if (status === EUploadStatus.Uploading) return
        setStatus(EUploadStatus.Uploading)
        setUploadProgress(0)

        const formData = new FormData()
        formData.append('file', file)

        try {
            // Change the URL to the correct endpoint
            await axios.post("https://httpbin.org/post", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const progress = progressEvent.total
                        ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
                        : 0
                    setUploadProgress(progress)
                }
            })
            setStatus(EUploadStatus.Success)
            setUploadProgress(100)
        } catch (error) {
            console.error(error)
            setStatus(EUploadStatus.Error)
            setUploadProgress(0)
        }
    }

    return (
        <div className="w-full h-full flex flex-col items-center gap-4 overflow-auto">
            <div
                className={`h-[300px] w-[600px] border-dashed border-2 rounded-md ${isDragging ? `border-blue-600` : `border-black`}`}
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
                                accept=".mp4, .mov"
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
                    <p>File size: {convertSizeToMb(file.size)} MB</p>
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
    );
}
