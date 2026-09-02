import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCameras } from "@/lib/hct/cameras";
import { getDoors } from "@/lib/hct/doors";
import { config } from "@/lib/config";
import { effectiveMode, isDryRun } from "@/lib/settings";

async function DashboardData() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [cameras, doors] = await Promise.all([
    getCameras(config.mode),
    getDoors(config.mode),
  ]);
  const online = cameras.filter((c) => c.online).length;

  return (
    <div className="grid">
      <Link href="/cameras" className="card" style={{ display: "block" }}>
        <h3>Cámaras</h3>
        <div className="stat">{cameras.length}</div>
        <div className="meta">{online} en línea</div>
      </Link>
      <Link href="/doors" className="card" style={{ display: "block" }}>
        <h3>Puertas</h3>
        <div className="stat">{doors.length}</div>
        <div className="meta">{doors.filter((d) => d.online).length} en línea</div>
      </Link>
      <Link href="/events" className="card" style={{ display: "block" }}>
        <h3>Marcaciones</h3>
        <div className="stat ok">48 h</div>
        <div className="meta">Eventos de acceso recientes</div>
      </Link>
    </div>
  );
}

// El modo y el dry-run efectivos salen de la cookie por navegador, que se lee
// en cada request: por eso va aparte del shell estático.
async function StatusLine() {
  await connection();
  const [mode, dryRun] = await Promise.all([effectiveMode(), isDryRun()]);
  return (
    <>
      {" "}
      · modo {mode}
      {dryRun ? " · dry-run (comandos simulados)" : ""}
    </>
  );
}

export default function DashboardPage() {
  return (
    <>
      <h1 className="page-title">Panel</h1>
      <p className="page-sub">
        POC de Video y Control de Acceso sobre Hik-Connect for Teams
        <Suspense fallback={null}>
          <StatusLine />
        </Suspense>
      </p>
      <Suspense fallback={<div className="spinner" />}>
        <DashboardData />
      </Suspense>
    </>
  );
}
