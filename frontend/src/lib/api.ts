const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "localhost" ? "" : "http://localhost:8001");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export interface Project {
  id: number;
  name: string;
  country: string;
  region?: string;
  description?: string;
  status: string;
  current_phase: number;
  created_at?: string;
  updated_at?: string;
  latitude?: number;
  longitude?: number;
  catchment_area_km2?: number;
  project_type?: string;
  capacity_class?: string;
  gross_head_m?: number;
  net_head_m?: number;
  mean_annual_flow_m3s?: number;
  q10_m3s?: number;
  q40_m3s?: number;
  q50_m3s?: number;
  q90_m3s?: number;
  nse_score?: number;
  design_flow_m3s?: number;
  installed_capacity_kw?: number;
  annual_energy_mwh?: number;
  turbine_type?: string;
  capacity_factor?: number;
  total_capex_usd?: number;
  specific_cost_usd_kw?: number;
  lcoe_usd_mwh?: number;
  npv_usd?: number;
  irr_pct?: number;
  payback_years?: number;
  recommendation?: string;
  fdc_data?: FDCPoint[];
  sensitivity_results?: SensitivityResult[];
  report_generated: boolean;
}

export interface FDCPoint {
  exceedance_pct: number;
  flow_p10: number;
  flow_p50: number;
  flow_p90: number;
}

export interface SensitivityResult {
  parameter: string;
  variation: string;
  lcoe: number;
  npv: number;
  irr: number;
}

export const api = {
  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (data: { name: string; country: string; region?: string; description?: string }) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
  getProject: (id: number) => request<Project>(`/api/projects/${id}`),
  deleteProject: (id: number) => request<{ ok: boolean }>(`/api/projects/${id}`, { method: "DELETE" }),

  savePhase1: (id: number, data: Record<string, unknown>) =>
    request<Project>(`/api/projects/${id}/phase1`, { method: "PUT", body: JSON.stringify(data) }),
  savePhase2: (id: number, data: Record<string, unknown>) =>
    request<{ project: Project; screening: Record<string, unknown> }>(`/api/projects/${id}/phase2`, { method: "PUT", body: JSON.stringify(data) }),
  savePhase3: (id: number, data: Record<string, unknown>) =>
    request<Project>(`/api/projects/${id}/phase3`, { method: "PUT", body: JSON.stringify(data) }),
  savePhase4: (id: number, data: Record<string, unknown>) =>
    request<{ project: Project; turbine_recommendation: Record<string, unknown>; design_flow_sensitivity: Record<string, unknown>[] }>(`/api/projects/${id}/phase4`, { method: "PUT", body: JSON.stringify(data) }),
  savePhase5: (id: number, data: Record<string, unknown>) =>
    request<{ project: Project; environmental_flows: Record<string, number>; esia_flags_count: number; requires_specialist_assessment: boolean }>(`/api/projects/${id}/phase5`, { method: "PUT", body: JSON.stringify(data) }),
  savePhase6: (id: number, data: Record<string, unknown>) =>
    request<{ project: Project; cost_breakdown: Record<string, number>; benchmark_range: Record<string, number> }>(`/api/projects/${id}/phase6`, { method: "PUT", body: JSON.stringify(data) }),
  savePhase7: (id: number, data: Record<string, unknown>) =>
    request<{ project: Project; recommendation: string; sensitivity: SensitivityResult[] }>(`/api/projects/${id}/phase7`, { method: "PUT", body: JSON.stringify(data) }),

  getReport: (id: number) =>
    request<{ project: Project; report_sections: Record<string, Record<string, unknown>> }>(`/api/projects/${id}/report`),
};
