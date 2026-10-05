import { cn } from "@/lib/utils/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "sm" && "px-3.5 py-1.5 text-[13px]",
        variant === "primary" &&
          "bg-brand-500 text-white hover:bg-brand-600",
        variant === "secondary" &&
          "border border-[#E2E8F0] bg-white text-[#1C2434] hover:bg-[#F1F5F9] dark:border-[#2E3A47] dark:bg-[#24303F] dark:text-[#DEE4EE] dark:hover:bg-[#333A48]",
        variant === "ghost" &&
          "text-[#64748B] hover:bg-[#F1F5F9] dark:text-[#DEE4EE] dark:hover:bg-[#333A48]",
        variant === "danger" && "bg-[#D34053] text-white hover:bg-[#b53344]",
        className
      )}
      {...props}
    />
  );
}
