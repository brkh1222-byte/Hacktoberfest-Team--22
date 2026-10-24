import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";
import { normalizeBaseUrl } from "./settings.ts";

export class ProviderError extends Error {
  constructor(public readonly status: number) {
    super("AI provider request failed");
  }
}

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(address, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
// Exclude transition mechanisms and documentation ranges even inside global unicast.
blocked.addSubnet("2001::", 23, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");
blocked.addSubnet("3fff::", 20, "ipv6");

export function isPublicAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  return family === 6 && globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

export async function validateEndpoint(value: string) {
  const url = new URL(normalizeBaseUrl(value));
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const family = isIP(hostname);
  const addresses = family
    ? [{ address: hostname, family }]
    : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address)))
    throw new ProviderError(400);
  return { url, address: addresses.find((value) => value.family === 4) ?? addresses[0]! };
}

export type JsonTransport = (
  url: string,
  headers: Record<string, string>,
  body: unknown,
) => Promise<unknown>;

// Resolve and pin a public address for each call. No redirects, so teacher-supplied
// endpoints cannot reach internal services or redirect credentials to another host.
export const postJson: JsonTransport = async (endpoint, headers, body) => {
  const { url, address } = await validateEndpoint(endpoint);
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = request(
      url,
      {
        method: "POST",
        agent: false,
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, [address]);
          else callback(null, address.address, address.family);
        },
      },
      (response) => {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          response.destroy();
          reject(new ProviderError(response.statusCode ?? 502));
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024) req.destroy(new ProviderError(502));
          else chunks.push(chunk);
        });
        response.on("error", () => reject(new ProviderError(502)));
        response.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown);
          } catch {
            reject(new ProviderError(502));
          }
        });
      },
    );
    const timer = setTimeout(() => req.destroy(new ProviderError(504)), 120_000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", () => reject(new ProviderError(502)));
    req.end(payload);
  });
};
