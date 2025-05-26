import React from "react";

interface FileInformationProps {
    file: File;
}

const FileInformation: React.FC<FileInformationProps> = ({ file }) => {
    const convertFileSize = (size: number) => {
        if (size < 1024) {
            return `${size} B`;
        } else if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(2)} KB`;
        } else {
            return `${(size / (1024 * 1024)).toFixed(2)} MB`;
        }
    };

    return (
        <div className="mt-4 p-2 bg-gray-50 rounded">
            <h3 className="font-bold text-sm mb-1">File Information</h3>
            <p className="text-sm">File name: {file.name}</p>
            <p className="text-sm">File size: {convertFileSize(file.size)}</p>
            <p className="text-sm">File type: {file.type}</p>
        </div>
    );
};

export default FileInformation;
