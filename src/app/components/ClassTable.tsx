import React from "react";

export type ClassType = {
  id: string | number;
  date: string | Date;
  classType: string;
  instructor: string;
  technique: string;
  description?: string;
  hours?: number;
  style: string;
  performance?: string;
  url?: string;
};

export default function ClassTable({ classes, onRowClick }: { classes: ClassType[]; onRowClick?: (c: ClassType) => void }) {
  const [hoverId, setHoverId] = React.useState<string | number | null>(null);
  const perfEmoji = (v?: string) => {
    if (!v) return null;
    const s = String(v).trim().toLowerCase();
    if (["none", "n/a", "na", "not added", "n\u00a0/a"].includes(s)) return null;
    if (["poor", "bad", "rough"].includes(s) || s === "poor") return "😕";
    if (["average", "ok", "okay", "mediocre", "avg"].includes(s) || s === "average") return "🙂";
    if (["excellent", "great", "good", "strong", "awesome"].includes(s) || s === "excellent") return "💪";
    return null;
  };
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "8px",
        // boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        overflow: "hidden",
        border: "1px solid #eee",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 14 }}>
        <thead>
          <tr style={{
            position: "sticky",
            top: 0,
            background: "#fafafa",
            zIndex: 1,
            borderBottom: "1px solid #ececec"
          }}>
            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, letterSpacing: 0.2, color: "#6b7280", fontWeight: 600 }}>Date</th>
            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, letterSpacing: 0.2, color: "#6b7280", fontWeight: 600 }}>Instructor</th>
            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, letterSpacing: 0.2, color: "#6b7280", fontWeight: 600 }}>Class Type</th>
            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, letterSpacing: 0.2, color: "#6b7280", fontWeight: 600 }}>Style</th>
            <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 12, letterSpacing: 0.2, color: "#6b7280", fontWeight: 600 }}>Perf</th>
            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, letterSpacing: 0.2, color: "#6b7280", fontWeight: 600 }}>Technique</th>
            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, letterSpacing: 0.2, color: "#6b7280", fontWeight: 600 }}>Description</th>
            <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 12, letterSpacing: 0.2, color: "#6b7280", fontWeight: 600 }}>Hours</th>
            <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 12, letterSpacing: 0.2, color: "#6b7280", fontWeight: 600 }}>Link</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((cls, idx) => (
            <tr
              key={cls.id}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick ? "Edit class" : undefined}
              onClick={onRowClick ? () => onRowClick(cls) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRowClick(cls); } } : undefined}
              onMouseEnter={() => setHoverId(cls.id)}
              onMouseLeave={() => setHoverId((prev) => (prev === cls.id ? null : prev))}
              style={{
                borderBottom: "1px solid #f3f4f6",
                cursor: onRowClick ? "pointer" : "default",
                background: hoverId === cls.id ? "#f7f9fb" : (idx % 2 === 1 ? "#fcfcfd" : undefined)
              }}
            >
              <td style={{ padding: "12px 16px" }}>
                {new Date(cls.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </td>
              <td style={{ padding: "12px 16px" }}>{cls.instructor}</td>
              <td style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(cls.classType ? cls.classType.split(",") : [])
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((t) => (
                      <span
                        key={t}
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "999px",
                          background: "#f3f4f6",
                          color: "#374151",
                          fontSize: 12,
                          fontWeight: 600,
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                </div>
              </td>
              <td style={{ padding: "12px 16px" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 10px",
                    borderRadius: "999px",
                    background: "#f3f4f6",
                    color: "#374151",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {cls.style}
                </span>
              </td>
              <td style={{ padding: "12px 16px", textAlign: "center" }}>
                {perfEmoji(cls.performance)}
              </td>
              <td style={{ padding: "12px 16px" }}>
                {cls.technique ? (
                  (() => {
                    const techniqueColors: Record<string, { bg: string; color: string }> = {
                      Submissions: { bg: "#fef2f2", color: "#b91c1c" },
                      Guard: { bg: "#eff6ff", color: "#1d4ed8" },
                      Passing: { bg: "#f0fdf4", color: "#15803d" },
                      Wrestling: { bg: "#fdf2f8", color: "#9d174d" },
                      Position: { bg: "#f5f5f5", color: "#444" },
                      Escapes: { bg: "#fff7ed", color: "#9a3412" },
                      "Leg Locks": { bg: "#faf5ff", color: "#6d28d9" },
                    };
                    return (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {cls.technique
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .map((t) => {
                            const color = techniqueColors[t] || { bg: "#f5f5f5", color: "#444" };
                            return (
                              <span
                                key={t}
                                style={{
                                  display: "inline-block",
                                  padding: "2px 10px",
                                  borderRadius: "999px",
                                  background: color.bg,
                                  color: color.color,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  border: "1px solid rgba(0,0,0,0.04)",
                                }}
                              >
                                {t}
                              </span>
                            );
                          })}
                      </div>
                    );
                  })()
                ) : null}
              </td>
              <td
                style={{
                  padding: "12px 16px",
                  fontSize: 13,
                  color: "#555",
                  maxWidth: 420,
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
              >
                {cls.description
                  ? cls.description.length > 80
                    ? (
                      <span title={cls.description}>
                        {cls.description.slice(0, 80)}…
                      </span>
                    )
                    : cls.description
                  : null}
              </td>
              <td style={{ padding: "12px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{cls.hours ?? "—"}</td>
              <td style={{ padding: "12px 16px", textAlign: "center" }}>
                {cls.url ? (
                  <a
                    href={cls.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open video in new tab"
                    title="Open video"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#6b7280", fontWeight: 600 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}