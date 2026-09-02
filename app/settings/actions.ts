"use server";

import { getSession } from "@/lib/auth/session";
import {
  setDryRunOverride,
  setModeOverride,
  effectiveMode,
  setHctField,
  setHctKeys,
  forgetHctKeys,
  hasHctKeys,
} from "@/lib/settings";
import type { PocMode } from "@/lib/config";
import { deleteDeviceCode } from "@/lib/deviceCodes";
import { audit } from "@/lib/audit";

type ActionResult = { ok: boolean; error?: string; warning?: string };

export async function setDryRun(enabled: boolean): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "operator") {
    return { ok: false, error: "Se requiere rol operator" };
  }
  try {
    await setDryRunOverride(enabled);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error guardando" };
  }
  await audit({
    actor: session.username,
    action: "set_dry_run",
    resource: "settings",
    result: enabled ? "dry-run ON (comandos simulados)" : "dry-run OFF (comandos reales)",
    at: new Date().toISOString(),
  });
  return { ok: true };
}

export async function setMode(mode: PocMode): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "operator") {
    return { ok: false, error: "Se requiere rol operator" };
  }
  try {
    await setModeOverride(mode);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error guardando" };
  }
  await audit({
    actor: session.username,
    action: "set_mode",
    resource: "settings",
    result: mode === "live" ? "live (tenant real)" : "mock (datos de ejemplo)",
    at: new Date().toISOString(),
  });
  if (mode === "live" && (await effectiveMode()) === "mock") {
    return { ok: true, warning: "Sigue en mock: faltan AppKey y SecretKey en este navegador." };
  }
  return { ok: true };
}

export async function removeDeviceCode(serial: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "operator") {
    return { ok: false, error: "Se requiere rol operator" };
  }
  try {
    await deleteDeviceCode(serial);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error eliminando" };
  }
  await audit({
    actor: session.username,
    action: "delete_device_code",
    resource: serial,
    result: "ok (desde configuración)",
    at: new Date().toISOString(),
  });
  return { ok: true };
}

export async function saveHctField(
  field: "host" | "appKey" | "secretKey",
  value: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Inicia sesión" };
  const v = value.trim();
  if (!v) return { ok: false, error: "El valor no puede estar vacío" };
  if (field === "host" && !/^https:\/\/.+/.test(v)) {
    return { ok: false, error: "El host debe ser una URL https://" };
  }
  try {
    await setHctField(field, v);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error guardando" };
  }
  await audit({
    actor: session.username,
    action: "save_hct_field",
    resource: field,
    result: field === "secretKey" ? "actualizada" : v.slice(0, 12) + (v.length > 12 ? "…" : ""),
    at: new Date().toISOString(),
  });
  if (field !== "host" && !(await hasHctKeys())) {
    return {
      ok: true,
      warning: field === "appKey" ? "Guardado · falta SecretKey" : "Guardado · falta AppKey",
    };
  }
  return { ok: true };
}

export async function saveHctKeys(appKey: string, secretKey: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Inicia sesión para guardar las claves" };
  if (!appKey.trim() || !secretKey.trim()) {
    return { ok: false, error: "AppKey y SecretKey son obligatorias" };
  }
  try {
    await setHctKeys(appKey.trim(), secretKey.trim());
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error guardando" };
  }
  await audit({
    actor: session.username,
    action: "save_hct_keys",
    resource: "browser-cookie",
    result: `appKey ${appKey.trim().slice(0, 4)}…`,
    at: new Date().toISOString(),
  });
  return { ok: true };
}

export async function forgetBrowserKeys(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Inicia sesión" };
  try {
    await forgetHctKeys();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
  await audit({
    actor: session.username,
    action: "forget_hct_keys",
    resource: "browser-cookie",
    result: "ok",
    at: new Date().toISOString(),
  });
  return { ok: true };
}
