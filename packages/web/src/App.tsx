import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { useCatalogData } from './hooks/useCatalogData';
import { useExplorerStore } from './store/explorer';
import { ComponentList } from './components/ComponentList';
import { PreviewPane } from './components/PreviewPane';
import { PropsPanel } from './components/PropsPanel';
import { ThemeToggle } from './components/ThemeToggle';

function LogoMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="#0F172A" />
      <path
        d="M 22 16 L 8 32 L 22 48"
        fill="none"
        stroke="#38BDF8"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 42 16 L 56 32 L 42 48"
        fill="none"
        stroke="#38BDF8"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="27,24 39,32 27,40"
        fill="#F43F5E"
        stroke="#F43F5E"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function App() {
  useCatalogData();
  const catalog = useExplorerStore((s) => s.catalog);
  const scanning = useExplorerStore((s) => s.scanning);
  const theme = useExplorerStore((s) => s.theme);
  const query = useExplorerStore((s) => s.query);
  const setQuery = useExplorerStore((s) => s.setQuery);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const filtered = useMemo(() => {
    const components = catalog?.components ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return components;
    return components.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.relativePath.toLowerCase().includes(q),
    );
  }, [catalog, query]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <div className="app-logo">
            <LogoMark />
          </div>
          <div>
            <div className="app-title">PropLab</div>
            <div className="app-subtitle">{catalog?.config.name ?? 'Component lab'}</div>
          </div>
        </div>

        <div className="app-search">
          <Search className="app-search-icon" size={15} strokeWidth={2.25} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components…"
            aria-label="Search components"
          />
        </div>

        <div className="app-actions">
          <AnimatePresence>
            {scanning && (
              <motion.span
                className="scan-pulse"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
              >
                Scanning
              </motion.span>
            )}
          </AnimatePresence>
          {catalog && (
            <span className="app-badge">
              <strong>{catalog.stats.totalComponents}</strong> components
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      <div className="app-workspace">
        <ComponentList components={filtered} />
        <PreviewPane />
        <PropsPanel />
      </div>
    </div>
  );
}
