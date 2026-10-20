/*
 * SPDX-FileCopyrightText: 2026 Pokegame
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Pokegame hook.
 *
 * The game is served under Pokegame's origin. Every session save reports the wave reached to
 * `/api/rogue/event` (same origin, session cookie); the server turns waves into credits (1 per wave,
 * 2 in Daily Run), checks the pace and caps the day. The HUD shows the player's credits where the
 * score used to be. Nothing here changes gameplay. Source of this fork: https://github.com/RealDevQuant/pokerogue
 */

type SessionReport = { slot: number; wave: number; mode: string; playTime: number; seed: string };

const apiBase: string = import.meta.env.VITE_POKEGAME_API ?? "";

let lastKey = "";
let credits = 0;
let refreshHud: (() => void) | null = null;

/** The player's credits as last reported by the server (0 when signed out or unknown). */
export function getCredits(): number {
  return credits;
}

/** The battle scene registers how to redraw its HUD when the credits change. */
export function onCreditsChange(fn: () => void): void {
  refreshHud = fn;
}

function setCredits(n: unknown): void {
  if (typeof n !== "number" || !Number.isFinite(n) || n === credits) {
    return;
  }
  credits = n;
  try {
    refreshHud?.();
  } catch {
    // the HUD may not exist yet
  }
}

/** Read the credits once at start-up (silent when signed out). */
export function initPokegame(): void {
  fetch(`${apiBase}/api/me`, { credentials: "include" })
    .then(async r => {
      if (!r.ok) {
        return;
      }
      const j = await r.json();
      setCredits(j?.stats?.credits);
    })
    .catch(() => {});
}

/** Report a session save (one call per wave) or the end of a run. Duplicates are skipped client-side. */
export function reportSession(s: SessionReport, over = false): void {
  if (!s.seed || !Number.isFinite(s.wave)) {
    return;
  }
  const key = `${s.slot}:${s.seed}:${s.wave}:${over ? 1 : 0}`;
  if (key === lastKey) {
    return;
  }
  lastKey = key;
  fetch(`${apiBase}/api/rogue/event`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...s, over }),
  })
    .then(async r => {
      if (!r.ok) {
        return;
      }
      const j = await r.json().catch(() => null);
      setCredits(j?.credits);
    })
    .catch(() => {});
}
