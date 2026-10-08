/**
 * FILE: agentSkillsScan.ts
 * PURPOSE: List skills installed into agent directories that bypass the CLI registry (for example npx skills installs).
 * LAYER: util
 * DEPENDS_ON: node:fs, node:os, node:path
 * RULES:
 * - Read-only directory and front-matter inspection; never executes or renders skill file contents.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * PURPOSE: Enumerate locally installed agent skills with their declared version, independent of the CLI registry.
 * INPUT:
 * - skillsDir: string — override directory for tests; defaults to ~/.agents/skills
 * OUTPUT:
 * - { name: string; version: string }[] — directory names plus parsed front-matter version (empty when absent)
 * USES:
 * - existsSync, readdirSync, readFileSync
 * EFFECT:
 * - none
 * ERRORS:
 * - Returns an empty array when the directory is missing or unreadable.
 * RULES:
 * - Only the first 4 KB of SKILL.md are read; directory names are returned verbatim and must be sanitized by the renderer.
 */
export function listAgentSkillDirs(skillsDir = join(homedir(), ".agents", "skills")): { name: string; version: string }[] {
  if (!existsSync(skillsDir)) return [];
  let entries: string[];
  try {
    entries = readdirSync(skillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() || e.isSymbolicLink())
      .map((e) => e.name);
  } catch {
    return [];
  }

  const skills: { name: string; version: string }[] = [];
  for (const name of entries) {
    let version = "";
    const skillFile = join(skillsDir, name, "SKILL.md");
    try {
      if (existsSync(skillFile)) {
        const head = readFileSync(skillFile, { encoding: "utf-8" }).slice(0, 4096);
        const match = head.match(/version:\s*"?([\d.]+)"?/);
        if (match) version = match[1] ?? "";
      }
    } catch {
      // Unreadable skill files still appear by directory name; version simply stays blank.
    }
    skills.push({ name, version });
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}
