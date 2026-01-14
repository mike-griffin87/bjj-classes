import { NextResponse } from "next/server";
import { getAdminSupabase } from '../../../../../lib/supabaseClient';

// Helpers
function strOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function parseHours(v: unknown): number | null {
  if (v === undefined) return null; // not provided -> we won't include it in update
  if (v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeStyle(v: unknown): "gi" | "nogi" | null {
  const s = strOrNull(v);
  if (!s) return null;
  const low = s.toLowerCase();
  return low === "gi" || low === "nogi" ? (low as "gi" | "nogi") : null;
}

function normalizePerformance(v: unknown): "NONE" | "BAD" | "OK" | "GREAT" {
  if (v === undefined || v === null) return "NONE";
  const s = String(v).trim().toLowerCase();
  if (["none", "n/a", "na", "not added", "notadded"].includes(s)) return "NONE";
  if (["bad", "poor", "rough", "😕"].includes(s)) return "BAD";
  if (["ok", "okay", "mediocre", "avg", "average", "🙂"].includes(s)) return "OK";
  if (["great", "good", "strong", "awesome", "💪"].includes(s)) return "GREAT";
  return "NONE";
}

// Build a partial update object from arbitrary input
function buildUpdate(data: any) {
  const out: Record<string, any> = {};

  // date (bigint epoch ms)
  if (data.date !== undefined) {
    const dateMs = new Date(data.date as any).getTime();
    if (Number.isFinite(dateMs)) {
      out.date = dateMs; // align with DB bigint
    }
  }

  // strings
  if (data.classType !== undefined) out.classType = strOrNull(data.classType);
  if (data.instructor !== undefined) out.instructor = strOrNull(data.instructor);
  if (data.technique !== undefined) out.technique = strOrNull(data.technique);
  if (data.description !== undefined) out.description = strOrNull(data.description);

  // hours (float8)
  if (data.hours !== undefined) out.hours = parseHours(data.hours);

  // style ("gi" | "nogi" | null)
  if (data.style !== undefined) out.style = normalizeStyle(data.style);

  // url (nullable text)
  if (data.url !== undefined) out.url = strOrNull(data.url);

  // performance → "NONE" | "BAD" | "OK" | "GREAT"
  if (data.performance !== undefined) out.performance = normalizePerformance(data.performance);

  // performanceNotes (nullable text)
  if (data.performanceNotes !== undefined) out.performanceNotes = strOrNull(data.performanceNotes);

  // remove keys that ended up undefined to avoid writing them
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);

  return out;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    const body = await req.json().catch(() => ({}));
    const update = buildUpdate(body);
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("classes")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("PUT /api/classes/[id] supabase error", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("PUT /api/classes/[id] error", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getAdminSupabase();
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("classes")
      .delete()
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("DELETE /api/classes/[id] supabase error", error);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/classes/[id] error", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

// PATCH behaves like PUT (partial update)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return PUT(req, ctx);
}