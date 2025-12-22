"use client";

import React from "react";
import ClassesFilter from "./ClassesFilter";
import NewClassForm from "./NewClassForm";

// Minimal shape we rely on in the drawer; keeps this component flexible
type ClassRow = {
  id: number | string;
  date?: string | Date;
  classType: string;
  instructor: string;
  technique: string;
  description?: string;
  hours?: number;
  style: string;
  url?: string;
};

export default function ClassesView({ classes }: { classes: ClassRow[] }) {
  const [editing, setEditing] = React.useState<ClassRow | null>(null);

  // Tooltip for goal badge (tap to see how many needed to reach target)
  const [goalTip, setGoalTip] = React.useState<{ message: string } | null>(null);
  const handleBadgeTap = React.useCallback(
    (payload: { needed: number; unit: "classes" | "hours"; target: number; projected: number; ytd: number }) => {
      const msg = `Need ${payload.needed} more ${payload.unit} to reach ${payload.target} this year (YTD ${payload.ytd}, proj ${Math.round(payload.projected)}).`;
      setGoalTip({ message: msg });
      // Auto-hide after 3 seconds
      window.clearTimeout((window as any).__goalTipTimer);
      (window as any).__goalTipTimer = window.setTimeout(() => setGoalTip(null), 3000);
    },
    []
  );

  // Handler passed to the table (forwarded through ClassesFilter)
  const handleRowClick = React.useCallback((row: ClassRow) => {
    setEditing(row);
  }, []);

  return (
    <div
      role="main"
      style={{
        background: "#fff",
        padding: "12px",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)",
      }}
    >
      {/* Filter + Table. NOTE: ClassesFilter must forward onRowClick to ClassTable. */}
      {/* After this file is added, we will update ClassesFilter.tsx to accept an optional onRowClick prop and pass it to ClassTable. */}
      <ClassesFilter
        classes={classes}
        onRowClick={handleRowClick}
        onBadgeTap={handleBadgeTap}
      />

      {/* Edit drawer (read-only placeholder for now) */}
      {editing && (
        <EditDrawer
          data={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {goalTip && (
        <div
          onClick={() => setGoalTip(null)}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: "calc(env(safe-area-inset-bottom) + 120px)",
            display: "flex",
            justifyContent: "center",
            zIndex: 2147483646,
            pointerEvents: "auto",
          }}
        >
          <div
            role="tooltip"
            style={{
              maxWidth: 320,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(17,17,17,0.92)",
              color: "#fff",
              fontSize: 12,
              boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
            }}
          >
            {goalTip.message}
          </div>
        </div>
      )}
    </div>
  );
}

function EditDrawer({ data, onClose }: { data: ClassRow; onClose: () => void }) {
  // Delegate to NewClassForm's controlled drawer in edit mode
  return (
    <NewClassForm
      open
      initialData={data}
      onClose={onClose}
    />
  );
}

function Detail({ label, value, multiline }: { label: string; value?: string; multiline?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      {value ? (
        multiline ? (
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{value}</div>
        ) : (
          <div>{value}</div>
        )
      ) : (
        <Muted>—</Muted>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "#6b7280", marginBottom: 6 }}>{children}</div>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#9ca3af" }}>{children}</div>;
}

function formatDate(d?: string | Date) {
  if (!d) return undefined;
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return undefined;
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}