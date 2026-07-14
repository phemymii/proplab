import { useFormContext } from '../../providers/FormProvider';
import { demo } from '../../theme';

export interface ProfileFormFieldProps {
  /** Form field name registered with FormProvider */
  name: string;
  /** Visible label */
  label: string;
  /** Input placeholder */
  placeholder?: string;
  /** Render as multiline */
  multiline?: boolean;
  /** Mark as required in the UI */
  required?: boolean;
}

/**
 * A single controlled field bound to FormProvider.
 * Previewing this alone (no `.proplabrc` decorator) throws:
 * `useFormContext must be used within FormProvider`
 */
export function ProfileFormField({
  name,
  label,
  placeholder,
  multiline = false,
  required = false,
}: ProfileFormFieldProps) {
  const { register, errors } = useFormContext();
  const field = register(name);
  const error = errors[name];

  const shared = {
    ...field,
    id: name,
    placeholder,
    required,
    style: {
      width: '100%',
      boxSizing: 'border-box' as const,
      padding: '10px 12px',
      borderRadius: 10,
      border: `1px solid ${error ? demo.danger : demo.line}`,
      background: demo.white,
      color: demo.ink,
      fontFamily: demo.font,
      fontSize: 14,
      outline: 'none',
      resize: 'vertical' as const,
    },
  };

  return (
    <label
      htmlFor={name}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: demo.font,
        maxWidth: 360,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: demo.ink,
          letterSpacing: '-0.01em',
        }}
      >
        {label}
        {required ? (
          <span style={{ color: demo.danger, marginLeft: 4 }}>*</span>
        ) : null}
      </span>
      {multiline ? (
        <textarea rows={3} {...shared} />
      ) : (
        <input type="text" {...shared} />
      )}
      {error ? (
        <span style={{ fontSize: 12, color: demo.danger }}>{error}</span>
      ) : (
        <span style={{ fontSize: 12, color: demo.soft }}>
          Bound to FormProvider · field “{name}”
        </span>
      )}
    </label>
  );
}

export default ProfileFormField;
