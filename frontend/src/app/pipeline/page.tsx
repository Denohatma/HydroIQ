"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  ArrowRight,
  CheckCircle2,
  Clock,
  ChevronDown,
} from "lucide-react";
import { api, type Project } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

const STATUS_OPTIONS: Record<string, { label: string; color: string }> = {
  not_started: { label: "NOT STARTED", color: "#475569" },
  in_progress: { label: "IN PROGRESS", color: "#3b82f6" },
  completed: { label: "COMPLETE", color: "#22c55e" },
};

const EPC_OPTIONS: Record<string, { label: string; color: string }> = {
  not_secured: { label: "NOT SECURED", color: "#475569" },
  tendering: { label: "TENDERING", color: "#f59e0b" },
  secured: { label: "SECURED", color: "#22c55e" },
};

const EQUITY_OPTIONS: Record<string, { label: string; color: string }> = {
  not_secured: { label: "NOT SECURED", color: "#475569" },
  fundraising: { label: "FUNDRAISING", color: "#f59e0b" },
  partially_secured: { label: "PARTIAL", color: "#f59e0b" },
  secured: { label: "SECURED", color: "#22c55e" },
};

const DEBT_OPTIONS: Record<string, { label: string; color: string }> = {
  not_secured: { label: "NOT SECURED", color: "#475569" },
  mandated: { label: "MANDATED", color: "#3b82f6" },
  term_sheet: { label: "TERM SHEET", color: "#8b5cf6" },
  secured: { label: "SECURED", color: "#22c55e" },
};

const TIMELINE_OPTIONS: Record<string, { label: string; color: string }> = {
  on_time: { label: "ON TIME", color: "#22c55e" },
  delayed: { label: "DELAYED", color: "#ef4444" },
  on_hold: { label: "ON HOLD", color: "#f59e0b" },
};

const ALL_STATUS: Record<string, { label: string; color: string }> = {
  ...STATUS_OPTIONS,
  ...EPC_OPTIONS,
  ...EQUITY_OPTIONS,
  ...DEBT_OPTIONS,
  ...TIMELINE_OPTIONS,
};

