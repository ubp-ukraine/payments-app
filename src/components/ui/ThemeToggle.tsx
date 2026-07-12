import { Moon, Sun } from 'lucide-react';
import { useTheme } from './useTheme';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      aria-label={isDark ? 'Світла тема' : 'Темна тема'}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
