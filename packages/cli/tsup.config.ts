/**
 * FILE: tsup.config.ts
 * PURPOSE: Define reproducible Node.js bundles for the CLI and interactive terminal dashboard.
 * LAYER: config
 * DEPENDS_ON: tsup, node:child_process
 * RULES:
 * - Keep each executable as a separate bundle entry so published bin commands resolve independently.
 */
import { defineConfig } from "tsup";
import { execSync } from "node:child_process";

const gitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();

export default defineConfig({
  entry: ["src/index.ts", "src/tui.ts"],
  format: ["esm"],
  platform: "node",
  target: "node18",
  sourcemap: true,
  clean: true,
  dts: false,
  noExternal: ["@agent-tradekit/core"],
  external: ["undici", "yauzl"],
  banner: { js: "#!/usr/bin/env node" },
  define: { __GIT_HASH__: JSON.stringify(gitHash) },
});
