"use server";

import { revalidateTag } from "next/cache";
import { syncEncryptionBatch } from "@/lib/hct/encryption";
import { invalidateCameraInventory } from "@/lib/hct/cameras";
import { invalidateDoorInventory } from "@/lib/hct/doors";
import { getHctKeys } from "@/lib/settings";
import { config } from "@/lib/config";

async function currentAppKey(): Promise<string | undefined> {
  try {
    return (await getHctKeys()).appKey;
  } catch {
    return undefined;
  }
}

export async function refreshCameras() {
  invalidateCameraInventory(await currentAppKey());
  revalidateTag("cameras", "max");
}

export async function refreshDoors() {
  invalidateDoorInventory(await currentAppKey());
  revalidateTag("doors", "max");
}

export async function syncEncryption() {
  const result = await syncEncryptionBatch(config.mode, 50);
  revalidateTag("cameras", "max");
  return result;
}
