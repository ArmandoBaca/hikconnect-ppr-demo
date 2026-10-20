import { config } from "@/lib/config";
import { hctFetch } from "./client";
import { getCamera } from "./cameras";
import { getDeviceCode } from "@/lib/deviceCodes";
import { mockPlaybackSession, mockRecordingSearch } from "@/lib/mock/fixtures";
import { effectiveMode } from "@/lib/settings";
import type { RecordingSearchResult, RecordingSegment, StreamSession } from "./types";

interface StreamTokenData {
  appToken?: string;
  streamAreaDomain?: string;
}

interface LiveAddressData {
  url?: string;
  playUrl?: string;
}

interface HctRecordSearchData {
  pageIndex?: number;
  pageSize?: number;
  recordList?: Array<{
    beginTime?: string;
    endTime?: string;
    targetType?: number;
  }>;
}

export type RecordingTargetType = 0 | 1;

export interface SearchRecordingsInput {
  beginTime: string;
  endTime: string;
  /** 0 = local device, 1 = cloud storage. */
  targetType: RecordingTargetType;
  pageIndex?: number;
  pageSize?: number;
  /** 0 = client time, 1 = device local time. Default 0. */
  timeType?: 0 | 1;
}

export interface PlaybackInput {
  beginTime: string;
  endTime: string;
  targetType: RecordingTargetType;
  code?: string;
}

/**
 * Convierte `2024-11-28T11:39:14+08:00` → `2024-11-28 11:39:14`.
 * Live/address pide hora de pared sin volver a aplicar zona horaria.
 */
export function toPlaybackWallTime(isoWithOffset: string): string {
  const m = isoWithOffset.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  if (!m) {
    throw new Error(`Formato de tiempo inválido para playback: ${isoWithOffset}`);
  }
  return `${m[1]} ${m[2]}`;
}

function normalizeSegment(raw: {
  beginTime?: string;
  endTime?: string;
  targetType?: number;
}): RecordingSegment | null {
  if (!raw.beginTime || !raw.endTime) return null;
  const targetType = raw.targetType === 1 ? 1 : 0;
  return { beginTime: raw.beginTime, endTime: raw.endTime, targetType };
}

export async function searchRecordings(
  mode: string,
  cameraId: string,
  input: SearchRecordingsInput,
): Promise<RecordingSearchResult> {
  if ((await effectiveMode(mode)) === "mock") {
    return mockRecordingSearch(cameraId, input.targetType, input.pageIndex ?? 1, input.pageSize ?? 20);
  }

  const camera = await getCamera(mode, cameraId);
  if (!camera) throw new Error("Camara no encontrada o fuera de allowlist");

  const pageIndex = Math.max(1, input.pageIndex ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));

  const data = await hctFetch<HctRecordSearchData>("/video/v1/record/element/search", {
    // Hik consulta el índice histórico del dispositivo/nube y puede superar
    // el límite general de 15 s. Se deja margen antes del maxDuration de la ruta.
    timeoutMs: 50000,
    body: {
      pageSize,
      pageIndex,
      cameraId: camera.id,
      filter: {
        timeType: input.timeType ?? 0,
        beginTime: input.beginTime,
        endTime: input.endTime,
        targetType: input.targetType,
      },
    },
  });

  const items = (data.recordList ?? [])
    .map(normalizeSegment)
    .filter((s): s is RecordingSegment => s !== null);

  return {
    items,
    pageIndex: data.pageIndex ?? pageIndex,
    pageSize: data.pageSize ?? pageSize,
  };
}

/**
 * type "2" = playback local, "3" = playback cloud (PDF §5.5.1).
 * Solo EZOPEN (protocol 1): RTMP/HLS no soportan playback.
 */
export async function createPlaybackSession(
  mode: string,
  cameraId: string,
  input: PlaybackInput,
): Promise<StreamSession> {
  if ((await effectiveMode(mode)) === "mock") {
    return mockPlaybackSession(cameraId, input.beginTime, input.endTime);
  }

  const camera = await getCamera(mode, cameraId);
  if (!camera) throw new Error("Camara no encontrada o fuera de allowlist");

  const effectiveCode =
    input.code ?? (await getDeviceCode(camera.serial)) ?? config.deviceCodes()[camera.serial];

  const type = input.targetType === 1 ? "3" : "2";
  const startTime = toPlaybackWallTime(input.beginTime);
  const stopTime = toPlaybackWallTime(input.endTime);

  const [streamToken, live] = await Promise.all([
    hctFetch<StreamTokenData>("/platform/v1/streamtoken/get", { method: "GET" }),
    hctFetch<LiveAddressData>("/video/v1/live/address/get", {
      body: {
        resourceId: camera.id,
        deviceSerial: camera.serial,
        type,
        protocol: 1,
        quality: "1",
        startTime,
        stopTime,
        ...(effectiveCode ? { code: effectiveCode } : {}),
      },
    }),
  ]);

  const playUrl = live.url ?? live.playUrl;
  if (!playUrl || !streamToken.appToken || !streamToken.streamAreaDomain) {
    const keys = [...Object.keys(live), ...Object.keys(streamToken)].join(",");
    throw new Error(`HCT no devolvio url/appToken/streamAreaDomain (campos recibidos: ${keys})`);
  }

  return {
    url: playUrl,
    accessToken: streamToken.appToken,
    domain: streamToken.streamAreaDomain,
    template: "pcRec",
    mock: false,
    cameraId,
  };
}
