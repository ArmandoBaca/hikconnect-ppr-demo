import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getCamerasWithEncryption } from "@/lib/hct/cameras";
import { config } from "@/lib/config";
import { CameraLive } from "@/components/CameraLive";
import { RequireKeys } from "@/components/RequireKeys";

async function CameraDetail({ id }: { id: string }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const camera = (await getCamerasWithEncryption(config.mode)).find((c) => c.id === id);
  if (!camera) {
    return <div className="alert error">Cámara no encontrada (o fuera de la allowlist).</div>;
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 20 }}>{camera.name}</h3>
          <span className="row">
            {camera.encrypted === true && <span className="badge warn">Stream cifrado · pide código</span>}
            {camera.encrypted === false && <span className="badge ok">Sin cifrar</span>}
            <span className={`badge ${camera.online ? "ok" : "off"}`}>
              {camera.online ? "En línea" : "Fuera de línea"}
            </span>
          </span>
        </div>
        <div className="meta">{camera.area || "Sin área"}</div>
        <div className="mono">
          id {camera.id} · serial {camera.serial} · canal {camera.channel}
        </div>
      </div>
      <Suspense fallback={<div className="player-box"><div className="spinner" /></div>}>
        <CameraLive id={id} serial={camera.serial} encrypted={camera.encrypted} />
      </Suspense>
    </>
  );
}

async function CameraResolver({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CameraDetail id={id} />;
}

export default function CameraPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <p style={{ marginTop: 24 }}>
        <Link href="/cameras">← Cámaras</Link>
      </p>
      <Suspense fallback={<div className="spinner" />}>
        <RequireKeys>
          <CameraResolver params={params} />
        </RequireKeys>
      </Suspense>
    </>
  );
}
