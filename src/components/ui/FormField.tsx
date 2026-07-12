import {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  htmlFor?: string;
  error?: string;
  pending?: boolean;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function FormField({
  label,
  required,
  htmlFor,
  error,
  pending,
  hint,
  action,
  children,
}: FormFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label htmlFor={htmlFor} className="text-sm font-medium text-stone-700">
          {label}
          {required && <span className="text-rose-600 ml-0.5">*</span>}
        </label>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
      {error ? (
        <p className="text-xs mt-1 text-rose-600">{error}</p>
      ) : pending ? (
        <p className="text-xs mt-1 text-amber-600">Заповніть це поле</p>
      ) : hint ? (
        <p className="text-xs mt-1 text-stone-500">{hint}</p>
      ) : null}
    </div>
  );
}

const INPUT_BASE =
  'w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg transition-colors focus:outline-none focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5 disabled:bg-stone-50 disabled:text-stone-500';

function stateClass(hasError?: boolean, isPending?: boolean) {
  if (hasError) return 'border-rose-300 bg-rose-50/40';
  if (isPending) return 'border-amber-300 bg-amber-50/40';
  return '';
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  isPending?: boolean;
}

export function TextInput({
  hasError,
  isPending,
  className = '',
  ...rest
}: TextInputProps) {
  return (
    <input
      className={`${INPUT_BASE} ${stateClass(hasError, isPending)} ${className}`}
      {...rest}
    />
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
  isPending?: boolean;
}

export function TextArea({
  hasError,
  isPending,
  className = '',
  ...rest
}: TextAreaProps) {
  return (
    <textarea
      className={`${INPUT_BASE} ${stateClass(hasError, isPending)} ${className}`}
      {...rest}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  isPending?: boolean;
  children: ReactNode;
}

export function Select({
  hasError,
  isPending,
  className = '',
  children,
  ...rest
}: SelectProps) {
  return (
    <select
      className={`${INPUT_BASE} ${stateClass(hasError, isPending)} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}
