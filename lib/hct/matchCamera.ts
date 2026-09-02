import type { Camera, Door } from "./types";

/** El live EZOPEN usa camera.id, no door.id. Un terminal de acceso con video
 *  suele aparecer en ambos inventarios con el mismo serial (y a veces canal). */
export function findCameraForDoor(door: Door, cameras: Camera[]): Camera | null {
  const sameSerial = cameras.filter((c) => c.serial && c.serial === door.serial);
  if (sameSerial.length === 0) return null;
  const sameChannel = sameSerial.find((c) => c.channel === door.channel);
  return sameChannel ?? sameSerial[0] ?? null;
}
