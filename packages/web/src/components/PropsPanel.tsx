import type { PropField } from '@proplab/core';
import { RotateCcw } from 'lucide-react';
import { useExplorerStore } from '../store/explorer';

export function PropsPanel() {
  const component = useExplorerStore((s) => s.selectedComponent());
  const propsDraft = useExplorerStore((s) => s.propsDraft);
  const variantId = useExplorerStore((s) => s.variantId);
  const patchProp = useExplorerStore((s) => s.patchProp);
  const setVariantId = useExplorerStore((s) => s.setVariantId);
  const setPropsDraft = useExplorerStore((s) => s.setPropsDraft);

  if (!component) {
    return (
      <aside className="props-panel">
        <div className="props-empty">
          Props and variants will appear here once you select a component.
        </div>
      </aside>
    );
  }

  return (
    <aside className="props-panel">
      <div className="props-section">
        <div className="props-label">Variants</div>
        <select
          className="props-select"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
        >
          {component.variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
        <button
          type="button"
          className="props-btn"
          onClick={() => {
            setPropsDraft({ ...component.fixtures });
            setVariantId('default');
          }}
        >
          <RotateCcw size={12} />
          Reset to defaults
        </button>
      </div>

      <div className="props-section props-section--grow">
        <div className="props-label">
          Props
          <span className="props-label-count">{component.props.fields.length}</span>
        </div>

        {component.props.fields.length === 0 ? (
          <div className="props-empty" style={{ padding: 0 }}>
            No props detected for this component.
          </div>
        ) : (
          <div className="props-fields">
            {component.props.fields.map((field) => (
              <PropControl
                key={field.name}
                field={field}
                value={propsDraft[field.name]}
                onChange={(value) => patchProp(field.name, value)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="props-section">
        <div className="props-label">Live JSON</div>
        <pre className="props-json">{JSON.stringify(propsDraft, null, 2)}</pre>
      </div>
    </aside>
  );
}

function PropControl({
  field,
  value,
  onChange,
}: {
  field: PropField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = (
    <div className="prop-field-label">
      <label className="prop-field-name">
        {field.name}
        {!field.required && <span className="prop-field-optional">?</span>}
      </label>
      <span className="prop-kind">{field.kind}</span>
    </div>
  );

  if (field.kind === 'boolean') {
    return (
      <div>
        {label}
        <label className="prop-toggle">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="prop-toggle-track">
            <span className="prop-toggle-thumb" />
          </span>
          <span className="prop-toggle-value">{Boolean(value) ? 'true' : 'false'}</span>
        </label>
      </div>
    );
  }

  if (field.kind === 'enum' && field.options?.length) {
    return (
      <div>
        {label}
        <select
          className="props-select"
          value={String(value ?? field.options[0])}
          onChange={(e) => {
            const raw = e.target.value;
            const match = field.options!.find((o) => String(o) === raw);
            onChange(match ?? raw);
          }}
        >
          {field.options.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.kind === 'number') {
    return (
      <div>
        {label}
        <input
          className="props-input"
          type="number"
          value={typeof value === 'number' ? value : Number(value) || 0}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
      </div>
    );
  }

  if (field.kind === 'function') {
    return (
      <div>
        {label}
        <div className="prop-stub">Stubbed — logs to console on call</div>
      </div>
    );
  }

  if (field.kind === 'object' || field.kind === 'array') {
    return (
      <div>
        {label}
        <textarea
          className="props-textarea"
          value={safeJson(value)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              // keep typing
            }
          }}
          rows={4}
        />
      </div>
    );
  }

  return (
    <div>
      {label}
      <input
        className="props-input"
        type="text"
        value={value == null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.typeText && <div className="prop-type-hint">{field.typeText}</div>}
    </div>
  );
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value);
  }
}
