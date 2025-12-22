"use client";

import React, { useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import ClassTable, { ClassType } from "./ClassTable";
import { goalToAnnualTarget, classifyProgress } from "./GoalSettings";
import { IconChevronDown, IconPlus, IconInfoCircle, IconAlertTriangle, IconCircleX, IconSun, IconMedal, IconTarget } from "@tabler/icons-react";

// Keep the type local to avoid importing from the table
// (it mirrors the structure used by ClassTable)
export type ClassRow = {
  id: string | number;
  date?: string | Date;
  classType: string;
  instructor: string;
  technique: string;
  description?: string;
  hours?: number;
  style: string;
  url?: string;
  createdAt?: Date | string;
};


const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ---- Notes types & helpers ----
export type NoteKind = "info" | "minor" | "major" | "camp" | "comp" | "focus";
export type Note = { id: number; year: number; month: number; kind: NoteKind; text: string; created_at?: string };

const KIND_META: Record<NoteKind, { label: string; bg: string; tint: string; Icon: any }> = {
  info:  { label: "Note",           bg: "#eef6ff", tint: "#60a5fa", Icon: IconInfoCircle },
  minor: { label: "Minor Injury",   bg: "#fff7ed", tint: "#f59e0b", Icon: IconAlertTriangle },
  major: { label: "Major Injury",   bg: "#fee2e2", tint: "#f87171", Icon: IconCircleX },
  camp:  { label: "BJJ Summer Camp",bg: "#ede9fe", tint: "#7c3aed", Icon: IconSun },
  comp:  { label: "Competition",    bg: "#ecfdf5", tint: "#10b981", Icon: IconMedal },
  focus: { label: "Training Focus",  bg: "#ecfeff", tint: "#06b6d4", Icon: IconTarget },
};

const ctlBase: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  fontSize: 16,
  lineHeight: 1.2,
  minHeight: 44,
  height: 44,
  background: "#fff",
  color: "#111",
  boxSizing: "border-box",
  WebkitAppearance: "none" as any,
  appearance: "none" as any,
};

function getYear(d?: string | Date) {
  if (!d) return NaN; // caller should ignore NaN
  const dt = new Date(d);
  return dt.getFullYear();
}

function getMonthIndex(d?: string | Date) {
  if (!d) return -1;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? -1 : dt.getMonth(); // 0-11 or -1 when invalid
}

function hasDate(row: ClassRow): row is ClassType {
  return row.date !== undefined;
}

function normalizePerf(v: unknown): 'great' | 'mediocre' | 'bad' | 'none' {
  const s = String(v ?? '').toLowerCase();
  if (s.includes('great') || s.includes('💪')) return 'great';
  if (s.includes('mediocre') || s.includes('ok') || s.includes('okay') || s.includes('🙂')) return 'mediocre';
  if (s.includes('bad') || s.includes('😕')) return 'bad';
  return 'none';
}

