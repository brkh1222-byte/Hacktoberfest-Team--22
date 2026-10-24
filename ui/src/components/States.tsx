import type { ApolloError } from "@apollo/client";
import { IconAlertCircle, IconDatabaseOff, IconLock, type Icon } from "@tabler/icons-react";
import { Button, Empty, Spinner, cn } from "erxes-ui";
import type { ReactNode } from "react";
import { mn } from "~/lib/mn";

export const errorCode = (error: ApolloError | undefined) =>
  error?.graphQLErrors[0]?.extensions?.code as string | undefined;

export const errorText = (error: ApolloError | Error) => {
  if ("graphQLErrors" in error) {
    const code = errorCode(error);
    if (code === "FORBIDDEN") return mn.forbidden;
    if (code === "NOT_FOUND") return mn.notFound;
    if (code === "BAD_USER_INPUT") return mn.invalidInput;
    if (code === "BAD_GATEWAY") return mn.generationError;
    if (error.networkError) return mn.error;
  }
  return error.message || mn.error;
};

export const Loading = () => <Spinner containerClassName="homework:py-20" />;

// Same two modes erxes list pages use: an overlay on a mounted RecordTable (the
// header stays usable) or a standalone panel.
export const EmptyState = ({
  icon: StateIcon = IconDatabaseOff,
  title,
  description,
  action,
  error,
  onRetry,
  overlay,
}: {
  icon?: Icon;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  error?: ApolloError;
  onRetry?: () => void;
  overlay?: boolean;
}) => {
  const forbidden = errorCode(error) === "FORBIDDEN";
  const ShownIcon = forbidden ? IconLock : error ? IconAlertCircle : StateIcon;

  return (
    <Empty
      role={error ? "alert" : undefined}
      className={cn(
        overlay
          ? "homework:pointer-events-none homework:absolute homework:inset-0 homework:z-10 homework:pt-16 homework:**:data-[slot=empty-content]:pointer-events-auto"
          : "homework:m-3 homework:rounded-lg homework:bg-sidebar",
      )}
    >
      <Empty.Header>
        <Empty.Media
          variant="icon"
          className={cn("homework:size-14 homework:rounded-xl homework:[&>svg]:size-8", error && "homework:text-destructive")}
        >
          <ShownIcon />
        </Empty.Media>
        <Empty.Title>{error ? errorText(error) : (title ?? mn.emptyTitle)}</Empty.Title>
        {error ? (
          forbidden && <Empty.Description>{mn.permissionHint}</Empty.Description>
        ) : (
          description && <Empty.Description>{description}</Empty.Description>
        )}
      </Empty.Header>
      {error && onRetry && !forbidden ? (
        <Empty.Content>
          <Button variant="outline" onClick={onRetry}>
            {mn.retry}
          </Button>
        </Empty.Content>
      ) : (
        !error && action && <Empty.Content>{action}</Empty.Content>
      )}
    </Empty>
  );
};
