import { Moon, Sun } from 'lucide-react';
import { ThemeMode } from '../types';
import { cn } from '../utils/cn';

interface ThemeToggleProps {
  theme: ThemeMode;
  onChange: (t: ThemeMode) => void;
}

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return (
    <button
      onClick={() => onChange(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        "p-2 rounded-xl border transition-all",
        "bg-surf2 border-border hover:border-gold/30 text-text-dim hover:text-gold"
      )}
      title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
