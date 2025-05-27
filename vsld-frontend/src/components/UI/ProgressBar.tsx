interface ProgressBarProps {
    progress: number; // 0-100
    className?: string;
    showPercentage?: boolean;
    variant?: 'default' | 'success' | 'error';
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
        error: 'bg-red-500'
    };

    return (<div className={`w-full ${className}`}>
        {showPercentage && (
            <div className="flex justify-between items-center mb-2">
                <div className="flex flex-col">
                    <span className="text-sm text-gray-600">{label}</span>
                    {subLabel && (
                        <span className="text-xs text-gray-500">{subLabel}</span>
                    )}
                </div>
                <span className="text-sm font-medium text-gray-900">
                    {normalizedProgress.toFixed(0)}%
                </span>
            </div>
        )}

        <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
            <div
                className={`${sizeClasses[size]} ${variantClasses[variant]} transition-all duration-300 ease-out rounded-full`}
                style={{ width: `${normalizedProgress}%` }}
                role="progressbar"
                aria-valuenow={normalizedProgress}
                aria-valuemin={0}
                aria-valuemax={100}
            />
        </div>
    </div>
    );
}