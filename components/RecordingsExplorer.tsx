"use client";

import { useMemo, useState } from "react";
import type { Camera, RecordingSegment, StreamSession } from "@/lib/hct/types";
import { EzopenPlayer } from "./EzopenPlayer";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function localOffset(): string {
  const mins = -new Date().getTimezoneOffset();
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Valor inicial para `<input type="datetime-local">` (sin segundos ni offset). */
function toDatetimeLocalValue(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** `YYYY-MM-DDTHH:mm` → `YYYY-MM-DDTHH:mm:ss±HH:mm` con offset del navegador. */
function toSearchIso(localValue: string): string {
  const withSeconds = localValue.length === 16 ? `${localValue}:00` : localValue;
  return `${withSeconds}${localOffset()}`;
}

function defaultRange(): { begin: string; end: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 0, 0);
  return { begin: toDatetimeLocalValue(start), end: toDatetimeLocalValue(end) };
}

function formatSegment(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function segmentKey(seg: RecordingSegment): string {
  return `${seg.beginTime}|${seg.endTime}|${seg.targetType}`;
}

type PlayState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "needsCode"; segment: RecordingSegment }
  | { status: "ready"; session: StreamSession; segment: RecordingSegment; code?: string }
  | { status: "error"; message: string };

export function RecordingsExplorer({
  cameras,
  initialCameraId,
}: {
  cameras: Camera[];
  initialCameraId?: string;
}) {
  const defaults = useMemo(() => defaultRange(), []);
  const [cameraId, setCameraId] = useState(
    initialCameraId && cameras.some((c) => c.id === initialCameraId)
      ? initialCameraId
      : cameras[0]?.id ?? "",
  );
  const [cameraQuery, setCameraQuery] = useState("");
  const [beginLocal, setBeginLocal] = useState(defaults.begin);
  const [endLocal, setEndLocal] = useState(defaults.end);
  const [targetType, setTargetType] = useState<0 | 1>(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [items, setItems] = useState<RecordingSegment[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [emptyHint, setEmptyHint] = useState(false);
  const [play, setPlay] = useState<PlayState>({ status: "idle" });
  const [code, setCode] = useState("");
  const pageSize = 20;

  const filteredCameras = useMemo(() => {
    const q = cameraQuery.trim().toLowerCase();
    if (!q) return cameras;
    return cameras.filter((c) => {
      const haystack = `${c.name} ${c.serial} ${c.area} ${c.channel} ch${c.channel}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [cameras, cameraQuery]);

  const selectedCamera = cameras.find((c) => c.id === cameraId);

  function selectCamera(id: string) {
    setCameraId(id);
    setItems(null);
    setEmptyHint(false);
    setSearchError("");
    setPlay({ status: "idle" });
  }

  async function runSearch(page = 1) {
    if (!cameraId) return;
    setSearching(true);
    setSearchError("");
    setEmptyHint(false);
    setPlay({ status: "idle" });
    try {
      const res = await fetch(`/api/cameras/${cameraId}/recordings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beginTime: toSearchIso(beginLocal),
          endTime: toSearchIso(endLocal),
          targetType,
          pageIndex: page,
          pageSize,
          timeType: 0,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        items?: RecordingSegment[];
        pageIndex?: number;
        error?: string;
        message?: string;
      } | null;
      if (!res.ok) {
        setItems(null);
        setSearchError(data?.message ?? data?.error ?? "Error buscando grabaciones");
        return;
      }
      const list = data?.items ?? [];
      setItems(list);
      setPageIndex(data?.pageIndex ?? page);
      setEmptyHint(list.length === 0);
    } catch (e) {
      setItems(null);
      setSearchError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setSearching(false);
    }
  }

  async function playSegment(segment: RecordingSegment, deviceCode?: string) {
    setPlay({ status: "loading" });
    try {
      const res = await fetch(`/api/cameras/${cameraId}/playback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beginTime: segment.beginTime,
          endTime: segment.endTime,
          targetType: segment.targetType,
          ...(deviceCode ? { code: deviceCode } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | (StreamSession & { error?: string; message?: string })
        | null;
      if (res.status === 409) {
        setPlay({ status: "needsCode", segment });
        return;
      }
      if (!res.ok || !data || !("url" in data)) {
        setPlay({
          status: "error",
          message: data?.message ?? data?.error ?? "Error creando sesión de playback",
        });
        return;
      }
      setPlay({ status: "ready", session: data, segment, code: deviceCode });
    } catch (e) {
      setPlay({
        status: "error",
        message: e instanceof Error ? e.message : "Error de red",
      });
    }
  }

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (play.status !== "needsCode") return;
    void playSegment(play.segment, code.trim());
  }

  if (cameras.length === 0) {
    return <div className="alert warn">No hay cámaras en el inventario para consultar grabaciones.</div>;
  }

  return (
    <div className="recordings-layout">
      <div className="card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch(1);
          }}
        >
          <label htmlFor="rec-camera-q">Buscar cámara</label>
          <input
            id="rec-camera-q"
            className="input"
            placeholder="Nombre, serial, área o canal…"
            value={cameraQuery}
            onChange={(e) => {
              const next = e.target.value;
              setCameraQuery(next);
              const q = next.trim().toLowerCase();
              const matches = q
                ? cameras.filter((c) =>
                    `${c.name} ${c.serial} ${c.area} ${c.channel} ch${c.channel}`
                      .toLowerCase()
                      .includes(q),
                  )
                : cameras;
              if (matches.length > 0 && !matches.some((c) => c.id === cameraId)) {
                selectCamera(matches[0].id);
              }
            }}
          />
          <label htmlFor="rec-camera">
            Cámara
            <span className="mono">
              {" "}
              · {filteredCameras.length} de {cameras.length}
            </span>
          </label>
          <select
            id="rec-camera"
            className="input"
            value={filteredCameras.some((c) => c.id === cameraId) ? cameraId : ""}
            onChange={(e) => selectCamera(e.target.value)}
          >
            {filteredCameras.length === 0 && <option value="">Sin coincidencias</option>}
            {filteredCameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.area ? ` · ${c.area}` : ""} · {c.serial} · CH{c.channel}
              </option>
            ))}
          </select>

          <div className="row" style={{ marginTop: 4 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label htmlFor="rec-begin">Inicio (hora local)</label>
              <input
                id="rec-begin"
                type="datetime-local"
                className="input"
                value={beginLocal}
                onChange={(e) => setBeginLocal(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label htmlFor="rec-end">Fin (hora local)</label>
              <input
                id="rec-end"
                type="datetime-local"
                className="input"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
                required
              />
            </div>
          </div>

          <label htmlFor="rec-target">Origen</label>
          <select
            id="rec-target"
            className="input"
            value={targetType}
            onChange={(e) => setTargetType(Number(e.target.value) === 1 ? 1 : 0)}
          >
            <option value={0}>Almacenamiento local del dispositivo</option>
            <option value={1}>Almacenamiento en la nube</option>
          </select>

          <div className="row" style={{ marginTop: 18 }}>
            <button
              type="submit"
              className="btn"
              disabled={searching || !filteredCameras.some((c) => c.id === cameraId)}
            >
              {searching ? "Buscando…" : "Buscar segmentos"}
            </button>
            {selectedCamera && (
              <span className="mono">
                offset navegador {localOffset()} · canal {selectedCamera.channel}
              </span>
            )}
          </div>
        </form>

        {searchError && <div className="alert error">{searchError}</div>}
        {emptyHint && (
          <div className="alert info">
            No hay segmentos en ese intervalo. La cámara puede no tener grabación local o en
            nube habilitada, o el dispositivo estuvo fuera de línea.
          </div>
        )}

        {items && items.length > 0 && (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Origen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((seg) => (
                  <tr key={segmentKey(seg)}>
                    <td className="mono">{formatSegment(seg.beginTime)}</td>
                    <td className="mono">{formatSegment(seg.endTime)}</td>
                    <td>
                      <span className="badge ok">
                        {seg.targetType === 1 ? "Nube" : "Local"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => void playSegment(seg)}
                      >
                        Reproducir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pager">
              {pageIndex > 1 && (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => void runSearch(pageIndex - 1)}
                >
                  ← Anterior
                </button>
              )}
              <span className="mono">
                página {pageIndex} · {items.length} segmentos
              </span>
              {items.length >= pageSize && (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => void runSearch(pageIndex + 1)}
                >
                  Siguiente →
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div>
        {play.status === "idle" && (
          <div className="card">
            <p className="meta" style={{ margin: 0 }}>
              Busca un rango y elige un segmento para reproducirlo con EZOPEN (`type` 2 local /
              3 nube).
            </p>
          </div>
        )}
        {play.status === "loading" && (
          <div className="player-box">
            <div className="spinner" />
          </div>
        )}
        {play.status === "error" && <div className="alert error">{play.message}</div>}
        {play.status === "needsCode" && (
          <div className="card">
            <div className="alert info">
              Esta cámara tiene el stream cifrado. Captura el código de verificación del
              dispositivo para reproducir la grabación.
            </div>
            <form onSubmit={submitCode}>
              <label htmlFor="rec-code">Código de verificación</label>
              <input
                id="rec-code"
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                required
              />
              <div className="row" style={{ marginTop: 14 }}>
                <button type="submit" className="btn">
                  Reproducir con código
                </button>
              </div>
            </form>
          </div>
        )}
        {play.status === "ready" && (
          <>
            <div className="mono" style={{ marginBottom: 8 }}>
              {formatSegment(play.segment.beginTime)} → {formatSegment(play.segment.endTime)}
            </div>
            <EzopenPlayer
              session={play.session}
              onPlaying={() => {
                if (!play.code) return;
                fetch(`/api/cameras/${cameraId}/code`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: play.code }),
                });
              }}
              onError={() => {
                if (selectedCamera?.encrypted === true || play.code) {
                  setPlay({ status: "needsCode", segment: play.segment });
                  return;
                }
                setPlay({
                  status: "error",
                  message: "No se pudo reproducir el segmento. Revisa el intervalo y el origen.",
                });
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
