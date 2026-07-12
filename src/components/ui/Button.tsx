import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
  secondary: 'bg-stone-100 text-stone-700 hover:bg-stone-200',
  outline: 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm',
  ghost: 'text-stone-600 hover:bg-stone-100',
};

const SIZES: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const BASE =
  'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-4 focus:ring-brand-600/20';

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
