import type { ComponentType, ReactNode } from "react";
// Root imports on purpose: core-ui shares `erxes-ui`/`ui-modules` as Module
// Federation singletons keyed on the bare specifier, so deep imports would
// bundle second private copies instead of reusing the host's.
import { Breadcrumb, Button, Separator } from "erxes-ui";
import { PageHeader } from "ui-modules";
import { Link } from "react-router";

export const PageShell = ({
  title,
  icon: Icon,
  iconName,
  to,
  actions,
  width = "lg",
  children,
}: {
  title: string;
  icon: ComponentType;
  // Tabler icon name stored with the favorite.
  iconName: string;
  to: string;
  actions?: ReactNode;
  width?: "md" | "lg";
  children: ReactNode;
}) => (
  <div className="homework:flex homework:h-full homework:flex-col">
    <PageHeader>
      <PageHeader.Start>
        <Breadcrumb>
          <Breadcrumb.List className="homework:gap-1">
            <Breadcrumb.Item>
              <Button variant="ghost" asChild>
                <Link to={to}>
                  <Icon />
                  {title}
                </Link>
              </Button>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb>
        <Separator.Inline />
        <PageHeader.FavoriteToggleButton breadcrumb={[title]} icon={iconName} />
      </PageHeader.Start>
      {actions && <PageHeader.End>{actions}</PageHeader.End>}
    </PageHeader>
    <div className="homework:flex-1 homework:overflow-auto">
      <div
        className={
          width === "md"
            ? "homework:mx-auto homework:flex homework:w-full homework:max-w-3xl homework:flex-col homework:gap-6 homework:p-6"
            : "homework:mx-auto homework:flex homework:w-full homework:max-w-6xl homework:flex-col homework:gap-6 homework:p-6"
        }
      >
        {children}
      </div>
    </div>
  </div>
);

export const Field = ({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) => (
  <div className="homework:flex homework:flex-col homework:gap-1.5">
    <label htmlFor={htmlFor} className="homework:text-sm homework:font-medium">
      {label}
    </label>
    {children}
  </div>
);
