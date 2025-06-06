import { motion } from "framer-motion";

interface ProgressBarProps {
    progress: number; // 0-100
    className?: string;
    showPercentage?: boolean;
    variant?: 'default' | 'success' | 'error' | 'gradient';
    size?: 'sm' | 'md' | 'lg';
    label?: string;
    subLabel?: string;
}

export default function ProgressBar({
    progress,
    className = '',
    showPercentage = true,
    variant = 'default',
    size = 'md',
    label = 'Progress',
    subLabel
}: ProgressBarProps) {
    const normalizedProgress = Math.max(0, Math.min(100, progress));

    const sizeClasses = {
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4'
    };

    const variantClasses = {
        default: 'bg-blue-500',
        success: 'bg-green-500',
        error: 'bg-red-500',
        gradient: 'bg-gradient-to-r from-blue-500 to-purple-600'
    };

    return (
        <div className={`w-full ${className}`}>
            {showPercentage && (
                <div className="flex justify-between items-center mb-3">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                        {subLabel && (
                            <span className="text-xs text-gray-500 mt-1">{subLabel}</span>
                        )}
                    </div>
                    <motion.span
                        key={normalizedProgress}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-sm font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded-full"
                    >
                        {normalizedProgress.toFixed(0)}%
                    </motion.span>
                </div>
            )}

            <div className={`w-full bg-gray-200 rounded-full overflow-hidden shadow-inner ${sizeClasses[size]}`}>
                <motion.div
                    className={`${sizeClasses[size]} ${variantClasses[variant]} transition-all duration-500 ease-out rounded-full shadow-sm`}
                    initial={{ width: 0 }}
                    animate={{ width: `${normalizedProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    role="progressbar"
                    aria-valuenow={normalizedProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>        </div>
    );
}