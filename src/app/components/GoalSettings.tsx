"use client";

import React from "react";
import { IconSettings } from "@tabler/icons-react";

// ------- Types
export type GoalMetric = "classes" | "hours";
export type GoalCadence = "weekly" | "monthly" | "annually";

export type GoalSettingsValue = {
  metric: GoalMetric; // classes or hours
  target: number; // numeric goal for the chosen cadence
  cadence: GoalCadence; // weekly | monthly | annually
  year: number; // current year only, as requested
};

// ------- Helpers (exported for use in other components)
export function goalToAnnualTarget(goal: GoalSettingsValue): number {
  switch (goal.cadence) {
    case "weekly":
      return goal.target * 52; // simple, predictable
    case "monthly":
      return goal.target * 12;
    case "annually":
    default:
      return goal.target;
  }
}

export function expectedToDate(annualTarget: number, today = new Date()): number {
  const year = today.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const elapsed = today.getTime() - start.getTime();
  const total = end.getTime() - start.getTime();
  const pct = Math.max(0, Math.min(1, elapsed / total));
  return annualTarget * pct;
}

export type BadgeResult = "Ahead of goal" | "On track" | "Behind goal";

export function classifyProgress(actual: number, annualTarget: number, today = new Date()): BadgeResult {
  const expected = expectedToDate(annualTarget, today);
  if (actual >= expected * 1.1) return "Ahead of goal"; // >= 10% above expected
  if (actual <= expected * 0.9) return "Behind goal"; // <= 10% below expected
  return "On track";
}

// ------- Storage
const STORAGE_KEY = "bjj-classes:goal:v1";

function loadStoredGoal(): GoalSettingsValue | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Defensive checks
    if (!parsed || typeof parsed !== "object") return null;
    return {
      metric: parsed.metric === "hours" ? "hours" : "classes",
      target: Number(parsed.target) > 0 ? Number(parsed.target) : 1,
      cadence: ["weekly", "monthly", "annually"].includes(parsed.cadence)
        ? parsed.cadence
        : "weekly",
      year: new Date().getFullYear(), // force current year relevance
    } as GoalSettingsValue;
  } catch (e) {
    return null;
  }
}

function saveStoredGoal(goal: GoalSettingsValue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goal));
  } catch (e) {
    // noop
  }
}

// ------- Component
export default function GoalSettings({
  onSave,
}: {
  onSave?: (goal: GoalSettingsValue) => void;
}) {
  const currentYear = new Date().getFullYear();

  const [menuOpen, setMenuOpen] = React.useState(false); // dropdown under cog
  const [panelOpen, setPanelOpen] = React.useState(false); // training goal panel

  const [metric, setMetric] = React.useState<GoalMetric>("classes");
  const [target, setTarget] = React.useState<number>(3);
  const [cadence, setCadence] = React.useState<GoalCadence>("weekly");
  const [year] = React.useState<number>(currentYear); // fixed to current year

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  // Load from localStorage once
  React.useEffect(() => {
    const stored = loadStoredGoal();
    if (stored) {
      setMetric(stored.metric);
      setTarget(stored.target);
      setCadence(stored.cadence);
    }
  }, []);

  const handleSave = () => {
    const goal: GoalSettingsValue = { metric, target, cadence, year };
    saveStoredGoal(goal);
    onSave?.(goal);
    setPanelOpen(false);
  };

  // --- UI Tokens (inline to avoid new files)
  const btn = {
    base: {
      cursor: "pointer" as const,
      border: "1px solid #e5e7eb",
      background: "#fff",
      padding: "8px 12px",
      borderRadius: 8,
      fontWeight: 600 as const,
    },
    primary: {
      background: "#111",
      color: "#fff",
      border: "1px solid #111",
    },
    subtle: {
      background: "transparent",
      border: "1px solid transparent",
      color: "#6b7280",
    },
  };

  return (
    <div style={{ position: "relative" }} ref={rootRef}>
      {/* Cog button (top-right owner can place this absolutely) */}
      <button
        aria-label="Settings"
        title="Settings"
        onClick={() => setMenuOpen((v) => !v)}
        style={{
          ...btn.base,
          padding: "6px 8px",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <IconSettings size={16} stroke={2} color="#111" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Settings menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: 180,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
            padding: 6,
            zIndex: 25,
          }}
        >
          <button
            role="menuitem"
            onClick={() => { setPanelOpen(true); setMenuOpen(false); }}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid transparent",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Training goal
          </button>
        </div>
      )}

      {panelOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 300,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
            padding: 12,
            zIndex: 20,
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Goal (current year)</div>

            {/* Metric toggle */}
            <div style={{ display: "flex", gap: 8 }}>
              {(["classes", "hours"] as GoalMetric[]).map((m) => {
                const active = metric === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    aria-pressed={active}
                    style={{
                      ...btn.base,
                      ...(active ? btn.primary : {}),
                    }}
                  >
                    {m === "classes" ? "Classes" : "Hours"}
                  </button>
                );
              })}
            </div>

            {/* Target number */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontWeight: 600 }}>Target</label>
              <input
                type="number"
                min={0}
                step={metric === "hours" ? 0.5 : 1}
                value={Number.isFinite(target) ? target : 0}
                onChange={(e) => setTarget(Number(e.target.value))}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              />
            </div>

            {/* Cadence */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontWeight: 600 }}>Cadence</label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value as GoalCadence)}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "8px 10px",
                  background: "#fff",
                }}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="annually">Annually</option>
              </select>
            </div>

            {/* Save */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={{ ...btn.base, ...btn.subtle }} onClick={() => setPanelOpen(false)}>
                Cancel
              </button>
              <button style={{ ...btn.base, ...btn.primary }} onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
