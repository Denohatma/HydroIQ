"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusCircle,
  ArrowRight,
  Loader2,
  Trash2,
  Activity,
  Database,
  FileCheck,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { api, type Project } from "@/lib/api";

const phaseLabels: Record<number, string> = {
  0: "—",
  1: "Site ID",
  2: "Screening",
  3: "Hydrology",
  4: "Design",
  5: "Environmental",
  6: "Cost Est.",
  7: "Financial",
};

function formatNum(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000)
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatCapacity(kw: number): string {
  if (kw >= 1000) return `${(kw / 1000).toFixed(1)} MW`;
  return `${kw.toFixed(0)} kW`;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      setError(null);
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

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const inEntry = projects.filter((p) => p.status !== "completed");
  const dataComplete = projects.filter((p) => p.current_phase >= 7);
  const pfsComplete = projects.filter((p) => p.status === "completed");
  const approved = projects.filter((p) => p.recommendation === "ADVANCE");
  const conditional = projects.filter(
    (p) => p.recommendation === "CONDITIONAL"
  );
  const approvedValue = approved.reduce(
    (s, p) => s + (p.total_capex_usd || 0),
    0
  );
  const conditionalValue = conditional.reduce(
    (s, p) => s + (p.total_capex_usd || 0),
    0
  );

  const totalCapacity = projects.reduce(
    (s, p) => s + (p.installed_capacity_kw || 0),
    0
  );
  const totalInvestment = projects.reduce(
    (s, p) => s + (p.total_capex_usd || 0),
    0
  );
  const countries = new Set(projects.map((p) => p.country));

  return (
    <div className="min-h-screen bg-[#0b1220]">
      <div className="mx-auto max-w-[1600px] px-4 py-5">
        {/* Section Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-[#d3a54a]/20" />
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#d3a54a]">
            Pipeline Overview
          </span>
          <div className="h-px flex-1 bg-[#d3a54a]/20" />
        </div>

        {/* Pipeline Funnel Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <StatBox
            icon={<Activity className="h-3.5 w-3.5" />}
            label="In Entry"
            value={inEntry.length}
            subtitle="projects in data collection"
            accentColor="#64748b"
          />
          <StatBox
            icon={<Database className="h-3.5 w-3.5" />}
            label="Data Complete"
            value={dataComplete.length}
            subtitle="all phases filled"
            accentColor="#3b82f6"
          />
          <StatBox
            icon={<FileCheck className="h-3.5 w-3.5" />}
            label="PFS Complete"
            value={pfsComplete.length}
            subtitle="studies finalized"
            accentColor="#8b5cf6"
          />
          <StatBox
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Approved"
            value={approved.length}
            subtitle="portfolio value"
            accentColor="#22c55e"
            money={approvedValue}
          />
          <StatBox
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="Conditional"
            value={conditional.length}
            subtitle="portfolio value"
            accentColor="#f59e0b"
            money={conditionalValue}
          />
        </div>

        {/* Pipeline Table */}
        <div className="bg-[#111c2e] border border-[#1a2744] rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a2744]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d3a54a] opacity-40" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d3a54a]" />
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-[#d3a54a]">
                Project Pipeline
              </span>
              <span className="text-[10px] font-mono text-[#475569]">
                ({projects.length})
              </span>
            </div>
            <Link
              href="/projects/new"
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#d3a54a] hover:text-[#e8c36a] transition-colors"
            >
              <PlusCircle className="h-3 w-3" />
              New Study
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-5 w-5 animate-spin text-[#d3a54a]" />
              <span className="ml-3 text-xs font-mono text-[#475569]">
                LOADING PIPELINE DATA...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-24">
              <p className="text-xs font-mono text-red-400">{error}</p>
              <button
                onClick={loadProjects}
                className="mt-3 text-[10px] font-mono uppercase tracking-wider text-[#d3a54a] hover:text-[#e8c36a]"
              >
                &#8635; Retry
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center py-24">
              <p className="text-sm font-mono text-[#475569]">
                NO PROJECTS IN PIPELINE
              </p>
              <Link
                href="/projects/new"
                className="mt-4 flex items-center gap-2 text-xs font-mono text-[#d3a54a] hover:text-[#e8c36a] transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                CREATE FIRST STUDY
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-[#1a2744]">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block px-4 py-3 hover:bg-[#162236] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-white truncate">
                          {project.name}
                        </p>
                        <p className="text-[10px] font-mono text-[#475569] mt-0.5">
                          {project.country} &middot;{" "}
                          {phaseLabels[project.current_phase] ??
                            `P${project.current_phase}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <RecBadge rec={project.recommendation} />
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(project.id, project.name);
                          }}
                          className="p-1 text-[#475569] hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-[10px] font-mono text-[#64748b]">
                      <span>
                        CAP:{" "}
                        {formatNum(project.installed_capacity_kw, 0)} kW
                      </span>
                      <span>
                        LCOE:{" "}
                        {project.lcoe_usd_mwh
                          ? `$${formatNum(project.lcoe_usd_mwh)}`
                          : "—"}
                      </span>
                      {project.total_capex_usd ? (
                        <span>
                          CAPEX:{" "}
                          {formatCurrency(project.total_capex_usd)}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#d3a54a]/10">
                      <th className="text-left text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-4 py-2.5 font-medium">
                        Project
                      </th>
                      <th className="text-left text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-4 py-2.5 font-medium">
                        Country
                      </th>
                      <th className="text-left text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-4 py-2.5 font-medium">
                        Phase
                      </th>
                      <th className="text-left text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-4 py-2.5 font-medium">
                        Status
                      </th>
                      <th className="text-right text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-4 py-2.5 font-medium">
                        Cap (kW)
                      </th>
                      <th className="text-right text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-4 py-2.5 font-medium">
                        LCOE ($/MWh)
                      </th>
                      <th className="text-right text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-4 py-2.5 font-medium">
                        CAPEX
                      </th>
                      <th className="text-center text-[10px] font-mono uppercase tracking-wider text-[#d3a54a]/60 px-4 py-2.5 font-medium">
                        Rec
                      </th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a2744]/50">
                    {projects.map((project) => (
                      <tr
                        key={project.id}
                        className="hover:bg-[#162236]/50 transition-colors group"
                      >
                        <td className="px-4 py-2">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-mono text-[11px] text-white hover:text-[#d3a54a] transition-colors"
                          >
                            {project.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2 font-mono text-[11px] text-[#94a3b8]">
                          {project.country}
                        </td>
                        <td className="px-4 py-2 font-mono text-[11px] text-[#94a3b8]">
                          {phaseLabels[project.current_phase] ??
                            `Phase ${project.current_phase}`}
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge status={project.status} />
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] text-[#e2e8f0]">
                          {formatNum(project.installed_capacity_kw, 0)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] text-[#e2e8f0]">
                          {project.lcoe_usd_mwh
                            ? `$${formatNum(project.lcoe_usd_mwh)}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] text-[#e2e8f0]">
                          {project.total_capex_usd
                            ? formatCurrency(project.total_capex_usd)
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <RecBadge rec={project.recommendation} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/projects/${project.id}`}>
                              <button className="p-1 text-[#475569] hover:text-[#d3a54a] transition-colors">
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </Link>
                            <button
                              onClick={() =>
                                handleDelete(project.id, project.name)
                              }
                              className="p-1 text-[#475569] hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Bottom Ticker */}
          {!loading && projects.length > 0 && (
            <div className="border-t border-[#1a2744] px-4 py-2 flex items-center gap-6 text-[10px] font-mono text-[#475569] overflow-x-auto no-scrollbar">
              <span>
                TOTAL:{" "}
                <span className="text-[#94a3b8]">{projects.length}</span>{" "}
                PROJECTS
              </span>
              <span>
                CAPACITY:{" "}
                <span className="text-[#94a3b8]">
                  {formatCapacity(totalCapacity)}
                </span>
              </span>
              <span>
                INVESTMENT:{" "}
                <span className="text-[#94a3b8]">
                  {totalInvestment > 0
                    ? formatCurrency(totalInvestment)
                    : "—"}
                </span>
              </span>
              <span>
                COUNTRIES:{" "}
                <span className="text-[#94a3b8]">{countries.size}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  subtitle,
  accentColor,
  money,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle: string;
  accentColor: string;
  money?: number;
}) {
  return (
    <div className="bg-[#111c2e] border border-[#1a2744] rounded-md p-4 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: accentColor }}>{icon}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748b]">
          {label}
        </span>
      </div>
      <div
        className="font-mono text-3xl font-bold"
        style={{ color: money !== undefined ? accentColor : "#ffffff" }}
      >
        {value}
      </div>
      {money !== undefined && money > 0 && (
        <div
          className="font-mono text-sm mt-1"
          style={{ color: accentColor, opacity: 0.8 }}
        >
          {formatCurrency(money)}
        </div>
      )}
      <div className="text-[10px] text-[#475569] mt-1 font-mono">
        {subtitle}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: {
      label: "DONE",
      className: "bg-[#22c55e]/10 text-[#22c55e]",
    },
    in_progress: {
      label: "WIP",
      className: "bg-[#3b82f6]/10 text-[#3b82f6]",
    },
    draft: {
      label: "ENTRY",
      className: "bg-[#475569]/20 text-[#64748b]",
    },
  };
  const c = config[status] ?? config.draft;
  return (
    <span
      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${c.className}`}
    >
      {c.label}
    </span>
  );
}

function RecBadge({ rec }: { rec?: string | null }) {
  if (!rec)
    return (
      <span className="text-[10px] font-mono text-[#475569]">&mdash;</span>
    );

  const config: Record<string, { label: string; className: string }> = {
    ADVANCE: {
      label: "ADVANCE",
      className:
        "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
    },
    CONDITIONAL: {
      label: "CONDITIONAL",
      className:
        "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
    },
    DO_NOT_ADVANCE: {
      label: "DO NOT ADV",
      className:
        "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20",
    },
  };
  const c = config[rec];
  if (!c)
    return (
      <span className="text-[10px] font-mono text-[#475569]">&mdash;</span>
    );

  return (
    <span
      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${c.className}`}
    >
      {c.label}
    </span>
  );
}
