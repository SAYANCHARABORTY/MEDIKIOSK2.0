import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.97] shadow-sm",
        destructive:
          "bg-destructive text-white hover:brightness-110 active:scale-[0.97]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-white/[0.04] active:scale-[0.97]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.97]",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
        link:
          "text-primary underline-offset-4 hover:underline",

        // Custom MediKiosk Variants (Spec 18, 20, 39, 40)
        hero:
          "bg-primary text-primary-foreground px-6 py-3 md:px-8 md:py-4 text-sm rounded-sm cursor-pointer hover:brightness-110 transition-all active:scale-[0.97] font-semibold tracking-wide shadow-lg shadow-primary/20",
        heroOutline:
          "bg-white text-background px-6 py-3 md:px-8 md:py-4 text-sm rounded-sm cursor-pointer hover:brightness-90 transition-all active:scale-[0.97] font-semibold tracking-wide",
        navCta:
          "text-foreground bg-nav-button hover:bg-nav-button/80 active:scale-[0.97] transition-all rounded-lg uppercase text-xs tracking-widest px-6 py-2.5 font-medium border border-white/[0.05]",
        clinical:
          "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 active:scale-[0.97] transition-all text-sm rounded-md font-medium",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm rounded-md",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-9 w-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
