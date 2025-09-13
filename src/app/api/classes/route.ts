import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- Supabase client (edge-safe) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Types for incoming payload (all optional except date & classType) ---
export type ClassPayload = {
  date: string | Date;
  classType: string;
  instructor?: string | null;
  technique?: string | null;
  description?: string | null;
  hours?: number | null;
  style?: string | null; // e.g. "gi" | "nogi"
  url?: string | null;
  performance?: string | null; // e.g. "EXCELLENT" | "NONE" | ...
  performanceNotes?: string | null;
  createdAt?: string | Date | null;
};

// GET /api/classes
// Returns the list of classes ordered by date desc then id desc
export async function GET() {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('date', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/classes
// Creates a new class row. Only `date` and `classType` are required.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ClassPayload>;

    const date = body.date ? new Date(body.date as any) : null;
    const classType = body.classType?.trim();

    if (!date || isNaN(date.getTime()) || !classType) {
      return NextResponse.json(
        { error: 'Both `date` (valid date) and `classType` are required.' },
        { status: 400 }
      );
    }

    // Normalize performance to match DB enum (NONE | BAD | OK | GREAT)
    const allowedPerformance = new Set(['NONE', 'BAD', 'OK', 'GREAT']);
    const normalizedPerformance = body.performance
      ? String(body.performance).toUpperCase()
      : null;
    const performanceValue =
      normalizedPerformance && allowedPerformance.has(normalizedPerformance)
        ? normalizedPerformance
        : null;

    // Build record. Use null for missing optionals so they can be nullable in DB.
    const record = {
      date: date.toISOString(),
      classType,
      instructor: body.instructor ?? null,
      technique: body.technique ?? null,
      description: body.description ?? null,
      hours: typeof body.hours === 'number' ? body.hours : body.hours ?? null,
      style: body.style ?? null,
      url: body.url ?? null,
      performance: performanceValue,
      performanceNotes: body.performanceNotes ?? null,
      createdAt: body.createdAt ? new Date(body.createdAt as any).toISOString() : new Date().toISOString(),
    };

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