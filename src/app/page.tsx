"use client";
import React, { useEffect, useState, useCallback } from "react";
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

  const handleTotalsChange = useCallback((totals: { total: number; hours: number; goal: string | null; yearsCount?: number }) => {
    setFilteredTotals({
      totalClasses: totals.total,
      totalHours: totals.hours,
      badgeText: totals.goal ?? "On track",
      yearsCount: totals.yearsCount,
    });
  }, []);

  // Compute yearsCount and showBadge before return
  const yearsCount = filteredTotals?.yearsCount;
  const showBadge = !(yearsCount && yearsCount > 1); // hide badge in All-years view

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
                <div style={{ borderRadius: 9999, padding: "2px 8px", fontSize: 11, ...badgeStyle }}>
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
                <div style={{ borderRadius: 9999, padding: "2px 8px", fontSize: 12, ...badgeStyle }}>
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
      {/* Version badge (fixed near bottom; above Add button) */}
      <div
        aria-label="app-version"
        style={{
          position: "fixed",
          left: "50%",
          bottom: "calc(env(safe-area-inset-bottom) + 76px)",
          transform: "translateX(-50%)",
          fontSize: 12,
          color: "#6b7280",
          opacity: 0.9,
          pointerEvents: "none",
          zIndex: 2147483646,
        }}
      >
        v1.3
      </div>
    </div>
  );
}
