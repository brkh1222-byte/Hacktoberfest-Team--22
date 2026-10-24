import type { ApolloError } from "@apollo/client";
import { IconAlertTriangle, IconLock } from "@tabler/icons-react";
import { Button, Empty, Spinner } from "erxes-ui";
import { mn } from "~/lib/mn";

export const errorCode = (error: ApolloError | undefined) =>
  error?.graphQLErrors[0]?.extensions?.code as string | undefined;

export const errorText = (error: ApolloError | Error) => {
  if ("graphQLErrors" in error) {
    const code = errorCode(error);
    if (code === "FORBIDDEN") return mn.forbidden;
    if (code === "NOT_FOUND") return mn.notFound;
    if (code === "BAD_USER_INPUT") return mn.invalidInput;
    if (code === "API_KEY_REQUIRED") return mn.apiKeyRequired;
    if (code === "API_KEY_INVALID") return mn.apiKeyInvalid;
    if (code === "API_KEY_STORAGE_UNAVAILABLE") return mn.apiKeyStorageUnavailable;
    if (code === "AI_PDF_UNSUPPORTED") return mn.aiPdfUnsupported;
    if (code === "AI_CONFIGURATION_INVALID") return mn.aiConfigurationInvalid;
    if (code === "AI_QUOTA_EXCEEDED") return mn.aiQuotaExceeded;
    if (code === "BAD_GATEWAY") return mn.generationError;
    if (error.networkError) return mn.error;
  }
  return error.message || mn.error;
};

export const Loading = () => (
  <div
    role="status"
    aria-label={mn.loading}
    className="homework:flex homework:justify-center homework:py-16"
  >
    <Spinner />
  </div>
);

export const ErrorState = ({ error, onRetry }: { error: ApolloError; onRetry?: () => void }) => {
  const forbidden = errorCode(error) === "FORBIDDEN";

  return (
    <Empty role="alert">
      <Empty.Header>
        <Empty.Media variant="icon">{forbidden ? <IconLock /> : <IconAlertTriangle />}</Empty.Media>
        <Empty.Title>{errorText(error)}</Empty.Title>
        {forbidden && <Empty.Description>{mn.permissionHint}</Empty.Description>}
      </Empty.Header>
      {onRetry && !forbidden && (
        <Empty.Content>
          <Button variant="outline" onClick={onRetry}>
            {mn.retry}
          </Button>
        </Empty.Content>
      )}
    </Empty>
  );
};
