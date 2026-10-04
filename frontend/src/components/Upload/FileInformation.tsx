import { FileText, HardDrive, Tag } from "lucide-react";

interface FileInformationProps {
  file: File;
}

function FileInformation({ file }: FileInformationProps) {
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
    { icon: <FileText className="h-4 w-4" />, label: "Name", value: file.name },
    {
      icon: <HardDrive className="h-4 w-4" />,
      label: "Size",
      value: convertFileSize(file.size),
    },
    {
      icon: <Tag className="h-4 w-4" />,
      label: "Type",
      value: file.type || "Unknown",
    },
  ];

  return (
    <div className="animate-fade-in rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 font-semibold text-slate-800">File Information</h3>
      <div className="space-y-2">
        {fileInfo.map((info) => (
          <div key={info.label} className="flex items-center gap-3 text-sm">
            <div className="text-slate-400">{info.icon}</div>
            <span className="min-w-12 font-medium text-slate-500">
              {info.label}:
            </span>
            <span className="flex-1 truncate text-slate-800" title={info.value}>
              {info.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FileInformation;
