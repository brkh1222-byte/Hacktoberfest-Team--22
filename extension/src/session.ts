import type { SessionStore } from "@/components/AuthProvider";

export const extensionDb: SessionStore = {
  async get() {
    const value = await chrome.storage.local.get("homework_session");
    return typeof value.homework_session === "string" ? value.homework_session : null;
  },
  async set(token) { await chrome.storage.local.set({ homework_session: token }); },
  async clear() { await chrome.storage.local.remove("homework_session"); },
};
