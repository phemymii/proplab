import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ComponentInfo } from '@proplab/core';
import { useExplorerStore } from '../store/explorer';

function groupByFolder(components: ComponentInfo[]): [string, ComponentInfo[]][] {
  const map = new Map<string, ComponentInfo[]>();
  for (const c of components) {
    const slash = c.relativePath.lastIndexOf('/');
    const dir = slash >= 0 ? c.relativePath.slice(0, slash) : '.';
    if (!map.has(dir)) map.set(dir, []);
    map.get(dir)!.push(c);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function ComponentList({ components }: { components: ComponentInfo[] }) {
  const selectedId = useExplorerStore((s) => s.selectedId);
  const selectComponent = useExplorerStore((s) => s.selectComponent);
  const groups = useMemo(() => groupByFolder(components), [components]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Components</span>
        <span className="sidebar-count">{components.length}</span>
      </div>

      {components.length === 0 ? (
        <div className="sidebar-empty">
          No components match your search. Try a different name or path.
        </div>
      ) : (
        groups.map(([dir, items]) => (
          <div key={dir} className="sidebar-group">
            <div className="sidebar-group-label" title={dir}>
              {dir === '.' ? 'root' : dir}
            </div>
            <ul className="sidebar-list">
              {items.map((comp, index) => {
                const active = comp.id === selectedId;
                return (
                  <motion.li
                    key={comp.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.015, 0.25) }}
                  >
                    <button
                      type="button"
                      className={`sidebar-item-btn${active ? ' active' : ''}`}
                      onClick={() => selectComponent(comp.id)}
                    >
                      <div className="sidebar-item-name">{comp.name}</div>
                      <div className="sidebar-item-path">{comp.relativePath}</div>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </aside>
  );
}
