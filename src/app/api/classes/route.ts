

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { date: "desc" },
    });
    return NextResponse.json(classes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // --- Required: date
    const dateStr = String((body as any).date || "").trim();
    if (!dateStr) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    // --- Optional: hours
    const hoursRaw = (body as any).hours;
    let hours: number | undefined = undefined;
    if (hoursRaw !== undefined && hoursRaw !== null && String(hoursRaw).trim() !== "") {
      const n = Number(hoursRaw);
      if (!Number.isFinite(n)) {
        return NextResponse.json({ error: "Hours must be a number" }, { status: 400 });
      }
      hours = n;
    }

    // --- Performance fields (tolerant input -> enum mapping)
    const perfRaw = (body as any).performance;
    const validPerfs = ["NONE", "POOR", "AVERAGE", "EXCELLENT"] as const;

    const normalizePerf = (v: unknown): typeof validPerfs[number] => {
      if (typeof v !== "string") return "NONE";
      const s = v.trim().toLowerCase();
      // explicit enum pass-through (already correct casing)
      if (["none", "poor", "average", "excellent"].includes(s)) {
        return s.toUpperCase() as typeof validPerfs[number];
      }
      // common aliases
      if (["n/a", "na", "none", "not added", "notadded"].includes(s)) return "NONE";
      if (["bad", "poor", "rough", "😕"].includes(s)) return "POOR";
      if (["ok", "okay", "mediocre", "avg", "average", "🙂"].includes(s)) return "AVERAGE";
      if (["great", "good", "strong", "awesome", "💪"].includes(s)) return "EXCELLENT";
      return "NONE";
    };

    const perf = normalizePerf(perfRaw);

    const performanceNotesRaw = (body as any).performanceNotes;
    const performanceNotes =
      typeof performanceNotesRaw === "string" && performanceNotesRaw.trim() !== ""
        ? performanceNotesRaw
        : undefined;

    const created = await prisma.class.create({
      data: {
        date,
        classType: String((body as any).classType ?? "Class"),
        instructor: String((body as any).instructor ?? ""),
        technique: String((body as any).technique ?? ""),
        description: (body as any).description ? String((body as any).description) : "",
        hours: hours ?? 0,
        style: String((body as any).style ?? "unknown"),
        url: (body as any).url ? String((body as any).url) : undefined,
        performance: perf,
        performanceNotes,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}