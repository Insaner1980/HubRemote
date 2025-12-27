import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center font-medium transition-colors
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
    focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
    disabled:opacity-50 disabled:cursor-not-allowed
  `

  const variantStyles = {
    primary: 'bg-accent-primary text-white hover:bg-accent-hover',
    secondary: 'bg-bg-secondary text-text-primary border border-border hover:bg-bg-hover',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover',
    icon: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover',
  }

  const sizeStyles = {
    sm: variant === 'icon' ? 'p-1.5 rounded' : 'px-3 py-1.5 text-sm rounded',
    md: variant === 'icon' ? 'p-2 rounded-md' : 'px-4 py-2 rounded-md',
    lg: variant === 'icon' ? 'p-3 rounded-lg' : 'px-6 py-3 text-lg rounded-lg',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
