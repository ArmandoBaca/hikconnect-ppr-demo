import { mkdir, readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";

const DATA_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "poc-hct") : path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "encryption.json");

export interface EncryptionInfo {
  encrypted: boolean;
  at: string;
}

export type EncryptionMap = Record<string, EncryptionInfo>;

export async function readEncryptionMap(): Promise<EncryptionMap> {
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw) as EncryptionMap;
  } catch {
    return {};
  }
}

export async function writeEncryptionMap(map: EncryptionMap): Promise<void> {
  try {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(map, null, 2), "utf8");
  } catch {
    // En Vercel /tmp es efímero; no tumbar sync ni la UI de configuración.
  }
}
