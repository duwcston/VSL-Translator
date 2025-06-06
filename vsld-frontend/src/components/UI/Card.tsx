import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'solid' | 'glass' | 'gradient';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    border?: boolean;
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    hover?: boolean;
    onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
    children,
    className = '',
    variant = 'solid',
    padding = 'md',
    shadow = 'md',
    border = true,
    rounded = 'xl',
    hover = false,
    onClick
}) => {
    const baseClasses = 'transition-all duration-300';

    const variantClasses = {
        solid: 'bg-white',
        glass: 'bg-white/70 backdrop-blur-sm',
        gradient: 'bg-gradient-to-br from-white to-gray-50'
    };

    const paddingClasses = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6'
    };

    const shadowClasses = {
        none: '',
        sm: 'shadow-sm',
        md: 'shadow-md',
        lg: 'shadow-lg',
        xl: 'shadow-xl'
    };

    const roundedClasses = {
        none: '',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        full: 'rounded-full'
    };

    const borderClass = border ? 'border border-gray-200/50' : '';
    const hoverClass = hover ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer' : '';
    const clickableClass = onClick ? 'cursor-pointer' : '';

    const combinedClasses = [
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        shadowClasses[shadow],
        roundedClasses[rounded],
        borderClass,
        hoverClass,
        clickableClass,
        className
    ].filter(Boolean).join(' ');

    const CardComponent = onClick ? motion.div : 'div';
    const motionProps = onClick ? {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 }
    } : {};

    return (
        <CardComponent
            className={combinedClasses}
            onClick={onClick}
            {...motionProps}
        >
            {children}
        </CardComponent>
    );
};

export default Card;
