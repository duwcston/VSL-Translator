import { ReactNode } from "react";

const variantClasses = {
  primary: "border-transparent bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  outline: "border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50",
};

const Button = ({
  label,
  onClick,
  disabled = false,
  icon,
  variant = "primary",
  fullWidth = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "outline";
  fullWidth?: boolean;
}) => {
  return (
    <button
      type="button"
      className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:translate-y-px disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
        fullWidth ? "w-full" : "px-5"
      } ${variantClasses[variant]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

export default Button;
