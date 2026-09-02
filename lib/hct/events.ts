import { hctFetch } from "./client";
import { describeEvent } from "./eventTypes";
import { mockEvents } from "@/lib/mock/fixtures";
import { effectiveMode } from "@/lib/settings";
import type { AccessEvent, Paged } from "./types";

// Esquema real de recordList (verificado en el tenant). La doc del OpenAPI
// documenta personName/certType planos, pero el API devuelve la persona
// anidada en personInfo.baseInfo y la credencial como eventType numerico.
interface HctRecord {
  recordGuid?: string;
  elementId?: string;
  elementName?: string;
  areaName?: string;
  deviceName?: string;
  cardNumber?: string;
  eventType?: number;
  swipeAuthResult?: number;
  occurTime?: string;
  deviceTime?: string;
  personInfo?: {
    id?: string;
    baseInfo?: {
      firstName?: string;
      lastName?: string;
      personCode?: string;
    };
  };
}

interface HctRecordPage {
  totalNum?: number;
  totalCount?: number;
  recordList?: HctRecord[];
}

// Muchos tenants enrolan a la gente con el numero de empleado en ambos campos
// ("240" / "240"): repetirlo en la tabla no aporta nada.
function personLabel(node: HctRecord): string {
  const base = node.personInfo?.baseInfo;
  const first = (base?.firstName ?? "").trim();
  const last = (base?.lastName ?? "").trim();
  const name = first && last ? (first === last ? first : `${first} ${last}`) : first || last;
  if (name) return name;

  const code = (base?.personCode ?? "").trim();
  if (code) return code;

  const card = (node.cardNumber ?? "").trim();
  if (card) return `Tarjeta ${card.length > 4 ? `••••${card.slice(-4)}` : card}`;

  return "Desconocido";
}

function normalize(node: HctRecord, index: number): AccessEvent {
  const { method, reason } = describeEvent(node.eventType);
  const granted = node.swipeAuthResult === 1;
  const base = node.personInfo?.baseInfo;

  return {
    id: node.recordGuid ?? `${node.occurTime ?? ""}-${index}`,
    personName: personLabel(node),
    personId: node.personInfo?.id ?? "",
    personCode: (base?.personCode ?? "").trim(),
    card: (node.cardNumber ?? "").trim(),
    doorName: node.elementName ?? node.deviceName ?? "",
    area: node.areaName ?? "",
    method: method || "—",
    result: granted ? "Éxito" : "Denegado",
    detail: granted ? "" : reason ?? "",
    // occurTime viene en UTC (sufijo Z); deviceTime trae el offset del sitio.
    time: node.deviceTime || node.occurTime || "",
  };
}

// Dinamico a proposito: las marcaciones cambian constantemente.
// elementId filtra por punto de acceso (searchCriteria.elementIDs del OpenAPI).
export async function getAccessEvents(
  mode: string,
  pageIndex: number,
  pageSize: number,
  elementId?: string,
): Promise<Paged<AccessEvent>> {
  if ((await effectiveMode(mode)) === "mock") {
    const start = (pageIndex - 1) * pageSize;
    return {
      items: mockEvents.slice(start, start + pageSize),
      total: mockEvents.length,
      pageIndex,
      pageSize,
    };
  }

  const end = new Date();
  const begin = new Date(end.getTime() - 48 * 3600 * 1000);
  const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "+00:00");

  const data = await hctFetch<HctRecordPage>("/acs/v1/event/certificaterecords/search", {
    body: {
      pageIndex,
      pageSize: Math.min(pageSize, 200),
      searchCriteria: {
        beginTime: iso(begin),
        endTime: iso(end),
        type: 0,
        swipeAuthResult: 0,
        searchType: 0,
        ...(elementId ? { elementIDs: elementId } : {}),
      },
    },
  });

  const records = data.recordList ?? [];
  return {
    items: records.map(normalize),
    total: data.totalNum ?? data.totalCount ?? records.length,
    pageIndex,
    pageSize,
  };
}
