import type { Camera, Door } from "@/lib/hct/types";

export interface FilterValues {
  q: string;
  area: string;
  status: string;
  enc: string;
}

export function applyCameraFilters(cameras: Camera[], f: FilterValues): Camera[] {
  const q = f.q.trim().toLowerCase();
  return cameras.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q) && !c.serial.toLowerCase().includes(q)) return false;
    if (f.area && c.area !== f.area) return false;
    if (f.status === "online" && !c.online) return false;
    if (f.status === "offline" && c.online) return false;
    if (f.enc === "plain" && c.encrypted !== false) return false;
    if (f.enc === "encrypted" && c.encrypted !== true) return false;
    if (f.enc === "unknown" && c.encrypted !== null && c.encrypted !== undefined) return false;
    return true;
  });
}

export function applyDoorFilters(doors: Door[], f: FilterValues): Door[] {
  const q = f.q.trim().toLowerCase();
  return doors.filter((d) => {
    if (q && !d.name.toLowerCase().includes(q) && !d.serial.toLowerCase().includes(q)) return false;
    if (f.area && d.area !== f.area) return false;
    if (f.status === "online" && !d.online) return false;
    if (f.status === "offline" && d.online) return false;
    return true;
  });
}

export function filtersToQuery(f: FilterValues, withEnc: boolean): string {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set("q", f.q.trim());
  if (f.area) params.set("area", f.area);
  if (f.status) params.set("status", f.status);
  if (withEnc && f.enc) params.set("enc", f.enc);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
