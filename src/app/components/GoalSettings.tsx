"use client";

import React from "react";
import { IconSettings, IconRefresh, IconNote, IconTarget, IconDownload } from "@tabler/icons-react";

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
const STATUS_KEY = "bjj-classes:show-status:v1";
const DRILLING_KEY = "bjj-classes:show-drilling:v1";

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

  // Hover state for menu items (to support inline hover styles)
  const [hoverItem, setHoverItem] = React.useState<string | null>(null);
  const itemStyle = (id: string) => ({
    width: "100%",
    textAlign: "left" as const,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid transparent",
    background: hoverItem === id ? "#f5f7fa" : "transparent",
    cursor: "pointer" as const,
    fontWeight: 500 as const,
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#111",
  });

  const [metric, setMetric] = React.useState<GoalMetric>("classes");
  const [target, setTarget] = React.useState<number>(3);
  const [cadence, setCadence] = React.useState<GoalCadence>("weekly");
  const [year] = React.useState<number>(currentYear); // fixed to current year

  // Show Status preference (controls visibility elsewhere via event)
  const [showStatus, setShowStatus] = React.useState(true);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STATUS_KEY);
      if (raw != null) setShowStatus(raw === '1' || raw === 'true');
    } catch {}
  }, []);
  // Dispatch event after showStatus changes (except initial mount)
  const didInitStatus = React.useRef(false);
  React.useEffect(() => {
    if (!didInitStatus.current) {
      didInitStatus.current = true;
      return;
    }
    try {
      window.dispatchEvent(new CustomEvent('bjj:show-status-changed', { detail: { value: showStatus } }));
    } catch {}
  }, [showStatus]);

  // Show Drilling preference
  const [showDrilling, setShowDrilling] = React.useState(true);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DRILLING_KEY);
      if (raw != null) setShowDrilling(raw === '1' || raw === 'true');
    } catch {}
  }, []);
  const didInitDrilling = React.useRef(false);
  React.useEffect(() => {
    if (!didInitDrilling.current) {
      didInitDrilling.current = true;
      return;
    }
    try {
      window.dispatchEvent(new CustomEvent('bjj:show-drilling-changed', { detail: { value: showDrilling } }));
    } catch {}
  }, [showDrilling]);

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

  const handleUpdateApp = React.useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        window.location.reload();
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        window.location.reload();
        return;
      }

      let reloaded = false;
      const onControllerChange = () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

      const sendSkipWaiting = (sw: ServiceWorker | null) => {
        try { sw && sw.postMessage('SKIP_WAITING'); } catch {}
      };

      // Check for an update
      try { await reg.update(); } catch {}

      if (reg.waiting) {
        sendSkipWaiting(reg.waiting);
        return;
      }
      if (reg.installing) {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => {
          if ((sw as ServiceWorker).state === 'installed') {
            sendSkipWaiting(sw as ServiceWorker);
          }
        });
        return;
      }

      // Fallback: no SW yet — do a normal reload
      setTimeout(() => { if (!reloaded) window.location.reload(); }, 300);
    } finally {
      setMenuOpen(false);
    }
  }, []);

  const handleAddNote = React.useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('bjj:add-note'));
      }
    } finally {
      setMenuOpen(false);
    }
  }, []);

  const handleExportYear = React.useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('bjj:export-year'));
      }
    } finally {
      setMenuOpen(false);
    }
  }, []);

  const handleToggleStatus = React.useCallback((nextValue?: boolean) => {
    setShowStatus((prev) => {
      const next = typeof nextValue === 'boolean' ? nextValue : !prev;
      try { localStorage.setItem(STATUS_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  const handleToggleDrilling = React.useCallback((nextValue?: boolean) => {
    setShowDrilling((prev) => {
      const next = typeof nextValue === 'boolean' ? nextValue : !prev;
      try { localStorage.setItem(DRILLING_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

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
          width: 40,
          height: 40,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
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
            minWidth: 220,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(17,24,39,0.12)",
            padding: 8,
            zIndex: 25,
          }}
        >
          <button
            role="menuitem"
            onClick={handleUpdateApp}
            onMouseEnter={() => setHoverItem("update")}
            onMouseLeave={() => setHoverItem(null)}
            style={itemStyle("update")}
          >
            <IconRefresh size={18} stroke={1.8} color="#6b7280" />
            <span>Update app</span>
          </button>
          <button
            role="menuitem"
            onClick={handleAddNote}
            onMouseEnter={() => setHoverItem("note")}
            onMouseLeave={() => setHoverItem(null)}
            style={itemStyle("note")}
          >
            <IconNote size={18} stroke={1.8} color="#6b7280" />
            <span>Add note</span>
          </button>
          <button
            role="menuitem"
            onClick={handleExportYear}
            onMouseEnter={() => setHoverItem("export")}
            onMouseLeave={() => setHoverItem(null)}
            style={itemStyle("export")}
          >
            <IconDownload size={18} stroke={1.8} color="#6b7280" />
            <span>Export data (JSON)</span>
          </button>
          <button
            role="menuitem"
            onClick={() => { setPanelOpen(true); setMenuOpen(false); }}
            onMouseEnter={() => setHoverItem("goal")}
            onMouseLeave={() => setHoverItem(null)}
            style={itemStyle("goal")}
          >
            <IconTarget size={18} stroke={1.8} color="#6b7280" />
            <span>Training goal</span>
          </button>
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px' }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Show status</span>
            <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                role="switch"
                checked={showStatus}
                onChange={(e) => handleToggleStatus(e.target.checked)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                aria-checked={showStatus}
                aria-label="Show Data"
              />
              <span
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  position: 'relative',
                  background: showStatus ? '#22c55e' : '#e5e7eb',
                  border: '1px solid #e5e7eb',
                  transition: 'background 150ms',
                }}
                aria-hidden
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: showStatus ? 24 : 2,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    transition: 'left 150ms',
                  }}
                />
              </span>
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px' }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Show drilling</span>
            <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                role="switch"
                checked={showDrilling}
                onChange={(e) => handleToggleDrilling(e.target.checked)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                aria-checked={showDrilling}
                aria-label="Show Drilling"
              />
              <span
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  position: 'relative',
                  background: showDrilling ? '#22c55e' : '#e5e7eb',
                  border: '1px solid #e5e7eb',
                  transition: 'background 150ms',
                }}
                aria-hidden
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: showDrilling ? 24 : 2,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    transition: 'left 150ms',
                  }}
                />
              </span>
            </label>
          </div>
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
