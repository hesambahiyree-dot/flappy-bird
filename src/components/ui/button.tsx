import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[opacity,transform,background-color] duration-(--motion-fast) ease-(--ease-smooth-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/70 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary: "bg-cream text-ink shadow-[0_8px_24px_rgba(20,8,12,0.28)] hover:opacity-95",
        secondary: "bg-cream/10 text-cream border border-cream/20 hover:bg-cream/16",
        ghost: "bg-transparent text-cream/85 hover:bg-cream/10",
      },
      size: {
        lg: "h-12 px-5 text-base rounded-xl",
        md: "h-11 px-4 text-sm rounded-lg",
        icon: "size-11 rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant, size, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
