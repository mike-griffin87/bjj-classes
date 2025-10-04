"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import ClassesFilter from "@/app/components/ClassesFilter";
import NewClassForm from "@/app/components/NewClassForm";
import GoalSettings from "@/app/components/GoalSettings";
import { IconCircleCheck, IconArrowUpRight, IconAlertTriangle } from "@tabler/icons-react";

function computeTotals(classes: any[]) {
  const totalClasses = classes.length;
  const totalHours = classes.reduce((sum, c) => sum + (c.hours ?? 0), 0);
  return { totalClasses, totalHours };
}

export default function Home() {
  const [openNew, setOpenNew] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<any | null>(null);

  const [isMobile, setIsMobile] = useState(false);

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

  const handleTotalsChange = useCallback((totals: { total: number; hours: number; goal: string | null; yearsCount?: number; goalDetail?: { unit: "classes" | "hours"; target: number; ytd: number; projected: number; needed: number } }) => {
    setFilteredTotals({
      totalClasses: totals.total,
      totalHours: totals.hours,
      badgeText: totals.goal ?? "On track",
      yearsCount: totals.yearsCount,
      goalDetail: totals.goalDetail,
    });
  }, []);

  // Compute yearsCount and showBadge before return
  const yearsCount = filteredTotals?.yearsCount;
  const showBadge = !(yearsCount && yearsCount > 1); // hide badge in All-years view

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
              {showBadge && (
                <div onClick={openGoalTip} role="button" aria-label="Show goal details" style={{ borderRadius: 9999, padding: "2px 8px", fontSize: 11, cursor: "pointer", ...badgeStyle }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {badgeIcon}
                    {badgeText}
                  </span>
                </div>
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
              {showBadge && (
                <div onClick={openGoalTip} role="button" aria-label="Show goal details" style={{ borderRadius: 9999, padding: "2px 8px", fontSize: 12, cursor: "pointer", ...badgeStyle }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {badgeIcon}
                    {badgeText}
                  </span>
                </div>
              )}
            </div>
            <GoalSettings />
          </div>
        )}
      </div>

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
        v0.8
      </div>
    </div>
  );
}
