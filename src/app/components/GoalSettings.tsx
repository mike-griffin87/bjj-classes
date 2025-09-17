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

// Project an end-of-year total from year-to-date progress
export function projectedAnnualFromYTD(actual: number, today = new Date()): number {
  const year = today.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const elapsedMs = Math.max(0, today.getTime() - start.getTime());
  const totalMs = end.getTime() - start.getTime();
  // Use a floor to avoid divide-by-zero at year start; keep a tiny minimum fraction
  const pctElapsed = Math.max(elapsedMs / totalMs, 1 / 365);
  return actual / pctElapsed; // if actual = 0, projection = 0
}

export type BadgeResult = "Ahead of goal" | "On track" | "Behind goal";

export function classifyProgress(actual: number, annualTarget: number, today = new Date()): BadgeResult {
  // Forecast end-of-year based on current YTD pace
  const projected = projectedAnnualFromYTD(actual, today);

  // Tolerance band to avoid flip-flopping due to small changes
  const TOL = 0.05; // 5%

  if (projected >= annualTarget * (1 + TOL)) return "Ahead of goal";
  if (projected <= annualTarget * (1 - TOL)) return "Behind goal";
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

// ------- Server sync (Supabase via /api/goals)
async function fetchServerGoal(year: number, metric: GoalMetric): Promise<number | null> {
  try {
    const res = await fetch(`/api/goals?year=${year}&metric=${metric}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) return null;
    const t = Number(json?.target);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

async function upsertServerGoal(year: number, metric: GoalMetric, target: number): Promise<void> {
  try {
    await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, metric, target }),
    });
  } catch {
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

  // Fetch goal from server for current metric/year so all devices match
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await fetchServerGoal(currentYear, metric);
      if (!cancelled && t !== null) setTarget(t);
    })();
    return () => { cancelled = true; };
  }, [metric, currentYear]);

  const handleSave = async () => {
    const goal: GoalSettingsValue = { metric, target, cadence, year };
    // Persist locally for offline, and to server for cross-device consistency
    saveStoredGoal(goal);
    await upsertServerGoal(year, metric, target);
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
