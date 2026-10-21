import { cn } from "@/lib/utils/cn";

type BadgeProps = {
  label: string;
  tone?: "default" | "success" | "error" | "warning" | "purple";
};

export function Badge({ label, tone = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold",
        tone === "default" && "bg-[#F1F5F9] text-[#64748B] dark:bg-[#333A48] dark:text-[#DEE4EE]",
        tone === "success" && "bg-[#DCFCE7] text-[#166534] dark:bg-emerald-500/20 dark:text-emerald-200",
        tone === "error" && "bg-[#FEE2E2] text-[#991B1B] dark:bg-rose-500/20 dark:text-rose-200",
        tone === "warning" && "bg-[#FEF9C3] text-[#854D0E] dark:bg-amber-500/20 dark:text-amber-200",
        tone === "purple" && "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200"
      )}
    >
      {label}
    </span>
  );
}
