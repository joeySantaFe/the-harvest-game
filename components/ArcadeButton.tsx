import React from 'react';

interface ArcadeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'alert';
  children: React.ReactNode;
}

export const ArcadeButton: React.FC<ArcadeButtonProps> = ({ 
  variant = 'primary', 
  children, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 font-bold text-xl transition-all duration-200 uppercase min-w-[150px] text-center border-2 backdrop-blur-sm tracking-wider font-mono";
  
  const variants = {
    primary: "border-[#0f0] text-[#0f0] bg-black/90 hover:bg-[#0f0] hover:text-black shadow-[0_0_10px_rgba(0,255,0,0.2)] hover:shadow-[0_0_25px_rgba(0,255,0,0.6)] hover:scale-105",
    secondary: "border-[#888] text-[#888] bg-black/90 hover:bg-[#888] hover:text-black shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]",
    alert: "border-[#f04] text-[#f04] bg-black/90 hover:bg-[#f04] hover:text-black shadow-[0_0_10px_rgba(255,0,68,0.2)] hover:shadow-[0_0_25px_rgba(255,0,68,0.6)] hover:scale-105"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
