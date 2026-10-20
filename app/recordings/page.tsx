import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getCamerasWithEncryption } from "@/lib/hct/cameras";
import { config } from "@/lib/config";
import { HctError } from "@/lib/hct/client";
import { RequireKeys } from "@/components/RequireKeys";
import { RecordingsExplorer } from "@/components/RecordingsExplorer";

async function RecordingsBody({ cameraId }: { cameraId?: string }) {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const cameras = await getCamerasWithEncryption(config.mode);
    return <RecordingsExplorer cameras={cameras} initialCameraId={cameraId} />;
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

async function RecordingsResolver({
  searchParams,
}: {
  searchParams: Promise<{ camera?: string }>;
}) {
  const { camera } = await searchParams;
  return <RecordingsBody cameraId={camera} />;
}

export default function RecordingsPage({
  searchParams,
}: {
  searchParams: Promise<{ camera?: string }>;
}) {
  return (
    <>
      <h1 className="page-title">Grabaciones</h1>
      <p className="page-sub">
        Busca segmentos anteriores (local o nube) y reprodúcelos con EZOPEN — OpenAPI V2.15.0
        §5.5.1
      </p>
      <Suspense fallback={<div className="spinner" />}>
        <RequireKeys>
          <RecordingsResolver searchParams={searchParams} />
        </RequireKeys>
      </Suspense>
    </>
  );
}
