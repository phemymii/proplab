import type { ComponentInfo, LabCatalog } from '@proplab/core';
import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ExplorerState {
  catalog: LabCatalog | null;
  scanning: boolean;
  selectedId: string | null;
  propsDraft: Record<string, unknown>;
  variantId: string;
  query: string;
  theme: Theme;
  previewKey: number;
  setCatalog: (catalog: LabCatalog) => void;
  setScanning: (scanning: boolean) => void;
  selectComponent: (id: string | null) => void;
  setPropsDraft: (props: Record<string, unknown>) => void;
  patchProp: (name: string, value: unknown) => void;
  setVariantId: (id: string) => void;
  setQuery: (query: string) => void;
  setTheme: (theme: Theme) => void;
  bumpPreview: () => void;
  selectedComponent: () => ComponentInfo | null;
}

function loadTheme(): Theme {
  const saved = localStorage.getItem('proplab-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  catalog: null,
  scanning: true,
  selectedId: null,
  propsDraft: {},
  variantId: 'default',
  query: '',
  theme: loadTheme(),
  previewKey: 0,

  setCatalog: (catalog) => {
    const current = get().selectedId;
    const stillExists = catalog.components.some((c) => c.id === current);
    const nextId = stillExists ? current : catalog.components[0]?.id ?? null;
    const comp = catalog.components.find((c) => c.id === nextId);
    const sameSelection = stillExists && current === get().selectedId;
    set({
      catalog,
      scanning: false,
      selectedId: nextId,
      // Keep live prop edits on soft catalog refresh of the same component
      propsDraft: sameSelection && Object.keys(get().propsDraft).length
        ? get().propsDraft
        : comp
          ? { ...comp.fixtures }
          : {},
      variantId: sameSelection ? get().variantId : 'default',
      // Only remount iframe when the selected component identity changes
      previewKey: sameSelection ? get().previewKey : get().previewKey + 1,
    });
  },

  setScanning: (scanning) => set({ scanning }),

  selectComponent: (id) => {
    if (id === get().selectedId) return;
    const comp = get().catalog?.components.find((c) => c.id === id);
    set({
      selectedId: id,
      propsDraft: comp ? { ...comp.fixtures } : {},
      variantId: 'default',
      previewKey: get().previewKey + 1,
    });
  },

  setPropsDraft: (props) => set({ propsDraft: props }),

  patchProp: (name, value) =>
    set((s) => ({
      propsDraft: { ...s.propsDraft, [name]: value },
      variantId: 'custom',
    })),

  setVariantId: (id) => {
    const comp = get().selectedComponent();
    if (!comp) {
      set({ variantId: id });
      return;
    }
    const variant = comp.variants.find((v) => v.id === id);
    set({
      variantId: id,
      propsDraft: variant ? { ...variant.props } : { ...comp.fixtures },
    });
  },

  setQuery: (query) => set({ query }),

  setTheme: (theme) => {
    localStorage.setItem('proplab-theme', theme);
    set({ theme });
  },

  bumpPreview: () => set((s) => ({ previewKey: s.previewKey + 1 })),

  selectedComponent: () => {
    const { catalog, selectedId } = get();
    if (!catalog || !selectedId) return null;
    return catalog.components.find((c) => c.id === selectedId) ?? null;
  },
}));
