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

  // Lock background scroll on iOS/Android while drawer is open
  const scrollYRef = React.useRef(0);
  React.useEffect(() => {
    if (!open) return;
    // Save current scroll position
    scrollYRef.current = window.scrollY || window.pageYOffset || 0;
    const { style } = document.body as HTMLBodyElement;
    const prev = {
      position: style.position,
      top: style.top as string,
      width: style.width,
      overflow: style.overflow,
    };
    style.position = "fixed";
    style.top = `-${scrollYRef.current}px`;
    style.width = "100%";
    style.overflow = "hidden";
    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.width = prev.width;
      style.overflow = prev.overflow;
      window.scrollTo(0, scrollYRef.current);
    };
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
    "Dean",
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
    { key: "N/A",      label: "➖ N/A" },
    { key: "Bad",      label: "😕 Bad" },
    { key: "Mediocre", label: "🙂 OK" },
    { key: "Great",    label: "💪 Great" },
  ] as const;

  // Normalize legacy/saved performance strings to our keys
  function normalizePerformance(v: unknown): string {
    const s = String(v ?? "").toLowerCase().trim();
    if (!s || s === "none" || s === "null" || s === "na" || s.includes("n/a")) return "None";
    if (s.includes("great") || s.includes("💪")) return "Great";
    if (s.includes("mediocre") || s.includes("ok") || s.includes("🙂")) return "Mediocre";
    if (s.includes("bad") || s.includes("😕")) return "Bad";
    return "None";
  }

  const [performanceValue, setPerformanceValue] = React.useState<string>(
    () => normalizePerformance(initialData?.performance) || "N/A"
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
  // Mode: 'class' (default) or 'drilling'
  const [mode, setMode] = React.useState<"class" | "drilling">("class");
  const [drillingLocation, setDrillingLocation] = React.useState<"home" | "gym">("home");
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

  // When the drawer opens with existing data, ensure all state is re-seeded correctly
  React.useEffect(() => {
    if (!open) return;
    
    // Re-seed performance value
    const s = String(initialData?.performance ?? "").toLowerCase().trim();
    let perfValue = "N/A"; // default to N/A
    if (s && s !== "none" && s !== "null" && s !== "n/a") {
      if (s.includes("great") || s.includes("💪")) perfValue = "Great";
      else if (s.includes("mediocre") || s.includes("ok") || s.includes("🙂")) perfValue = "Mediocre";
      else if (s.includes("bad") || s.includes("😕")) perfValue = "Bad";
    }
    setPerformanceValue(perfValue);
    
    // Re-seed class types
    const newClassTypes = initialData?.classType
      ? String(initialData.classType)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : ["Advanced"];
    setClassTypes(newClassTypes);
    
    // Re-seed technique tags
    const newTechniqueTags = initialData?.technique
      ? String(initialData.technique)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
    setTechniqueTags(newTechniqueTags);
    
    // Re-seed instructor
    setInstructorValue(initialData?.instructor || "Kieran Davern");
    
    // Re-seed style
    setStyleValue(initialData?.style || "nogi");
    
    // Seed mode and drilling location when editing an existing row
    try {
      const ct = String(initialData?.classType || "").toLowerCase();
      if (ct.includes("drill")) setMode("drilling");
      else setMode("class");
      const loc = String(initialData?.drillingLocation || "home").toLowerCase();
      setDrillingLocation((loc === "gym" ? "gym" : "home") as "home" | "gym");
    } catch {}
  }, [open, initialData]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);

    // Build payload
    const payload = {
      date: String(fd.get("date") || "").trim(),
      classType: ((): string => {
        // If drilling mode, prefer explicit drilling marker; otherwise use selected class types
        if (mode === "drilling") return "Drilling";
        // allow an explicit hidden classType field (form override)
        const explicit = String(fd.get("classType") || "").trim();
        if (explicit) return explicit;
        return classTypes.join(", ");
      })(),
      instructor: mode === "drilling" ? (drillingLocation === "home" ? "Home" : "Gym") : instructorValue,
      technique: techniqueTags.join(", "),
      description: String(fd.get("description") || "").trim(),
      hours: ((): number | undefined => {
        const v = String(fd.get("hours") || "").trim();
        if (!v) return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      })(),
      style: styleValue,
      performance: performanceValue,
      performanceNotes: ((): string | undefined => {
        const v = String(fd.get("performanceNotes") || "").trim();
        return v ? v : undefined;
      })(),
      url: ((): string | undefined => {
        const v = String(fd.get("url") || "").trim();
        return v ? v : undefined;
      })(),
      // include drillingLocation when in drilling mode
      ...(mode === "drilling" ? { drillingLocation } : {}),
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
      fontSize: 16,            // avoid iOS zoom + unify height
      lineHeight: 1.4,
      minHeight: 44,           // consistent control height on iPhone
      background: "#fff",      // force light mode for inputs
      color: "#111",
      WebkitAppearance: "none" as any,
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
            height: "100dvh",
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
            overscrollBehavior: "none",
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
          <div
            style={{
              padding: "16px 18px",
              overflow: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              flex: 1,
              // extra bottom space so last inputs aren't covered by the sticky footer/keyboard
              paddingBottom: "calc(env(safe-area-inset-bottom) + 120px)",
            }}
          >
            <form
              ref={formRef}
              onSubmit={onSubmit}
              id={FORM_ID}
              style={{ display: "grid", gap: 24 }}
            >
              {/* Mode toggle (Class vs Drilling) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, background: "#f3f4f6", padding: 4, borderRadius: 12, marginBottom: 8 }}>
                {[
                  { key: "class", label: "Class" },
                  { key: "drilling", label: "Drilling" },
                ].map((opt) => {
                  const isActive = mode === (opt.key as "class" | "drilling");
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setMode(opt.key as "class" | "drilling")}
                      aria-pressed={isActive}
                      style={{
                        border: "none",
                        padding: "10px 14px",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: isActive ? 800 : 600,
                        background: isActive ? "#111" : "transparent",
                        color: isActive ? "#fff" : "#374151",
                        boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.12)" : "none",
                        transition: "all 120ms",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Unified Description */}
              <div style={{ marginTop: 24, marginBottom: 24 }}>
                <label style={input.label}>Description</label>
                <textarea
                  name="description"
                  rows={mode === "drilling" ? 6 : 8}
                  placeholder={mode === "drilling" ? "What you worked on while drilling" : "Key notes / drills / sparring focus"}
                  style={{ ...input.base, resize: "vertical" }}
                  defaultValue={initialData?.description || ""}
                />
              </div>

              {/* Date (always shown) */}
              <div style={{ display: "grid", gridTemplateColumns: mode === "class" ? "1fr 1fr" : "1fr", gap: 24, alignItems: "stretch" }}>
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

                {/* Instructor (class mode only - always rendered, visibility controlled) */}
                <div style={{ display: mode === "class" ? "block" : "none" }}>
                  <label style={input.label}>Instructor</label>
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
                        background: "#fff",
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

              {/* Class-specific fields row (always rendered, visibility controlled) */}
              <div style={{ display: mode === "class" ? "flex" : "none", gap: 24, flexWrap: "wrap", marginTop: 16 }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start", width: "100%" }}>
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
                          background: "#fff",
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
                          background: "#fff",
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
                </div>
              </div>

              {/* Drilling location (drilling mode only - always rendered, visibility controlled) */}
              <div style={{ display: mode === "drilling" ? "block" : "none" }}>
                <label style={input.label}>Location</label>
                <input type="hidden" name="drillingLocation" value={drillingLocation} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[{ key: "home", label: "Home" }, { key: "gym", label: "Gym" }].map((opt) => {
                    const active = drillingLocation === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setDrillingLocation(opt.key as "home" | "gym")}
                        style={{
                          ...input.base,
                          padding: "10px 12px",
                          textAlign: "center",
                          cursor: "pointer",
                          background: "#fff",
                          color: active ? "#111" : "#6b7280",
                          borderColor: active ? "#111" : "#e5e7eb",
                          fontWeight: active ? 700 : 600,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hours (both modes) */}
              <div style={{ minWidth: 120, maxWidth: 180 }}>
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

              {/* Style (both modes) */}
              <div style={{ minWidth: 160, maxWidth: 280 }}>
                <label style={input.label}>Style</label>
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

              {/* Performance (class mode only - always rendered, visibility controlled) */}
              <div style={{ display: mode === "class" ? "block" : "none" }}>
              {/* Divider between Style and Performance */}
              <div style={{ height: 1, background: "#eef0f2", margin: "16px 0" }} />
              {/* Performance */}
              <div style={{ display: "grid", gap: 24 }}>
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
                {performanceValue !== "N/A" && (
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
              </div>

              {mode === "drilling" && <input type="hidden" name="classType" value="Drilling" />}

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
              paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)",
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
