const J = (s: unknown) => JSON.stringify(s);

/**
 * Client tracker shipped inside exported sites. Listens for tel: CTA clicks and
 * beacons them to the Iris appliance — works from any host the zip is deployed on.
 */
export function renderIrisTrack(origin: string, key: string): string {
  return `"use client";

import { useEffect } from "react";

const ORIGIN = ${J(origin)};
const KEY = ${J(key)};

function placementOf(el: Element): string {
  if (el.closest("[data-mobile-call]")) return "mobile-bar";
  if (el.closest("header")) return "header";
  if (el.closest("footer")) return "footer";
  const cls = (el.closest("section")?.className || "").toString();
  if (cls.indexOf("-hero") !== -1) return "hero";
  if (cls.indexOf("v-sec-cta") !== -1 || cls.indexOf("-cta") !== -1) return "cta-band";
  return "other";
}

function isCallCta(el: Element): boolean {
  if (!(el instanceof HTMLAnchorElement)) return false;
  const href = (el.getAttribute("href") || "").trim().toLowerCase();
  if (href.indexOf("tel:") === 0) return true;
  return el.getAttribute("data-iris-cta") === "call";
}

function send(placement: string, path: string) {
  if (!ORIGIN || !KEY) return;
  const body = JSON.stringify({
    key: KEY,
    type: "cta_click",
    placement: placement,
    path: path.slice(0, 200),
  });
  const url = ORIGIN + "/api/t";
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
      return;
    }
  } catch {
    // ignore
  }
  try {
    fetch(url, { method: "POST", body: body, mode: "cors", keepalive: true, headers: { "Content-Type": "text/plain" } });
  } catch {
    // ignore
  }
}

export function IrisTrack() {
  useEffect(() => {
    if (!ORIGIN || !KEY) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link || !isCallCta(link)) return;
      send(placementOf(link), window.location.pathname || "/");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
`;
}
