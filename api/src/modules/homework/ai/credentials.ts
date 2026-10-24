import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../../../config.ts";
import { fail } from "../errors.ts";

const encryptionKey = () => {
  const value = env.HOMEWORK_API_KEY_SECRET;
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) return null;
  const key = Buffer.from(value, "base64");
  return key.length === 32 ? key : null;
};

export const keyStorageEnabled = () => encryptionKey() !== null;

export function encryptApiKey(apiKey: string, owner: string) {
  const key = encryptionKey();
  if (!key)
    return fail(
      "API_KEY_STORAGE_UNAVAILABLE",
      "Ask your administrator to configure API key encryption.",
    );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(owner));
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptApiKey(encrypted: string, owner: string) {
  const key = encryptionKey();
  if (!key)
    return fail(
      "API_KEY_STORAGE_UNAVAILABLE",
      "Ask your administrator to configure API key encryption.",
    );
  try {
    const [version, iv, tag, ciphertext, extra] = encrypted.split(".");
    if (version !== "v1" || !iv || !tag || !ciphertext || extra)
      throw new Error("Invalid credential");
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(owner));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return fail(
      "API_KEY_STORAGE_UNAVAILABLE",
      "Cannot read the saved API key. Please save your key again in Settings.",
    );
  }
}
