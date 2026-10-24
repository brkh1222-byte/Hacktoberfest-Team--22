// Builds the distributable erxes plugin: release/homework-<version>/ and a
// .tar.gz of it. The archive holds everything a buyer deploys (API image
// sources with a frozen lockfile, the static UI remote, docs) and no
// node_modules, so nothing built for this machine's OS is shipped.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(join(root, "erxes.json"), "utf8"));
const name = `${manifest.name}-${manifest.version}`;
const releaseDir = join(root, "release");
const out = join(releaseDir, name);
const staging = join(releaseDir, ".deploy");

const run = (command, args, cwd = root) =>
  execFileSync(command, args, { cwd, stdio: "inherit" });

rmSync(out, { recursive: true, force: true });
rmSync(staging, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

run("pnpm", ["run", "codegen"]);
run("pnpm", ["--filter", "homework_api", "test"]);
run("pnpm", ["--filter", "homework_api", "build"]);
run("pnpm", ["--filter", "homework_ui", "build"]);

// `pnpm deploy` resolves the API's own lockfile (exact versions, including
// the OpenTelemetry/Sentry pins) out of the workspace.
run("pnpm", ["--filter", "homework_api", "deploy", "--prod", staging]);

const apiOut = join(out, "api");
mkdirSync(apiOut, { recursive: true });
for (const file of ["dist", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]) {
  cpSync(join(staging, file), join(apiOut, file), { recursive: true });
}
rmSync(staging, { recursive: true, force: true });

cpSync(join(root, "ui", "dist"), join(out, "ui"), { recursive: true });
cpSync(join(root, "erxes.json"), join(out, "erxes.json"));
cpSync(join(root, "release-template", "Dockerfile"), join(out, "Dockerfile"));
cpSync(join(root, "release-template", "env.example"), join(out, ".env.example"));
cpSync(join(root, "docs", "installation.md"), join(out, "INSTALL.md"));
mkdirSync(join(out, "docs"), { recursive: true });
cpSync(join(root, "docs", "erxes-integration.md"), join(out, "docs", "erxes-integration.md"));
if (existsSync(join(root, "LICENSE"))) cpSync(join(root, "LICENSE"), join(out, "LICENSE"));

writeFileSync(
  join(out, "release.json"),
  `${JSON.stringify(
    {
      plugin: manifest.name,
      version: manifest.version,
      ui: { remote: manifest.ui.remote, entry: "ui/remoteEntry.js" },
      api: { image: "Dockerfile", port: 80, health: manifest.api.health },
      erxes: "3.3.2+",
      builtAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);

run("tar", ["-czf", `${name}.tar.gz`, name], releaseDir);
console.log(`\nRelease ready: release/${name}/ and release/${name}.tar.gz`);
