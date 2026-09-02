import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAccessEvents } from "@/lib/hct/events";
import { config } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import { HctError } from "@/lib/hct/client";
import { RequireKeys } from "@/components/RequireKeys";

const PAGE_SIZE = 20;

async function EventsTable({ page }: { page: number }) {
  const session = await getSession();
  if (!session) redirect("/login");

  let data;
  try {
    data = await getAccessEvents(config.mode, page, PAGE_SIZE);
  } catch (e) {
    const message =
      e instanceof HctError
        ? `${e.errorCode}: ${e.message}`
        : e instanceof Error
          ? e.message
          : "Error consultando HCT";
    return <div className="alert error">{message}</div>;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <>
      <table className="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Persona</th>
            <th>Puerta</th>
            <th>Método</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((evt) => (
            <tr key={evt.id}>
              <td className="mono">{formatDateTime(evt.time)}</td>
              <td>
                {evt.personName}
                {evt.personCode && evt.personCode !== evt.personName && (
                  <div className="mono">{evt.personCode}</div>
                )}
              </td>
              <td>
                {evt.doorName || "—"}
                {evt.area && <div className="mono">{evt.area}</div>}
              </td>
              <td>{evt.method}</td>
              <td>
                <span className={`badge ${evt.result === "Éxito" ? "ok" : "warn"}`}>
                  {evt.result || "—"}
                </span>
                {evt.detail && <div className="mono">{evt.detail}</div>}
              </td>
            </tr>
          ))}
          {data.items.length === 0 && (
            <tr>
              <td colSpan={5} className="mono">Sin marcaciones en las últimas 48 h.</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="pager">
        {page > 1 && (
          <Link className="btn ghost sm" href={`/events?page=${page - 1}`}>← Anterior</Link>
        )}
        <span className="mono">
          página {data.pageIndex} de {totalPages} · {data.total} eventos
        </span>
        {page < totalPages && (
          <Link className="btn ghost sm" href={`/events?page=${page + 1}`}>Siguiente →</Link>
        )}
      </div>
    </>
  );
}

async function EventsResolver({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const pageIndex = Math.max(1, Number(page) || 1);
  return <EventsTable page={pageIndex} />;
}

export default function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <>
      <h1 className="page-title">Marcaciones</h1>
      <p className="page-sub">Eventos de acceso de las últimas 48 horas (dinámico, sin cache)</p>
      <Suspense fallback={<div className="spinner" />}>
        <RequireKeys>
          <EventsResolver searchParams={searchParams} />
        </RequireKeys>
      </Suspense>
    </>
  );
}
