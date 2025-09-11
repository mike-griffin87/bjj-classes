import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Build a partial update object from arbitrary input
function buildUpdate(data: any) {
  const out: Record<string, any> = {};

  if (data.date !== undefined) {
    const d = typeof data.date === "string" ? new Date(data.date) : data.date;
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) out.date = parsed;
  }
  if (data.classType !== undefined) out.classType = String(data.classType).trim();
  if (data.instructor !== undefined) out.instructor = String(data.instructor).trim();
  if (data.technique !== undefined) out.technique = String(data.technique).trim(); // comma-separated
  if (data.description !== undefined) out.description = String(data.description).trim();
  if (data.hours !== undefined) {
    const n = Number(data.hours);
    out.hours = Number.isFinite(n) ? n : null;
  }
  if (data.style !== undefined) out.style = String(data.style).trim(); // "gi" | "nogi"
  if (data.url !== undefined) {
    const url = String(data.url).trim();
    out.url = url.length ? url : null;
  }

  // Performance normalization (maps many inputs to enum values)
  if (data.performance !== undefined) {
    const normalizePerf = (v: unknown) => {
      if (typeof v !== "string") return "NONE" as const;
      const s = v.trim().toLowerCase();
      if (["none", "poor", "average", "excellent"].includes(s)) {
        return s.toUpperCase() as "NONE" | "POOR" | "AVERAGE" | "EXCELLENT";
      }
      if (["n/a", "na", "not added", "notadded"].includes(s)) return "NONE" as const;
      if (["bad", "poor", "rough", "😕"].includes(s)) return "POOR" as const;
      if (["ok", "okay", "mediocre", "avg", "average", "🙂"].includes(s)) return "AVERAGE" as const;
      if (["great", "good", "strong", "awesome", "💪"].includes(s)) return "EXCELLENT" as const;
      return "NONE" as const;
    };
    out.performance = normalizePerf(data.performance);
  }

  if (data.performanceNotes !== undefined) {
    const txt = String(data.performanceNotes ?? "").trim();
    out.performanceNotes = txt.length ? txt : null;
  }

  return out;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const data = buildUpdate(body);
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    const updated = await prisma.class.update({ where: { id }, data });
    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error("PUT /api/classes/[id] error", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const deleted = await prisma.class.delete({ where: { id } });
    return NextResponse.json(deleted, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/classes/[id] error", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  return PUT(req, ctx);
}