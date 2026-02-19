export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md";

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function buttonClasses(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const variant = options?.variant ?? "primary";
  const size = options?.size ?? "md";

  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-amber-50";

  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-stone-900 text-white hover:bg-stone-800 focus-visible:ring-amber-500",
    secondary:
      "border border-stone-300 bg-white text-stone-900 hover:bg-amber-50 focus-visible:ring-amber-300",
    ghost: "text-stone-700 hover:bg-amber-100 focus-visible:ring-amber-300",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  };

  return classNames(base, sizes[size], variants[variant], options?.className);
}
