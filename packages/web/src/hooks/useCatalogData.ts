import { useEffect } from 'react';
import type { LabCatalog } from '@proplab/core';
import { useExplorerStore } from '../store/explorer';

export function useCatalogData() {
  const setCatalog = useExplorerStore((s) => s.setCatalog);
  const setScanning = useExplorerStore((s) => s.setScanning);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;

    async function load() {
      setScanning(true);
      try {
        const res = await fetch('/api/catalog');
        if (!res.ok) throw new Error('Failed to load catalog');
        const data = (await res.json()) as LabCatalog;
        if (!cancelled) setCatalog(data);
      } catch {
        if (!cancelled) setScanning(false);
      }
    }

    void load();

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${protocol}://${location.host}/ws`);
    socket.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          data?: LabCatalog;
        };
        if (msg.type === 'scanning') setScanning(true);
        if (msg.type === 'catalog-update' && msg.data) setCatalog(msg.data);
      } catch {
        // ignore malformed
      }
    });

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, [setCatalog, setScanning]);
}
