import { cn } from "@/lib/utils/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export function Textarea({ label, helperText, error, className, ...props }: TextareaProps) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      {label ? <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span> : null}
      <textarea
        className={cn(
          "min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          error && "border-rose-400 focus:border-rose-400 focus:ring-rose-200",
          className
        )}
        {...props}
      />
      {helperText ? (
        <span className="text-xs text-slate-500 dark:text-slate-400">{helperText}</span>
      ) : null}
      {error ? <span className="text-xs text-rose-500">{error}</span> : null}
    </label>
  );
}
