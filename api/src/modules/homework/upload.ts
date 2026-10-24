import { checkPermissionGroup } from "erxes-api-shared/core-modules";
import type { IUserDocument } from "erxes-api-shared/core-types";
import { getSubdomain, sendTRPCMessage } from "erxes-api-shared/utils";
import express, { type Request, type Response, Router } from "express";
import { GraphQLError } from "graphql";
import { generateModels } from "../../connectionResolvers.ts";
import { GENERATE } from "../../permissions.ts";
import { MAX_PDF_BYTES } from "./db/models/Uploads.ts";

// The gateway proxies `/pl:<plugin>/*` here after its own auth middleware and
// sets `userid` + `hostname`. Like the GraphQL `user` header, that is a trusted
// gateway assertion: the API port must stay private (docs/erxes-integration.md).
// PDFs go here rather than through GraphQL because the router caps request
// bodies well below the 10 MB a lesson PDF may need.
export const uploadRouter = Router();

const headerValue = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || "";

uploadRouter.post(
  "/upload",
  express.raw({ type: "application/pdf", limit: MAX_PDF_BYTES }),
  async (req: Request, res: Response) => {
    const userId = headerValue(req.headers.userid);
    const subdomain = getSubdomain(req);

    if (!userId || !subdomain) {
      res.status(401).json({ error: "Login required" });
      return;
    }

    try {
      const user = (await sendTRPCMessage({
        subdomain,
        pluginName: "core",
        method: "query",
        module: "users",
        action: "findOne",
        input: { query: { _id: userId, isActive: { $ne: false } } },
        defaultValue: null,
      })) as IUserDocument | null;

      if (!user) {
        res.status(401).json({ error: "Login required" });
        return;
      }

      await checkPermissionGroup(subdomain, user)(GENERATE);

      if (!Buffer.isBuffer(req.body)) {
        res.status(415).json({ error: "Send the file as application/pdf" });
        return;
      }

      const models = await generateModels(subdomain);
      const filename = decodeURIComponent(headerValue(req.headers["x-file-name"]) || "lesson.pdf");
      const uploadId = await models.Uploads.createPdf(user._id, filename, req.body);

      res.json({ uploadId });
    } catch (error) {
      if (error instanceof GraphQLError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof Error && error.message === "Permission required") {
        res.status(403).json({ error: "Permission required" });
      } else {
        console.error(`[homework] upload failed: ${error instanceof Error ? error.message : "unknown"}`);
        res.status(500).json({ error: "Upload failed" });
      }
    }
  },
);

// express.raw rejects oversized bodies before the handler runs.
uploadRouter.use(
  (error: Error & { type?: string }, _req: Request, res: Response, next: (error: Error) => void) => {
    if (error.type === "entity.too.large") {
      res.status(413).json({ error: "Upload a PDF file of 10 MB or less" });
      return;
    }
    next(error);
  },
);
