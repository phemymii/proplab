import { useEffect, useState } from "react";
import type { PropField } from "@proplab/core";
import { RotateCcw } from "lucide-react";
import { useExplorerStore } from "../store/explorer";

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
            setVariantId("default");
          }}
        >
          <RotateCcw size={12} />
          Reset to defaults
        </button>
      </div>

      <div className="props-section props-section--grow">
        <div className="props-label">
          Props
          <span className="props-label-count">
            {component.props.fields.length}
          </span>
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

  if (field.kind === "boolean") {
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
          <span className="prop-toggle-value">
            {Boolean(value) ? "true" : "false"}
          </span>
        </label>
      </div>
    );
  }

  if (field.kind === "enum" && field.options?.length) {
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

  if (field.kind === "number") {
    return (
      <div>
        {label}
        <input
          className="props-input"
          type="number"
          value={typeof value === "number" ? value : Number(value) || 0}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
      </div>
    );
  }

  if (field.kind === "function") {
    return (
      <div>
        {label}
        <div className="prop-stub">Stubbed — logs to console on call</div>
      </div>
    );
  }

  // ReactNode / slots — text fixtures (strings are valid nodes on web)
  if (field.kind === "reactNode") {
    return (
      <div>
        {label}
        <TextPropEditor
          value={
            typeof value === "string"
              ? value
              : value == null
                ? ""
                : String(value)
          }
          onChange={onChange}
          rows={field.name === "children" ? 3 : 2}
        />
        <div className="prop-type-hint">
          {field.typeText ? `${field.typeText} · ` : ""}
          plain text or HTML (e.g. {"<div>Hey</div>"})
        </div>
      </div>
    );
  }

  // Objects, arrays, structured aliases (PageObject), style bags — JSON editor
  if (
    field.kind === "object" ||
    field.kind === "array" ||
    isStyleLikeField(field) ||
    isStructuredField(field)
  ) {
    const fallback = isStyleLikeField(field)
      ? EMPTY_STYLE
      : field.kind === "array"
        ? EMPTY_ARRAY
        : EMPTY_OBJECT;
    return (
      <div>
        {label}
        <JsonPropEditor
          value={value}
          emptyFallback={fallback}
          onChange={onChange}
        />
        {field.typeText && (
          <div className="prop-type-hint">{field.typeText}</div>
        )}
      </div>
    );
  }

  return (
    <div>
      {label}
      <input
        className="props-input"
        type="text"
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.typeText && <div className="prop-type-hint">{field.typeText}</div>}
    </div>
  );
}

const EMPTY_STYLE: Record<string, never> = Object.freeze({});
const EMPTY_OBJECT: Record<string, never> = Object.freeze({});
const EMPTY_ARRAY: readonly unknown[] = Object.freeze([]);

function isStyleLikeField(field: PropField): boolean {
  const t = field.typeText ?? "";
  if (/\bStyleProp\b|(?:View|Text|Image)Style\b|RegisteredStyle\b/.test(t))
    return true;
  if (/Style$/.test(field.name) && field.kind === "unknown") return true;
  return false;
}

/** PathObjectType | null, anonymous objects, etc. — never a free-text string input. */
function isStructuredField(field: PropField): boolean {
  if (field.fields?.length) return true;
  if (field.item) return true;
  if (field.kind !== "unknown" && field.kind !== "union") return false;
  const t = field.typeText ?? "";
  const base = t.split("|")[0]?.trim() ?? "";
  if (t.startsWith("{")) return true;
  if (/^[A-Z][A-Za-z0-9_]+$/.test(base)) return true;
  if (typeof field === "object" && t.includes("[]")) return true;
  return false;
}

/** Local draft for text / ReactNode string fixtures so typing isn't lost. */
function TextPropEditor({
  value,
  onChange,
  rows = 2,
}: {
  value: string;
  onChange: (value: unknown) => void;
  rows?: number;
}) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <textarea
      className="props-textarea"
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        onChange(next);
      }}
      rows={rows}
      spellCheck={false}
    />
  );
}

/** Local draft text so intermediate JSON (e.g. `{`) isn't wiped by controlled value. */
function JsonPropEditor({
  value,
  emptyFallback,
  onChange,
}: {
  value: unknown;
  emptyFallback: unknown;
  onChange: (value: unknown) => void;
}) {
  const committed = value === undefined ? emptyFallback : value;
  const [text, setText] = useState(() => safeJson(committed));
  const [invalid, setInvalid] = useState(false);
  const [committedKey, setCommittedKey] = useState(() => safeJson(committed));

  // Sync from parent only when the stored value actually changed (not while drafting)
  useEffect(() => {
    const nextKey = safeJson(committed);
    if (nextKey === committedKey) return;
    setCommittedKey(nextKey);
    setText(nextKey);
    setInvalid(false);
  }, [committed, committedKey]);

  return (
    <>
      <textarea
        className={`props-textarea${invalid ? " props-textarea--invalid" : ""}`}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          try {
            const parsed = JSON.parse(next) as unknown;
            onChange(parsed);
            setCommittedKey(safeJson(parsed));
            setInvalid(false);
          } catch {
            setInvalid(true);
          }
        }}
        onBlur={() => {
          if (invalid) {
            setText(safeJson(committed));
            setInvalid(false);
          }
        }}
        rows={4}
        spellCheck={false}
      />
      {invalid && (
        <div className="prop-type-hint">
          Invalid JSON — finish editing to apply
        </div>
      )}
    </>
  );
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value);
  }
}
