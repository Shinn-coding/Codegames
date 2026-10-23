import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-xl border border-line bg-surface text-sm text-ink shadow-[0_1px_0_rgba(22,36,31,0.03)] transition-colors placeholder:text-muted/55 hover:border-ink/20 focus:border-forest/35 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint disabled:cursor-not-allowed disabled:opacity-60";

const labelBase =
  "text-[10px] font-semibold tracking-[0.16em] text-muted uppercase";

type FieldFrameProps = {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
};

function FieldFrame({
  label,
  name,
  hint,
  error,
  required,
  className,
  children,
}: FieldFrameProps) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className={labelBase}>
        {label}
        {required ? (
          <span className="ml-1 text-forest" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children({ id, describedBy })}
      {error ? (
        <p id={errorId} role="alert" className="text-[11px] leading-5 text-[#8a3d1f]">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[11px] leading-5 text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<ComponentProps<"input">, "name"> &
  Omit<FieldFrameProps, "children"> & { name: string };

export function TextField({
  label,
  name,
  hint,
  error,
  required,
  className,
  ...props
}: TextFieldProps) {
  return (
    <FieldFrame
      label={label}
      name={name}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {({ id, describedBy }) => (
        <input
          {...props}
          id={id}
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            controlBase,
            "h-11 px-3.5",
            error && "border-[#b4573a]/50",
          )}
        />
      )}
    </FieldFrame>
  );
}

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "name"> &
  Omit<FieldFrameProps, "children"> & { name: string };

export function TextAreaField({
  label,
  name,
  hint,
  error,
  required,
  className,
  ...props
}: TextAreaFieldProps) {
  return (
    <FieldFrame
      label={label}
      name={name}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {({ id, describedBy }) => (
        <textarea
          {...props}
          id={id}
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            controlBase,
            "min-h-[112px] resize-y px-3.5 py-3 leading-6",
            error && "border-[#b4573a]/50",
          )}
        />
      )}
    </FieldFrame>
  );
}

type SelectFieldProps = Omit<ComponentProps<"select">, "name"> &
  Omit<FieldFrameProps, "children"> & { name: string };

export function SelectField({
  label,
  name,
  hint,
  error,
  required,
  className,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <FieldFrame
      label={label}
      name={name}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {({ id, describedBy }) => (
        <select
          {...props}
          id={id}
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlBase, "h-11 px-3", error && "border-[#b4573a]/50")}
        >
          {children}
        </select>
      )}
    </FieldFrame>
  );
}

type CheckboxFieldProps = Omit<ComponentProps<"input">, "type"> & {
  label: string;
  hint?: string;
};

export function CheckboxField({
  label,
  hint,
  className,
  ...props
}: CheckboxFieldProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3",
        className,
      )}
    >
      <input
        {...props}
        type="checkbox"
        className="mt-0.5 size-4 accent-[var(--forest)]"
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] leading-5 text-muted">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}
