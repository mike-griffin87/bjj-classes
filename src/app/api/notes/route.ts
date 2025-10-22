import { NextResponse } from "next/server";
import { getAdminSupabase, SUPABASE_URL, SUPABASE_PROJECT_REF } from '../../../../lib/supabaseClient';

const ALLOWED_KINDS = ["info", "minor", "major", "camp", "comp", "focus"] as const;
type Kind = (typeof ALLOWED_KINDS)[number];
function parseKind(v: unknown): Kind | null {
  return typeof v === "string" && (ALLOWED_KINDS as readonly string[]).includes(v)
    ? (v as Kind)
    : null;
}

// Notes API
// Table expected: public.notes (id bigserial PK, year int, month int 1-12, kind text, text text, created_at timestamptz default now())
// Minimal RLS example (run in Supabase, if enabled):
//   create policy "notes read" on public.notes for select using (true);
//   create policy "notes write" on public.notes for insert with check (true);

function num(v: unknown): number | null {
  if (v == null) return null; // no param provided
  if (typeof v === "string" && v.trim() === "") return null; // empty string
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return null; // ignore 0 (treat as unset)
  return n;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const y = num(url.searchParams.get("year"));
    const m = num(url.searchParams.get("month"));
    const k = parseKind(url.searchParams.get("kind"));
    const debug = url.searchParams.get("debug") === "1";

    const supabase = getAdminSupabase();

    let q = supabase
      .from("notes")
      .select("id, year, month, kind, text, created_at")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .order("created_at", { ascending: false });

    if (y !== null) q = q.eq("year", y);
    if (m !== null) q = q.eq("month", m);
    if (k !== null) q = q.eq("kind", k);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (debug) {
      // Count total rows in the table for quick sanity check
      const total = await supabase
        .from("notes")
        .select("id", { count: "exact", head: true });

      return NextResponse.json(
        {
          projectRef: SUPABASE_PROJECT_REF,
          supabaseUrl: SUPABASE_URL,
          filters: { year: y, month: m, kind: k },
          totalRows: total.count ?? null,
          returned: (data ?? []).length,
          notes: data ?? [],
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ notes: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load notes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json().catch(() => ({}));
    const y = num((body as any).year) ?? new Date().getFullYear();
    const m = num((body as any).month) ?? new Date().getMonth() + 1; // 1-12
    let text = String((body as any).text ?? "").trim();
    const kind = parseKind((body as any).kind) ?? "info";

    if (!text) return NextResponse.json({ error: "`text` is required" }, { status: 400 });
    if (m < 1 || m > 12) return NextResponse.json({ error: "`month` must be 1-12" }, { status: 400 });

    const { data, error } = await supabase
      .from("notes")
      .insert({ year: y, month: m, kind, text })
      .select("id, year, month, kind, text, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to save note" }, { status: 500 });
  }
}