function StatusPill({ value }: { value?: string | null }) {
  const cfg = ALL_STATUS[value || "not_started"] ?? ALL_STATUS.not_started;
  return (
    <span
      className="text-[11px] font-mono uppercase px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function TimelinePill({ value }: { value?: string | null }) {
  const cfg =
    TIMELINE_OPTIONS[value || "on_time"] ?? TIMELINE_OPTIONS.on_time;
  return (
    <span
      className="text-[11px] font-mono uppercase px-1.5 py-0.5 rounded border whitespace-nowrap"
      style={{
        backgroundColor: `${cfg.color}15`,
        color: cfg.color,
        borderColor: `${cfg.color}30`,
      }}
    >
      {cfg.label}
    </span>
  );
}

function EditableSelect({
  value,
  options,
  onSave,
}: {
  value: string;
  options: Record<string, { label: string; color: string }>;
  onSave: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const cfg = options[value] ?? Object.values(options)[0];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center gap-1 group/edit cursor-pointer"
      >
        <span
          className="text-[11px] font-mono uppercase px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
        >
          {cfg.label}
        </span>
        <ChevronDown className="h-2.5 w-2.5 text-[#475569] opacity-0 group-hover/edit:opacity-100 transition-opacity" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-[#0f1b2b] border border-[#1a2744] rounded shadow-xl min-w-[140px]">
          {Object.entries(options).map(([key, opt]) => (
            <button
              key={key}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSave(key);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-mono uppercase hover:bg-[#162236] transition-colors flex items-center gap-2 ${
                key === value ? "bg-[#162236]" : ""
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: opt.color }}
              />
              <span style={{ color: opt.color }}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableText({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder: string;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  if (!editing) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setText(value);
          setEditing(true);
        }}
        className="font-mono text-xs text-[#94a3b8] hover:text-white transition-colors cursor-pointer text-left"
      >
        {value || <span className="text-[#475569]">{placeholder}</span>}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== value) onSave(text);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (text !== value) onSave(text);
          setEditing(false);
        }
        if (e.key === "Escape") {
          setText(value);
          setEditing(false);
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="bg-[#0b1220] border border-[#d3a54a]/40 rounded px-1.5 py-0.5 text-xs font-mono text-white w-24 outline-none focus:border-[#d3a54a]"
      placeholder={placeholder}
    />
  );
}

function dataCompletenessScore(p: Project): number {
  let score = 0;
  if (p.latitude && p.longitude) score += 1;
  if (p.catchment_area_km2) score += 1;
  if (p.gross_head_m) score += 1;
  if (p.mean_annual_flow_m3s) score += 1;
  if (p.design_flow_m3s) score += 1;
  if (p.installed_capacity_kw) score += 1;
  if (p.annual_energy_mwh) score += 1;
  if (p.total_capex_usd) score += 1;
  if (p.lcoe_usd_mwh) score += 1;
  if (p.irr_pct) score += 1;
  return score;
}

const MAX_DATA_SCORE = 10;

function DataBar({ score }: { score: number }) {
  const pct = Math.round((score / MAX_DATA_SCORE) * 100);
  const color =
    pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#1a2744] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-mono" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function ProjectTable({
  projects,
  showRank,
  onUpdate,
}: {
  projects: Project[];
  showRank: boolean;
  onUpdate: (id: number, field: string, value: string) => void;
}) {
  return (
    <>
      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-[#1a2744]">
        {projects.map((project, idx) => (
          <div
            key={project.id}
            className="px-4 py-3 hover:bg-[#162236] transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {showRank && (
                    <span className="text-xs font-mono text-[#d3a54a]">
                      #{idx + 1}
                    </span>
                  )}
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-mono text-sm text-white hover:text-[#d3a54a] truncate"
                  >
                    {project.name}
                  </Link>
                </div>
                <p className="text-xs font-mono text-[#475569] mt-0.5">
                  {project.country}
                  {project.total_capex_usd
                    ? ` · ${formatCurrency(project.total_capex_usd)}`
                    : ""}
                </p>
              </div>
              <EditableSelect
                value={project.timeline_status || "on_time"}
                options={TIMELINE_OPTIONS}
                onSave={(v) => onUpdate(project.id, "timeline_status", v)}
              />
            </div>
            <div className="mt-1.5">
              <DataBar score={dataCompletenessScore(project)} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono mt-2">
              <div className="flex items-center gap-1">
                <span className="text-[#475569]">FS:</span>
                <EditableSelect
                  value={project.feasibility_status || "not_started"}
                  options={STATUS_OPTIONS}
                  onSave={(v) => onUpdate(project.id, "feasibility_status", v)}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#475569]">FM:</span>
                <EditableSelect
                  value={project.financial_model_status || "not_started"}
                  options={STATUS_OPTIONS}
                  onSave={(v) =>
                    onUpdate(project.id, "financial_model_status", v)
                  }
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#475569]">EPC:</span>
                <EditableSelect
                  value={project.epc_status || "not_secured"}
                  options={EPC_OPTIONS}
                  onSave={(v) => onUpdate(project.id, "epc_status", v)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#d3a54a]/10">
              {showRank && (
                <th className="text-left text-xs font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium w-8">
                  #
                </th>
              )}
              <th className="text-left text-xs font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Project
              </th>
              <th className="text-left text-xs font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Country
              </th>
              <th className="text-center text-xs font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium w-24">
                Data
              </th>
              <th className="text-center text-xs font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Feasibility
              </th>
              <th className="text-center text-xs font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Fin. Model
              </th>
              <th className="text-center text-xs font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                EPC
              </th>
              <th className="text-center text-xs font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Equity
              </th>
              <th className="text-center text-xs font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Debt
              </th>
              <th className="text-center text-xs font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                FC Date
              </th>
              <th className="text-center text-xs font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Timeline
              </th>
              <th className="text-left text-xs font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Lead
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2744]/50">
            {projects.map((project, idx) => (
              <tr
                key={project.id}
                className="hover:bg-[#162236]/50 transition-colors group"
              >
                {showRank && (
                  <td className="px-3 py-2 font-mono text-xs text-[#d3a54a]/40">
                    {idx + 1}
                  </td>
                )}
                <td className="px-3 py-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-mono text-sm text-white hover:text-[#d3a54a] transition-colors"
                  >
                    {project.name}
                  </Link>
                  {project.total_capex_usd ? (
                    <span className="ml-2 text-[11px] font-mono text-[#64748b]">
                      {formatCurrency(project.total_capex_usd)}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 font-mono text-sm text-[#94a3b8]">
                  {project.country}
                </td>
                <td className="px-3 py-2 w-24">
                  <DataBar score={dataCompletenessScore(project)} />
                </td>
                <td className="px-3 py-2 text-center">
                  <EditableSelect
                    value={project.feasibility_status || "not_started"}
                    options={STATUS_OPTIONS}
                    onSave={(v) =>
                      onUpdate(project.id, "feasibility_status", v)
                    }
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <EditableSelect
                    value={project.financial_model_status || "not_started"}
                    options={STATUS_OPTIONS}
                    onSave={(v) =>
                      onUpdate(project.id, "financial_model_status", v)
                    }
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <EditableSelect
                    value={project.epc_status || "not_secured"}
                    options={EPC_OPTIONS}
                    onSave={(v) => onUpdate(project.id, "epc_status", v)}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <EditableSelect
                    value={project.equity_status || "not_secured"}
                    options={EQUITY_OPTIONS}
                    onSave={(v) => onUpdate(project.id, "equity_status", v)}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <EditableSelect
                    value={project.debt_status || "not_secured"}
                    options={DEBT_OPTIONS}
                    onSave={(v) => onUpdate(project.id, "debt_status", v)}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <EditableText
                    value={project.potential_fc_date || ""}
                    placeholder="Set date"
                    onSave={(v) =>
                      onUpdate(project.id, "potential_fc_date", v)
                    }
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <EditableSelect
                    value={project.timeline_status || "on_time"}
                    options={TIMELINE_OPTIONS}
                    onSave={(v) =>
                      onUpdate(project.id, "timeline_status", v)
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <EditableText
                    value={project.project_lead || ""}
                    placeholder="Assign"
                    onSave={(v) => onUpdate(project.id, "project_lead", v)}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/projects/${project.id}`}>
                    <button className="p-1 text-[#475569] hover:text-[#d3a54a] transition-colors opacity-0 group-hover:opacity-100">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function PipelinePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      const data = await api.listProjects();
      setProjects(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load projects"
      );
    } finally {
      setLoading(false);
    }
  }

  const handleUpdate = useCallback(async (id: number, field: string, value: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
    try {
      await api.updatePipeline(id, { [field]: value });
    } catch {
      loadProjects();
    }
  }, []);

  const { approved, entry, approvedValue } = useMemo(() => {
    const ap = projects
      .filter((p) => p.recommendation === "ADVANCE" || p.recommendation === "CONDITIONAL")
      .sort((a, b) => dataCompletenessScore(b) - dataCompletenessScore(a));
    const en = projects
      .filter((p) => p.recommendation !== "ADVANCE" && p.recommendation !== "CONDITIONAL")
      .sort((a, b) => dataCompletenessScore(b) - dataCompletenessScore(a));
    return {
      approved: ap,
      entry: en,
      approvedValue: ap.reduce((sum, p) => sum + (p.total_capex_usd || 0), 0),
    };
  }, [projects]);

  return (
    <div className="min-h-screen bg-[#0b1220]">
      <div className="mx-auto max-w-[1800px] px-4 py-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-[#d3a54a]/20" />
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#d3a54a]">
            AfCEN Project Pipeline
          </span>
          <div className="h-px flex-1 bg-[#d3a54a]/20" />
        </div>

        {loading ? (
          <div className="bg-[#111c2e] border border-[#1a2744] rounded-md flex items-center justify-center py-24">
            <Loader2 className="h-5 w-5 animate-spin text-[#d3a54a]" />
            <span className="ml-3 text-xs font-mono text-[#475569]">
              LOADING PIPELINE...
            </span>
          </div>
        ) : error ? (
          <div className="bg-[#111c2e] border border-[#1a2744] rounded-md flex flex-col items-center py-24">
            <p className="text-xs font-mono text-red-400">{error}</p>
            <button
              onClick={loadProjects}
              className="mt-3 text-xs font-mono uppercase text-[#d3a54a] hover:text-[#e8c36a]"
            >
              &#8635; Retry
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Approved Projects */}
            <div className="bg-[#111c2e] border border-[#1a2744] rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a2744]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#22c55e]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[#22c55e]">
                    Approved Projects
                  </span>
                  <span className="text-xs font-mono text-[#475569]">
                    ({approved.length})
                  </span>
                  {approvedValue > 0 && (
                    <span className="text-xs font-mono text-[#22c55e]/60 ml-1">
                      Portfolio: {formatCurrency(approvedValue)}
                    </span>
                  )}
                </div>
              </div>

              {approved.length > 0 ? (
                <ProjectTable
                  projects={approved}
                  showRank={false}
                  onUpdate={handleUpdate}
                />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <span className="text-xs font-mono text-[#475569]">
                    NO APPROVED PROJECTS YET
                  </span>
                </div>
              )}
            </div>

            {/* Section 2: Projects in Entry */}
            <div className="bg-[#111c2e] border border-[#1a2744] rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a2744]">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-[#d3a54a]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[#d3a54a]">
                    Projects in Entry
                  </span>
                  <span className="text-xs font-mono text-[#475569]">
                    ({entry.length})
                  </span>
                </div>
                <Link
                  href="/projects/new"
                  className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#d3a54a] hover:text-[#e8c36a] transition-colors"
                >
                  + New Study
                </Link>
              </div>

              {entry.length > 0 ? (
                <ProjectTable
                  projects={entry}
                  showRank={true}
                  onUpdate={handleUpdate}
                />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <span className="text-xs font-mono text-[#475569]">
                    NO PROJECTS IN ENTRY
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Summary */}
            <div className="border border-[#1a2744] rounded-md px-4 py-2 flex items-center gap-6 text-xs font-mono text-[#475569] overflow-x-auto no-scrollbar bg-[#111c2e]">
              <span>
                TOTAL:{" "}
                <span className="text-[#94a3b8]">{projects.length}</span>{" "}
                SITES
              </span>
              <span>
                APPROVED:{" "}
                <span className="text-[#22c55e]">{approved.length}</span>
              </span>
              <span>
                IN ENTRY:{" "}
                <span className="text-[#d3a54a]">{entry.length}</span>
              </span>
              <span>
                FS COMPLETE:{" "}
                <span className="text-[#22c55e]">
                  {
                    projects.filter(
                      (p) => p.feasibility_status === "completed"
                    ).length
                  }
                </span>
              </span>
              <span>
                EPC SECURED:{" "}
                <span className="text-[#22c55e]">
                  {
                    projects.filter((p) => p.epc_status === "secured")
                      .length
                  }
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
