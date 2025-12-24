import { NextResponse } from 'next/server';
import { getAdminSupabase } from '../../../../lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const supabase = getAdminSupabase();

    // Clear existing data
    const { error: deleteError } = await supabase
      .from('classes')
      .delete()
      .neq('id', 0); // Delete all

    if (deleteError && deleteError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      console.warn('Delete warning:', deleteError);
    }

    // Add test data
    const now = new Date();
    const year = now.getFullYear();

    const classData = [
      { date: new Date(year, 0, 5).toISOString(), classType: "Fundamentals", instructor: "Coach A", technique: "Guard", hours: 1, style: "gi" },
      { date: new Date(year, 1, 10).toISOString(), classType: "Advanced", instructor: "Coach B", technique: "Mount", hours: 1.5, style: "nogi" },
      { date: new Date(year, 2, 15).toISOString(), classType: "Fundamentals", instructor: "Coach A", technique: "Escapes", hours: 1, style: "gi" },
      { date: new Date(year, 3, 20).toISOString(), classType: "Competition", instructor: "Coach C", technique: "Takedown", hours: 2, style: "gi" },
      { date: new Date(year, 4, 25).toISOString(), classType: "Fundamentals", instructor: "Coach A", technique: "Guard", hours: 1, style: "gi" },
      { date: new Date(year, 5, 30).toISOString(), classType: "Advanced", instructor: "Coach B", technique: "Transitions", hours: 1.5, style: "nogi" },
      // Drilling sessions
      { date: new Date(year, 0, 8).toISOString(), classType: "Drilling", instructor: "Home", description: "Guard drill", hours: 0.5 },
      { date: new Date(year, 1, 12).toISOString(), classType: "Drilling", instructor: "Gym", description: "Mount escape drill", hours: 1 },
      { date: new Date(year, 2, 18).toISOString(), classType: "Drilling", instructor: "Home", description: "Leg drag drill", hours: 0.75 },
      { date: new Date(year, 3, 22).toISOString(), classType: "Drilling", instructor: "Gym", description: "Armbar drill", hours: 1.25 },
      { date: new Date(year, 4, 28).toISOString(), classType: "Drilling", instructor: "Home", description: "Footlock drill", hours: 0.5 },
      { date: new Date(year, 5, 5).toISOString(), classType: "Drilling", instructor: "Gym", description: "Guard drill", hours: 1 },
    ];

    const { data, error: insertError } = await supabase
      .from('classes')
      .insert(classData)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length ?? 0,
      message: `Seeded ${data?.length ?? 0} test classes`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}
