import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDoors } from "@/lib/hct/doors";
import { getCamerasWithEncryption } from "@/lib/hct/cameras";
import { findCameraForDoor } from "@/lib/hct/matchCamera";
import { getAccessEvents } from "@/lib/hct/events";
import { HctError } from "@/lib/hct/client";
import { config } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import { effectiveMode } from "@/lib/settings";
import { DoorActions } from "@/components/DoorActions";
import { CameraLive } from "@/components/CameraLive";
import { RequireKeys } from "@/components/RequireKeys";
import type { Camera, Door } from "@/lib/hct/types";

async function DoorEvents({ door }: { door: Door }) {
  try {
    // En live filtra server-side por punto de acceso (elementIDs); en mock por nombre.
    const paged = await getAccessEvents(config.mode, 1, 10, door.id);
    const items =
      (await effectiveMode()) === "mock"
        ? paged.items.filter((e) => e.doorName === door.name)
        : paged.items;

    if (items.length === 0) {
      return <div className="card mono">Sin marcaciones en las últimas 48 h.</div>;
    }
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Persona</th>
            <th>Método</th>
            <th>Resultado</th>
            <th>Hora</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id}>
              <td>{e.personName}</td>
              <td>{e.method}</td>
              <td>
                <span className={`badge ${e.result === "Éxito" ? "ok" : "warn"}`}>{e.result || "—"}</span>
                {e.detail && <div className="mono">{e.detail}</div>}
              </td>
              <td className="mono">{formatDateTime(e.time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } catch (e) {
    const message = e instanceof HctError ? `${e.errorCode}: ${e.message}` : "Error consultando marcaciones";
    return <div className="alert error">{message}</div>;
  }
}

function DoorVideo({ camera }: { camera: Camera | null }) {
  if (!camera) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Video</h3>
        <p className="meta">
          Este punto de acceso no tiene cámara en el inventario de video (mismo serial). Es
          habitual en lectores o cerraduras sin canal de imagen. El live de Hik-Connect usa el{" "}
          <code>id</code> de cámara, no el de la puerta.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <h3>Video</h3>
        <Link href={`/cameras/${camera.id}`}>{camera.name} →</Link>
      </div>
      <p className="meta" style={{ marginBottom: 12 }}>
        Canal {camera.channel} · serial {camera.serial}
        {camera.encrypted === true ? " · stream cifrado" : ""}
      </p>
      <Suspense fallback={<div className="player-box compact"><div className="spinner" /></div>}>
        <CameraLive id={camera.id} serial={camera.serial} encrypted={camera.encrypted} />
      </Suspense>
    </div>
  );
}

async function DoorDetail({ id }: { id: string }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [doors, cameras] = await Promise.all([
    getDoors(config.mode),
    getCamerasWithEncryption(config.mode),
  ]);
  const door = doors.find((d) => d.id === id);
  if (!door) {
    return <div className="alert error">Puerta no encontrada.</div>;
  }

  const camera = findCameraForDoor(door, cameras);
  const isOperator = session.role === "operator";

  return (
    <>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 20 }}>{door.name}</h3>
          <span className={`badge ${door.online ? "ok" : "off"}`}>
            {door.online ? "En línea" : "Fuera de línea"}
          </span>
        </div>
        <div className="meta">{door.area || "Sin área"}</div>
        <div className="mono">
          id {door.id} · serial {door.serial} · canal {door.channel}
        </div>
      </div>

      <div className="door-ops">
        <DoorVideo camera={camera} />
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Comandos remotos</h3>
          {isOperator ? (
            <>
              <p className="meta" style={{ marginBottom: 12 }}>
                Cada comando exige motivo y queda en el audit log. "Abrir" es un pulso; "Dejar
                abierta/bloqueada" mantiene el estado hasta nuevo comando.
              </p>
              <DoorActions doorId={door.id} doorName={door.name} full />
            </>
          ) : (
            <div className="alert info">Rol viewer: solo lectura. Los comandos requieren rol operator.</div>
          )}
        </div>
      </div>

      <h3 style={{ marginBottom: 12 }}>Marcaciones recientes (48 h)</h3>
      <Suspense fallback={<div className="card"><div className="spinner" /></div>}>
        <DoorEvents door={door} />
      </Suspense>
    </>
  );
}

async function DoorResolver({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DoorDetail id={id} />;
}

export default function DoorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <p style={{ marginTop: 24 }}>
        <Link href="/doors">← Puertas</Link>
      </p>
      <Suspense fallback={<div className="spinner" />}>
        <RequireKeys>
          <DoorResolver params={params} />
        </RequireKeys>
      </Suspense>
    </>
  );
}
