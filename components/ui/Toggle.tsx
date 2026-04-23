import { cn } from "@/lib/utils/cn";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-150",
          checked ? "bg-brand-500" : "bg-[#E2E8F0] dark:bg-[#2E3A47]"
        )}
      >
        <span
          className={cn(
            "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150",
            checked && "translate-x-5"
          )}
        />
      </button>
      {label ? <span className="text-[#1C2434] dark:text-[#DEE4EE]">{label}</span> : null}
    </label>
  );
}
