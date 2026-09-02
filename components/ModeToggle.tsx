"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMode } from "@/app/settings/actions";
import type { PocMode } from "@/lib/config";

// Interruptor en caliente de POC_MODE: guarda la preferencia cifrada en la
// cookie del navegador. live = tenant real; mock = fixtures locales.
export function ModeToggle({ requested }: { requested: PocMode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);

  function choose(mode: PocMode) {
    startTransition(async () => {
      try {
        const res = await setMode(mode);
        if (!res.ok) {
          setMessage({ text: res.error ?? "Error", tone: "warn" });
          return;
        }
        setMessage(res.warning ? { text: res.warning, tone: "warn" } : null);
        router.refresh();
      } catch (e) {
        setMessage({ text: e instanceof Error ? e.message : "Error", tone: "warn" });
      }
    });
  }

  return (
    <span className="row">
      <button
        className={requested === "live" ? "btn sm" : "btn ghost sm"}
        disabled={pending}
        onClick={() => choose("live")}
      >
        Live (tenant real)
      </button>
      <button
        className={requested === "mock" ? "btn sm" : "btn ghost sm"}
        disabled={pending}
        onClick={() => choose("mock")}
      >
        Mock (datos de ejemplo)
      </button>
      {message && <span className={`badge ${message.tone}`}>{message.text}</span>}
    </span>
  );
}
