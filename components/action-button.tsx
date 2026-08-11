"use client";

import { useState, type ReactNode } from "react";
import { IconCheck } from "./icons";

type Props = {
  children: ReactNode;
  onAction: () => void | Promise<void>;
  className?: string;
  loadingLabel?: string;
  successLabel?: string;
  icon?: ReactNode;
};

/** Button that shows a spinner while its async action runs, then a brief success check. */
export function ActionButton({ children, onAction, className = "iris-btn", loadingLabel, successLabel, icon }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function run() {
    if (state !== "idle") return;
    setState("loading");
    try {
      await Promise.resolve(onAction());
      setState("done");
      setTimeout(() => setState("idle"), 1600);
    } catch {
      setState("idle");
    }
  }

  return (
    <button className={className} onClick={run} disabled={state === "loading"} data-state={state}>
      {state === "loading" && <span className="iris-spinner" aria-hidden />}
      {state === "done" && <IconCheck style={{ width: 16, height: 16 }} />}
      {state === "idle" && icon}
      {state === "loading" ? loadingLabel || "Working…" : state === "done" ? successLabel || "Done" : children}
    </button>
  );
}