export default function ClassesFilter({ classes, onRowClick, onAddClick, onTotalsChange, onBadgeTap }: { classes: ClassRow[]; onRowClick?: (c: ClassRow) => void; onAddClick?: () => void; onTotalsChange?: (t: { total: number; hours: number; goal: string | null; yearsCount?: number; goalDetail?: { unit: "classes" | "hours"; target: number; ytd: number; projected: number; needed: number }; perfCounts?: { great: number; mediocre: number; bad: number; none: number }; monthCounts?: number[]; avgClassesPerWeek?: number; hasActiveFilter?: boolean }) => void; onBadgeTap?: (p: { needed: number; unit: "classes" | "hours"; target: number; projected: number; ytd: number }) => void }) {
  // Derive available years from the data
  const years = useMemo(() => {
    const set = new Set<number>();
    classes.forEach((c) => { const y = getYear(c.date); if (!Number.isNaN(y)) set.add(y); });
    return Array.from(set).sort((a, b) => a - b); // asc (earliest first)
  }, [classes]);

  const defaultYear = useMemo(() => {
    const current = new Date().getFullYear();
    if (years.includes(current)) return current;
    if (years.length) return years[years.length - 1];
    return current;
  }, [years]);
  const [year, setYear] = useState<number | "all">(defaultYear);
  const [months, setMonths] = useState<number[]>([]); // empty = all months
  const [query, setQuery] = useState("");
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const monthMenuRef = useRef<HTMLDivElement | null>(null);
  const monthBtnRef = useRef<HTMLButtonElement | null>(null);
  const [monthMenuPos, setMonthMenuPos] = useState<{top:number; left:number; width:number}>({top:0,left:0,width:220});

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteYear, setNoteYear] = useState<number>(new Date().getFullYear());
  const [noteMonth, setNoteMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [noteKind, setNoteKind] = useState<NoteKind>("info");
  const [noteText, setNoteText] = useState("");

  // --- Note tooltip (shows on icon tap/click for up to 30s) ---
  const [noteTip, setNoteTip] = useState<null | { title: string; text: string; tint: string; Icon: any }>(null);
  const tipTimerRef = useRef<number | null>(null);
  const closeNoteTip = React.useCallback(() => {
    if (tipTimerRef.current) {
      window.clearTimeout(tipTimerRef.current);
      tipTimerRef.current = null;
    }
    setNoteTip(null);
  }, []);
  const openNoteTip = React.useCallback((n: Note) => {
    const meta = KIND_META[n.kind];
    const safeMonth = Math.max(1, Math.min(12, Number(n.month ?? 1)));
    const dt = new Date(n.year, safeMonth - 1, 1);
    const monthLabel = dt.toLocaleString(undefined, { month: 'long' });
    setNoteTip({ title: `${monthLabel} ${n.year}`, text: n.text, tint: meta.tint, Icon: meta.Icon });
    if (tipTimerRef.current) window.clearTimeout(tipTimerRef.current);
    tipTimerRef.current = window.setTimeout(() => setNoteTip(null), 30000); // 30s
  }, []);
  React.useEffect(() => () => { if (tipTimerRef.current) window.clearTimeout(tipTimerRef.current); }, []);


  // Listen for global Add Note command dispatched by the cog menu
  React.useEffect(() => {
    const handler = () => openAddNote();
    window.addEventListener('bjj:add-note' as any, handler as any);
    return () => window.removeEventListener('bjj:add-note' as any, handler as any);
  }, []);

  // Fetch notes when year changes; we filter by month client-side to support multi-select
  React.useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (year !== "all") params.set("year", String(year));
        const res = await fetch(`/api/notes${params.size ? `?${params.toString()}` : ""}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        setNotes(Array.isArray(json.notes) ? json.notes : []);
      } catch {
        setNotes([]);
      }
    })();
  }, [year]);

  const visibleNotes = useMemo(() => {
    let list = notes;
    if (year !== "all") list = list.filter(n => n.year === year);
    if (months.length) list = list.filter(n => months.includes(n.month - 1));
    return list;
  }, [notes, year, months]);

  const openAddNote = () => {
    setNoteYear(year === "all" ? new Date().getFullYear() : year);
    setNoteMonth(months.length ? months[0] + 1 : new Date().getMonth() + 1);
    setNoteKind("info");
    setNoteText("");
    setNoteModalOpen(true);
  };

  async function saveNote() {
    const payload = { year: noteYear, month: noteMonth, kind: noteKind, text: noteText };
    const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json().catch(() => null);
    if (res.ok && json) {
      setNotes(prev => [json, ...prev]);
      setNoteModalOpen(false);
    } else {
      alert(json?.error || "Failed to save note");
    }
  }

  const [isMobile, setIsMobile] = useState(false);
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 480);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    if (!monthMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = monthMenuRef.current;
      if (el && !el.contains(e.target as Node)) setMonthMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMonthMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [monthMenuOpen]);

  // New helper function to reposition month menu on mobile
  function repositionMonthMenu() {
    const rect = monthBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pad = 8;
    const desiredWidth = Math.max(220, rect.width);
    const maxLeft = window.innerWidth - desiredWidth - pad;
    const left = Math.max(pad, Math.min(rect.left, maxLeft));
    const top = rect.bottom + 6;
    setMonthMenuPos({ top, left, width: desiredWidth });
  }

  React.useEffect(() => {
    if (!monthMenuOpen) return;
    const onResizeOrScroll = () => {
      repositionMonthMenu();
    };
    window.addEventListener('resize', onResizeOrScroll, { passive: true });
    window.addEventListener('scroll', onResizeOrScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll);
    };
  }, [monthMenuOpen]);

  const toggleMonth = (idx: number) => {
    setMonths((prev) =>
      prev.includes(idx) ? prev.filter((m) => m !== idx) : [...prev, idx]
    );
  };

  const clearMonths = () => setMonths([]);

  const filtered = useMemo(() => {
    const q = (query ?? "").toLowerCase();
    return classes.filter((c) => {
      if (year !== "all") {
        const y = getYear(c.date);
        if (y !== year) return false;
      }
      if (months.length !== 0) {
        const m = getMonthIndex(c.date);
        if (!months.includes(m)) return false;
      }
      if (q === "") return true;
      const desc = c.description?.toLowerCase() ?? "";
      const tech = (c.technique ?? "").toLowerCase();
      return desc.includes(q) || tech.includes(q);
    });
  }, [classes, year, months, query]);

  const availableMonths = useMemo(() => {
    if (year === "all") return [] as number[];
    const set = new Set<number>();
    classes.forEach((c) => {
      const y = getYear(c.date);
      if (y === year) {
        const m = getMonthIndex(c.date);
        if (m >= 0) set.add(m);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [classes, year]);

  // 12-month counts for the selected year (null when viewing All years)
  const monthCounts = useMemo(() => {
    if (year === 'all') return null as number[] | null;
    const arr = Array(12).fill(0) as number[];
    classes.forEach((c) => {
      if (getYear(c.date) === year) {
        const m = getMonthIndex(c.date);
        if (m >= 0) arr[m]++;
      }
    });
    return arr;
  }, [classes, year]);

  // Labels for selected months & a compact summary for the button label
  const selectedMonthLabels = useMemo(() => {
    const sorted = [...months].sort((a, b) => a - b);
    return sorted.map((i) => MONTH_LABELS[i]);
  }, [months]);

  const monthSummary = useMemo(() => {
    const labels = selectedMonthLabels;
    if (labels.length === 0) return "All months";
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]}, ${labels[1]}`;
    return `${labels[0]}, ${labels[1]} + ${labels.length - 2}`;
  }, [selectedMonthLabels]);

  const totalHours = useMemo(() => {
    return filtered.reduce((sum, c) => sum + (c.hours ?? 0), 0);
  }, [filtered]);

  const avgClassesPerWeek = useMemo(() => {
    const now = new Date();
    const yearNow = now.getFullYear();
    const start = new Date(yearNow, 0, 1);
    const weeks = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)));
    let count = 0;
    classes.forEach((c) => {
      const d = c.date ? new Date(c.date) : null;
      if (d && !Number.isNaN(d.getTime()) && d.getFullYear() === yearNow && d <= now) count++;
    });
    return Number((count / weeks).toFixed(1));
  }, [classes]);
  const hasActiveFilter = useMemo(() => {
    return (months.length > 0) || ((query ?? '').trim() !== '');
  }, [months, query]);

  // Performance split from currently filtered rows
  const perfCounts = useMemo(() => {
    const counts = { great: 0, mediocre: 0, bad: 0, none: 0 };
    filtered.forEach((c) => {
      const cat = normalizePerf((c as any).performance);
      counts[cat]++;
    });
    return counts;
  }, [filtered]);

  const yearsCount = useMemo(() => {
    if (year !== "all") return undefined;
    const set = new Set<number>();
    filtered.forEach((c) => { const y = getYear(c.date); if (!Number.isNaN(y)) set.add(y); });
    return set.size;
  }, [filtered, year]);

  const formatHours = (n: number) => n.toFixed(2).replace(/\.00$/, "");

  // --- Goal / Progress (current year only, independent of filters)
  const [goalBadge, setGoalBadge] = useState<string | null>(null);
  const [goalDetail, setGoalDetail] = useState<{ unit: "classes" | "hours"; target: number; ytd: number; projected: number; needed: number } | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("bjj-classes:goal:v1");
      if (!raw) { setGoalDetail(null); setGoalBadge(null); return; }
      const g = JSON.parse(raw) as { metric: "classes"|"hours"; target: number; cadence: "weekly"|"monthly"|"annually"; year: number };
      if (!g || !g.metric || !g.cadence || !Number.isFinite(g.target)) { setGoalDetail(null); setGoalBadge(null); return; }

      const thisYear = new Date().getFullYear();
      // Only evaluate against the current year
      const thisYearRows = classes.filter(c => {
        const d = c.date ? new Date(c.date) : null;
        return !!(d && !Number.isNaN(d.getTime()) && d.getFullYear() === thisYear);
      });
      const actualClasses = thisYearRows.length;
      const actualHours = thisYearRows.reduce((sum, c) => sum + (c.hours ?? 0), 0);

      const annual = goalToAnnualTarget({ metric: g.metric, target: g.target, cadence: g.cadence, year: thisYear });
      // Build goal detail for tooltip
      const actual = g.metric === "classes" ? actualClasses : actualHours;
      const start = new Date(thisYear, 0, 1).getTime();
      const end = new Date(thisYear + 1, 0, 1).getTime();
      const elapsed = Math.max(0, Date.now() - start);
      const total = end - start;
      const frac = Math.max(elapsed / total, 1 / 365);
      const projected = actual / frac;
      const needed = Math.max(0, annual - actual);
      setGoalDetail({ unit: g.metric, target: annual, ytd: actual, projected, needed });
      const label = classifyProgress(actual, annual);
      setGoalBadge(label);
    } catch (e) {
      setGoalDetail(null);
      setGoalBadge(null);
    }
  }, [classes]);

  // onTotalsChange is intentionally excluded from dependencies to avoid re-runs caused by changing function identity
  React.useEffect(() => {
    onTotalsChange?.({
      total: filtered.length,
      hours: totalHours,
      goal: goalBadge ?? null,
      yearsCount,
      goalDetail: goalDetail ?? undefined,
      perfCounts,
      monthCounts: monthCounts ?? undefined,
      avgClassesPerWeek,
      hasActiveFilter,
    });
  }, [filtered.length, totalHours, goalBadge, yearsCount, goalDetail, perfCounts, monthCounts, avgClassesPerWeek, hasActiveFilter]);

  // ---- Export selected year data as JSON (triggered via 'bjj:export-year')
  const exportSelectedYear = React.useCallback(() => {
    try {
      const selectedYear = year === "all" ? null : year;
      const classRows = (selectedYear === null ? classes : classes.filter(c => getYear(c.date) === selectedYear));

      // compute totals
      const hoursTotal = classRows.reduce((sum, c) => sum + (c.hours ?? 0), 0);

      const iso = (d?: string | Date) => {
        if (!d) return null;
        const nd = new Date(d);
        if (isNaN(nd.getTime())) return null;
        const yyyy = nd.getFullYear();
        const mm = String(nd.getMonth()+1).padStart(2,"0");
        const dd = String(nd.getDate()).padStart(2,"0");
        return `${yyyy}-${mm}-${dd}`;
      };

      const weekday = (d?: string | Date) => {
        if (!d) return null;
        const nd = new Date(d);
        if (isNaN(nd.getTime())) return null;
        return nd.toLocaleDateString(undefined, { weekday: "short" });
      };

      const classesOut = classRows
        .filter(c => !!c.date)
        .map((c) => ({
          id: c.id,
          date: iso(c.date)!,
          weekday: weekday(c.date),
          type: c.classType,
          instructor: c.instructor,
          technique: c.technique,
          description: c.description ?? "",
          hours: c.hours ?? 0,
          style: c.style,
          performance: (c as any).performance ?? null,
          url: c.url ?? null,
        }));

      const notesOut = (selectedYear === null ? notes : notes.filter(n => n.year === selectedYear))
        .map((n) => {
          const dt = new Date(n.year, Math.max(1, Math.min(12, Number(n.month)))-1, 1);
          const label = dt.toLocaleString(undefined, { month: "long", year: "numeric" });
          return { year: n.year, month: n.month, kind: n.kind, text: n.text, label };
        });

      const payload: any = {
        year: selectedYear ?? "all",
        generatedAt: new Date().toISOString(),
        summary: {
          classes: classesOut.length,
          hours: Number(hoursTotal.toFixed(2)),
        },
        classes: classesOut,
        notes: notesOut,
      };

      // include goal context if relevant to selected year (only meaningful for current year)
      if (selectedYear === new Date().getFullYear() && goalDetail) {
        payload.summary.goal = {
          metric: goalDetail.unit,
          target: goalDetail.target,
          ytd: goalDetail.ytd,
          projected: Math.round(goalDetail.projected),
          badge: goalBadge ?? null,
        };
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const yname = selectedYear ?? "all";
      const stamp = new Date();
      const ts = `${stamp.getFullYear()}${String(stamp.getMonth()+1).padStart(2,"0")}${String(stamp.getDate()).padStart(2,"0")}-${String(stamp.getHours()).padStart(2,"0")}${String(stamp.getMinutes()).padStart(2,"0")}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `bjj-export-${yname}-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 0);
    } catch (e) {
      alert("Export failed");
    }
  }, [year, classes, notes, goalDetail, goalBadge]);

  React.useEffect(() => {
    const handler = () => exportSelectedYear();
    window.addEventListener('bjj:export-year' as any, handler as any);
    return () => window.removeEventListener('bjj:export-year' as any, handler as any);
  }, [exportSelectedYear]);

  return (
    <div style={{ display: "grid", gap: isMobile ? 8 : 10 }}>
      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: isMobile ? 8 : 10,
          padding: isMobile ? "8px 10px" : "10px 12px",
          flexWrap: "wrap",
        }}
      >
        {/* Year select control */}
        <div
          style={{
            position: "relative",
            marginRight: isMobile ? 0 : 8,
            boxSizing: "border-box",
            height: 40,
            flex: isMobile ? "1 1 0" : undefined,
            minWidth: isMobile ? 0 : undefined,
          }}
        >
          <select
            value={year}
            onChange={(e) => {
              const v = e.target.value;
              setYear(v === "all" ? "all" : Number(v));
            }}
            style={{
              ...ctlBase,
              paddingRight: 34,
              fontWeight: 600,
              width: "100%",
              MozAppearance: "none" as any,
            }}
          >
            <option value="all">All</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <IconChevronDown
            size={16}
            stroke={2}
            color="#6b7280"
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
        </div>
        {/* Months container */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 40,
          boxSizing: 'border-box',
          flex: isMobile ? '1 1 0' : undefined,
          minWidth: isMobile ? 0 : undefined,
          width: isMobile ? '100%' : undefined,
        }}>
          {/* Month pills */}
          {year !== "all" && (
  isMobile ? (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, height: 40, width: '100%' }}>
      <button
        ref={monthBtnRef}
        onClick={() => {
          if (!monthMenuOpen) {
            repositionMonthMenu();
            setMonthMenuOpen(true);
          } else {
            setMonthMenuOpen(false);
          }
        }}
        aria-expanded={monthMenuOpen}
        aria-haspopup="listbox"
        title={selectedMonthLabels.length ? selectedMonthLabels.join(', ') : 'All months'}
        style={{
          ...ctlBase,
          paddingRight: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 8,
          flex: '1 1 0',
          minWidth: 0,
          width: '100%',
          position: 'relative',
        }}
      >
        {monthSummary}
        <IconChevronDown
          size={16}
          stroke={2}
          color="#6b7280"
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
      </button>
      {monthMenuOpen && typeof window !== 'undefined' && createPortal(
        <div ref={monthMenuRef} style={{
          position: 'fixed',
          top: monthMenuPos.top,
          left: monthMenuPos.left,
          zIndex: 1000,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)',
          width: monthMenuPos.width,
          maxHeight: 320,
          overflowY: 'auto',
          padding: 8,
        }}>
          <button
            onClick={() => { setMonths([]); setMonthMenuOpen(false); }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid transparent',
              background: months.length === 0 ? '#f3f4f6' : 'transparent',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            All months
          </button>
          <div style={{ height: 8 }} />
          {availableMonths.map(i => {
            const checked = months.includes(i);
            return (
              <label key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                background: checked ? '#f9fafb' : 'transparent',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleMonth(i)}
                  style={{
                    WebkitAppearance: "checkbox" as any,
                    appearance: "auto" as any,
                    width: 18,
                    height: 18,
                    marginRight: 10,
                    verticalAlign: "middle",
                    accentColor: "#111",
                  }}
                />
                <span style={{ fontWeight: 600 }}>{MONTH_LABELS[i]}</span>
              </label>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  ) : (
    <div style={{
      display: "flex",
      gap: 6,
      alignItems: "center",
      flexWrap: "wrap",
      height: 40,
    }}>
      {availableMonths.map((i) => {
        const label = MONTH_LABELS[i];
        const active = months.includes(i);
        return (
          <button
            key={label}
            onClick={() => toggleMonth(i)}
            aria-pressed={active}
            title={label}
            style={{
              cursor: "pointer",
              border: active ? "1px solid #111" : "1px solid #e5e7eb",
              padding: "4px 8px",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              background: active ? "#111" : "#fff",
              color: active ? "#fff" : "#111",
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              height: 40,
              display: "flex",
              alignItems: "center",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  )
)}
        </div>
        {/* Search input (full width on mobile) */}
        <input
          type="search"
          placeholder="Search classes..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            ...ctlBase,
            borderRadius: 12,
            // Make it a full-width row on mobile; grow inline on desktop
            flex: isMobile ? "0 0 100%" : "1 1 300px",
            minWidth: isMobile ? undefined : 150,
            width: isMobile ? "100%" : undefined,
          }}
        />
        {!isMobile && (
          <div style={{
            marginLeft: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
          }}>
            <button
              onClick={() => onAddClick?.()}
              style={{
                background: '#111',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconPlus size={16} stroke={2} />
                Add Class
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Notes icons row (no container) */}
      {visibleNotes.length > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: isMobile ? '4px 0' : '6px 0' }}>
          {visibleNotes.map(n => {
            const M = KIND_META[n.kind];
            const Ico = M.Icon;
            return (
              <div
                key={n.id}
                title={M.label}
                onClick={() => openNoteTip(n)}
                style={{ background: M.bg, borderRadius: 12, padding: 10, display: 'inline-flex', cursor: 'pointer' }}
              >
                <Ico size={20} stroke={2} color={M.tint} />
              </div>
            );
          })}
        </div>
      )}

      {/* Result table */}
      <ClassTable
        classes={filtered.filter(hasDate)}
        onRowClick={(c) => onRowClick?.(c)}
      />
      {isMobile && <div style={{ height: 76 }} />}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 8,
            padding: '24px 12px calc(10px + env(safe-area-inset-bottom))',
            background: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(1px)',
            WebkitBackdropFilter: 'blur(1px)',
            // borderTop: '1px solid #e5e7eb',
            zIndex: 1000,
          }}
        >
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <button
              onClick={() => onAddClick?.()}
              style={{
                background: '#111',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                <IconPlus size={18} stroke={2} />
                Add Class
              </span>
            </button>
          </div>
        </div>
      )}
      {noteModalOpen && typeof window !== 'undefined' && createPortal(
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 'min(540px, 92vw)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 700 }}>Add note</div>
            <div style={{ padding: '14px 16px', display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={noteYear} onChange={e => setNoteYear(Number(e.target.value))} style={{ ...ctlBase, flex: 1 }}>
                  {[...new Set([new Date().getFullYear(), ...years])].sort((a,b)=>a-b).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select value={noteMonth} onChange={e => setNoteMonth(Number(e.target.value))} style={{ ...ctlBase, flex: 1 }}>
                  {MONTH_LABELS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <select value={noteKind} onChange={e => setNoteKind(e.target.value as NoteKind)} style={{ ...ctlBase }}>
                <option value="info">Note</option>
                <option value="minor">Minor injury</option>
                <option value="major">Major injury</option>
                <option value="camp">Training camp</option>
                <option value="comp">Competition</option>
                <option value="focus">Training focus</option>
              </select>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} placeholder="Type your note..." style={{ ...ctlBase, height: 'auto', minHeight: 120, resize: 'vertical' }} />
            </div>
            <div style={{ position: 'sticky', bottom: 0, padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setNoteModalOpen(false)} style={{ background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveNote} style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {noteTip && typeof window !== 'undefined' && createPortal(
        <div
          role="tooltip"
          onClick={closeNoteTip}
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 'calc(env(safe-area-inset-bottom) + 120px)',
            transform: 'translateX(-50%)',
            background: 'rgba(17,17,17,0.92)',
            color: '#fff',
            padding: '10px 12px',
            borderRadius: 10,
            fontSize: 13,
            lineHeight: 1.4,
            zIndex: 3000,
            boxShadow: `0 0 0 2px ${noteTip.tint} inset, 0 6px 18px rgba(0,0,0,0.25)`,
            maxWidth: 560,
            width: 'calc(100vw - 28px)',
            textAlign: 'left',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {React.createElement(noteTip.Icon, { size: 16, stroke: 2, color: noteTip.tint })}
            <strong style={{ color: noteTip.tint }}>{noteTip.title}</strong>
          </div>
          <div style={{ whiteSpace: 'pre-line' }}>{noteTip.text}</div>
        </div>,
        document.body
      )}
    </div>
  );
}