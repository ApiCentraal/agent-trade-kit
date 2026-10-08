/**
 * FILE: selectSkillAction.ts
 * PURPOSE: Search, inspect, verify, install, download, and remove marketplace skills safely.
 * LAYER: controller
 * DEPENDS_ON: node:readline/promises, ../types.js, ../agentSkillsScan.js
 * RULES:
 * - Skill installation must retain signature verification; destructive or filesystem-writing operations require exact confirmation.
 */
import type { Interface } from "node:readline/promises";
import type { TuiDashboardState } from "../types.js";
import { listAgentSkillDirs } from "../agentSkillsScan.js";

/**
 * PURPOSE: Route skill-management choices to existing CLI commands with constrained names and explicit consent.
 * INPUT:
 * - input: Interface — prompt channel for skill identifiers, paths, and confirmations
 * - state: TuiDashboardState — active profile for marketplace requests that require credentials
 * OUTPUT:
 * - Promise<string[] | undefined> — CLI arguments or undefined when the user cancels/chooses an invalid option
 * USES:
 * - Interface.question, TuiDashboardState, listAgentSkillDirs
 * EFFECT:
 * - io
 * ERRORS:
 * - Rejects if terminal input closes while a skill operation is being confirmed.
 * RULES:
 * - Never pass --force to skill add; installs use the CLI's signature verification, and add/download/remove require exact confirmation.
 * - "Installed skills" first shows a read-only ~/.agents/skills scan because registry-untracked installs would otherwise be invisible.
 */
export async function selectSkillAction(
  input: Interface,
  state: TuiDashboardState,
): Promise<string[] | undefined> {
  process.stdout.write("\n  Tools & skills\n");
  process.stdout.write("  1  Browse tool catalog\n");
  process.stdout.write("  2  Search skill marketplace\n");
  process.stdout.write("  3  Skill categories\n");
  process.stdout.write("  4  Installed skills\n");
  process.stdout.write("  5  Check skill version\n");
  process.stdout.write("  6  Verify installed skill\n");
  process.stdout.write("  7  Install signed skill\n");
  process.stdout.write("  8  Download skill package\n");
  process.stdout.write("  9  Remove installed skill\n");
  const choice = (await input.question("  Choose 1–9, or Q to return: ")).trim().toLowerCase();
  const profileArgs = ["--profile", state.activeProfile];

  if (choice === "1") return ["list-tools"];
  if (choice === "3") return ["skill", "categories"];
  if (choice === "4") {
    const agentSkills = listAgentSkillDirs();
    if (agentSkills.length === 0) {
      process.stdout.write("\n  No skills found in the agents directory.\n");
    } else {
      process.stdout.write("\n  Skills installed for agents (~/.agents/skills):\n");
      for (const skill of agentSkills) {
        const safeName = skill.name.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
        process.stdout.write(`    ${safeName}${skill.version ? `  v${skill.version}` : ""}\n`);
      }
      process.stdout.write("  Registry-tracked installs (okx skill add) follow below.\n");
    }
    return ["skill", "list"];
  }

  if (choice === "2") {
    const keyword = (await input.question("  Search keyword (optional): ")).trim();
    if (keyword.length > 80 || /[\u0000-\u001f\u007f]/.test(keyword)) {
      process.stdout.write("  Search keyword must be at most 80 printable characters.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    const args = ["skill", "search"];
    if (keyword) args.push("--keyword", keyword);
    args.push("--limit", "20", ...profileArgs);
    return args;
  }

  if (choice === "5" || choice === "6" || choice === "7" || choice === "8" || choice === "9") {
    const name = (await input.question("  Skill name: ")).trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(name)) {
      process.stdout.write("  Skill name must be a 1–64 character marketplace slug.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    if (choice === "5") return ["skill", "check", name, ...profileArgs];
    if (choice === "6") return ["skill", "verify", name, ...profileArgs];

    if (choice === "7") {
      const confirmation = await input.question("  This installs into detected agents after signature verification. Type INSTALL SKILL: ");
      if (confirmation !== "INSTALL SKILL") {
        process.stdout.write("  Skill installation cancelled.\n");
        await input.question("  Press Enter to return to the dashboard...");
        return undefined;
      }
      return ["skill", "add", name, ...profileArgs];
    }

    if (choice === "8") {
      const format = (await input.question("  Package format (zip or skill; default zip): ")).trim() || "zip";
      if (format !== "zip" && format !== "skill") {
        process.stdout.write("  Choose zip or skill.\n");
        await input.question("  Press Enter to return to the dashboard...");
        return undefined;
      }
      const targetDir = (await input.question("  Destination directory (default current directory): ")).trim() || ".";
      if (targetDir.length > 512 || /[\u0000-\u001f\u007f]/.test(targetDir)) {
        process.stdout.write("  Destination path is invalid or too long.\n");
        await input.question("  Press Enter to return to the dashboard...");
        return undefined;
      }
      const confirmation = await input.question("  This writes a package to the selected directory. Type DOWNLOAD SKILL: ");
      if (confirmation !== "DOWNLOAD SKILL") {
        process.stdout.write("  Skill download cancelled.\n");
        await input.question("  Press Enter to return to the dashboard...");
        return undefined;
      }
      return ["skill", "download", name, "--dir", targetDir, "--format", format, ...profileArgs];
    }

    const confirmation = await input.question("  This removes the skill from detected agents. Type REMOVE SKILL: ");
    if (confirmation !== "REMOVE SKILL") {
      process.stdout.write("  Skill removal cancelled.\n");
      await input.question("  Press Enter to return to the dashboard...");
      return undefined;
    }
    return ["skill", "remove", name];
  }

  return undefined;
}
