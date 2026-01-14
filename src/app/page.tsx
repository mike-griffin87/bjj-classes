/* eslint-disable */
"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
const STATUS_KEY = "bjj-classes:show-status:v1";
import ClassesFilter from "@/app/components/ClassesFilter";
import NewClassForm from "@/app/components/NewClassForm";
import GoalSettings from "@/app/components/GoalSettings";
import { IconCircleCheck, IconArrowUpRight, IconAlertTriangle } from "@tabler/icons-react";

function computeTotals(classes: any[]) {
  const nonDrilling = classes.filter(c => !String(c.classType || "").toLowerCase().includes("drill"));
  const totalClasses = nonDrilling.length;
  const totalHours = nonDrilling.reduce((sum, c) => sum + (c.hours ?? 0), 0);
  return { totalClasses, totalHours };
}

export default function Home() {
  const [openNew, setOpenNew] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<any | null>(null);

  // Show/Hide dashboard status (persisted in localStorage, controlled from GoalSettings)
  const [showStatus, setShowStatus] = useState<boolean>(true);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATUS_KEY);
      if (raw != null) setShowStatus(raw === '1' || raw === 'true');
    } catch {}
  }, []);
  useEffect(() => {
    function onStatus(e: any) {
      try { setShowStatus(!!(e?.detail?.value)); } catch {}
    }
    window.addEventListener('bjj:show-status-changed' as any, onStatus as any);
    return () => window.removeEventListener('bjj:show-status-changed' as any, onStatus as any);
  }, []);

  // Progress panel hidden by default for now
  const showProgress = false;

  const { totalClasses, totalHours } = computeTotals(classes);
  const [isMounted, setIsMounted] = useState(false);
  const [filteredTotals, setFilteredTotals] = useState<{
    totalClasses: number;
    totalHours: number;
    badgeText: string;
    yearsCount?: number;
    goalDetail?: { unit: "classes" | "hours"; target: number; ytd: number; projected: number; needed: number };
    perfCounts?: { great: number; mediocre: number; bad: number; none: number };
    monthCounts?: number[];
    monthDrillingHours?: number[];
    avgClassesPerWeek?: number;
    hasActiveFilter?: boolean;
  } | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/classes", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load classes");
      const data = await res.json();
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setIsMounted(true);
  }, []);

  function getBadgeStyle(text: string) {
    if (text.includes("Ahead")) {
      return { backgroundColor: "#d1fae5", color: "#065f46" };
    } else if (text.includes("Behind")) {
      return { backgroundColor: "#fee2e2", color: "#991b1b" };
    } else {
      return { backgroundColor: "#dbeafe", color: "#1e3a8a" };
    }
  }

  function getBadgeIcon(text: string) {
    if (text.includes("Ahead")) {
      return <IconArrowUpRight size={12} stroke={2} style={{ marginRight: 4 }} />;
    } else if (text.includes("Behind")) {
      return <IconAlertTriangle size={12} stroke={2} style={{ marginRight: 4 }} />;
    } else {
      return <IconCircleCheck size={12} stroke={2} style={{ marginRight: 4 }} />;
    }
  }

  const badgeText = filteredTotals?.badgeText ?? "On track";
  const badgeStyle = getBadgeStyle(badgeText);
  const badgeIcon = getBadgeIcon(badgeText);

  const handleTotalsChange = useCallback((totals: { total: number; hours: number; goal: string | null; yearsCount?: number; goalDetail?: { unit: "classes" | "hours"; target: number; ytd: number; projected: number; needed: number }; perfCounts?: { great: number; mediocre: number; bad: number; none: number }; monthCounts?: number[]; monthDrillingHours?: number[]; avgClassesPerWeek?: number; hasActiveFilter?: boolean }) => {
    setFilteredTotals({
      totalClasses: totals.total,
      totalHours: totals.hours,
      badgeText: totals.goal ?? "On track",
      yearsCount: totals.yearsCount,
      goalDetail: totals.goalDetail,
      perfCounts: totals.perfCounts,
      monthCounts: totals.monthCounts,
      monthDrillingHours: totals.monthDrillingHours,
      avgClassesPerWeek: totals.avgClassesPerWeek,
      hasActiveFilter: totals.hasActiveFilter,
    });
  }, []);

  // Compute yearsCount and showBadge before return
  const yearsCount = filteredTotals?.yearsCount;
  const showBadge = !(yearsCount && yearsCount > 1); // hide badge in All-years view

  // Dashboard state & derived metrics
  const [dashOpen, setDashOpen] = useState(true);
  const ft = filteredTotals;
  const kpiClasses = ft?.totalClasses ?? totalClasses;
  const kpiHours = ft?.totalHours ?? totalHours;
  const gd = ft?.goalDetail;
  const neededToTarget = gd ? Math.max(0, Math.ceil(gd.needed)) : null;
  const progressFrac = gd ? Math.max(0, Math.min(1.2, gd.ytd / Math.max(1, gd.target))) : null; // cap at 120%

  // Perf split + month bars
  const pc = ft?.perfCounts;
  const perfTotal = pc ? pc.great + pc.mediocre + pc.bad + pc.none : 0;
  const pct = (n: number) => (perfTotal ? Math.round((n / perfTotal) * 100) : 0);
  const monthsArr = ft?.monthCounts;
  const monthDrillingArr = ft?.monthDrillingHours;
  const monthMax = monthsArr && monthsArr.length ? Math.max(1, ...monthsArr) : 1;
  const drillingMax = monthDrillingArr && monthDrillingArr.length ? Math.max(1, ...monthDrillingArr) : 1;
  const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const trackH = 160;
  const bubbleSize = 32;
  const trackW = 42;

  // Dim Avg when any filter is applied (from ClassesFilter)
  const dimAvg = !!ft?.hasActiveFilter;
  // Dim Projected/Remaining the same way
  const dimProjRem = !!ft?.hasActiveFilter;

  // Progress helper metrics
  const msWeek = 1000 * 60 * 60 * 24 * 7;
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
  const weeksElapsed = Math.max(1, Math.ceil((today.getTime() - startOfYear.getTime()) / msWeek));
  const weeksRemaining = Math.max(1, Math.ceil((endOfYear.getTime() - today.getTime()) / msWeek));
  const unit = gd?.unit ?? 'hours';
  const ytdVal = gd?.ytd ?? (unit === 'hours' ? kpiHours : kpiClasses);
  const targetVal = gd?.target ?? (unit === 'hours' ? Math.round(kpiHours) : kpiClasses);
  const projectedVal = gd?.projected ?? ytdVal; // fallback
  const remainingVal = Math.max(0, (gd ? gd.target - gd.ytd : 0));
  const avgPerWeek = ft?.avgClassesPerWeek ?? Number((kpiClasses / weeksElapsed).toFixed(1));
  // Progress bar color selection
  const barColor = badgeText.includes('Ahead')
    ? '#16a34a'
    : badgeText.includes('Behind')
    ? '#dc2626'
    : '#111827';


  // Tooltip for goal badge — 30s auto-hide or tap to dismiss
  const [goalTip, setGoalTip] = useState<string | null>(null);
  const goalTipTimerRef = useRef<number | null>(null);

  const openGoalTip = useCallback(() => {
    const d = filteredTotals?.goalDetail;
    const msg = d
      ? `Need ${Math.max(0, Math.ceil(d.needed))} more ${d.unit} to reach ${d.target}.\nYTD: ${d.ytd}  ·  Projected: ${Math.round(d.projected)}`
      : "Set a goal to see details";

    setGoalTip(msg);

    // Clear any previous timer, then start a new 30s timer
    if (goalTipTimerRef.current) window.clearTimeout(goalTipTimerRef.current);
    goalTipTimerRef.current = window.setTimeout(() => setGoalTip(null), 30000);
  }, [filteredTotals]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (goalTipTimerRef.current) window.clearTimeout(goalTipTimerRef.current);
    };
  }, []);

  // Calculate total drilling hours
  const totalDrillingHours = monthDrillingArr ? monthDrillingArr.reduce((sum, h) => sum + h, 0) : 0;

  // Format hours: only show decimal if needed
  const formatHours = (h: number) => {
    const str = h.toFixed(1);
    return str.endsWith('.0') ? str.slice(0, -2) : str;
  };

  return (
      <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
        {/* Title and Settings Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h1 style={{ margin: 0 }}>BJJ Classes</h1>
          <GoalSettings />
        </div>
        
        {/* Metric Pills Row */}
        {isMounted && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {/* Classes pill */}
          <div style={{ 
            backgroundColor: "#f3f4f6", 
            padding: "6px 12px", 
            borderRadius: 16, 
            fontSize: 13, 
            color: "#374151",
            fontWeight: 500,
            whiteSpace: "nowrap"
          }}>
            {(filteredTotals?.totalClasses ?? totalClasses)} classes
          </div>
          {/* Training hours pill */}
          <div style={{ 
            backgroundColor: "#f3f4f6", 
            padding: "6px 12px", 
            borderRadius: 16, 
            fontSize: 13, 
            color: "#374151",
            fontWeight: 500,
            whiteSpace: "nowrap"
          }}>
            {formatHours(filteredTotals?.totalHours ?? totalHours)}h hours
          </div>
          {/* Drilling hours pill */}
          <div style={{ 
            backgroundColor: "#f3f4f6", 
            padding: "6px 12px", 
            borderRadius: 16, 
            fontSize: 13, 
            color: "#374151",
            fontWeight: 500,
            whiteSpace: "nowrap"
          }}>
            {formatHours(totalDrillingHours)}h drilling
          </div>
          {yearsCount && yearsCount > 1 && (
            <div style={{ 
              fontSize: 11, 
              color: "#9ca3af",
              marginLeft: 4
            }}>
              ({yearsCount} years)
            </div>
          )}
          {/* Divider */}
          <div style={{ 
            width: 1, 
            height: 24, 
            backgroundColor: "#e5e7eb",
            margin: "0 4px"
          }} />
          {/* Goal pill */}
          <div style={{ 
            backgroundColor: "#f3f4f6", 
            padding: "6px 12px", 
            borderRadius: 16, 
            fontSize: 13, 
            color: "#374151",
            fontWeight: 500,
            whiteSpace: "nowrap"
          }}>
            {gd ? `Goal: ${gd.target}${gd.unit === 'hours' ? 'h' : ''}` : 'No goal'}
          </div>
        </div>
        )}

        {/* Dashboard */}
        {showStatus && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: 'grid',
              gap: 8,
              gridTemplateColumns: '1fr',
              marginTop: 0,
            }}
          >
              {/* PROGRESS (combined) */}
              
              {/* Progress panel intentionally hidden for now; monthly widget occupies full width */}

              {/* MONTHLY PILLS */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', background: '#fff', overflow: 'hidden' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Monthly classes & drilling</div>
                <div style={{ 
                  marginTop: 10, 
                  overflowX: 'auto', 
                  overflowY: 'hidden',
                  WebkitOverflowScrolling: 'touch' as any,
                  width: '100%',
                  paddingBottom: 8
                }}>
                  {monthsArr && monthsArr.length > 0 ? (
                    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 10 }}>
                      {monthsArr.map((cnt, i) => {
                        const classesPct = Math.round((cnt / monthMax) * 100);
                        const classesPercent = Math.max(0, Math.min(100, classesPct));
                        const drillingHours = monthDrillingArr?.[i] ?? 0;
                        const drillingPct = Math.round((drillingHours / drillingMax) * 100);
                        const drillingPercent = Math.max(0, Math.min(100, drillingPct));
                        const initial = MONTH_SHORT[i]?.charAt(0) ?? '';
                        const barW = 16; // Fixed bar width for consistent sizing
                        
                        // Check if month is empty/disabled (no classes and no drilling hours)
                        const isDisabled = cnt === 0 && drillingHours === 0;
                        
                        const classesColor = isDisabled ? '#d1d5db' : '#4f46e5';
                        const drillingColor = isDisabled ? '#d1d5db' : '#f59e0b';
                        const classesLightBg = isDisabled ? '#f3f4f6' : '#eef2ff';
                        const drillingLightBg = isDisabled ? '#f3f4f6' : '#fffbeb';
                        return (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 70, flexShrink: 0 }}>
                            {/* Two bars side by side */}
                            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: trackH }}>
                              {/* Classes bar */}
                              <div style={{ position: 'relative', width: barW, height: trackH, background: classesLightBg, borderRadius: 9999, overflow: 'visible', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                <div style={{ width: '100%', height: `${classesPercent}%`, background: classesColor, borderRadius: 9999 }} />
                                <div style={{ position: 'absolute', bottom: -28, whiteSpace: 'nowrap', fontWeight: 800, fontSize: 14, color: classesColor }}>
                                  {cnt}
                                </div>
                              </div>
                              {/* Drilling hours bar */}
                              <div style={{ position: 'relative', width: barW, height: trackH, background: drillingLightBg, borderRadius: 9999, overflow: 'visible', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                <div style={{ width: '100%', height: `${drillingPercent}%`, background: drillingColor, borderRadius: 9999 }} />
                                <div style={{ position: 'absolute', bottom: -28, whiteSpace: 'nowrap', fontWeight: 800, fontSize: 14, color: drillingColor }}>
                                  {drillingHours.toFixed(1).replace(/\.0$/, '')}
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: 44, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{initial}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Select a year to see month-by-month.</div>
                  )}
                </div>
              </div>
          </div>
        </div>
        )}

        <ClassesFilter
          classes={classes}
          onAddClick={() => setOpenNew(true)}
          onRowClick={(row) => setEditRow(row)}
          onTotalsChange={handleTotalsChange}
        />

        {loading && (
          <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>Loading…</div>
        )}

        {openNew && (
          <NewClassForm
            open={openNew}
            onClose={() => {
              setOpenNew(false);
              // reload to reflect newly added class
              load();
            }}
          />
        )}

        {editRow && (
          <NewClassForm
            open={true}
            initialData={editRow}
            onClose={() => {
              setEditRow(null);
              // reload to reflect edited class
              load();
            }}
          />
        )}
        {goalTip && (
          <div
            role="tooltip"
            onClick={() => { if (goalTipTimerRef.current) window.clearTimeout(goalTipTimerRef.current); setGoalTip(null); }}
            style={{
              position: "fixed",
              left: "50%",
              bottom: "calc(env(safe-area-inset-bottom) + 120px)",
              transform: "translateX(-50%)",
              background: "rgba(17,17,17,0.92)",
              color: "#fff",
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 12,
              zIndex: 2147483647,
              boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
              whiteSpace: "pre-line",
            }}
          >
            {goalTip}
          </div>
        )}
        {/* Version badge (fixed near bottom; above Add button) */}
        <div
          aria-label="app-version"
          style={{
            display: "block",
            position: "relative",
            textAlign: "center",
            margin: "16px 0",
            fontSize: 12,
            color: "#6b7280",
            opacity: 0.9,
            pointerEvents: "none",
            zIndex: 2147483646,
          }}
        >
          v1.01
        </div>
      </div>
  );
}
