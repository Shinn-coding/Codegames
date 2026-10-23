import Link from "next/link";
import type { ComponentProps, ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "group inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-forest text-bg shadow-[0_14px_30px_-18px_rgba(36,59,51,0.8)] hover:bg-forest-2",
        mint: "bg-mint text-forest shadow-[0_14px_30px_-18px_rgba(191,224,200,0.8)] hover:bg-[#cdebd4]",
        outline:
          "border border-line bg-transparent text-ink hover:border-ink/25 hover:bg-surface",
        light: "bg-bg text-forest hover:bg-white",
        ghostLight:
          "border border-white/20 bg-white/5 text-bg hover:border-white/35 hover:bg-white/10",
        ghost: "text-ink hover:bg-ink/5",
      },
      size: {
        sm: "h-10 px-4 text-xs tracking-[0.02em]",
        md: "h-12 px-5 text-sm",
        lg: "h-14 px-7 text-[15px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
  };

export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
