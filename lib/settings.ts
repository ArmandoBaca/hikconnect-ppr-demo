import { config } from "@/lib/config";
import type { PocMode } from "@/lib/config";
import type { HctCreds } from "@/lib/hctCookie";
import { clearHctCookie, readHctCookie, writeHctCookie } from "@/lib/hctCookie";

export interface RuntimeSettings {
  dryRun?: boolean;
  mode?: PocMode;
}

export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  const cookie = await readHctCookie();
  return { dryRun: cookie?.dryRun, mode: cookie?.mode };
}

export async function setDryRunOverride(value: boolean): Promise<void> {
  const settings = (await readHctCookie()) ?? {};
  await writeHctCookie({ ...settings, dryRun: value });
}

export async function isDryRun(): Promise<boolean> {
  const settings = await getRuntimeSettings();
  return settings.dryRun ?? true;
}

export async function setModeOverride(value: PocMode): Promise<void> {
  const settings = (await readHctCookie()) ?? {};
  await writeHctCookie({ ...settings, mode: value });
}

// Modo pedido por el usuario, sin considerar si hay claves. Para la UI.
export async function getRequestedMode(): Promise<PocMode> {
  const settings = await getRuntimeSettings();
  return settings.mode ?? "mock";
}

export interface HctKeys {
  appKey: string;
  secretKey: string;
  source: "cookie" | "settings" | "env";
}

export async function getHctKeys(): Promise<HctKeys> {
  const fromCookie = await readHctCookie();
  const appKey = fromCookie?.appKey || process.env.HCT_APP_KEY || "";
  const secretKey = fromCookie?.secretKey || process.env.HCT_SECRET_KEY || "";
  if (!appKey || !secretKey) {
    throw new Error(
      "Faltan credenciales del OpenAPI: captura AppKey y SecretKey en este navegador.",
    );
  }
  const source = fromCookie?.appKey || fromCookie?.secretKey ? "cookie" : "env";
  return { appKey, secretKey, source };
}

export async function getHctHost(): Promise<string> {
  const fromCookie = await readHctCookie();
  if (fromCookie?.host) return fromCookie.host.replace(/\/$/, "");
  return config.hct.host.replace(/\/$/, "");
}

async function currentCreds(): Promise<HctCreds> {
  const cookie = await readHctCookie();
  return {
    ...cookie,
    host: (cookie?.host ?? config.hct.host).replace(/\/$/, ""),
    appKey: cookie?.appKey || process.env.HCT_APP_KEY || "",
    secretKey: cookie?.secretKey || process.env.HCT_SECRET_KEY || "",
  };
}

// Guarda un campo suelto sin exigir que los otros ya existan: de lo contrario
// no habria forma de capturar AppKey y SecretKey una por una.
export async function setHctField(
  field: "host" | "appKey" | "secretKey",
  value: string,
): Promise<void> {
  const current = await currentCreds();
  if (field === "host") current.host = value.replace(/\/$/, "");
  if (field === "appKey") current.appKey = value;
  if (field === "secretKey") current.secretKey = value;
  await writeHctCookie(current);
}

export async function setHctKeys(appKey: string, secretKey: string): Promise<void> {
  const current = (await readHctCookie()) ?? {};
  const host = await getHctHost();
  await writeHctCookie({ ...current, host, appKey, secretKey });
}

export async function forgetHctKeys(): Promise<void> {
  const current = await readHctCookie();
  if (!current) return;
  const { host: _host, appKey: _appKey, secretKey: _secretKey, ...preferences } = current;
  if (Object.keys(preferences).length === 0) {
    await clearHctCookie();
    return;
  }
  await writeHctCookie(preferences);
}

export async function hasHctKeys(): Promise<boolean> {
  try {
    await getHctKeys();
    return true;
  } catch {
    return false;
  }
}

// El override de la cookie manda sobre POC_MODE de .env.local, y sin claves en
// este navegador el demo cae a fixtures (simulados) aunque pida live.
export async function effectiveMode(_requested: string = "mock"): Promise<PocMode> {
  const settings = await getRuntimeSettings();
  const wanted = settings.mode ?? "mock";
  if (wanted !== "live") return "mock";
  return (await hasHctKeys()) ? "live" : "mock";
}
