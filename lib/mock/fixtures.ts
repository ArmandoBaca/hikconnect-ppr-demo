import type {
  Camera,
  Door,
  AccessEvent,
  StreamSession,
  RecordingSearchResult,
  PersonGroup,
  Person,
  AccessLevel,
  PlatformUser,
} from "@/lib/hct/types";

export const mockCameras: Camera[] = [
  { id: "mock-cam-01", name: "Entrada principal", online: true, area: "Oficinas SYSCOM", serial: "MOCK0001", channel: "1", encrypted: false },
  { id: "mock-cam-02", name: "Estacionamiento norte", online: true, area: "Exteriores", serial: "MOCK0002", channel: "1", encrypted: true },
  { id: "mock-cam-03", name: "Almacén andén 3", online: false, area: "Almacén", serial: "MOCK0003", channel: "2", encrypted: false },
  { id: "mock-cam-04", name: "Recepción piso 1", online: true, area: "Oficinas SYSCOM", serial: "MOCK0004", channel: "1", encrypted: null },
  { id: "mock-cam-05", name: "Cuarto de servidores", online: true, area: "TI", serial: "MOCK0005", channel: "1", encrypted: true },
];

export const mockDoors: Door[] = [
  { id: "mock-door-01", name: "Puerta recepción", online: true, area: "Oficinas SYSCOM", serial: "MOCK0001", channel: "1" },
  { id: "mock-door-02", name: "Puerta almacén", online: true, area: "Almacén", serial: "MOCK0003", channel: "2" },
  { id: "mock-door-03", name: "Puerta laboratorio", online: false, area: "TI", serial: "MOCKK2000", channel: "1" },
];

const now = Date.now();
export const mockEvents: AccessEvent[] = [
  { id: "evt-1", personName: "Ana Martínez", personId: "mock-per-01", personCode: "EMP001", doorName: "Puerta recepción", area: "Oficinas SYSCOM", method: "Tarjeta", result: "Éxito", time: new Date(now - 12 * 60000).toISOString() },
  { id: "evt-2", personName: "Carlos Ruiz", personId: "mock-per-02", personCode: "EMP002", doorName: "Puerta almacén", area: "Almacén", method: "Huella", result: "Éxito", time: new Date(now - 47 * 60000).toISOString() },
  { id: "evt-3", personName: "Tarjeta ••••4821", card: "90014821", doorName: "Puerta recepción", area: "Oficinas SYSCOM", method: "Tarjeta", result: "Denegado", detail: "Tarjeta no existe", time: new Date(now - 95 * 60000).toISOString() },
  { id: "evt-4", personName: "Lucía Gómez", personId: "mock-per-03", personCode: "EMP003", doorName: "Puerta laboratorio", area: "TI", method: "Rostro", result: "Éxito", time: new Date(now - 180 * 60000).toISOString() },
  { id: "evt-5", personName: "Pedro Sosa", personId: "mock-per-04", personCode: "CTR001", doorName: "Puerta almacén", area: "Almacén", method: "Rostro", result: "Denegado", detail: "Fuera del horario permitido", time: new Date(now - 240 * 60000).toISOString() },
  { id: "evt-6", personName: "Ana Martínez", personId: "mock-per-01", personCode: "EMP001", doorName: "Puerta almacén", area: "Almacén", method: "Tarjeta", result: "Éxito", time: new Date(now - 300 * 60000).toISOString() },
];

export function mockStreamSession(cameraId: string): StreamSession {
  return {
    url: `ezopen://open.ezviz.com/MOCK0001/1.hd.live`,
    accessToken: "at.mock-token-sin-validez",
    domain: "https://iusopen.ezvizlife.com",
    template: "pcLive",
    mock: true,
    cameraId,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Offset local del host (p. ej. -06:00) para fixtures de búsqueda. */
function localOffset(): string {
  const mins = -new Date().getTimezoneOffset();
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

function localIso(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    localOffset()
  );
}

export function mockRecordingSearch(
  _cameraId: string,
  targetType: 0 | 1,
  pageIndex: number,
  pageSize: number,
): RecordingSearchResult {
  const dayStart = new Date();
  dayStart.setHours(8, 0, 0, 0);
  const items = [
    {
      beginTime: localIso(dayStart),
      endTime: localIso(new Date(dayStart.getTime() + 45 * 60_000)),
      targetType,
    },
    {
      beginTime: localIso(new Date(dayStart.getTime() + 2 * 3600_000)),
      endTime: localIso(new Date(dayStart.getTime() + 2 * 3600_000 + 12 * 60_000)),
      targetType,
    },
    {
      beginTime: localIso(new Date(dayStart.getTime() + 5 * 3600_000)),
      endTime: localIso(new Date(dayStart.getTime() + 5 * 3600_000 + 90 * 60_000)),
      targetType,
    },
  ] as const;

  return {
    items: [...items],
    pageIndex,
    pageSize,
  };
}

export function mockPlaybackSession(
  cameraId: string,
  beginTime: string,
  _endTime: string,
): StreamSession {
  return {
    url: `ezopen://open.ezviz.com/MOCK0001/1.rec?begin=${encodeURIComponent(beginTime)}`,
    accessToken: "at.mock-token-sin-validez",
    domain: "https://iusopen.ezvizlife.com",
    template: "pcRec",
    mock: true,
    cameraId,
  };
}

export const mockPersonGroups: PersonGroup[] = [
  { id: "mock-grp-01", name: "Empleados", personCount: 3, fullPath: "/Empleados" },
  { id: "mock-grp-02", name: "Contratistas", personCount: 1, fullPath: "/Contratistas" },
];

export const mockPersons: Person[] = [
  { id: "mock-per-01", code: "EMP001", firstName: "Ana", lastName: "Martínez", phone: "5551234001", email: "ana@syscom.demo", startDate: "2026-01-01T00:00:00-06:00", endDate: "2030-12-31T23:59:59-06:00" },
  { id: "mock-per-02", code: "EMP002", firstName: "Carlos", lastName: "Ruiz", phone: "5551234002", email: "carlos@syscom.demo", startDate: "2026-01-01T00:00:00-06:00", endDate: "2030-12-31T23:59:59-06:00" },
  { id: "mock-per-03", code: "EMP003", firstName: "Lucía", lastName: "Gómez", phone: "", email: "lucia@syscom.demo", startDate: "2026-01-01T00:00:00-06:00", endDate: "2030-12-31T23:59:59-06:00" },
  { id: "mock-per-04", code: "CTR001", firstName: "Pedro", lastName: "Sosa", phone: "", email: "", startDate: "2026-03-01T00:00:00-06:00", endDate: "2026-12-31T23:59:59-06:00" },
];

export const mockAccessLevels: AccessLevel[] = [
  { id: "mock-lvl-01", name: "Acceso general", remark: "Recepción y almacén", resourceCount: 2 },
  { id: "mock-lvl-02", name: "Solo recepción", remark: "", resourceCount: 1 },
];

export const mockPlatformUsers: PlatformUser[] = [
  { id: "mock-usr-01", name: "operador.syscom" },
  { id: "mock-usr-02", name: "seguridad.syscom" },
];
