import clsx from "clsx";

export type TwAlertSeverity = "info" | "success" | "warning" | "error";

export interface TwAlertProps {
  title: string;
  message?: string;
  severity?: TwAlertSeverity;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const severityClass: Record<TwAlertSeverity, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  error: "border-rose-200 bg-rose-50 text-rose-950",
};

const barClass: Record<TwAlertSeverity, string> = {
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
};

export function TwAlert({
  title,
  message = "Something needs your attention before you continue.",
  severity = "info",
  dismissible = true,
  onDismiss,
}: Readonly<TwAlertProps>) {
  return (
    <div
      role="status"
      className={clsx(
        "flex max-w-lg gap-3 overflow-hidden rounded-2xl border p-4 shadow-sm",
        severityClass[severity],
      )}
    >
      <div
        aria-hidden
        className={clsx(
          "w-1.5 shrink-0 self-stretch rounded-full",
          barClass[severity],
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold tracking-tight">{title}</div>
        <p className="mt-1 text-sm leading-relaxed opacity-80">{message}</p>
      </div>
      {dismissible ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold opacity-70 hover:bg-black/5 hover:opacity-100"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

export default TwAlert;
