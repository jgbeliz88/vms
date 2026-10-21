import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export function Input({ label, helperText, error, className, ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label ? (
        <span className="text-xs font-medium uppercase tracking-[0.05em] text-[#8899A8]">
          {label}
        </span>
      ) : null}
      <input
        className={cn(
          "w-full rounded-md border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#1C2434] placeholder:text-[#8899A8] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-[#2E3A47] dark:bg-[#24303F] dark:text-[#DEE4EE]",
          error && "border-[#D34053] focus:border-[#D34053] focus:ring-[#D34053]/20",
          className
        )}
        {...props}
      />
      {helperText ? (
        <span className="text-xs text-[#8899A8]">{helperText}</span>
      ) : null}
      {error ? <span className="text-xs text-[#D34053]">{error}</span> : null}
    </label>
  );
}
