import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileCode2, Layers } from 'lucide-react';
import { useExplorerStore } from '../store/explorer';

export function PreviewPane() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const selectedId = useExplorerStore((s) => s.selectedId);
  const propsDraft = useExplorerStore((s) => s.propsDraft);
  const previewKey = useExplorerStore((s) => s.previewKey);
  const component = useExplorerStore((s) => s.selectedComponent());
  const [openBusy, setOpenBusy] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !selectedId) return;

    const send = () => {
      iframe.contentWindow?.postMessage({ type: 'proplab:props', props: propsDraft }, '*');
    };

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'proplab:ready') send();
    };

    window.addEventListener('message', onMessage);
    send();
    return () => window.removeEventListener('message', onMessage);
  }, [selectedId, propsDraft, previewKey]);

  if (!selectedId || !component) {
    return (
      <main className="preview preview-empty">
        <div className="preview-empty-inner">
          <div className="preview-empty-icon">
            <Layers size={28} strokeWidth={1.75} />
          </div>
          <div className="preview-empty-title">Pick a component</div>
          <div className="preview-empty-desc">
            Select any component from the sidebar to preview it with generated props and variants.
          </div>
        </div>
      </main>
    );
  }

  const src = `/__proplab_preview__?id=${encodeURIComponent(selectedId)}`;

  async function openInEditor() {
    if (!component || openBusy) return;
    setOpenBusy(true);
    setOpenError(null);
    try {
      const res = await fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: component.id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setOpenError(data.error ?? `Could not open file (${res.status})`);
      }
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Could not open file');
    } finally {
      setOpenBusy(false);
    }
  }

  return (
    <main className="preview">
      <div className="preview-toolbar">
        <div className="preview-toolbar-main">
          <div className="preview-name">{component.name}</div>
          <div className="preview-meta">
            <span className="preview-meta-item">{component.relativePath}</span>
            {component.props.typeName && (
              <span className="preview-meta-item">{component.props.typeName}</span>
            )}
            {component.isDefaultExport && (
              <span className="preview-meta-item">default export</span>
            )}
          </div>
          {openError && <div className="preview-open-error">{openError}</div>}
        </div>
        <button
          type="button"
          className="preview-open-btn"
          onClick={() => void openInEditor()}
          disabled={openBusy}
          title="Open source file in your editor"
        >
          <FileCode2 size={14} strokeWidth={2.25} />
          {openBusy ? 'Opening…' : 'Open in editor'}
        </button>
      </div>

      <motion.div
        key={previewKey}
        className="preview-canvas"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="preview-frame">
          <div className="preview-chrome">
            <div className="preview-dots">
              <span className="preview-dot preview-dot--red" />
              <span className="preview-dot preview-dot--yellow" />
              <span className="preview-dot preview-dot--green" />
            </div>
            <div className="preview-url">proplab://preview/{component.name}</div>
          </div>
          <div className="preview-iframe-wrap">
            <iframe
              key={previewKey}
              ref={iframeRef}
              title={`Preview ${component.name}`}
              src={src}
            />
          </div>
        </div>
      </motion.div>
    </main>
  );
}
