import React from "react";
import { motion } from "framer-motion";
import { FileText, HardDrive, Tag } from "lucide-react";

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

    const fileInfo = [
        { icon: <FileText className="w-4 h-4" />, label: "Name", value: file.name },
        { icon: <HardDrive className="w-4 h-4" />, label: "Size", value: convertFileSize(file.size) },
        { icon: <Tag className="w-4 h-4" />, label: "Type", value: file.type || "Unknown" }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100"
        >
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                File Information
            </h3>
            <div className="space-y-2">
                {fileInfo.map((info, index) => (
                    <motion.div
                        key={info.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3 text-sm"
                    >
                        <div className="text-gray-500">{info.icon}</div>
                        <span className="font-medium text-gray-600 min-w-12">{info.label}:</span>
                        <span className="text-gray-800 truncate flex-1" title={info.value}>
                            {info.value}
                        </span>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default FileInformation;
