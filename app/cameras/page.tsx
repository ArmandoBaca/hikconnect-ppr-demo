import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getCamerasWithEncryption } from "@/lib/hct/cameras";
import { config } from "@/lib/config";
import { HctError } from "@/lib/hct/client";
import { RequireKeys } from "@/components/RequireKeys";
import { CameraExplorer } from "@/components/CameraExplorer";
import type { FilterValues } from "@/lib/filters";

async function CameraList({ filters }: { filters: FilterValues }) {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const cameras = await getCamerasWithEncryption(config.mode);
    return (
      <CameraExplorer
        cameras={cameras}
        initialFilters={filters}
        isOperator={session.role === "operator"}
      />
    );
  } catch (e) {
    const message =
      e instanceof HctError
        ? `${e.errorCode}: ${e.message}`
        : e instanceof Error
          ? e.message
          : "Error consultando HCT";
    return <div className="alert error">{message}</div>;
  }
}

async function CamerasResolver({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const filters: FilterValues = {
    q: one(sp.q),
    area: one(sp.area),
    status: one(sp.status),
    enc: one(sp.enc),
  };
  return <CameraList filters={filters} />;
}

export default function CamerasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <h1 className="page-title">Cámaras</h1>
      <p className="page-sub">Inventario SYSCOM vía Hik-Connect for Teams</p>
      <Suspense fallback={<div className="spinner" />}>
        <RequireKeys>
          <CamerasResolver searchParams={searchParams} />
        </RequireKeys>
      </Suspense>
    </>
  );
}
