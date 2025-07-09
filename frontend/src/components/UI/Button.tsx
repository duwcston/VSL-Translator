import { motion } from "framer-motion";
import { ReactNode } from "react";

const Button = ({
    height,
    width,
    label,
    onClick,
    disabled = false,
    icon,
    variant = "primary"
}: {
    height: string;
    width: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    icon?: ReactNode;
    variant?: "primary" | "secondary" | "outline";
}) => {
    const getVariantClasses = () => {
        if (disabled) {
            return 'text-gray-400 bg-gray-200 border-gray-300 cursor-not-allowed';
        }

        switch (variant) {
            case "primary":
                return 'text-white bg-gradient-to-r from-blue-600 to-purple-600 border-transparent shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700';
            case "secondary":
                return 'text-blue-600 bg-white border-blue-200 shadow-md hover:shadow-lg hover:bg-blue-50';
            case "outline":
                return 'text-blue-600 bg-transparent border-blue-600 hover:bg-blue-600 hover:text-white';
            default:
                return 'text-white bg-gradient-to-r from-blue-600 to-purple-600 border-transparent shadow-lg hover:shadow-xl';
        }
    };

    return (
        <motion.button
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            className={`
                h-${height} ${width === 'auto' ? 'px-6' : `w-${width}`} 
                rounded-xl text-sm font-semibold border-2 
                flex items-center justify-center gap-2
                transition-all duration-200 ease-in-out
                ${getVariantClasses()}
            `}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
        >
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <span>{label}</span>
        </motion.button>
    )
}

export default Button;
