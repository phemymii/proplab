import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type FormValues = Record<string, string>;

export interface FormContextValue {
  values: FormValues;
  errors: Record<string, string | undefined>;
  setValue: (name: string, value: string) => void;
  register: (name: string) => {
    name: string;
    value: string;
    onChange: (event: { target: { value: string } }) => void;
  };
}

const FormContext = createContext<FormContextValue | null>(null);

export interface FormProviderProps {
  children: ReactNode;
  defaultValues?: FormValues;
}

export function FormProvider({
  children,
  defaultValues = {},
}: FormProviderProps) {
  const [values, setValues] = useState<FormValues>(defaultValues);

  const setValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const register = useCallback(
    (name: string) => ({
      name,
      value: values[name] ?? '',
      onChange: (event: { target: { value: string } }) => {
        setValue(name, event.target.value);
      },
    }),
    [setValue, values],
  );

  const errors = useMemo(() => {
    const next: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key === 'email' && value && !value.includes('@')) {
        next[key] = 'Enter a valid email';
      }
      if (key === 'displayName' && value.length > 0 && value.length < 2) {
        next[key] = 'Too short';
      }
    }
    return next;
  }, [values]);

  const value = useMemo<FormContextValue>(
    () => ({ values, errors, setValue, register }),
    [values, errors, setValue, register],
  );

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

export function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error('useFormContext must be used within FormProvider');
  }
  return ctx;
}
