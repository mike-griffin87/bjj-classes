"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

export default function NewClassForm({
  initialData,
  open: controlledOpen,
  onClose,
}: {
  initialData?: any;
  open?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  // Internal open state if not controlled
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(v);
    // else ignore, controlled from parent
  };
  const close = () => {
    if (onClose) onClose();
    else setOpen(false);
  };
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Default date to today (local)
  const today = React.useMemo(() => {
    const now = new Date();
    const tz = now.getTimezoneOffset();
    const local = new Date(now.getTime() - tz * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  // Class type streamlined controls
  const [classTypes, setClassTypes] = React.useState<string[]>(
    initialData?.classType
      ? String(initialData.classType)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : ["Advanced"]
  );

  const CLASS_TYPE_OPTIONS = [
    "Fundamentals",
    "Advanced",
    "Open Mat",
    "Seminar",
    "Workshop",
    "Drilling",
  ] as const;

  // Instructor dropdown state and options
  const INSTRUCTOR_OPTIONS = [
    "Kieran Davern",
    "Shane Smith",
    "Stu Mulpeter",
    "Kieran OD",
    "None",
  ] as const;
  const [instructorValue, setInstructorValue] = React.useState<string>(
    initialData?.instructor || "Kieran Davern"
  );

  // Technique tags (multi-select)
  const [techniqueTags, setTechniqueTags] = React.useState<string[]>(
    initialData?.technique
      ? String(initialData.technique)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : []
  );
  // Style segmented toggle state
  const [styleValue, setStyleValue] = React.useState<string>(initialData?.style || "nogi");
  // Performance (self-assessment)
  const PERFORMANCE_OPTIONS = [
    { key: "None",     label: "🚫 N/A" },
    { key: "Bad",      label: "😕 Bad" },
    { key: "Mediocre", label: "🙂 OK" },
    { key: "Great",    label: "💪 Great" },
  ] as const;

  const [performanceValue, setPerformanceValue] = React.useState<string>(
    initialData?.performance ?? "None"
  );
  const TECHNIQUE_OPTIONS = [
    "Passing",
    "Submissions",
    "Position",
    "Guard",
    "Wrestling",
    "Escapes",
    "Leg Locks",
  ] as const;

  const [teOpen, setTeOpen] = React.useState(false);
  const toggleTechniqueTag = (val: string) => {
    setTechniqueTags((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  // Multi-select dropdown state
  const [ctOpen, setCtOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const toggleClassType = (val: string) => {
    setClassTypes((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  // Popover positioning so menus aren't clipped by the drawer
  function useAnchoredStyle<T extends HTMLElement>(open: boolean, ref: React.RefObject<T | null>) {
    const [style, setStyle] = React.useState<React.CSSProperties | null>(null);
    React.useLayoutEffect(() => {
      if (!open || !ref.current) { setStyle(null); return; }
      const rect = ref.current.getBoundingClientRect();
      setStyle({ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width });
      const recalc = () => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        setStyle({ position: "fixed", top: r.bottom + 4, left: r.left, width: r.width });
      };
      window.addEventListener("scroll", recalc, true);
      window.addEventListener("resize", recalc);
      return () => {
        window.removeEventListener("scroll", recalc, true);
        window.removeEventListener("resize", recalc);
      };
    }, [open, ref]);
    return style;
  }

  const ctBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const teBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const ctMenuRef = React.useRef<HTMLDivElement | null>(null);
  const teMenuRef = React.useRef<HTMLDivElement | null>(null);
  const ctStyle = useAnchoredStyle(ctOpen, ctBtnRef);
  const teStyle = useAnchoredStyle(teOpen, teBtnRef);
  // Instructor dropdown menu open state and refs
  const [insOpen, setInsOpen] = React.useState(false);
  const insBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const insMenuRef = React.useRef<HTMLDivElement | null>(null);
  const insStyle = useAnchoredStyle(insOpen, insBtnRef);

  // Outside click/ESC for portal menus
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (ctBtnRef.current && ctBtnRef.current.contains(t)) return;
      if (ctMenuRef.current && ctMenuRef.current.contains(t)) return;
      setCtOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setCtOpen(false); }
    if (ctOpen) {
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [ctOpen]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (teBtnRef.current && teBtnRef.current.contains(t)) return;
      if (teMenuRef.current && teMenuRef.current.contains(t)) return;
      setTeOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setTeOpen(false); }
    if (teOpen) {
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [teOpen]);
  // Instructor menu outside click/esc
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (insBtnRef.current && insBtnRef.current.contains(t)) return;
      if (insMenuRef.current && insMenuRef.current.contains(t)) return;
      setInsOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setInsOpen(false); }
    if (insOpen) {
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [insOpen]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);

    // Build payload
    const payload = {
      date: String(fd.get("date") || "").trim(),
      classType: classTypes.join(", "),
      instructor: instructorValue,
      technique: techniqueTags.join(", "),
      description: String(fd.get("description") || "").trim(),
      hours: ((): number | undefined => {
        const v = String(fd.get("hours") || "").trim();
        if (!v) return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      })(),
      style: styleValue,
      performance: performanceValue === "None" ? null : performanceValue,
      performanceNotes: ((): string | undefined => {
        const v = String(fd.get("performanceNotes") || "").trim();
        return v ? v : undefined;
      })(),
      url: ((): string | undefined => {
        const v = String(fd.get("url") || "").trim();
        return v ? v : undefined;
      })(),
    } as const;

    if (!payload.date) {
      setSubmitting(false);
      setError("Date is required");
      return;
    }

    try {
      let url = "/api/classes";
      let method = "POST";
      if (initialData?.id) {
        url = `/api/classes/${initialData.id}`;
        method = "PUT";
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed: ${res.status}`);
      }
      setSuccess("Saved");
      formRef.current?.reset();
      // Refresh server data to show the new row in the table
      router.refresh();
      if (onClose) onClose();
      else setOpen(false);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Small input style tokens
  const input = {
    base: {
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      width: "100%",
      fontSize: 14,
      lineHeight: 1.4,
    } as React.CSSProperties,
    label: {
      fontWeight: 600,
      fontSize: "0.8rem",
      color: "#6b7280",
      marginBottom: 6,
      display: "inline-block",
    } as React.CSSProperties,
  };

  // Form ID for accessibility and external submit
  const FORM_ID = "class-form";

  return (
    <div>
      {/* Trigger */}
      {controlledOpen === undefined && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          + Add Class
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(2px)",
            zIndex: 1000,
          }}
        />
      )}

      {/* Drawer */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            height: "100vh",
            width: 480,
            maxWidth: "min(92vw, 520px)",
            background: "#fff",
            borderLeft: "1px solid #eef0f2",
            boxShadow: "-12px 0 28px rgba(0,0,0,0.12)",
            zIndex: 1001,
            display: "flex",
            flexDirection: "column",
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
          }}
        >
          {/* Header */}
          <div
            style={{
              position: "sticky",
              top: 0,
              background: "#fff",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              borderBottom: "1px solid #f2f2f2",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {initialData?.id ? "Edit class" : "Add class"}
            </div>
            <button
              onClick={close}
              aria-label="Close"
              style={{
                border: "none",
                background: "transparent",
                borderRadius: 8,
                padding: 6,
                cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "16px 18px", overflow: "auto", flex: 1 }}>
            <form
              ref={formRef}
              onSubmit={onSubmit}
              id={FORM_ID}
              style={{ display: "grid", gap: 14 }}
            >
              <div>
                <label style={input.label}>Description</label>
                <textarea
                  name="description"
                  rows={8}
                  placeholder="Key notes / drills / sparring focus"
                  style={{ ...input.base, resize: "vertical" }}
                  defaultValue={initialData?.description || ""}
                />
              </div>

              {/* Row 1: Date + Instructor (locked side-by-side) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={input.label}>Date</label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={
                      initialData?.date
                        ? new Date(initialData.date).toISOString().slice(0, 10)
                        : today
                    }
                    style={input.base}
                  />
                </div>
                <div>
                  <label style={input.label}>Instructor</label>
                  {/* hidden input so form data stays consistent */}
                  <input type="hidden" name="instructor" value={instructorValue} />
                  <div style={{ position: "relative" }}>
                    <button
                      ref={insBtnRef}
                      type="button"
                      onClick={() => setInsOpen((v) => !v)}
                      aria-haspopup="listbox"
                      aria-expanded={insOpen}
                      style={{
                        ...input.base,
                        background: "#f9fafb",
                        borderColor: "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ color: instructorValue ? "#111" : "#9ca3af" }}>{instructorValue || "Select instructor"}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    {insOpen && insStyle && createPortal(
                      <div
                        ref={insMenuRef}
                        role="listbox"
                        style={{
                          ...insStyle,
                          background: "#fff",
                          border: "1px solid #eef0f2",
                          borderRadius: 14,
                          boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
                          maxHeight: 260,
                          overflow: "auto",
                          zIndex: 3000,
                        }}
                      >
                        {INSTRUCTOR_OPTIONS.map((opt) => (
                          <div
                            key={opt}
                            onClick={() => { setInstructorValue(opt); setInsOpen(false); }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "12px 14px",
                              cursor: "pointer",
                              userSelect: "none",
                              transition: "background 120ms",
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 6,
                                border: instructorValue === opt ? "1px solid #111" : "1px solid #d1d5db",
                                background: instructorValue === opt ? "#111" : "#fff",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {instructorValue === opt && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              )}
                            </span>
                            <span style={{ fontWeight: 500, fontSize: 15 }}>{opt}</span>
                          </div>
                        ))}
                      </div>, document.body)}
                  </div>
                </div>
              </div>

              {/* Row 2: rest of fields */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start", width: "100%" }}>
                  <div style={{ minWidth: 280, flex: 1 }}>
                    <label style={input.label}>Class Type</label>
                    <div style={{ position: "relative" }}>
                      <button
                        ref={ctBtnRef}
                        type="button"
                        onClick={() => setCtOpen((v) => !v)}
                        aria-haspopup="listbox"
                        aria-expanded={ctOpen}
                        style={{
                          ...input.base,
                          background: "#f9fafb",
                          borderColor: "#e5e7eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ color: classTypes.length ? "#111" : "#9ca3af" }}>
                          {classTypes.length ? classTypes.join(", ") : "Select class types"}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </button>
                      {ctOpen && ctStyle && createPortal(
                        <div
                          ref={ctMenuRef}
                          role="listbox"
                          aria-multiselectable
                          style={{
                            ...ctStyle,
                            background: "#fff",
                            border: "1px solid #eef0f2",
                            borderRadius: 14,
                            boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
                            maxHeight: 260,
                            overflow: "auto",
                            zIndex: 3000,
                          }}
                        >
                          {CLASS_TYPE_OPTIONS.map((opt) => {
                            const checked = classTypes.includes(opt);
                            return (
                              <div
                                key={opt}
                                onClick={() => toggleClassType(opt)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  padding: "12px 14px",
                                  cursor: "pointer",
                                  userSelect: "none",
                                  transition: "background 120ms",
                                }}
                              >
                                <span aria-hidden style={{ width: 18, height: 18, borderRadius: 6, border: checked ? "1px solid #111" : "1px solid #d1d5db", background: checked ? "#111" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                  {checked && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                  )}
                                </span>
                                <span style={{ fontWeight: 500, fontSize: 15 }}>{opt}</span>
                              </div>
                            );
                          })}
                        </div>, document.body)}
                    </div>
                  </div>
                </div>
                <div style={{ minWidth: 240, flex: 1 }}>
                  <label style={input.label}>Technique</label>
                  <div style={{ position: "relative" }}>
                    <button
                      ref={teBtnRef}
                      type="button"
                      onClick={() => setTeOpen((v) => !v)}
                      aria-haspopup="listbox"
                      aria-expanded={teOpen}
                      style={{
                        ...input.base,
                        background: "#f9fafb",
                        borderColor: "#e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ color: techniqueTags.length ? "#111" : "#9ca3af" }}>
                        {techniqueTags.length ? techniqueTags.join(", ") : "Select technique tags"}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    {teOpen && teStyle && createPortal(
                      <div
                        ref={teMenuRef}
                        role="listbox"
                        aria-multiselectable
                        style={{
                          ...teStyle,
                          background: "#fff",
                          border: "1px solid #eef0f2",
                          borderRadius: 14,
                          boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
                          maxHeight: 260,
                          overflow: "auto",
                          zIndex: 3000,
                        }}
                      >
                        {TECHNIQUE_OPTIONS.map((opt) => {
                          const checked = techniqueTags.includes(opt);
                          return (
                            <div
                              key={opt}
                              onClick={() => toggleTechniqueTag(opt)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "12px 14px",
                                cursor: "pointer",
                                userSelect: "none",
                                transition: "background 120ms",
                              }}
                            >
                              <span aria-hidden style={{ width: 18, height: 18, borderRadius: 6, border: checked ? "1px solid #111" : "1px solid #d1d5db", background: checked ? "#111" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                {checked && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                )}
                              </span>
                              <span style={{ fontWeight: 500, fontSize: 15 }}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>, document.body)}
                  </div>
                </div>
                <div style={{ minWidth: 120, flex: 1 }}>
                  <label style={input.label}>Hours</label>
                  <input
                    name="hours"
                    type="number"
                    step="0.25"
                    placeholder="1.5"
                    style={input.base}
                    defaultValue={
                      initialData?.hours !== undefined && initialData?.hours !== null
                        ? initialData.hours
                        : ""
                    }
                  />
                </div>
                <div style={{ minWidth: 160, flex: 1 }}>
                  <label style={input.label}>Style</label>
                  {/* Hidden input to keep form data consistent */}
                  <input type="hidden" name="style" value={styleValue} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { key: "gi", label: "Gi" },
                      { key: "nogi", label: "NoGi" },
                    ].map((opt) => {
                      const active = styleValue === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setStyleValue(opt.key)}
                          style={{
                            ...input.base,
                            padding: "10px 12px",
                            textAlign: "center",
                            cursor: "pointer",
                            background: "#fff",
                            color: active ? "#111" : "#6b7280",
                            borderColor: active ? "#111" : "#e5e7eb",
                            fontWeight: active ? 700 : 600,
                            transition: "border-color 120ms, color 120ms",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Divider between Style and Performance */}
              <div style={{ height: 1, background: "#eef0f2", margin: "16px 0" }} />
              {/* Performance */}
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  {/* keep form data consistent */}
                  <input type="hidden" name="performance" value={performanceValue} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {PERFORMANCE_OPTIONS.map((opt) => {
                      const active = performanceValue === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setPerformanceValue(opt.key)}
                          style={{
                            ...input.base,
                            padding: "8px 10px",
                            fontSize: 13,
                            textAlign: "center",
                            cursor: "pointer",
                            background: "#fff",
                            color: active ? "#111" : "#6b7280",
                            borderColor: active ? "#111" : "#e5e7eb",
                            fontWeight: active ? 700 : 600,
                            transition: "border-color 120ms, color 120ms",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {performanceValue !== "None" && (
                  <div>
                    <label style={input.label}>Notes</label>
                    <textarea
                      name="performanceNotes"
                      rows={4}
                      placeholder="What went well / needs work"
                      style={{ ...input.base, resize: "vertical" }}
                      defaultValue={initialData?.performanceNotes || ""}
                    />
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#6b7280",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {moreOpen ? "Hide more" : "Show more"}
                </button>
                {moreOpen && (
                  <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                    <div style={{ minWidth: 260, maxWidth: 600 }}>
                      <label style={input.label}>YouTube / Link</label>
                      <input
                        name="url"
                        type="url"
                        placeholder="https://youtu.be/..."
                        style={input.base}
                        defaultValue={initialData?.url || ""}
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div style={{ color: "#b91c1c", fontWeight: 600 }}>{error}</div>
              )}
              {success && (
                <div style={{ color: "#065f46", fontWeight: 600 }}>{success}</div>
              )}

            </form>
          </div>
          {/* Footer: sticky action bar */}
          <div
            style={{
              position: "sticky",
              bottom: 0,
              background: "#fff",
              borderTop: "1px solid #f2f2f2",
              padding: "12px 18px",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              zIndex: 1,
            }}
          >
            <button
              type="button"
              onClick={close}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form={FORM_ID}
              disabled={submitting}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 700,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Saving…" : (initialData?.id ? "Save changes" : "Save class")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
