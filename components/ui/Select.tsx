import { cn } from "@/lib/utils/cn";

export type SelectOption = { label: string; value: string };

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  size?: "md" | "sm";
};

export function Select({ label, helperText, error, options, size = "md", className, ...props }: SelectProps) {
  return (
    <label className={cn("flex flex-col text-sm", size === "md" ? "gap-1.5" : "min-w-0 gap-1")}>
      {label ? (
        <span
          className={cn(
            "font-medium uppercase tracking-[0.05em] text-[#8899A8]",
            size === "md" ? "text-xs" : "text-[11px]"
          )}
        >
          {label}
        </span>
      ) : null}
      <select
        className={cn(
          "w-full rounded-md border border-[#E2E8F0] bg-white text-[#1C2434] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-[#2E3A47] dark:bg-[#24303F] dark:text-[#DEE4EE]",
          size === "md" && "px-3.5 py-2.5 text-sm",
          size === "sm" && "px-2.5 py-1.5 text-[13px]",
          error && "border-[#D34053] focus:border-[#D34053] focus:ring-[#D34053]/20",
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? (
        <span className="text-xs text-[#8899A8]">{helperText}</span>
      ) : null}
      {error ? <span className="text-xs text-[#D34053]">{error}</span> : null}
    </label>
  );
}
