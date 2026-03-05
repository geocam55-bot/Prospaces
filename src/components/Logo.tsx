import React from 'react';
import logoImage from 'figma:asset/a158adb6efa7a055465beaa862148922ef01169e.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-16 w-16',
  };

  return (
    <img 
      src={logoImage} 
      alt="ProSpaces CRM Logo" 
      className={`${sizeClasses[size]} ${className} object-contain`}
    />
  );
}
