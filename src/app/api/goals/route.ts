

import { NextResponse } from "next/server";
import { getAdminSupabase } from '../../../../lib/supabaseClient';

type Metric = "classes" | "hours";

function parseYear(v: string | null): number {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : new Date().getFullYear();
}

function parseMetric(v: string | null): Metric {
  return v === "hours" ? "hours" : "classes";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const year = parseYear(url.searchParams.get("year"));
    const metric = parseMetric(url.searchParams.get("metric"));

    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from("goals")
      .select("year, metric, target, updated_at")
      .eq("year", year)
      .eq("metric", metric)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      year,
      metric,
      target: data?.target ?? null,
      updated_at: data?.updated_at ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load goal" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = getAdminSupabase();
    const body = await req.json();
    const rawYear = body?.year as number | string | undefined;
    const rawMetric = body?.metric as string | undefined;
    const rawTarget = body?.target as number | string | undefined;

    const year = Number.isFinite(Number(rawYear)) ? Math.trunc(Number(rawYear)) : new Date().getFullYear();
    const metric: Metric = rawMetric === "hours" ? "hours" : "classes";

    let target: number | null = null;
    if (rawTarget !== undefined && rawTarget !== null && rawTarget !== "") {
      const n = Number(rawTarget);
      if (!Number.isNaN(n) && Number.isFinite(n) && n >= 0) target = n;
    }

    if (target === null) {
      return NextResponse.json({ error: "`target` must be a non-negative number" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("goals")
      .upsert(
        [{ year, metric, target, updated_at: new Date().toISOString() }],
        { onConflict: "year,metric" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to save goal" }, { status: 500 });
  }
}