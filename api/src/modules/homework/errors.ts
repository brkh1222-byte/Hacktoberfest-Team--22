import { GraphQLError } from "graphql";
import { ZodError } from "zod";

type Code = "BAD_USER_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "UNAUTHENTICATED" | "BAD_GATEWAY";

export const fail = (code: Code, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

// Not found and not allowed look the same, so ids of other teachers' private
// sets cannot be probed.
export const notFound = () => fail("NOT_FOUND", "Exercise set not found");

export const parseInput = <T>(parse: () => T): T => {
  try {
    return parse();
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      return fail(
        "BAD_USER_INPUT",
        issue ? `${issue.path.join(".") || "input"}: ${issue.message}` : "Invalid input",
      );
    }
    throw error;
  }
};
