"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { api, type Project } from "@/lib/api";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: "NOT STARTED", color: "#475569" },
  in_progress: { label: "IN PROGRESS", color: "#3b82f6" },
  completed: { label: "COMPLETE", color: "#22c55e" },
  not_secured: { label: "NOT SECURED", color: "#475569" },
  tendering: { label: "TENDERING", color: "#f59e0b" },
  secured: { label: "SECURED", color: "#22c55e" },
  fundraising: { label: "FUNDRAISING", color: "#f59e0b" },
  partially_secured: { label: "PARTIAL", color: "#f59e0b" },
  mandated: { label: "MANDATED", color: "#3b82f6" },
  term_sheet: { label: "TERM SHEET", color: "#8b5cf6" },
};

const TIMELINE_LABELS: Record<string, { label: string; color: string }> = {
  on_time: { label: "ON TIME", color: "#22c55e" },
  delayed: { label: "DELAYED", color: "#ef4444" },
  on_hold: { label: "ON HOLD", color: "#f59e0b" },
};

function StatusPill({ value }: { value?: string | null }) {
  const cfg =
    STATUS_LABELS[value || "not_started"] ?? STATUS_LABELS.not_started;
  return (
    <span
      className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
      style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function TimelinePill({ value }: { value?: string | null }) {
  const cfg =
    TIMELINE_LABELS[value || "on_time"] ?? TIMELINE_LABELS.on_time;
  return (
    <span
      className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border"
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

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000)
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
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
      <span className="text-[9px] font-mono" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function ProjectTable({
  projects,
  showRank,
}: {
  projects: Project[];
  showRank: boolean;
}) {
  return (
    <>
      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-[#1a2744]">
        {projects.map((project, idx) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="block px-4 py-3 hover:bg-[#162236] transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {showRank && (
                    <span className="text-[10px] font-mono text-[#d3a54a]">
                      #{idx + 1}
                    </span>
                  )}
                  <p className="font-mono text-xs text-white truncate">
                    {project.name}
                  </p>
                </div>
                <p className="text-[10px] font-mono text-[#475569] mt-0.5">
                  {project.country}
                  {project.total_capex_usd
                    ? ` · ${formatCurrency(project.total_capex_usd)}`
                    : ""}
                </p>
              </div>
              <TimelinePill value={project.timeline_status} />
            </div>
            <div className="mt-1.5">
              <DataBar score={dataCompletenessScore(project)} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-[9px] font-mono mt-2">
              <div>
                <span className="text-[#475569]">FS:</span>{" "}
                <StatusPill value={project.feasibility_status} />
              </div>
              <div>
                <span className="text-[#475569]">FM:</span>{" "}
                <StatusPill value={project.financial_model_status} />
              </div>
              <div>
                <span className="text-[#475569]">EPC:</span>{" "}
                <StatusPill value={project.epc_status} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#d3a54a]/10">
              {showRank && (
                <th className="text-left text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium w-8">
                  #
                </th>
              )}
              <th className="text-left text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Project
              </th>
              <th className="text-left text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Country
              </th>
              <th className="text-center text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium w-24">
                Data
              </th>
              <th className="text-center text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Feasibility
              </th>
              <th className="text-center text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Fin. Model
              </th>
              <th className="text-center text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                EPC
              </th>
              <th className="text-center text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Equity
              </th>
              <th className="text-center text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Debt
              </th>
              <th className="text-center text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                FC Date
              </th>
              <th className="text-center text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
                Timeline
              </th>
              <th className="text-left text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-3 py-2.5 font-medium">
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
                  <td className="px-3 py-2 font-mono text-[10px] text-[#d3a54a]/40">
                    {idx + 1}
                  </td>
                )}
                <td className="px-3 py-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-mono text-[11px] text-white hover:text-[#d3a54a] transition-colors"
                  >
                    {project.name}
                  </Link>
                  {project.total_capex_usd ? (
                    <span className="ml-2 text-[9px] font-mono text-[#64748b]">
                      {formatCurrency(project.total_capex_usd)}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-[#94a3b8]">
                  {project.country}
                </td>
                <td className="px-3 py-2 w-24">
                  <DataBar score={dataCompletenessScore(project)} />
                </td>
                <td className="px-3 py-2 text-center">
                  <StatusPill value={project.feasibility_status} />
                </td>
                <td className="px-3 py-2 text-center">
                  <StatusPill value={project.financial_model_status} />
                </td>
                <td className="px-3 py-2 text-center">
                  <StatusPill value={project.epc_status} />
                </td>
                <td className="px-3 py-2 text-center">
                  <StatusPill value={project.equity_status} />
                </td>
                <td className="px-3 py-2 text-center">
                  <StatusPill value={project.debt_status} />
                </td>
                <td className="px-3 py-2 text-center font-mono text-[10px] text-[#94a3b8]">
                  {project.potential_fc_date || "—"}
                </td>
                <td className="px-3 py-2 text-center">
                  <TimelinePill value={project.timeline_status} />
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-[#94a3b8]">
                  {project.project_lead || "—"}
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

  const approved = projects
    .filter(
      (p) =>
        p.recommendation === "ADVANCE" ||
        p.recommendation === "CONDITIONAL"
    )
    .sort((a, b) => dataCompletenessScore(b) - dataCompletenessScore(a));

  const entry = projects
    .filter(
      (p) =>
        p.recommendation !== "ADVANCE" &&
        p.recommendation !== "CONDITIONAL"
    )
    .sort((a, b) => dataCompletenessScore(b) - dataCompletenessScore(a));

  const approvedValue = approved.reduce(
    (sum, p) => sum + (p.total_capex_usd || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#0b1220]">
      <div className="mx-auto max-w-[1800px] px-4 py-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-[#d3a54a]/20" />
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#d3a54a]">
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
              className="mt-3 text-[10px] font-mono uppercase text-[#d3a54a] hover:text-[#e8c36a]"
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
                  <span className="text-[10px] font-mono text-[#475569]">
                    ({approved.length})
                  </span>
                  {approvedValue > 0 && (
                    <span className="text-[10px] font-mono text-[#22c55e]/60 ml-1">
                      Portfolio: {formatCurrency(approvedValue)}
                    </span>
                  )}
                </div>
              </div>

              {approved.length > 0 ? (
                <ProjectTable projects={approved} showRank={false} />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <span className="text-[10px] font-mono text-[#475569]">
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
                  <span className="text-[10px] font-mono text-[#475569]">
                    ({entry.length})
                  </span>
                </div>
                <Link
                  href="/projects/new"
                  className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#d3a54a] hover:text-[#e8c36a] transition-colors"
                >
                  + New Study
                </Link>
              </div>

              {entry.length > 0 ? (
                <ProjectTable projects={entry} showRank={true} />
              ) : (
                <div className="flex items-center justify-center py-12">
                  <span className="text-[10px] font-mono text-[#475569]">
                    NO PROJECTS IN ENTRY
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Summary */}
            <div className="border border-[#1a2744] rounded-md px-4 py-2 flex items-center gap-6 text-[10px] font-mono text-[#475569] overflow-x-auto no-scrollbar bg-[#111c2e]">
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
