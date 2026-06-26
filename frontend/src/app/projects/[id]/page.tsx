"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api, Project, FDCPoint, SensitivityResult } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

import {
  Droplets,
  Mountain,
  Brain,
  Zap,
  TreePine,
  DollarSign,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  ExternalLink,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Phase metadata
// ---------------------------------------------------------------------------

const PHASES = [
  { num: 1, label: "Scoping & Data Inventory", icon: Droplets },
  { num: 2, label: "Topographic & Hydrological Screening", icon: Mountain },
  { num: 3, label: "ML-Based Streamflow Prediction", icon: Brain },
  { num: 4, label: "Power & Energy Estimation", icon: Zap },
  { num: 5, label: "Environmental & Social Screening", icon: TreePine },
  { num: 6, label: "Preliminary Cost Estimation", icon: DollarSign },
  { num: 7, label: "Financial Viability & Recommendation", icon: TrendingUp },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number | undefined | null, decimals = 2): string {
  if (n == null || isNaN(n)) return "--";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtInt(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "--";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtUsd(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "--";
  return "$" + Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ---------------------------------------------------------------------------
// Phase Stepper
// ---------------------------------------------------------------------------

function PhaseStepper({
  currentPhase,
  completedUpTo,
  onSelect,
}: {
  currentPhase: number;
  completedUpTo: number;
  onSelect: (p: number) => void;
}) {
  return (
    <div className="w-full">
      {/* Desktop stepper */}
      <div className="hidden sm:flex items-center justify-between mb-2">
        {PHASES.map((p, idx) => {
          const Icon = p.icon;
          const isCompleted = p.num < completedUpTo;
          const isCurrent = p.num === currentPhase;
          const isAccessible = p.num <= completedUpTo;

          return (
            <div key={p.num} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => isAccessible && onSelect(p.num)}
                disabled={!isAccessible}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isAccessible
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-40"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? "bg-teal-600 border-teal-600 text-white"
                      : isCurrent
                      ? "bg-blue-900 border-blue-900 text-white ring-4 ring-blue-200"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium text-center leading-tight max-w-[80px] ${
                    isCurrent
                      ? "text-blue-900"
                      : isCompleted
                      ? "text-teal-700"
                      : "text-gray-400"
                  }`}
                >
                  {p.label}
                </span>
              </button>
              {idx < PHASES.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 mt-[-20px] ${
                    p.num < completedUpTo ? "bg-teal-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Mobile stepper - compact grid */}
      <div className="grid grid-cols-7 gap-1 sm:hidden mb-2">
        {PHASES.map((p) => {
          const Icon = p.icon;
          const isCompleted = p.num < completedUpTo;
          const isCurrent = p.num === currentPhase;
          const isAccessible = p.num <= completedUpTo;

          return (
            <button
              key={p.num}
              onClick={() => isAccessible && onSelect(p.num)}
              disabled={!isAccessible}
              className={`flex flex-col items-center gap-0.5 py-1 ${
                isAccessible ? "cursor-pointer" : "cursor-not-allowed opacity-40"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  isCompleted
                    ? "bg-teal-600 border-teal-600 text-white"
                    : isCurrent
                    ? "bg-blue-900 border-blue-900 text-white ring-2 ring-blue-200"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span className={`text-[8px] font-medium text-center leading-tight ${
                isCurrent ? "text-blue-900" : isCompleted ? "text-teal-700" : "text-gray-400"
              }`}>
                P{p.num}
              </span>
            </button>
          );
        })}
      </div>
      <Progress value={((completedUpTo - 1) / 7) * 100}>
        <span className="text-xs text-muted-foreground">
          {completedUpTo - 1} of 7 phases complete
        </span>
      </Progress>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable form field wrappers
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
  step,
  min,
  max,
  placeholder,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  hint?: string;
  step?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
      />
    </Field>
  );
}

function SelectField({
  label,
  value,
  onValueChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value} onValueChange={(v) => { if (v !== null) onValueChange(v); }}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function CheckField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <Label className="cursor-pointer">{label}</Label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const id = Number(rawId);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("phase-1");

  // Phase-specific response state
  const [screeningResults, setScreeningResults] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [turbineRec, setTurbineRec] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [designSensitivity, setDesignSensitivity] = useState<
    Record<string, unknown>[]
  >([]);
  const [envFlows, setEnvFlows] = useState<Record<string, number> | null>(
    null
  );
  const [esiaFlagCount, setEsiaFlagCount] = useState<number>(0);
  const [requiresSpecialist, setRequiresSpecialist] = useState(false);
  const [costBreakdown, setCostBreakdown] = useState<Record<
    string,
    number
  > | null>(null);
  const [benchmarkRange, setBenchmarkRange] = useState<Record<
    string,
    number
  > | null>(null);
  const [finRecommendation, setFinRecommendation] = useState<string>("");
  const [sensitivityResults, setSensitivityResults] = useState<
    SensitivityResult[]
  >([]);

  // ---- Phase 1 state ----
  const [p1, setP1] = useState({
    latitude: "" as string | number,
    longitude: "" as string | number,
    catchment_area_km2: "" as string | number,
    project_type: "run_of_river",
    capacity_class: "small",
    distance_to_load_km: "" as string | number,
    has_gauge_data: "no",
    gauge_years: "" as string | number,
  });

  // ---- Phase 2 state ----
  const [p2, setP2] = useState({
    dem_resolution_m: 30 as string | number,
    gross_head_m: "" as string | number,
    mean_slope_pct: "" as string | number,
    elevation_mean_m: "" as string | number,
    stream_length_km: "" as string | number,
    penstock_length_m: "" as string | number,
    aridity_index: "" as string | number,
    forest_fraction: "" as string | number,
    soil_porosity: "" as string | number,
    soil_conductivity: "" as string | number,
    geological_permeability: "" as string | number,
    carbonate_rock_fraction: "" as string | number,
  });

  // ---- Phase 3 state ----
  const [p3, setP3] = useState({
    lstm_model_approach: "Regional LSTM with local fine-tuning",
    mean_annual_flow_m3s: "" as string | number,
    q10_m3s: "" as string | number,
    q40_m3s: "" as string | number,
    q50_m3s: "" as string | number,
    q90_m3s: "" as string | number,
    flow_cv: "" as string | number,
    nse_score: "" as string | number,
    ensemble_size: 10 as string | number,
    simulation_years: 20 as string | number,
  });

  // ---- Phase 4 state ----
  const [p4, setP4] = useState({
    design_flow_exceedance: "Q40",
    turbine_efficiency: 0.8 as string | number,
    plant_availability: 0.87 as string | number,
    auxiliary_consumption_pct: 3 as string | number,
    transmission_loss_pct: 2 as string | number,
  });

  // ---- Phase 5 state ----
  const [p5, setP5] = useState({
    env_flow_method: "Tennant",
    env_flow_min_pct: 10 as string | number,
    env_flow_fair_pct: 30 as string | number,
    env_flow_outstanding_pct: 60 as string | number,
    protected_area: false,
    endangered_species: false,
    community_dependency: false,
    cultural_heritage: false,
    land_area_affected_ha: "" as string | number,
    water_rights_affected: false,
    esia_notes: "",
  });

  // ---- Phase 6 state ----
  const [p6, setP6] = useState({
    civil_works_usd: "" as string | number,
    electromechanical_usd: "" as string | number,
    transmission_km: "" as string | number,
    transmission_cost_per_km: 25000 as string | number,
    environmental_social_pct: 5 as string | number,
    engineering_dev_pct: 10 as string | number,
    contingency_pct: 30 as string | number,
    annual_om_pct: 2.5 as string | number,
  });

  // ---- Phase 7 state ----
  const [p7, setP7] = useState({
    tariff_usd_kwh: "" as string | number,
    discount_rate_pct: 10 as string | number,
    project_life_years: 30 as string | number,
    debt_fraction: "" as string | number,
    debt_rate_pct: "" as string | number,
    debt_term_years: "" as string | number,
  });

  // ---- Auto-save state ----
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const initialized = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Load project ----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getProject(id)
      .then((proj) => {
        if (cancelled) return;
        setProject(proj);
        populateFromProject(proj);
        setActiveTab(`phase-${proj.current_phase}`);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---- Populate forms from project data ----
  const populateFromProject = useCallback((proj: Project) => {
    setP1({
      latitude: proj.latitude ?? "",
      longitude: proj.longitude ?? "",
      catchment_area_km2: proj.catchment_area_km2 ?? "",
      project_type: proj.project_type ?? "run_of_river",
      capacity_class: proj.capacity_class ?? "small",
      distance_to_load_km: (proj as unknown as Record<string, unknown>).distance_to_load_km as string | number ?? "",
      has_gauge_data: (proj as unknown as Record<string, unknown>).has_gauge_data as string ?? "no",
      gauge_years: (proj as unknown as Record<string, unknown>).gauge_years as string | number ?? "",
    });
    setP2((prev) => ({
      ...prev,
      gross_head_m: proj.gross_head_m ?? "",
      ...(Object.fromEntries(
        [
          "dem_resolution_m",
          "mean_slope_pct",
          "elevation_mean_m",
          "stream_length_km",
          "penstock_length_m",
          "aridity_index",
          "forest_fraction",
          "soil_porosity",
          "soil_conductivity",
          "geological_permeability",
          "carbonate_rock_fraction",
        ].map((k) => [k, (proj as unknown as Record<string, unknown>)[k] ?? prev[k as keyof typeof prev]])
      )),
    }));
    setP3((prev) => ({
      ...prev,
      mean_annual_flow_m3s: proj.mean_annual_flow_m3s ?? "",
      q10_m3s: proj.q10_m3s ?? "",
      q40_m3s: proj.q40_m3s ?? "",
      q50_m3s: proj.q50_m3s ?? "",
      q90_m3s: proj.q90_m3s ?? "",
      nse_score: proj.nse_score ?? "",
      ...(Object.fromEntries(
        ["lstm_model_approach", "flow_cv", "ensemble_size", "simulation_years"].map((k) => [
          k,
          (proj as unknown as Record<string, unknown>)[k] ?? prev[k as keyof typeof prev],
        ])
      )),
    }));
    setP4((prev) => ({
      ...prev,
      ...(Object.fromEntries(
        [
          "design_flow_exceedance",
          "turbine_efficiency",
          "plant_availability",
          "auxiliary_consumption_pct",
          "transmission_loss_pct",
        ].map((k) => [k, (proj as unknown as Record<string, unknown>)[k] ?? prev[k as keyof typeof prev]])
      )),
    }));
    setP5((prev) => ({
      ...prev,
      ...(Object.fromEntries(
        [
          "env_flow_method",
          "env_flow_min_pct",
          "env_flow_fair_pct",
          "env_flow_outstanding_pct",
          "protected_area",
          "endangered_species",
          "community_dependency",
          "cultural_heritage",
          "land_area_affected_ha",
          "water_rights_affected",
          "esia_notes",
        ].map((k) => [k, (proj as unknown as Record<string, unknown>)[k] ?? prev[k as keyof typeof prev]])
      )),
    }));
    setP6((prev) => ({
      ...prev,
      ...(Object.fromEntries(
        [
          "civil_works_usd",
          "electromechanical_usd",
          "transmission_km",
          "transmission_cost_per_km",
          "environmental_social_pct",
          "engineering_dev_pct",
          "contingency_pct",
          "annual_om_pct",
        ].map((k) => [k, (proj as unknown as Record<string, unknown>)[k] ?? prev[k as keyof typeof prev]])
      )),
    }));
    setP7((prev) => ({
      ...prev,
      ...(Object.fromEntries(
        [
          "tariff_usd_kwh",
          "discount_rate_pct",
          "project_life_years",
          "debt_fraction",
          "debt_rate_pct",
          "debt_term_years",
        ].map((k) => [k, (proj as unknown as Record<string, unknown>)[k] ?? prev[k as keyof typeof prev]])
      )),
    }));

    if (proj.sensitivity_results) setSensitivityResults(proj.sensitivity_results);
    setTimeout(() => { initialized.current = true; }, 100);
  }, []);

  // ---- Auto-save (debounced) ----
  useEffect(() => {
    if (!initialized.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const draft: Record<string, unknown> = {};
      const addNum = (key: string, v: string | number) => {
        if (v === "" || v == null) return;
        const n = Number(v);
        if (!isNaN(n)) draft[key] = n;
      };
      const addStr = (key: string, v: string) => {
        if (v) draft[key] = v;
      };
      const addBool = (key: string, v: boolean) => {
        draft[key] = v;
      };

      // Phase 1
      addNum("latitude", p1.latitude);
      addNum("longitude", p1.longitude);
      addNum("catchment_area_km2", p1.catchment_area_km2);
      addStr("project_type", p1.project_type);
      addStr("capacity_class", p1.capacity_class);
      addNum("distance_to_load_km", p1.distance_to_load_km);
      addStr("has_gauge_data", p1.has_gauge_data);
      addNum("gauge_years", p1.gauge_years);

      // Phase 2
      addNum("dem_resolution_m", p2.dem_resolution_m);
      addNum("gross_head_m", p2.gross_head_m);
      addNum("mean_slope_pct", p2.mean_slope_pct);
      addNum("elevation_mean_m", p2.elevation_mean_m);
      addNum("stream_length_km", p2.stream_length_km);
      addNum("penstock_length_m", p2.penstock_length_m);
      addNum("aridity_index", p2.aridity_index);
      addNum("forest_fraction", p2.forest_fraction);
      addNum("soil_porosity", p2.soil_porosity);
      addNum("soil_conductivity", p2.soil_conductivity);
      addNum("geological_permeability", p2.geological_permeability);
      addNum("carbonate_rock_fraction", p2.carbonate_rock_fraction);

      // Phase 3
      addStr("lstm_model_approach", p3.lstm_model_approach);
      addNum("mean_annual_flow_m3s", p3.mean_annual_flow_m3s);
      addNum("q10_m3s", p3.q10_m3s);
      addNum("q40_m3s", p3.q40_m3s);
      addNum("q50_m3s", p3.q50_m3s);
      addNum("q90_m3s", p3.q90_m3s);
      addNum("flow_cv", p3.flow_cv);
      addNum("nse_score", p3.nse_score);
      addNum("ensemble_size", p3.ensemble_size);
      addNum("simulation_years", p3.simulation_years);

      // Phase 4
      addStr("design_flow_exceedance", p4.design_flow_exceedance);
      addNum("turbine_efficiency", p4.turbine_efficiency);
      addNum("plant_availability", p4.plant_availability);
      addNum("auxiliary_consumption_pct", p4.auxiliary_consumption_pct);
      addNum("transmission_loss_pct", p4.transmission_loss_pct);

      // Phase 5
      addStr("env_flow_method", p5.env_flow_method);
      addNum("env_flow_min_pct", p5.env_flow_min_pct);
      addNum("env_flow_fair_pct", p5.env_flow_fair_pct);
      addNum("env_flow_outstanding_pct", p5.env_flow_outstanding_pct);
      addBool("protected_area", p5.protected_area);
      addBool("endangered_species", p5.endangered_species);
      addBool("community_dependency", p5.community_dependency);
      addBool("cultural_heritage", p5.cultural_heritage);
      addNum("land_area_affected_ha", p5.land_area_affected_ha);
      addBool("water_rights_affected", p5.water_rights_affected);
      addStr("esia_notes", p5.esia_notes);

      // Phase 6
      addNum("civil_works_usd", p6.civil_works_usd);
      addNum("electromechanical_usd", p6.electromechanical_usd);
      addNum("transmission_km", p6.transmission_km);
      addNum("transmission_cost_per_km", p6.transmission_cost_per_km);
      addNum("environmental_social_pct", p6.environmental_social_pct);
      addNum("engineering_dev_pct", p6.engineering_dev_pct);
      addNum("contingency_pct", p6.contingency_pct);
      addNum("annual_om_pct", p6.annual_om_pct);

      // Phase 7
      addNum("tariff_usd_kwh", p7.tariff_usd_kwh);
      addNum("discount_rate_pct", p7.discount_rate_pct);
      addNum("project_life_years", p7.project_life_years);
      addNum("debt_fraction", p7.debt_fraction);
      addNum("debt_rate_pct", p7.debt_rate_pct);
      addNum("debt_term_years", p7.debt_term_years);

      if (Object.keys(draft).length === 0) return;

      setSaveStatus("saving");
      try {
        await api.saveDraft(id, draft);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => s === "saved" ? "idle" : s), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p1, p2, p3, p4, p5, p6, p7]);

  // ---- Computed values ----
  const netHead = useMemo(() => {
    const gh = Number(p2.gross_head_m);
    return isNaN(gh) || gh === 0 ? null : gh * 0.92;
  }, [p2.gross_head_m]);

  const completedUpTo = project ? project.current_phase : 1;

  const hasEsiaWarning =
    p5.protected_area ||
    p5.endangered_species ||
    p5.community_dependency ||
    p5.cultural_heritage ||
    p5.water_rights_affected;

  // ---- Save helpers ----
  function toNum(v: string | number): number | undefined {
    if (v === "" || v == null) return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  }

  function buildPayload(obj: Record<string, string | number | boolean>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "boolean") {
        result[k] = v;
      } else if (typeof v === "string" && isNaN(Number(v))) {
        result[k] = v;
      } else {
        result[k] = toNum(v) ?? v;
      }
    }
    return result;
  }

  async function handleSavePhase1() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.savePhase1(id, buildPayload(p1));
      setProject(updated);
      setActiveTab("phase-2");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePhase2() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.savePhase2(id, buildPayload(p2));
      setProject(res.project);
      setScreeningResults(res.screening);
      setActiveTab("phase-3");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePhase3() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.savePhase3(id, buildPayload(p3));
      setProject(updated);
      setActiveTab("phase-4");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePhase4() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.savePhase4(id, buildPayload(p4));
      setProject(res.project);
      setTurbineRec(res.turbine_recommendation);
      setDesignSensitivity(res.design_flow_sensitivity);
      setActiveTab("phase-5");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePhase5() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.savePhase5(id, buildPayload(p5));
      setProject(res.project);
      setEnvFlows(res.environmental_flows);
      setEsiaFlagCount(res.esia_flags_count);
      setRequiresSpecialist(res.requires_specialist_assessment);
      setActiveTab("phase-6");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePhase6() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.savePhase6(id, buildPayload(p6));
      setProject(res.project);
      setCostBreakdown(res.cost_breakdown);
      setBenchmarkRange(res.benchmark_range);
      setActiveTab("phase-7");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePhase7() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.savePhase7(id, buildPayload(p7));
      setProject(res.project);
      setFinRecommendation(res.recommendation);
      setSensitivityResults(res.sensitivity);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ---- Grouped sensitivity results ----
  const groupedSensitivity = useMemo(() => {
    const groups: Record<string, SensitivityResult[]> = {};
    for (const r of sensitivityResults) {
      if (!groups[r.parameter]) groups[r.parameter] = [];
      groups[r.parameter].push(r);
    }
    return groups;
  }, [sensitivityResults]);

  // ---- Loading / error states ----
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <Droplets className="w-12 h-12 text-blue-900 animate-pulse mx-auto" />
          <p className="text-lg text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!project) return null;

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-950 to-teal-800 text-white px-4 sm:px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-widest text-blue-200 mb-0.5">
                HydroIQ Pre-Feasibility Study
              </p>
              <h1 className="text-lg sm:text-2xl font-bold leading-tight">{project.name}</h1>
              <p className="text-xs sm:text-sm text-blue-200 mt-0.5">
                {project.country}
                {project.region ? ` - ${project.region}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-blue-200 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-300 animate-ping" />
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-teal-300">
                  <CheckCircle className="h-3 w-3" />
                  Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-red-300">
                  <AlertTriangle className="h-3 w-3" />
                  Save failed
                </span>
              )}
              <Badge
                variant={project.status === "complete" ? "default" : "secondary"}
                className={`text-[10px] sm:text-xs ${
                  project.status === "complete"
                    ? "bg-teal-500 text-white"
                    : "bg-blue-800 text-blue-100"
                }`}
              >
                {project.status}
              </Badge>
              <Badge variant="outline" className="border-blue-400 text-blue-200 text-[10px] sm:text-xs">
                Phase {project.current_phase} / 7
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Error banner */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* PFS Locked banner */}
        {project.pfs_locked && (
          <Alert className="border-teal-300 bg-teal-50">
            <Lock className="w-4 h-4 text-teal-700" />
            <AlertTitle className="text-teal-800">PFS Complete — Project in AfCEN Pipeline</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-teal-700">
                This pre-feasibility study was finalized on{" "}
                {project.pfs_completed_at
                  ? new Date(project.pfs_completed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
                  : "—"}
                . Data is now locked and the project has been moved to the AfCEN Pipeline.
              </span>
              <Link
                href="/pipeline"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-800 hover:text-teal-900 whitespace-nowrap"
              >
                View Pipeline <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Phase Stepper */}
        <Card>
          <CardContent className="pt-6">
            <PhaseStepper
              currentPhase={Number(activeTab.split("-")[1])}
              completedUpTo={completedUpTo}
              onSelect={(p) => setActiveTab(`phase-${p}`)}
            />
          </CardContent>
        </Card>

        {/* Phase Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as string)}
        >
          <TabsList variant="line" className="w-full overflow-x-auto flex-nowrap h-auto gap-0 no-scrollbar">
            {PHASES.map((p) => {
              const Icon = p.icon;
              const isAccessible = p.num <= completedUpTo;
              return (
                <TabsTrigger
                  key={p.num}
                  value={`phase-${p.num}`}
                  disabled={!isAccessible}
                  className="gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 shrink-0"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs sm:text-sm">P{p.num}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* ============================================================ */}
          {/* PHASE 1: Scoping & Data Inventory */}
          {/* ============================================================ */}
          <TabsContent value="phase-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Droplets className="w-5 h-5" />
                  Phase 1: Scoping &amp; Data Inventory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <NumberField
                    label="Latitude"
                    value={p1.latitude}
                    onChange={(v) => setP1({ ...p1, latitude: v })}
                    step="0.0001"
                    placeholder="-15.4321"
                  />
                  <NumberField
                    label="Longitude"
                    value={p1.longitude}
                    onChange={(v) => setP1({ ...p1, longitude: v })}
                    step="0.0001"
                    placeholder="35.1234"
                  />
                  <NumberField
                    label="Catchment Area (km2)"
                    value={p1.catchment_area_km2}
                    onChange={(v) => setP1({ ...p1, catchment_area_km2: v })}
                    min="0"
                  />
                  <SelectField
                    label="Project Type"
                    value={p1.project_type}
                    onValueChange={(v) => setP1({ ...p1, project_type: v })}
                    options={[
                      { value: "run_of_river", label: "Run-of-River" },
                      { value: "pondage", label: "Pondage" },
                      { value: "large", label: "Large / Storage" },
                    ]}
                  />
                  <SelectField
                    label="Capacity Class"
                    value={p1.capacity_class}
                    onValueChange={(v) => setP1({ ...p1, capacity_class: v })}
                    options={[
                      { value: "micro", label: "Micro (< 100 kW)" },
                      { value: "mini", label: "Mini (100 - 1,000 kW)" },
                      { value: "small", label: "Small (1 - 10 MW)" },
                      { value: "medium", label: "Medium (10 - 100 MW)" },
                      { value: "large", label: "Large (> 100 MW)" },
                    ]}
                  />
                  <NumberField
                    label="Distance to Load (km)"
                    value={p1.distance_to_load_km}
                    onChange={(v) => setP1({ ...p1, distance_to_load_km: v })}
                    min="0"
                  />
                  <SelectField
                    label="Has Gauge Data?"
                    value={p1.has_gauge_data}
                    onValueChange={(v) => setP1({ ...p1, has_gauge_data: v })}
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "partial", label: "Partial" },
                      { value: "no", label: "No" },
                    ]}
                  />
                  <NumberField
                    label="Gauge Record (years)"
                    value={p1.gauge_years}
                    onChange={(v) => setP1({ ...p1, gauge_years: v })}
                    min="0"
                    hint="Number of years of available gauge data"
                  />
                </div>
                <Separator />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSavePhase1}
                    disabled={saving}
                    className="bg-blue-900 hover:bg-blue-800 text-white gap-2"
                  >
                    {saving ? "Saving..." : "Save & Continue"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================ */}
          {/* PHASE 2: Topographic & Hydrological Screening */}
          {/* ============================================================ */}
          <TabsContent value="phase-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Mountain className="w-5 h-5" />
                  Phase 2: Topographic &amp; Hydrological Screening
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <NumberField
                    label="DEM Resolution (m)"
                    value={p2.dem_resolution_m}
                    onChange={(v) => setP2({ ...p2, dem_resolution_m: v })}
                    hint="Default: 30m SRTM"
                  />
                  <div className="space-y-1.5">
                    <Label>Gross Head (m)</Label>
                    <Input
                      type="number"
                      value={p2.gross_head_m}
                      onChange={(e) =>
                        setP2({ ...p2, gross_head_m: e.target.value })
                      }
                      min="0"
                    />
                    {netHead !== null && (
                      <p className="text-xs text-teal-700 font-medium">
                        Net Head (x0.92): {fmt(netHead)} m
                      </p>
                    )}
                  </div>
                  <NumberField
                    label="Mean Slope (%)"
                    value={p2.mean_slope_pct}
                    onChange={(v) => setP2({ ...p2, mean_slope_pct: v })}
                  />
                  <NumberField
                    label="Mean Elevation (m)"
                    value={p2.elevation_mean_m}
                    onChange={(v) => setP2({ ...p2, elevation_mean_m: v })}
                  />
                  <NumberField
                    label="Stream Length (km)"
                    value={p2.stream_length_km}
                    onChange={(v) => setP2({ ...p2, stream_length_km: v })}
                  />
                  <NumberField
                    label="Penstock Length (m)"
                    value={p2.penstock_length_m}
                    onChange={(v) => setP2({ ...p2, penstock_length_m: v })}
                  />
                  <NumberField
                    label="Aridity Index"
                    value={p2.aridity_index}
                    onChange={(v) => setP2({ ...p2, aridity_index: v })}
                    step="0.01"
                    hint="P / PET ratio"
                  />
                  <NumberField
                    label="Forest Fraction"
                    value={p2.forest_fraction}
                    onChange={(v) => setP2({ ...p2, forest_fraction: v })}
                    step="0.01"
                    min="0"
                    max="1"
                  />
                  <NumberField
                    label="Soil Porosity"
                    value={p2.soil_porosity}
                    onChange={(v) => setP2({ ...p2, soil_porosity: v })}
                    step="0.01"
                    min="0"
                    max="1"
                  />
                  <NumberField
                    label="Soil Conductivity"
                    value={p2.soil_conductivity}
                    onChange={(v) => setP2({ ...p2, soil_conductivity: v })}
                    step="0.01"
                  />
                  <NumberField
                    label="Geological Permeability"
                    value={p2.geological_permeability}
                    onChange={(v) =>
                      setP2({ ...p2, geological_permeability: v })
                    }
                    step="0.01"
                  />
                  <NumberField
                    label="Carbonate Rock Fraction"
                    value={p2.carbonate_rock_fraction}
                    onChange={(v) =>
                      setP2({ ...p2, carbonate_rock_fraction: v })
                    }
                    step="0.01"
                    min="0"
                    max="1"
                  />
                </div>

                {/* Screening results */}
                {screeningResults && (
                  <>
                    <Separator />
                    <Alert className="border-teal-300 bg-teal-50">
                      <CheckCircle className="w-4 h-4 text-teal-600" />
                      <AlertTitle className="text-teal-800">
                        Screening Results
                      </AlertTitle>
                      <AlertDescription>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                          {Object.entries(screeningResults).map(([k, v]) => (
                            <div
                              key={k}
                              className="bg-white rounded-lg p-2 border"
                            >
                              <p className="text-[10px] uppercase text-gray-500">
                                {k.replace(/_/g, " ")}
                              </p>
                              <p className="font-semibold text-sm text-teal-800">
                                {typeof v === "number" ? fmt(v as number) : String(v)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  </>
                )}

                <Separator />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSavePhase2}
                    disabled={saving}
                    className="bg-blue-900 hover:bg-blue-800 text-white gap-2"
                  >
                    {saving ? "Saving..." : "Save & Continue"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================ */}
          {/* PHASE 3: ML-Based Streamflow Prediction */}
          {/* ============================================================ */}
          <TabsContent value="phase-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Brain className="w-5 h-5" />
                  Phase 3: ML-Based Streamflow Prediction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <SelectField
                    label="LSTM Model Approach"
                    value={p3.lstm_model_approach}
                    onValueChange={(v) =>
                      setP3({ ...p3, lstm_model_approach: v })
                    }
                    options={[
                      {
                        value: "Regional LSTM with local fine-tuning",
                        label: "Regional LSTM with local fine-tuning",
                      },
                      {
                        value: "Regional LSTM with validation",
                        label: "Regional LSTM with validation",
                      },
                      {
                        value: "Pre-trained PUB mode",
                        label: "Pre-trained PUB mode",
                      },
                      {
                        value: "GIS-derived ungauged",
                        label: "GIS-derived ungauged",
                      },
                    ]}
                  />
                  <NumberField
                    label="Mean Annual Flow (m3/s)"
                    value={p3.mean_annual_flow_m3s}
                    onChange={(v) =>
                      setP3({ ...p3, mean_annual_flow_m3s: v })
                    }
                    step="0.01"
                    min="0"
                  />
                  <NumberField
                    label="Q10 (m3/s)"
                    value={p3.q10_m3s}
                    onChange={(v) => setP3({ ...p3, q10_m3s: v })}
                    step="0.01"
                    hint="Flow exceeded 10% of the time"
                  />
                  <NumberField
                    label="Q40 (m3/s)"
                    value={p3.q40_m3s}
                    onChange={(v) => setP3({ ...p3, q40_m3s: v })}
                    step="0.01"
                  />
                  <NumberField
                    label="Q50 (m3/s)"
                    value={p3.q50_m3s}
                    onChange={(v) => setP3({ ...p3, q50_m3s: v })}
                    step="0.01"
                    hint="Median flow"
                  />
                  <NumberField
                    label="Q90 (m3/s)"
                    value={p3.q90_m3s}
                    onChange={(v) => setP3({ ...p3, q90_m3s: v })}
                    step="0.01"
                    hint="Flow exceeded 90% of the time"
                  />
                  <NumberField
                    label="Flow CV"
                    value={p3.flow_cv}
                    onChange={(v) => setP3({ ...p3, flow_cv: v })}
                    step="0.01"
                    hint="Coefficient of variation"
                  />
                  <NumberField
                    label="NSE Score"
                    value={p3.nse_score}
                    onChange={(v) => setP3({ ...p3, nse_score: v })}
                    step="0.01"
                    hint="Nash-Sutcliffe Efficiency (-inf to 1)"
                  />
                  <NumberField
                    label="Ensemble Size"
                    value={p3.ensemble_size}
                    onChange={(v) => setP3({ ...p3, ensemble_size: v })}
                    min="1"
                  />
                  <NumberField
                    label="Simulation Years"
                    value={p3.simulation_years}
                    onChange={(v) => setP3({ ...p3, simulation_years: v })}
                    min="1"
                  />
                </div>

                {/* FDC Chart */}
                {project.fdc_data && project.fdc_data.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-900 mb-3">
                        Flow Duration Curve (FDC)
                      </h3>
                      <div className="bg-white rounded-lg border p-4">
                        <ResponsiveContainer width="100%" height={320}>
                          <LineChart data={project.fdc_data}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e2e8f0"
                            />
                            <XAxis
                              dataKey="exceedance_pct"
                              label={{
                                value: "Exceedance (%)",
                                position: "insideBottomRight",
                                offset: -5,
                              }}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis
                              label={{
                                value: "Flow (m3/s)",
                                angle: -90,
                                position: "insideLeft",
                              }}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="flow_p10"
                              name="P10 (wet)"
                              stroke="#0ea5e9"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="flow_p50"
                              name="P50 (median)"
                              stroke="#0f172a"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="flow_p90"
                              name="P90 (dry)"
                              stroke="#dc2626"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSavePhase3}
                    disabled={saving}
                    className="bg-blue-900 hover:bg-blue-800 text-white gap-2"
                  >
                    {saving ? "Saving..." : "Save & Continue"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================ */}
          {/* PHASE 4: Power & Energy Estimation */}
          {/* ============================================================ */}
          <TabsContent value="phase-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Zap className="w-5 h-5" />
                  Phase 4: Power &amp; Energy Estimation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Power equation reference */}
                <div className="bg-blue-950 text-white rounded-lg p-4 text-center">
                  <p className="text-xs uppercase tracking-wide text-blue-300 mb-1">
                    Power Equation
                  </p>
                  <p className="text-lg font-mono font-bold">
                    P = &#951; &times; &#961; &times; g &times; Q &times; H
                  </p>
                  <p className="text-xs text-blue-300 mt-1">
                    where &#951; = efficiency, &#961; = water density (1000
                    kg/m3), g = 9.81 m/s2, Q = design flow, H = net head
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <SelectField
                    label="Design Flow Exceedance"
                    value={p4.design_flow_exceedance}
                    onValueChange={(v) =>
                      setP4({ ...p4, design_flow_exceedance: v })
                    }
                    options={[
                      { value: "Q30", label: "Q30 (30% exceedance)" },
                      { value: "Q40", label: "Q40 (40% exceedance)" },
                      { value: "Q50", label: "Q50 (50% exceedance)" },
                      { value: "Q60", label: "Q60 (60% exceedance)" },
                      { value: "Q70", label: "Q70 (70% exceedance)" },
                      { value: "Q80", label: "Q80 (80% exceedance)" },
                    ]}
                  />
                  <NumberField
                    label="Turbine Efficiency"
                    value={p4.turbine_efficiency}
                    onChange={(v) => setP4({ ...p4, turbine_efficiency: v })}
                    step="0.01"
                    min="0"
                    max="1"
                    hint="Typically 0.75 - 0.92"
                  />
                  <NumberField
                    label="Plant Availability"
                    value={p4.plant_availability}
                    onChange={(v) => setP4({ ...p4, plant_availability: v })}
                    step="0.01"
                    min="0"
                    max="1"
                    hint="Default: 0.87"
                  />
                  <NumberField
                    label="Auxiliary Consumption (%)"
                    value={p4.auxiliary_consumption_pct}
                    onChange={(v) =>
                      setP4({ ...p4, auxiliary_consumption_pct: v })
                    }
                    min="0"
                    max="100"
                  />
                  <NumberField
                    label="Transmission Loss (%)"
                    value={p4.transmission_loss_pct}
                    onChange={(v) =>
                      setP4({ ...p4, transmission_loss_pct: v })
                    }
                    min="0"
                    max="100"
                  />
                </div>

                {/* Results display */}
                {project.installed_capacity_kw != null && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-3 sm:p-4 text-white">
                        <p className="text-[10px] sm:text-xs uppercase tracking-wide text-blue-200">
                          Installed Capacity
                        </p>
                        <p className="text-lg sm:text-2xl font-bold mt-1">
                          {fmt(project.installed_capacity_kw, 0)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-blue-300">kW</p>
                      </div>
                      <div className="bg-gradient-to-br from-teal-700 to-teal-600 rounded-lg p-3 sm:p-4 text-white">
                        <p className="text-[10px] sm:text-xs uppercase tracking-wide text-teal-200">
                          Annual Energy
                        </p>
                        <p className="text-lg sm:text-2xl font-bold mt-1">
                          {fmt(project.annual_energy_mwh, 0)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-teal-300">MWh/yr</p>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-700 to-indigo-600 rounded-lg p-3 sm:p-4 text-white">
                        <p className="text-[10px] sm:text-xs uppercase tracking-wide text-indigo-200">
                          Turbine Type
                        </p>
                        <p className="text-base sm:text-xl font-bold mt-1">
                          {project.turbine_type ?? "--"}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-cyan-700 to-cyan-600 rounded-lg p-3 sm:p-4 text-white">
                        <p className="text-[10px] sm:text-xs uppercase tracking-wide text-cyan-200">
                          Capacity Factor
                        </p>
                        <p className="text-lg sm:text-2xl font-bold mt-1">
                          {project.capacity_factor != null
                            ? fmt(project.capacity_factor * 100, 1) + "%"
                            : "--"}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Turbine recommendation */}
                {turbineRec && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">
                      Turbine Recommendation
                    </AlertTitle>
                    <AlertDescription>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {Object.entries(turbineRec).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-xs text-gray-500">
                              {k.replace(/_/g, " ")}:
                            </span>{" "}
                            <span className="font-medium text-sm">
                              {typeof v === "number" ? fmt(v as number) : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Design flow sensitivity table */}
                {designSensitivity.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">
                      Design Flow Sensitivity
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(designSensitivity[0]).map((k) => (
                            <TableHead key={k}>
                              {k.replace(/_/g, " ")}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {designSensitivity.map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row).map((v, j) => (
                              <TableCell key={j}>
                                {typeof v === "number" ? fmt(v as number) : String(v)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <Separator />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSavePhase4}
                    disabled={saving}
                    className="bg-blue-900 hover:bg-blue-800 text-white gap-2"
                  >
                    {saving ? "Saving..." : "Save & Continue"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================ */}
          {/* PHASE 5: Environmental & Social Screening */}
          {/* ============================================================ */}
          <TabsContent value="phase-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <TreePine className="w-5 h-5" />
                  Phase 5: Environmental &amp; Social Screening
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <SelectField
                    label="Environmental Flow Method"
                    value={p5.env_flow_method}
                    onValueChange={(v) =>
                      setP5({ ...p5, env_flow_method: v })
                    }
                    options={[
                      { value: "Tennant", label: "Tennant Method" },
                      { value: "Q95", label: "Q95 Method" },
                      { value: "Building_Block", label: "Building Block" },
                    ]}
                  />
                  <NumberField
                    label="Env Flow Minimum (%)"
                    value={p5.env_flow_min_pct}
                    onChange={(v) => setP5({ ...p5, env_flow_min_pct: v })}
                    min="0"
                    max="100"
                    hint="Minimum flow for poor habitat"
                  />
                  <NumberField
                    label="Env Flow Fair (%)"
                    value={p5.env_flow_fair_pct}
                    onChange={(v) => setP5({ ...p5, env_flow_fair_pct: v })}
                    min="0"
                    max="100"
                  />
                  <NumberField
                    label="Env Flow Outstanding (%)"
                    value={p5.env_flow_outstanding_pct}
                    onChange={(v) =>
                      setP5({ ...p5, env_flow_outstanding_pct: v })
                    }
                    min="0"
                    max="100"
                  />
                  <NumberField
                    label="Land Area Affected (ha)"
                    value={p5.land_area_affected_ha}
                    onChange={(v) =>
                      setP5({ ...p5, land_area_affected_ha: v })
                    }
                    min="0"
                  />
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">
                    ESIA Screening Flags
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <CheckField
                      label="Protected Area"
                      checked={p5.protected_area}
                      onCheckedChange={(c) =>
                        setP5({ ...p5, protected_area: c })
                      }
                    />
                    <CheckField
                      label="Endangered Species"
                      checked={p5.endangered_species}
                      onCheckedChange={(c) =>
                        setP5({ ...p5, endangered_species: c })
                      }
                    />
                    <CheckField
                      label="Community Dependency"
                      checked={p5.community_dependency}
                      onCheckedChange={(c) =>
                        setP5({ ...p5, community_dependency: c })
                      }
                    />
                    <CheckField
                      label="Cultural Heritage"
                      checked={p5.cultural_heritage}
                      onCheckedChange={(c) =>
                        setP5({ ...p5, cultural_heritage: c })
                      }
                    />
                    <CheckField
                      label="Water Rights Affected"
                      checked={p5.water_rights_affected}
                      onCheckedChange={(c) =>
                        setP5({ ...p5, water_rights_affected: c })
                      }
                    />
                  </div>
                </div>

                {hasEsiaWarning && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>ESIA Flags Detected</AlertTitle>
                    <AlertDescription>
                      One or more environmental / social flags are active. A
                      specialist ESIA assessment may be required before
                      proceeding.
                    </AlertDescription>
                  </Alert>
                )}

                <Field label="ESIA Notes">
                  <Textarea
                    value={p5.esia_notes}
                    onChange={(e) =>
                      setP5({ ...p5, esia_notes: e.target.value })
                    }
                    placeholder="Additional environmental and social notes..."
                    rows={4}
                  />
                </Field>

                {/* Environmental flows results */}
                {envFlows && (
                  <>
                    <Separator />
                    <Alert className="border-green-300 bg-green-50">
                      <TreePine className="w-4 h-4 text-green-600" />
                      <AlertTitle className="text-green-800">
                        Environmental Flows ({esiaFlagCount} ESIA flag
                        {esiaFlagCount !== 1 ? "s" : ""})
                      </AlertTitle>
                      <AlertDescription>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                          {Object.entries(envFlows).map(([k, v]) => (
                            <div
                              key={k}
                              className="bg-white rounded-lg p-2 border"
                            >
                              <p className="text-[10px] uppercase text-gray-500">
                                {k.replace(/_/g, " ")}
                              </p>
                              <p className="font-semibold text-sm">
                                {fmt(v)} m3/s
                              </p>
                            </div>
                          ))}
                        </div>
                        {requiresSpecialist && (
                          <p className="mt-3 text-sm font-medium text-amber-700">
                            Specialist environmental assessment recommended.
                          </p>
                        )}
                      </AlertDescription>
                    </Alert>
                  </>
                )}

                <Separator />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSavePhase5}
                    disabled={saving}
                    className="bg-blue-900 hover:bg-blue-800 text-white gap-2"
                  >
                    {saving ? "Saving..." : "Save & Continue"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================ */}
          {/* PHASE 6: Preliminary Cost Estimation */}
          {/* ============================================================ */}
          <TabsContent value="phase-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <DollarSign className="w-5 h-5" />
                  Phase 6: Preliminary Cost Estimation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <NumberField
                    label="Civil Works (USD)"
                    value={p6.civil_works_usd}
                    onChange={(v) => setP6({ ...p6, civil_works_usd: v })}
                    min="0"
                    hint="Optional override"
                    placeholder="Auto-estimated if blank"
                  />
                  <NumberField
                    label="Electromechanical (USD)"
                    value={p6.electromechanical_usd}
                    onChange={(v) =>
                      setP6({ ...p6, electromechanical_usd: v })
                    }
                    min="0"
                    hint="Optional override"
                    placeholder="Auto-estimated if blank"
                  />
                  <NumberField
                    label="Transmission Line (km)"
                    value={p6.transmission_km}
                    onChange={(v) => setP6({ ...p6, transmission_km: v })}
                    min="0"
                  />
                  <NumberField
                    label="Transmission Cost per km (USD)"
                    value={p6.transmission_cost_per_km}
                    onChange={(v) =>
                      setP6({ ...p6, transmission_cost_per_km: v })
                    }
                    min="0"
                  />
                  <NumberField
                    label="Environmental & Social (%)"
                    value={p6.environmental_social_pct}
                    onChange={(v) =>
                      setP6({ ...p6, environmental_social_pct: v })
                    }
                    min="0"
                    max="100"
                    hint="% of direct costs"
                  />
                  <NumberField
                    label="Engineering & Development (%)"
                    value={p6.engineering_dev_pct}
                    onChange={(v) => setP6({ ...p6, engineering_dev_pct: v })}
                    min="0"
                    max="100"
                  />
                  <NumberField
                    label="Contingency (%)"
                    value={p6.contingency_pct}
                    onChange={(v) => setP6({ ...p6, contingency_pct: v })}
                    min="0"
                    max="100"
                    hint="Default: 30% for pre-feasibility"
                  />
                  <NumberField
                    label="Annual O&M (%)"
                    value={p6.annual_om_pct}
                    onChange={(v) => setP6({ ...p6, annual_om_pct: v })}
                    min="0"
                    max="100"
                    hint="% of CAPEX"
                  />
                </div>

                {/* Cost breakdown */}
                {costBreakdown && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-900 mb-3">
                        Cost Breakdown
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(costBreakdown).map(([k, v]) => {
                          const total =
                            costBreakdown.total ??
                            Object.values(costBreakdown).reduce(
                              (s, x) => s + x,
                              0
                            );
                          const pct = total > 0 ? (v / total) * 100 : 0;
                          return (
                            <div key={k} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">
                                  {k.replace(/_/g, " ")}
                                </span>
                                <span className="font-semibold">
                                  {fmtUsd(v)}
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-900 to-teal-600 rounded-full transition-all"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Specific cost + benchmark */}
                {project.specific_cost_usd_kw != null && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                        <p className="text-xs uppercase text-blue-600">
                          Total CAPEX
                        </p>
                        <p className="text-xl font-bold text-blue-900">
                          {fmtUsd(project.total_capex_usd)}
                        </p>
                      </div>
                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
                        <p className="text-xs uppercase text-teal-600">
                          Specific Cost
                        </p>
                        <p className="text-xl font-bold text-teal-800">
                          {fmtUsd(project.specific_cost_usd_kw)}/kW
                        </p>
                      </div>
                      {benchmarkRange && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                          <p className="text-xs uppercase text-amber-600">
                            Benchmark Range
                          </p>
                          <p className="text-xl font-bold text-amber-800">
                            {fmtUsd(benchmarkRange.low)} - {fmtUsd(benchmarkRange.high)}/kW
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSavePhase6}
                    disabled={saving}
                    className="bg-blue-900 hover:bg-blue-800 text-white gap-2"
                  >
                    {saving ? "Saving..." : "Save & Continue"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================ */}
          {/* PHASE 7: Financial Viability & Recommendation */}
          {/* ============================================================ */}
          <TabsContent value="phase-7">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <TrendingUp className="w-5 h-5" />
                  Phase 7: Financial Viability &amp; Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <NumberField
                    label="Tariff (USD/kWh)"
                    value={p7.tariff_usd_kwh}
                    onChange={(v) => setP7({ ...p7, tariff_usd_kwh: v })}
                    step="0.001"
                    min="0"
                    placeholder="0.12"
                  />
                  <NumberField
                    label="Discount Rate (%)"
                    value={p7.discount_rate_pct}
                    onChange={(v) => setP7({ ...p7, discount_rate_pct: v })}
                    min="0"
                    max="100"
                  />
                  <NumberField
                    label="Project Life (years)"
                    value={p7.project_life_years}
                    onChange={(v) => setP7({ ...p7, project_life_years: v })}
                    min="1"
                  />
                  <NumberField
                    label="Debt Fraction"
                    value={p7.debt_fraction}
                    onChange={(v) => setP7({ ...p7, debt_fraction: v })}
                    step="0.01"
                    min="0"
                    max="1"
                    hint="e.g. 0.70 for 70% debt"
                  />
                  <NumberField
                    label="Debt Rate (%)"
                    value={p7.debt_rate_pct}
                    onChange={(v) => setP7({ ...p7, debt_rate_pct: v })}
                    min="0"
                  />
                  <NumberField
                    label="Debt Term (years)"
                    value={p7.debt_term_years}
                    onChange={(v) => setP7({ ...p7, debt_term_years: v })}
                    min="1"
                  />
                </div>

                {/* Financial indicators */}
                {project.lcoe_usd_mwh != null && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
                      <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-2.5 sm:p-4 text-white text-center">
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-blue-200">
                          LCOE
                        </p>
                        <p className="text-base sm:text-xl font-bold mt-1">
                          ${fmt(project.lcoe_usd_mwh, 1)}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-blue-300">/MWh</p>
                      </div>
                      <div className="bg-gradient-to-br from-teal-700 to-teal-600 rounded-lg p-2.5 sm:p-4 text-white text-center">
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-teal-200">
                          NPV
                        </p>
                        <p className="text-base sm:text-xl font-bold mt-1">
                          {fmtUsd(project.npv_usd)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-700 to-indigo-600 rounded-lg p-2.5 sm:p-4 text-white text-center">
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-indigo-200">
                          IRR
                        </p>
                        <p className="text-base sm:text-xl font-bold mt-1">
                          {project.irr_pct != null
                            ? fmt(project.irr_pct, 1) + "%"
                            : "--"}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-cyan-700 to-cyan-600 rounded-lg p-2.5 sm:p-4 text-white text-center">
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-cyan-200">
                          Payback
                        </p>
                        <p className="text-base sm:text-xl font-bold mt-1">
                          {project.payback_years != null
                            ? fmt(project.payback_years, 1)
                            : "--"}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-cyan-300">years</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-700 to-purple-600 rounded-lg p-2.5 sm:p-4 text-white text-center">
                        <p className="text-[10px] uppercase tracking-wide text-purple-200">
                          DSCR
                        </p>
                        <p className="text-xl font-bold mt-1">
                          {(project as unknown as Record<string, unknown>).dscr != null
                            ? fmt(
                                (project as unknown as Record<string, unknown>)
                                  .dscr as number,
                                2
                              )
                            : "--"}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Recommendation badge */}
                {(finRecommendation || project.recommendation) && (
                  <>
                    <Separator />
                    {(() => {
                      const rec = finRecommendation || project.recommendation || "";
                      const isAdvance = rec.toUpperCase().includes("ADVANCE") && !rec.toUpperCase().includes("DO_NOT");
                      const isConditional = rec.toUpperCase().includes("CONDITIONAL");
                      const isDoNot = rec.toUpperCase().includes("DO_NOT");

                      let bgClass = "bg-yellow-50 border-yellow-300";
                      let textClass = "text-yellow-800";
                      let badgeClass = "bg-yellow-500 text-white";
                      let Icon = AlertTriangle;
                      let description =
                        "This project may proceed with additional conditions to be met.";

                      if (isDoNot) {
                        bgClass = "bg-red-50 border-red-300";
                        textClass = "text-red-800";
                        badgeClass = "bg-red-600 text-white";
                        Icon = XCircle;
                        description =
                          "This project does not meet the minimum viability criteria and should not advance to full feasibility.";
                      } else if (isAdvance && !isConditional) {
                        bgClass = "bg-green-50 border-green-300";
                        textClass = "text-green-800";
                        badgeClass = "bg-green-600 text-white";
                        Icon = CheckCircle;
                        description =
                          "This project meets the viability criteria and is recommended to advance to full feasibility study.";
                      }

                      return (
                        <div
                          className={`rounded-lg border-2 p-6 ${bgClass} flex flex-col items-center gap-3`}
                        >
                          <Icon className={`w-10 h-10 ${textClass}`} />
                          <Badge className={`text-lg px-4 py-1.5 ${badgeClass}`}>
                            {rec.replace(/_/g, " ")}
                          </Badge>
                          <p className={`text-sm text-center max-w-lg ${textClass}`}>
                            {description}
                          </p>
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* Sensitivity analysis table */}
                {sensitivityResults.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-900 mb-3">
                        Sensitivity Analysis
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parameter</TableHead>
                            <TableHead>Variation</TableHead>
                            <TableHead className="text-right">
                              LCOE ($/MWh)
                            </TableHead>
                            <TableHead className="text-right">
                              NPV ($)
                            </TableHead>
                            <TableHead className="text-right">
                              IRR (%)
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(groupedSensitivity).map(
                            ([param, rows]) =>
                              rows.map((r, i) => (
                                <TableRow
                                  key={`${param}-${r.variation}`}
                                  className={
                                    i === 0
                                      ? "border-t-2 border-gray-300"
                                      : ""
                                  }
                                >
                                  {i === 0 && (
                                    <TableCell
                                      rowSpan={rows.length}
                                      className="font-medium text-blue-900 align-top"
                                    >
                                      {param.replace(/_/g, " ")}
                                    </TableCell>
                                  )}
                                  <TableCell>{r.variation}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {fmt(r.lcoe, 1)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {fmtUsd(r.npv)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {fmt(r.irr, 1)}%
                                  </TableCell>
                                </TableRow>
                              ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex flex-wrap justify-between gap-2">
                  {!project.pfs_locked ? (
                    <Button
                      onClick={handleSavePhase7}
                      disabled={saving}
                      className="bg-blue-900 hover:bg-blue-800 text-white gap-2"
                    >
                      {saving ? "Saving..." : "Finalize & Move to Pipeline"}
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      className="bg-teal-700 hover:bg-teal-600 text-white gap-2"
                      render={<Link href="/pipeline" />}
                    >
                      <Lock className="w-4 h-4" />
                      View in AfCEN Pipeline
                    </Button>
                  )}
                  <Button
                    className="bg-teal-700 hover:bg-teal-600 text-white gap-2"
                    render={
                      <Link href={`/projects/${id}/report`} />
                    }
                  >
                    Generate Report
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
