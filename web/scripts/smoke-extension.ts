import { chromium, expect } from "@playwright/test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { mn } from "../src/lib/i18n/mn";

const extensionPath = fileURLToPath(new URL("../../extension/dist/", import.meta.url));
const manifest = JSON.parse(await readFile(join(extensionPath, "manifest.json"), "utf8")) as {
  manifest_version: number;
  permissions: string[];
  host_permissions: string[];
};
assert.equal(manifest.manifest_version, 3);
assert.ok(!manifest.host_permissions.includes("<all_urls>"));
const directory = await mkdtemp(join(tmpdir(), "homework-extension-smoke-"));
const context = await chromium.launchPersistentContext(directory, {
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  viewport: { width: 390, height: 844 },
  ignoreDefaultArgs: ["--disable-extensions"],
  args: ["--enable-unsafe-extension-debugging"],
});
try {
  const browser = context.browser();
  assert.ok(browser);
  const protocol = await browser.newBrowserCDPSession();
  const loaded = await protocol.send("Extensions.loadUnpacked", { path: extensionPath });
  const extensionId = loaded.id;
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker", { timeout: 15000 }));
  assert.equal(new URL(worker.url()).host, extensionId);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(page.locator(".brand")).toContainText(mn.brand);
  await expect(page.getByRole("heading").first()).toHaveText(
    new RegExp(`${mn.setupTitle}|${mn.welcome}`),
  );
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: join(directory, "sidepanel.png"), fullPage: true });
  console.log(
    `Extension loaded successfully in Chrome. Screenshot: ${join(directory, "sidepanel.png")}`,
  );
} finally {
  await context.close();
}
