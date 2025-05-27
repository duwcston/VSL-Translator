const Button = ({
    height,
    width,
    label,
    onClick,
    disabled = false
}: {
    height: string;
    width: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
}) => {
    return (
        <button
            className={`h-${height} w-${width} rounded-md text-base font-medium p-2 border-2 border-[#004C9D] ${disabled
                    ? 'text-gray-400 bg-gray-200 border-gray-300 cursor-not-allowed'
                    : `hover:cursor-pointer ${label !== 'Clear' ? 'text-[#FFFFFF] bg-[#004C9D]' : 'text-[#004C9D] bg-[#FFFFFF]'}`
                }`}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
        >
            {label}
        </button>
    )
}

export default Button;
