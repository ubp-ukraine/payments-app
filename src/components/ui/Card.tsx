import { ReactNode } from 'react';

interface CardBlockProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardBlockProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardBlockProps) {
  return <div className={`px-5 py-4 border-b border-gray-100 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = '' }: CardBlockProps) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}
