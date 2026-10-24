import { useQuery } from "@apollo/client";
import type { ComponentType, ReactNode } from "react";
import {
  IconBook,
  IconDatabase,
  IconExternalLink,
  IconLayoutDashboard,
  IconSandbox,
  IconSettings,
} from "@tabler/icons-react";
// Root imports on purpose: core-ui shares `erxes-ui`/`ui-modules` as Module
// Federation singletons keyed on the bare specifier, so deep imports would
// bundle second private copies instead of reusing the host's.
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Separator,
  Skeleton,
  cn,
} from "erxes-ui";
import { PageHeader } from "ui-modules";
import { Link } from "react-router";
import manifest from "../../../erxes.json" with { type: "json" };
import { STATUS_QUERY } from "../graphql";
import { Samples } from "../Samples";

const { path } = manifest.ui;

const Dot = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "lesson:inline-block lesson:size-2 lesson:rounded-full",
      className,
    )}
  />
);

const StatusRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="lesson:flex lesson:items-center lesson:justify-between lesson:gap-4 lesson:text-sm">
    <span className="lesson:text-muted-foreground">{label}</span>
    <span className="lesson:flex lesson:items-center lesson:gap-2 lesson:font-medium">
      {children}
    </span>
  </div>
);

const ConnectionCard = () => {
  const { data, loading, error, refetch } = useQuery(STATUS_QUERY);
  const status = data?.lessonStatus;

  const pending = (
    <>
      <Dot className="lesson:animate-pulse lesson:bg-muted-foreground" />
      <Skeleton className="lesson:h-4 lesson:w-24" />
    </>
  );

  return (
    <Card className="lesson:w-full lesson:md:w-80 lesson:shrink-0">
      <Card.Header>
        <Card.Title className="lesson:text-sm">Connection</Card.Title>
        <Card.Description>
          Live status of this plugin inside erxes
        </Card.Description>
      </Card.Header>
      <Card.Content className="lesson:flex lesson:flex-col lesson:gap-3">
        <StatusRow label="API">
          {loading ? (
            pending
          ) : error ? (
            <>
              <Dot className="lesson:bg-destructive" />
              <span>Unreachable</span>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </>
          ) : (
            <>
              <Dot className="lesson:bg-success" />
              <span>Connected · v{status?.version}</span>
            </>
          )}
        </StatusRow>
        <StatusRow label="Gateway">
          {loading ? (
            pending
          ) : error ? (
            <>
              <Dot className="lesson:bg-destructive" />
              <span
                className="lesson:truncate lesson:max-w-40"
                title={error.message}
              >
                {error.message}
              </span>
            </>
          ) : (
            <>
              <Dot className="lesson:bg-success" />
              <span>Federated as {status?.plugin}</span>
            </>
          )}
        </StatusRow>
        <StatusRow label="Tenant">
          {loading ? pending : (status?.subdomain ?? "—")}
        </StatusRow>
        <StatusRow label="Signed in">
          {loading
            ? pending
            : (status && (status.userEmail ?? status.userId ?? "Anonymous")) ||
              "—"}
        </StatusRow>
      </Card.Content>
    </Card>
  );
};

const StepCard = ({
  icon: Icon,
  title,
  description,
  code,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  code: string;
}) => (
  <Card>
    <Card.Header>
      <div className="lesson:flex lesson:size-9 lesson:items-center lesson:justify-center lesson:rounded-lg lesson:bg-accent">
        <Icon className="lesson:size-5" />
      </div>
      <Card.Title>{title}</Card.Title>
      <Card.Description>{description}</Card.Description>
    </Card.Header>
    <Card.Content>
      <code className="lesson:rounded lesson:bg-muted lesson:px-1.5 lesson:py-0.5 lesson:font-mono lesson:text-xs">
        {code}
      </code>
    </Card.Content>
  </Card>
);

const STEPS = [
  {
    icon: IconDatabase,
    title: "Model your data",
    description:
      "Define the records this plugin owns and expose them on the federated graph.",
    code: "api/src/modules/sample",
  },
  {
    icon: IconLayoutDashboard,
    title: "Build the page",
    description:
      "Replace this overview with your module: lists with RecordTable, forms with Form, details in a Sheet.",
    code: "ui/src/pages/IndexPage.tsx",
  },
];

export const IndexPage = () => (
  <div className="lesson:flex lesson:h-full lesson:flex-col">
    <PageHeader>
      <PageHeader.Start>
        <Breadcrumb>
          <Breadcrumb.List className="lesson:gap-1">
            <Breadcrumb.Item>
              <Button variant="ghost" asChild>
                <Link to={`/${path}`}>
                  <IconSandbox />
                  {manifest.title}
                </Link>
              </Button>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb>
        <Separator.Inline />
        <PageHeader.FavoriteToggleButton
          breadcrumb={[manifest.title]}
          icon="IconSandbox"
        />
      </PageHeader.Start>
      <PageHeader.End>
        <Button variant="outline" asChild>
          <Link to={`/${path}/settings`}>
            <IconSettings />
            Settings
          </Link>
        </Button>
      </PageHeader.End>
    </PageHeader>
    <div className="lesson:flex-1 lesson:overflow-auto">
      <div className="lesson:mx-auto lesson:flex lesson:w-full lesson:max-w-5xl lesson:flex-col lesson:gap-6 lesson:p-6">
        <section className="lesson:relative lesson:overflow-hidden lesson:rounded-xl lesson:border lesson:border-border lesson:bg-background lesson:p-8 lesson:shadow-xs">
          <div
            aria-hidden
            className="lesson:pointer-events-none lesson:absolute lesson:inset-0 lesson:bg-gradient-to-br lesson:from-primary/10 lesson:via-transparent lesson:to-transparent"
          />
          <div className="lesson:relative lesson:flex lesson:flex-col lesson:gap-6 lesson:md:flex-row lesson:md:items-start lesson:md:justify-between">
            <div className="lesson:flex lesson:max-w-xl lesson:flex-col lesson:gap-4">
              <div>
                <Badge variant="info">Plugin · v{manifest.version}</Badge>
              </div>
              <h1 className="lesson:text-2xl lesson:font-semibold lesson:tracking-tight">
                Welcome to {manifest.title}
              </h1>
              <p className="lesson:text-sm lesson:leading-relaxed lesson:text-muted-foreground">
                {manifest.description}
              </p>
              <div className="lesson:flex lesson:flex-wrap lesson:gap-2">
                <Button asChild>
                  <Link to={`/${path}/settings`}>
                    <IconSettings />
                    Open settings
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href="https://erxes.io/docs/create-plugin-standalone"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IconBook />
                    Developer guide
                    <IconExternalLink />
                  </a>
                </Button>
              </div>
            </div>
            <ConnectionCard />
          </div>
        </section>
        <Samples />
        <div className="lesson:grid lesson:gap-4 lesson:md:grid-cols-2">
          {STEPS.map((step) => (
            <StepCard key={step.title} {...step} />
          ))}
        </div>
      </div>
    </div>
  </div>
);
