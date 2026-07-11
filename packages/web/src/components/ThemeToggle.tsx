import { Moon, Sun } from 'lucide-react';
import { useExplorerStore } from '../store/explorer';

export function ThemeToggle() {
  const theme = useExplorerStore((s) => s.theme);
  const setTheme = useExplorerStore((s) => s.setTheme);

  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      <button
        type="button"
        className={`theme-toggle-btn${theme === 'light' ? ' active' : ''}`}
        aria-label="Light mode"
        aria-pressed={theme === 'light'}
        onClick={() => setTheme('light')}
      >
        <Sun size={15} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className={`theme-toggle-btn${theme === 'dark' ? ' active' : ''}`}
        aria-label="Dark mode"
        aria-pressed={theme === 'dark'}
        onClick={() => setTheme('dark')}
      >
        <Moon size={15} strokeWidth={2.25} />
      </button>
    </div>
  );
}
