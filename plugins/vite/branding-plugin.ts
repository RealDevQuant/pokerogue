/*
 * Pokegame branding: after the assets submodule has been copied into dist, lay our own files over it
 * (icons, web manifest). The submodule is upstream's and stays untouched; everything we override lives in branding/.
 */
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Plugin } from "vite";

export function brandingPlugin(): Plugin {
  return {
    name: "pokegame-branding",
    apply: "build",
    enforce: "post",
    closeBundle(): void {
      const from = resolve("branding");
      const to = resolve("dist");
      if (!existsSync(from) || !existsSync(to)) {
        return;
      }
      for (const file of readdirSync(from)) {
        copyFileSync(join(from, file), join(to, file));
      }
    },
  };
}
