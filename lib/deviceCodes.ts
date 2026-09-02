import { readHctCookie, writeHctCookie } from "@/lib/hctCookie";

// Códigos por navegador dentro de la misma cookie cifrada de configuración.
// Esto evita depender del sistema de archivos efímero de Vercel.

export async function readDeviceCodes(): Promise<Record<string, string>> {
  return (await readHctCookie())?.deviceCodes ?? {};
}

export async function getDeviceCode(serial: string): Promise<string | undefined> {
  const map = await readDeviceCodes();
  return map[serial];
}

export async function saveDeviceCode(serial: string, code: string): Promise<void> {
  const settings = (await readHctCookie()) ?? {};
  await writeHctCookie({
    ...settings,
    deviceCodes: { ...settings.deviceCodes, [serial]: code },
  });
}

export async function deleteDeviceCode(serial: string): Promise<void> {
  const settings = await readHctCookie();
  if (!settings) return;
  const map = { ...settings.deviceCodes };
  if (!(serial in map)) return;
  delete map[serial];
  await writeHctCookie({ ...settings, deviceCodes: map });
}
