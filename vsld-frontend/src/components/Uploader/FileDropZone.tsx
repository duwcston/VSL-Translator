import React from "react";

interface FileDropZoneProps {
    isDragging: boolean;
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    onClick: () => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
    isDragging,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    onClick,
    onFileChange,
    inputRef
}) => {
    return (
        <div
            className={`
                h-85 w-full flex justify-center items-center hover:cursor-pointer
                border-dashed border-2 rounded-md ${isDragging ? `border-blue-600` : `border-gray-400`}`}
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
                    <div className="text-blue-600 font-medium">Drop file here</div>
                ) : (
                    <div className="flex gap-1 items-center">
                        <span>Drop your file here or</span>
                        <span className="hover:underline hover:cursor-pointer font-semibold text-[#0074EF]">
                            Choose
                        </span>
                        <input
                            ref={inputRef}
                            className="hidden"
                            type="file"
                            accept=".mp4, .mov, .jpeg, .png, .jpg"
                            multiple
                            onChange={onFileChange}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileDropZone;
