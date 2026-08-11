import { existsSync, mkdirSync } from "fs";
import path from "path";

/**
 * Resolve the data directory for persisted projects and users.
 *
 * In the container IRIS_DATA_DIR=/data (a mounted volume). For local dev that path
 * usually isn't writable, so if the configured directory can't be created we fall
 * back to <cwd>/data. This keeps the same code path working in both environments.
 */
function resolveDataDir(): string {
  const configured = process.env.IRIS_DATA_DIR;
  const fallback = path.join(process.cwd(), "data");
  if (!configured) return fallback;
  try {
    mkdirSync(configured, { recursive: true });
    return configured;
  } catch {
    // Configured path not writable (e.g. /data on a dev laptop) — use local fallback.
    try {
      if (!existsSync(fallback)) mkdirSync(fallback, { recursive: true });
    } catch {
      // If even the fallback fails we return it anyway; callers surface the error.
    }
    return fallback;
  }
}

export const DATA_DIR = resolveDataDir();
