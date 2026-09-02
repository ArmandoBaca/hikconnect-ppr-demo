import { mkdir, appendFile } from "fs/promises";
import os from "os";
import path from "path";

const DATA_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "poc-hct") : path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "audit.jsonl");

export interface AuditEntry {
  actor: string;
  action: string;
  resource: string;
  reason?: string;
  result: string;
  at: string;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await mkdir(path.dirname(FILE), { recursive: true });
    await appendFile(FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // El audit no debe tumbar la operacion; en produccion va a un servicio dedicado.
  }
}
