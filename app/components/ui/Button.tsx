import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
  frontIcon?: React.ReactNode;
  backIcon?: React.ReactNode;
}

export const Button = ({
  className,
  children,
  frontIcon,
  backIcon,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={`group relative bg-backgroundSecondary overflow-hidden rounded-full border-1 border-primary px-6 py-3 sm:px-4 sm:py-2 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] active:scale-95 active:brightness-90 cursor-pointer z-0 ${className}`}
      {...props}
    >
      <span className="absolute inset-0 top-[100%] left-1/2 -z-10 h-0 w-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary transition-all duration-500 ease-[cubic-bezier(0.83,0,0.17,1)] content-[''] group-hover:h-[300%] group-hover:w-[300%]" />
      <span className="relative z-10 flex items-center gap-2 text-textPrimary transition-colors duration-700 ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:text-btnHoverText">
        {frontIcon && <span>{frontIcon}</span>}
        {children}
        {backIcon && <span>{backIcon}</span>}
      </span>
    </button>
  );
};
