import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createPlaybackSession, type RecordingTargetType } from "@/lib/hct/recordings";
import { config } from "@/lib/config";
import { HctError } from "@/lib/hct/client";

interface Body {
  beginTime?: string;
  endTime?: string;
  targetType?: number;
  code?: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body JSON requerido" }, { status: 400 });
  }

  const beginTime = body.beginTime?.trim();
  const endTime = body.endTime?.trim();
  if (!beginTime || !endTime) {
    return NextResponse.json({ error: "beginTime y endTime son requeridos" }, { status: 400 });
  }

  const targetType: RecordingTargetType = body.targetType === 1 ? 1 : 0;
  const code = body.code?.trim() || undefined;

  try {
    const sessionPlayback = await createPlaybackSession(config.mode, id, {
      beginTime,
      endTime,
      targetType,
      code,
    });
    return NextResponse.json(sessionPlayback);
  } catch (e) {
    if (e instanceof HctError && e.errorCode === "EVZ60019") {
      return NextResponse.json(
        {
          error: "DEVICE_CODE_REQUIRED",
          message: "El stream está cifrado: captura el código de verificación del dispositivo.",
        },
        { status: 409 },
      );
    }
    if (e instanceof HctError) {
      return NextResponse.json(
        { error: e.errorCode, message: e.message },
        { status: 502 },
      );
    }
    const message = e instanceof Error ? e.message : "Error creando sesión de playback";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
