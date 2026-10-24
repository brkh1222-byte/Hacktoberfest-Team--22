import type { ReactNode } from "react";
import { Label } from "erxes-ui";

export const Field = ({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={className ? `homework:flex homework:flex-col homework:gap-2 ${className}` : "homework:flex homework:flex-col homework:gap-2"}>
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
  </div>
);
