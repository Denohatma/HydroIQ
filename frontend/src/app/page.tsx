"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Droplets,
  PlusCircle,
  FolderOpen,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { api, type Project } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
};

const recommendationConfig: Record<
  string,
  { label: string; className: string }
> = {
  ADVANCE: {
    label: "Advance",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CONDITIONAL: {
    label: "Conditional",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  DO_NOT_ADVANCE: {
    label: "Do Not Advance",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

const phaseLabels: Record<number, string> = {
  0: "Not Started",
  1: "Site Identification",
  2: "Screening",
  3: "Hydrology",
  4: "Design",
  5: "Environmental",
  6: "Cost Estimation",
  7: "Financial",
};

function formatNumber(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value === null || value === undefined) return "--";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
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
    if (!confirm(`Delete project "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to delete project"
      );
    }
  }

  const totalProjects = projects.length;
  const completedStudies = projects.filter(
    (p) => p.status === "completed"
  ).length;
  const inProgress = projects.filter(
    (p) => p.status === "in_progress"
  ).length;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-[#0c2d48] to-[#145374]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Droplets className="h-7 w-7 sm:h-8 sm:w-8 text-teal-400" />
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  HydroIQ
                </h1>
              </div>
              <p className="text-base sm:text-lg text-teal-200/80">
                AfCEN &mdash; Africa&apos;s Infrastructure Intelligence Layer
              </p>
              <p className="mt-1 text-sm text-slate-400 hidden sm:block">
                Structured assessment framework for small hydropower projects
                across Africa
              </p>
            </div>
            <Link href="/projects/new">
              <Button
                size="lg"
                className="gap-2 bg-teal-600 text-white hover:bg-teal-700 w-full sm:w-auto"
              >
                <PlusCircle className="h-4 w-4" />
                New Study
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats */}
        <div className="mb-6 sm:mb-8 grid grid-cols-3 gap-2 sm:gap-4">
          <Card>
            <CardContent className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 pt-1 px-3 sm:px-6">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-slate-100">
                <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium text-slate-500">
                  Projects
                </p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900">
                  {totalProjects}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 pt-1 px-3 sm:px-6">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium text-slate-500">
                  Completed
                </p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900">
                  {completedStudies}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 pt-1 px-3 sm:px-6">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-sky-50">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-sky-600" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium text-slate-500">
                  In Progress
                </p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900">
                  {inProgress}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-900">
                All Projects
              </CardTitle>
              <Link href="/projects/new">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <PlusCircle className="h-3.5 w-3.5" />
                  New Study
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                <span className="ml-3 text-sm text-slate-500">
                  Loading projects...
                </span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-red-600">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={loadProjects}
                >
                  Retry
                </Button>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <FolderOpen className="h-7 w-7 text-slate-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-900">
                  No projects yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Create your first hydropower pre-feasibility study to get
                  started.
                </p>
                <Link href="/projects/new" className="mt-4">
                  <Button className="gap-2 bg-teal-600 text-white hover:bg-teal-700">
                    <PlusCircle className="h-4 w-4" />
                    New Study
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="space-y-3 md:hidden">
                  {projects.map((project) => {
                    const status =
                      statusConfig[project.status] ?? statusConfig.draft;
                    const rec = project.recommendation
                      ? recommendationConfig[project.recommendation]
                      : null;

                    return (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="block rounded-lg border border-slate-200 p-4 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                              {project.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {project.country} &middot;{" "}
                              {phaseLabels[project.current_phase] ??
                                `Phase ${project.current_phase}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${status.className}`}
                            >
                              {status.label}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-slate-400 hover:text-red-600"
                              onClick={(e) => {
                                e.preventDefault();
                                handleDelete(project.id, project.name);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                          <span>
                            <span className="text-slate-400">Cap:</span>{" "}
                            {formatNumber(project.installed_capacity_kw, 0)} kW
                          </span>
                          <span>
                            <span className="text-slate-400">LCOE:</span>{" "}
                            ${formatNumber(project.lcoe_usd_mwh)}
                          </span>
                          {rec ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${rec.className}`}
                            >
                              {rec.label}
                            </Badge>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Name</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Phase</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">
                          Capacity (kW)
                        </TableHead>
                        <TableHead className="text-right">
                          LCOE (USD/MWh)
                        </TableHead>
                        <TableHead>Recommendation</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => {
                        const status =
                          statusConfig[project.status] ?? statusConfig.draft;
                        const rec = project.recommendation
                          ? recommendationConfig[project.recommendation]
                          : null;

                        return (
                          <TableRow key={project.id}>
                            <TableCell>
                              <Link
                                href={`/projects/${project.id}`}
                                className="font-medium text-slate-900 hover:text-teal-700 hover:underline"
                              >
                                {project.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {project.country}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {phaseLabels[project.current_phase] ??
                                `Phase ${project.current_phase}`}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={status.className}
                              >
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-700">
                              {formatNumber(project.installed_capacity_kw, 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-700">
                              {formatNumber(project.lcoe_usd_mwh)}
                            </TableCell>
                            <TableCell>
                              {rec ? (
                                <Badge
                                  variant="outline"
                                  className={rec.className}
                                >
                                  {rec.label}
                                </Badge>
                              ) : (
                                <span className="text-sm text-slate-400">
                                  --
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Link href={`/projects/${project.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-slate-500 hover:text-teal-700"
                                  >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-slate-400 hover:text-red-600"
                                  onClick={() =>
                                    handleDelete(project.id, project.name)
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
