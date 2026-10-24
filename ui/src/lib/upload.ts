import { REACT_APP_API_URL } from "erxes-ui";
import manifest from "../../../erxes.json" with { type: "json" };
import { mn } from "./mn";

// The gateway proxies `/pl:<plugin>/*` to the plugin API with the signed-in
// user attached, the same cookie auth GraphQL uses.
export async function uploadPdf(file: File): Promise<string> {
  const response = await fetch(`${REACT_APP_API_URL}/pl:${manifest.name}/upload`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/pdf",
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
  const body = (await response.json().catch(() => ({}))) as { uploadId?: string; error?: string };

  if (!response.ok || !body.uploadId) {
    throw new Error(
      response.status === 403 ? mn.forbidden : response.status === 413 ? mn.pdfInvalid : (body.error ?? mn.error),
    );
  }

  return body.uploadId;
}
