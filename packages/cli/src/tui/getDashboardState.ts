/**
 * FILE: getDashboardState.ts
 * PURPOSE: Read the selected OKX profile and expose only safe dashboard status fields.
 * LAYER: service
 * DEPENDS_ON: @agent-tradekit/core config readers, ../commands/diagnose-utils.js
 * RULES:
 * - Never copy API keys, secret keys, or passphrases into the dashboard state or terminal output.
 */
import { configFilePath, readFullConfig } from "@agent-tradekit/core";
import { readCliVersion } from "../commands/diagnose-utils.js";
import type { TuiDashboardState } from "./types.js";

/**
 * PURPOSE: Summarize the selected profile, trading mode, and credential readiness without revealing secrets.
 * INPUT:
 * - none
 * OUTPUT:
 * - TuiDashboardState — version, selected profile, mode, readiness, config path, and profile names only
 * USES:
 * - readFullConfig, configFilePath, readCliVersion
 * EFFECT:
 * - io
 * ERRORS:
 * - Propagates malformed configuration or filesystem read errors from readFullConfig.
 * RULES:
 * - Credential values are read only to compute a boolean and are never returned or logged.
 */
export function getDashboardState(): TuiDashboardState {
  const config = readFullConfig();
  const activeProfile = config.default_profile ?? "default";
  const profile = config.profiles[activeProfile];
  const apiKey = process.env.OKX_API_KEY?.trim() ?? profile?.api_key ?? "";
  const secretKey = process.env.OKX_SECRET_KEY?.trim() ?? profile?.secret_key ?? "";
  const passphrase = process.env.OKX_PASSPHRASE?.trim() ?? profile?.passphrase ?? "";
  const credentialsReady = apiKey.length > 0 && secretKey.length > 0 && passphrase.length > 0;
  const demoMode = process.env.OKX_DEMO === "1" || process.env.OKX_DEMO === "true" || profile?.demo === true;
  const mode = demoMode ? "DEMO" : profile === undefined ? "NOT CONFIGURED" : "LIVE";

  return {
    version: readCliVersion(),
    activeProfile,
    mode,
    credentialsReady,
    configPath: configFilePath(),
    profileNames: Object.keys(config.profiles),
  };
}
