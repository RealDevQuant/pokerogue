/*
 * SPDX-FileCopyrightText: 2026 Pokegame
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * Pokegame hook.
 *
 * The game is served under Pokegame's origin. Every session save reports the wave reached to
 * `/api/rogue/event` (same origin, session cookie); the server awards points per wave, checks the pace
 * and caps the day. Points, rank and prizes are shown on the Pokegame site, not inside the game.
 * Nothing here changes gameplay. Source of this fork: https://github.com/RealDevQuant/pokerogue
 */

type SessionReport = { slot: number; wave: number; mode: string; playTime: number; seed: string };

const apiBase: string = import.meta.env.VITE_POKEGAME_API ?? "";

let lastKey = "";

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
  }).catch(() => {});
}
