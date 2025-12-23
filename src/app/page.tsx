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

  const [isMobile, setIsMobile] = useState(false);
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

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 480);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { totalClasses, totalHours } = computeTotals(classes);
  const [filteredTotals, setFilteredTotals] = useState<{
    totalClasses: number;
    totalHours: number;
    badgeText: string;
    yearsCount?: number;
    goalDetail?: { unit: "classes" | "hours"; target: number; ytd: number; projected: number; needed: number };
    perfCounts?: { great: number; mediocre: number; bad: number; none: number };
    monthCounts?: number[];
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

  const handleTotalsChange = useCallback((totals: { total: number; hours: number; goal: string | null; yearsCount?: number; goalDetail?: { unit: "classes" | "hours"; target: number; ytd: number; projected: number; needed: number }; perfCounts?: { great: number; mediocre: number; bad: number; none: number }; monthCounts?: number[]; avgClassesPerWeek?: number; hasActiveFilter?: boolean }) => {
    setFilteredTotals({
      totalClasses: totals.total,
      totalHours: totals.hours,
      badgeText: totals.goal ?? "On track",
      yearsCount: totals.yearsCount,
      goalDetail: totals.goalDetail,
      perfCounts: totals.perfCounts,
      monthCounts: totals.monthCounts,
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
  const monthMax = monthsArr && monthsArr.length ? Math.max(1, ...monthsArr) : 1;
  const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const trackH = isMobile ? 78 : 100;
  const bubbleSize = isMobile ? 24 : 26;
  const trackW = isMobile ? 12 : 14;

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

  return (
    <div style={{ padding: isMobile ? "1rem" : "2rem", fontFamily: "Arial, sans-serif" }}>
      <div
        style={
          isMobile
            ? { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }
            : { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }
        }
      >
        <h1 style={{ margin: 0, fontSize: isMobile ? 20 : undefined }}>BJJ Classes</h1>
        {isMobile ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#374151" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {(filteredTotals?.totalClasses ?? totalClasses)} • {(filteredTotals?.totalHours ?? totalHours).toFixed(2)} hrs
              {yearsCount && yearsCount > 1 && (
                <span>• {yearsCount} years</span>
              )}
            </div>
            <GoalSettings />
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
              {(filteredTotals?.totalClasses ?? totalClasses)} • {(filteredTotals?.totalHours ?? totalHours).toFixed(2)} hrs
              {yearsCount && yearsCount > 1 && (
                <span>• {yearsCount} years</span>
              )}
            </div>
            <GoalSettings />
          </div>
        )}
      </div>

      {/* Dashboard */}
      {showStatus && (
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'grid',
            gap: 8,
            gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
            marginTop: 0,
          }}
        >
            {/* PROGRESS (combined) */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Progress</div>
                {showBadge && (
                  <div onClick={openGoalTip} role="button" aria-label="Show goal details" style={{ display: 'inline-flex', borderRadius: 9999, padding: '2px 8px', fontSize: 12, cursor: 'pointer', ...badgeStyle }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {badgeIcon}
                      {badgeText}
                    </span>
                  </div>
                )}
              </div>

              {/* Big line: YTD / Target */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{ytdVal}</div>
                {gd ? (
                  <div style={{ fontSize: 13, color: '#6b7280' }}>/ {gd.target} {gd.unit}</div>
                ) : (
                  <div style={{ fontSize: 13, color: '#6b7280' }}>/ {targetVal} {unit}</div>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ height: 9, marginTop: 8, position: 'relative', background: '#f3f4f6', borderRadius: 9999 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.round(Math.min(1, (progressFrac ?? 0)) * 100)}%`, background: barColor, borderRadius: 9999 }} />
              </div>

              {/* Mini KPI row */}
              <div style={{ display: 'grid', gap: 6, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Classes</div>
                  <div style={{ fontWeight: 700 }}>{kpiClasses}</div>
                </div>
                <div style={{ paddingLeft: isMobile ? 0 : 10, borderLeft: isMobile ? 'none' : '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Hours</div>
                  <div style={{ fontWeight: 700 }}>{kpiHours.toFixed(1)}</div>
                </div>
                <div style={{ paddingLeft: isMobile ? 0 : 10, borderLeft: isMobile ? 'none' : '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: 12, color: dimAvg ? '#9ca3af' : '#6b7280' }}>Avg / wk</div>
                  <div style={{ fontWeight: 700, color: dimAvg ? '#9ca3af' : undefined }} title={dimAvg ? 'Average is year-to-date; a filter is active.' : undefined}>{avgPerWeek}</div>
                </div>
                <div style={{ paddingLeft: isMobile ? 0 : 10, borderLeft: isMobile ? 'none' : '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: 12, color: dimProjRem ? '#9ca3af' : '#6b7280' }}>Projected</div>
                  <div style={{ fontWeight: 700, color: dimProjRem ? '#9ca3af' : undefined }} title={dimProjRem ? 'Projected ignores filters; based on full year.' : undefined}>{Math.round(projectedVal)} {unit}</div>
                </div>
                <div style={{ paddingLeft: isMobile ? 0 : 10, borderLeft: isMobile ? 'none' : '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: 12, color: dimProjRem ? '#9ca3af' : '#6b7280' }}>Remaining</div>
                  <div style={{ fontWeight: 700, color: dimProjRem ? '#9ca3af' : undefined }} title={dimProjRem ? 'Remaining ignores filters; based on full year.' : undefined}>{Math.max(0, Math.round(remainingVal))} {unit}</div>
                </div>
              </div>

            </div>

            {/* MONTHLY PILLS */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', background: '#fff' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Monthly classes</div>
              {monthsArr ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
                    {monthsArr.map((cnt, i) => {
                      const hPct = Math.round((cnt / monthMax) * 100);
                      const fillPct = Math.max(0, Math.min(100, hPct));
                      const initial = MONTH_SHORT[i]?.charAt(0) ?? '';
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <div style={{ position: 'relative', width: trackW, height: trackH, background: '#e5e7eb', borderRadius: 9999, overflow: 'visible', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <div style={{ width: '100%', height: `${fillPct}%`, background: '#111827', borderRadius: trackW }} />
                            {cnt > 0 && (
                              <div style={{ position: 'absolute', bottom: -bubbleSize/2, width: bubbleSize, height: bubbleSize, borderRadius: '50%', background: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: isMobile ? 12 : 13 }}>
                                {cnt}
                              </div>
                            )}
                          </div>
                          <div style={{ marginTop: bubbleSize/2 + 8, fontSize: 12, color: '#111' }}>{initial}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Select a year to see month-by-month.</div>
              )}
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
        v0.9
      </div>
    </div>
  );
}
