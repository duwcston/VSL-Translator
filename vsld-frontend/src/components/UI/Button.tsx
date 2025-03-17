const Button = ({ height, width, label, onClick }: { height: string; width: string; label: string; onClick: () => void }) => {
    return (
        <button
            className={`h-${height} w-${width} rounded-md text-base font-medium p-2 border-2 border-[#004C9D] hover:cursor-pointer ${label !== 'Clear' ? 'text-[#FFFFFF] bg-[#004C9D]' : 'text-[#004C9D] bg-[#FFFFFF]'}`}
            onClick={onClick}
        >
            {label}
        </button>
    )
}

export default Button;
