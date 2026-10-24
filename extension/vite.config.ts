import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { defineConfig } from "vite";
import tailwind from "@tailwindcss/postcss";
import { mn } from "../web/src/lib/i18n/mn";

const envPath = fileURLToPath(new URL("../web/.env.local", import.meta.url));
const env = existsSync(envPath) ? parseEnv(readFileSync(envPath, "utf8")) : {};
const webUrl = new URL(env.WEB_APP_URL || "http://localhost:3000");
if (
  !["https:", "http:"].includes(webUrl.protocol) ||
  (webUrl.protocol === "http:" && !["localhost", "127.0.0.1"].includes(webUrl.hostname))
)
  throw new Error("WEB_APP_URL must use HTTPS except on localhost.");
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
const hosts = [`${webUrl.origin}/*`, ...(supabaseUrl ? [`${new URL(supabaseUrl).origin}/*`] : [])];

export default defineConfig({
  envPrefix: [],
  resolve: {
    alias: { "@": fileURLToPath(new URL("../web/src", import.meta.url)) },
    dedupe: ["react", "react-dom"],
  },
  define: {
    __WEB_APP_URL__: JSON.stringify(webUrl.origin),
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    ),
  },
  esbuild: { jsx: "automatic" },
  css: { postcss: { plugins: [tailwind()] } },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        sidepanel: fileURLToPath(new URL("sidepanel.html", import.meta.url)),
        background: fileURLToPath(new URL("src/background.ts", import.meta.url)),
      },
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
          validation: ["zod"],
        },
        entryFileNames: (chunk) =>
          chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js",
      },
    },
  },
  plugins: [
    {
      name: "standalone-client-components",
      enforce: "pre",
      // Next needs this boundary; a Chrome side panel runs entirely in the browser.
      transform(code, id) {
        if (id.includes("/web/src/components/") && code.startsWith('"use client";')) {
          return { code: code.replace(/^"use client";\s*/, ""), map: null };
        }
      },
    },
    {
      name: "homework-manifest",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "manifest.json",
          source: JSON.stringify(
            {
              manifest_version: 3,
              name: mn.brand,
              description: mn.description,
              version: "0.1.0",
              minimum_chrome_version: "116",
              permissions: ["sidePanel", "storage", "activeTab", "scripting"],
              host_permissions: [...new Set(hosts)],
              action: { default_title: mn.extensionTitle },
              side_panel: { default_path: "sidepanel.html" },
              background: { service_worker: "background.js", type: "module" },
              content_security_policy: { extension_pages: "script-src 'self'; object-src 'self';" },
            },
            null,
            2,
          ),
        });
      },
    },
  ],
});
