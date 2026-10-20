import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { searchRecordings, type RecordingTargetType } from "@/lib/hct/recordings";
import { config } from "@/lib/config";
import { HctError } from "@/lib/hct/client";

interface Body {
  beginTime?: string;
  endTime?: string;
  targetType?: number;
  pageIndex?: number;
  pageSize?: number;
  timeType?: number;
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
  const timeType = body.timeType === 1 ? 1 : 0;

  try {
    const result = await searchRecordings(config.mode, id, {
      beginTime,
      endTime,
      targetType,
      pageIndex: body.pageIndex,
      pageSize: body.pageSize,
      timeType,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof HctError) {
      return NextResponse.json(
        { error: e.errorCode, message: e.message },
        { status: 502 },
      );
    }
    const message = e instanceof Error ? e.message : "Error buscando grabaciones";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
