import { type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";
import Link from "next/link";

const VARIANTS = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
  outline:
    "border border-border text-foreground hover:border-accent hover:text-accent active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
  ghost:
    "text-foreground hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed",
};

const BASE =
  "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium shadow-sm hover:shadow transition-all";

type Variant = keyof typeof VARIANTS;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
