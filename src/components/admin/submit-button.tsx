"use client";

import { CircleNotch } from "@phosphor-icons/react";
import { useFormStatus } from "react-dom";
import type { VariantProps } from "class-variance-authority";

import { Button, buttonVariants } from "@/components/ui/button";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  className?: string;
  confirm?: string;
} & VariantProps<typeof buttonVariants>;

export function SubmitButton({
  label,
  pendingLabel = "Saving…",
  className,
  confirm,
  variant = "primary",
  size = "md",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      className={className}
      onClick={
        confirm
          ? (event) => {
              if (!window.confirm(confirm)) {
                event.preventDefault();
              }
            }
          : undefined
      }
    >
      {pending ? (
        <CircleNotch
          size={14}
          weight="bold"
          className="animate-spin"
          aria-hidden="true"
        />
      ) : null}
      {pending ? pendingLabel : label}
    </Button>
  );
}
