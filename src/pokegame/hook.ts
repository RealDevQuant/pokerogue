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
 * and caps the day. A small badge shows the day's points, or a sign-in link. Nothing here changes gameplay.
 */

type SessionReport = { slot: number; wave: number; mode: string; playTime: number; seed: string };

const apiBase: string = import.meta.env.VITE_POKEGAME_API ?? "";
const siteUrl: string = import.meta.env.VITE_POKEGAME_SITE ?? "/";
const sourceUrl = "https://github.com/RealDevQuant/pokerogue";

let lastKey = "";
let badge: HTMLDivElement | null = null;
let flashTimer: ReturnType<typeof setTimeout> | undefined;
const state: { signedIn: boolean | null; today: number; cap: number; name: string; flash: string } = {
  signedIn: null,
  today: 0,
  cap: 0,
  name: "",
  flash: "",
};

function render(): void {
  if (!badge) {
    return;
  }
  const link = (href: string, text: string, external = false) =>
    `<a href="${href}" ${external ? 'target="_blank" rel="noreferrer"' : ""} style="color:#ffc83d;text-decoration:none">${text}</a>`;
  let body: string;
  if (state.signedIn === false) {
    body = `${link(siteUrl, "Sign in on Pokegame")} to earn points`;
  } else if (state.signedIn === true) {
    body = `${state.name ? `${state.name} · ` : ""}<b style="color:#ffc83d">${state.today}</b>/${state.cap} pts today${state.flash ? ` <span style="color:#7be0a4">${state.flash}</span>` : ""}`;
  } else {
    body = "connecting…";
  }
  badge.innerHTML = `<span style="font-weight:700">${link(siteUrl, "Pokegame")}</span> · ${body} · <span style="opacity:.6">${link(sourceUrl, "source", true)}</span>`;
}

/** Mount the badge once the page exists. Safe to call more than once. */
export function initPokegameBadge(): void {
  if (badge || typeof document === "undefined") {
    return;
  }
  badge = document.createElement("div");
  badge.id = "pokegame-badge";
  badge.style.cssText =
    "position:fixed;left:10px;bottom:10px;z-index:9999;font:13px/1.4 system-ui,sans-serif;color:#eef1fb;"
    + "background:rgba(11,16,32,.82);border:1px solid #27315a;border-radius:999px;padding:6px 12px;pointer-events:auto;"
    + "backdrop-filter:blur(6px);max-width:calc(100vw - 20px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
  document.body.appendChild(badge);
  render();
  fetch(`${apiBase}/api/me`, { credentials: "include" })
    .then(async r => {
      if (r.status === 401) {
        state.signedIn = false;
      } else if (r.ok) {
        const j = await r.json();
        state.signedIn = true;
        state.name = j?.user?.name ?? "";
        state.today = j?.stats?.todayCounted ?? 0;
        state.cap = j?.stats?.dailyCap ?? 0;
      }
      render();
    })
    .catch(() => {
      state.signedIn = false;
      render();
    });
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
      if (r.status === 401) {
        state.signedIn = false;
        render();
        return;
      }
      const j = await r.json().catch(() => null);
      if (!r.ok || !j) {
        return;
      }
      state.signedIn = true;
      state.today = j.todayCounted ?? state.today;
      state.cap = j.dailyCap ?? state.cap;
      if (j.points > 0) {
        state.flash = `+${j.points}`;
        clearTimeout(flashTimer);
        flashTimer = setTimeout(() => {
          state.flash = "";
          render();
        }, 2500);
      }
      render();
    })
    .catch(() => {});
}
