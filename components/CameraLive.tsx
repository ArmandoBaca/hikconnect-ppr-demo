import { connection } from "next/server";
import { createStreamSession } from "@/lib/hct/streams";
import { getDeviceCode } from "@/lib/deviceCodes";
import { HctError } from "@/lib/hct/client";
import { config } from "@/lib/config";
import { EzopenPlayer } from "@/components/EzopenPlayer";
import { LiveWithCode } from "@/components/LiveWithCode";
import { LiveAuto } from "@/components/LiveAuto";

export async function CameraLive({
  id,
  serial,
  encrypted,
}: {
  id: string;
  serial: string;
  encrypted?: boolean | null;
}) {
  // La sesión de stream es secreta y de corta vida: nunca durante el prerender
  // (un llenado frío del inventario puede tumbar la página con USE_CACHE_TIMEOUT).
  await connection();

  let withCode = false;
  if (encrypted === true) {
    const stored = (await getDeviceCode(serial)) ?? config.deviceCodes()[serial];
    if (!stored) return <LiveWithCode cameraId={id} />;
    withCode = true;
  }
  try {
    const session = await createStreamSession(config.mode, id);
    if (withCode) return <LiveAuto session={session} cameraId={id} />;
    return <EzopenPlayer session={session} />;
  } catch (e) {
    if (e instanceof HctError && e.errorCode === "EVZ60019") {
      return <LiveWithCode cameraId={id} />;
    }
    const message = e instanceof Error ? e.message : "Error creando sesión de stream";
    return <div className="alert error">{message}</div>;
  }
}
