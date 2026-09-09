import type { BadgeVariant } from "../types/common";

const CLASS_BY_VARIANT: Record<BadgeVariant, string> = {
  ok: "badge badge-ok",
  fail: "badge badge-fail",
  warn: "badge badge-warn",
  stored: "badge badge-stored",
  disc: "badge badge-disc",
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  return <span className={CLASS_BY_VARIANT[variant]}>{children}</span>;
}
