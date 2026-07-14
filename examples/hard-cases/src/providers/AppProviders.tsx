import type { ReactNode } from "react";
import { AuthProvider, demoUser, type AuthUser } from "./AuthProvider";
import { FormProvider, type FormValues } from "./FormProvider";
import { ThemeProvider } from "./ThemeProvider";
import type { LabThemeMode } from "../theme";

export interface AppProvidersProps {
  children: ReactNode;
  /** Theme mode for every preview */
  theme?: LabThemeMode;
  /** Signed-in user (pass null to simulate signed-out) */
  user?: AuthUser | null;
  /** Initial form field values */
  formDefaults?: FormValues;
}

/**
 * App shell used by `.proplabrc.tsx` decorators.
 * Without this wrapper, AccountBadge / ThemedBanner / ProfileFormField crash.
 */
export function AppProviders({
  children,
  theme = "light",
  user = demoUser,
  formDefaults = {
    displayName: "Ada Lovelace",
    email: "ada@proplab.dev",
    bio: "Mathematician and first programmer",
  },
}: Readonly<AppProvidersProps>) {
  return (
    <ThemeProvider defaultMode={theme}>
      <AuthProvider user={user}>
        <FormProvider defaultValues={formDefaults}>{children}</FormProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
