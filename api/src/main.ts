import { startPlugin } from "erxes-api-shared/utils";
import { manifest } from "./config.ts";
import { generateModels } from "./connectionResolvers.ts";
import { resolvers } from "./graphql/resolvers.ts";
import { typeDefs } from "./graphql/schema.ts";
import { uploadRouter } from "./modules/homework/upload.ts";
import { permissions } from "./permissions.ts";

// startPlugin serves the federated subgraph on /graphql, mounts /health,
// wires tRPC + agent-tools, parses the gateway `user`/`hostname` headers into
// the context, and registers this service with the erxes gateway through
// Redis — including UI_ENTRY_URL so core-ui can find the UI remote.
startPlugin({
  name: manifest.name,
  port: manifest.api.port,
  meta: { permissions },
  // Reached from the browser as `<gateway>/pl:<name>/upload`.
  expressRouter: uploadRouter,
  graphql: async () => ({ typeDefs, resolvers }),
  apolloServerContext: async (subdomain, context) => {
    context.models = await generateModels(subdomain, context);

    return context;
  },
});
