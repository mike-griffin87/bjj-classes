import { NextResponse } from 'next/server';
import { getAdminSupabase } from '../../../../lib/supabaseClient';

// --- Types for incoming payload (all optional except date & classType) ---
export type ClassPayload = {
  date: string | number | Date;
  classType: string;
  instructor?: string | null;
  technique?: string | null;
  description?: string | null;
  hours?: number | string | null;
  style?: string | null; // e.g. "gi" | "nogi"
  url?: string | null;
  performance?: string | null; // e.g. "EXCELLENT" | "NONE" | ...
  performanceNotes?: string | null;
  createdAt?: string | Date | null;
};

// GET /api/classes
// Returns the list of classes ordered by date desc then id desc
export async function GET(req: Request) {
  try {
    const supabase = getAdminSupabase();
    const url = new URL(req.url);
    const debug = url.searchParams.get('debug') === '1';

    if (debug) {
      const countRes = await supabase
        .from('classes')
        .select('id', { count: 'exact', head: true });

      const sampleRes = await supabase
        .from('classes')
        .select('*')
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .limit(3);

      const projectRef = (() => {
        try {
          const host = new URL(process.env.SUPABASE_URL || '').hostname;
          return host.split('.')[0] || '';
        } catch {
          return '';
        }
      })();

      // Infer which key we are actually using by decoding the JWT payload (local debug only)
      let usingKeyRole: string | null = null;
      try {
        const raw = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        const parts = raw.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          usingKeyRole = payload?.role ?? null;
        }
      } catch {}

      return NextResponse.json({
        supabaseUrl: process.env.SUPABASE_URL || null,
        projectRef,
        usingKeyRole,
        count: countRes.count ?? null,
        countError: countRes.error ? String(countRes.error.message) : null,
        sample: sampleRes.data ?? [],
        sampleError: sampleRes.error ? String(sampleRes.error.message) : null,
      });
    }

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('date', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}

// POST /api/classes
// Creates a new class row. Only `date` and `classType` are required.
export async function POST(req: Request) {
  try {
    const supabase = getAdminSupabase();
    const body = (await req.json()) as Partial<ClassPayload>;

    const classType = body.classType?.trim();
    const dateMs = body.date != null ? new Date(body.date as any).getTime() : NaN; // accept ISO, number, or Date

    if (!classType || Number.isNaN(dateMs)) {
      return NextResponse.json(
        { error: 'Both `date` (valid) and `classType` are required.' },
        { status: 400 }
      );
    }

    // Normalize performance to match DB enum (NONE | BAD | OK | GREAT)
    const performanceValue = (() => {
      if (!body.performance) return 'NONE';
      const s = String(body.performance).toLowerCase().trim();
      if (s === 'n/a' || s === 'na' || s === 'none') return 'NONE';
      if (s === 'bad' || s.includes('bad')) return 'BAD';
      if (s === 'ok' || s === 'mediocre' || s.includes('ok')) return 'OK';
      if (s === 'great' || s.includes('great')) return 'GREAT';
      return 'NONE';
    })();

    let hoursVal: number | null = null;
    const rawHours = (body as any).hours;
    if (rawHours !== undefined && rawHours !== null && rawHours !== '') {
      const n = Number(rawHours);
      hoursVal = Number.isNaN(n) ? null : n;
    }

    const record = {
      date: dateMs, // bigint in DB (epoch ms)
      classType,
      instructor: body.instructor ?? null,
      technique: body.technique ?? null,
      description: body.description ?? null,
      hours: hoursVal !== null && !Number.isNaN(hoursVal) ? hoursVal : null,
      style: body.style ?? null,
      url: body.url ?? null,
      performance: performanceValue,
      performanceNotes: body.performanceNotes ?? null,
      createdAt: body.createdAt ? new Date(body.createdAt as any).getTime() : Date.now(),
    } as const;

    const { data, error } = await supabase
      .from('classes')
      .insert(record)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Invalid JSON body' }, { status: 400 });
  }
}