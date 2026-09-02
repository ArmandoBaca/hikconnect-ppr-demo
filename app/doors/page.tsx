import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDoors } from "@/lib/hct/doors";
import { config } from "@/lib/config";
import { HctError } from "@/lib/hct/client";
import { RequireKeys } from "@/components/RequireKeys";
import { DoorExplorer } from "@/components/DoorExplorer";
import type { FilterValues } from "@/lib/filters";

async function DoorList({ filters }: { filters: FilterValues }) {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const doors = await getDoors(config.mode);
    return (
      <DoorExplorer
        doors={doors}
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

async function DoorsResolver({
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
    enc: "",
  };
  return <DoorList filters={filters} />;
}

export default function DoorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <h1 className="page-title">Puertas</h1>
      <p className="page-sub">
        Control de acceso · los comandos exigen motivo y quedan en audit log
      </p>
      <Suspense fallback={<div className="spinner" />}>
        <RequireKeys>
          <DoorsResolver searchParams={searchParams} />
        </RequireKeys>
      </Suspense>
    </>
  );
}
