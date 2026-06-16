"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Project, type FDCPoint, type SensitivityResult } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ReportData {
  project: Project;
  report_sections: {
    executive_summary: Record<string, unknown>;
    site_description: Record<string, unknown>;
    hydrology: Record<string, unknown>;
    power_energy: Record<string, unknown>;
    environmental: Record<string, unknown>;
    cost_estimate: Record<string, unknown>;
    financial_analysis: Record<string, unknown>;
    recommendation: Record<string, unknown>;
  };
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                */
/* ------------------------------------------------------------------ */

function fmtCurrency(v: unknown): string {
  const n = Number(v);
  if (v == null || isNaN(n)) return "--";
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtNumber(v: unknown, decimals = 2): string {
  const n = Number(v);
  if (v == null || isNaN(n)) return "--";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

function fmtPct(v: unknown): string {
  const n = Number(v);
  if (v == null || isNaN(n)) return "--";
  return `${fmtNumber(n, 1)}%`;
}

function str(v: unknown): string {
  if (v == null) return "--";
  return String(v);
}

function recStyle(rec: string | undefined) {
  const r = (rec ?? "").toUpperCase();
  if (r === "ADVANCE") return { bg: "bg-emerald-100 text-emerald-800 border-emerald-300", label: "ADVANCE", icon: <CheckCircle className="size-5" /> };
  if (r === "CONDITIONAL") return { bg: "bg-amber-100 text-amber-800 border-amber-300", label: "CONDITIONAL", icon: <AlertTriangle className="size-5" /> };
  return { bg: "bg-red-100 text-red-800 border-red-300", label: "DO NOT ADVANCE", icon: <XCircle className="size-5" /> };
}

/* ------------------------------------------------------------------ */
/*  Reusable components                                               */
/* ------------------------------------------------------------------ */

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="mt-10 mb-4 page-break-before">
      <h2 className="text-xl font-bold tracking-tight text-slate-800">
        <span className="text-teal-700 mr-2">{number}.</span>{title}
      </h2>
      <Separator className="mt-2" />
    </div>
  );
}

function SubHeading({ number, title }: { number: string; title: string }) {
  return (
    <h3 className="text-base font-semibold text-slate-700 mt-6 mb-2">
      <span className="text-teal-600 mr-1.5">{number}</span>{title}
    </h3>
  );
}

function KVRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <TableRow>
      <TableCell className="font-medium text-slate-500 w-1/2">{label}</TableCell>
      <TableCell className={`text-right ${bold ? "font-bold text-slate-800" : ""}`}>{value}</TableCell>
    </TableRow>
  );
}

function MetricCard({ label, value, unit, highlight }: { label: string; value: string; unit?: string; highlight?: boolean }) {
  return (
    <Card className={`border-slate-200 ${highlight ? "bg-teal-50/50 border-teal-200" : ""}`}>
      <CardContent className="py-3">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className={`text-lg font-semibold ${highlight ? "text-teal-800" : "text-slate-800"}`}>
          {value}{unit ? <span className="text-sm font-normal text-slate-500 ml-1">{unit}</span> : null}
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Report Page                                                  */
/* ------------------------------------------------------------------ */

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReport(Number(id))
      .then((res) => setData(res as unknown as ReportData))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Generating PFS report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader><CardTitle className="text-red-600">Report Error</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error ?? "Failed to load report data."}</p>
            <Link href={`/projects/${id}`}>
              <Button variant="outline" size="sm"><ArrowLeft className="size-4 mr-1" />Back to Project</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project: p, report_sections: s } = data;
  const rec = recStyle(p.recommendation);
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const docRef = `AfCEN/HPF/${String(p.id).padStart(4, "0")}`;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10pt; }
          .report-page { box-shadow: none !important; max-width: 100% !important; }
          @page { margin: 2cm; size: A4; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 py-4 sm:py-8 px-2 sm:px-4 print:bg-white print:py-0">
        {/* Navigation */}
        <div className="no-print mx-auto max-w-4xl mb-4 sm:mb-6 flex items-center justify-between px-2">
          <Link href={`/projects/${id}`}>
            <Button variant="outline" size="sm"><ArrowLeft className="size-4 mr-1.5" /><span className="hidden sm:inline">Back to Project</span><span className="sm:hidden">Back</span></Button>
          </Link>
          <div className="flex gap-2">
            <Button size="sm" className="bg-teal-700 text-white hover:bg-teal-800" onClick={() => window.print()}>
              <Printer className="size-4 mr-1.5" /><span className="hidden sm:inline">Print / Save PDF</span><span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>

        <div className="report-page mx-auto max-w-4xl bg-white shadow-lg ring-1 ring-slate-200 rounded-lg overflow-hidden print:shadow-none print:ring-0">

          {/* ════════════════════════════════════════════════════════════ */}
          {/*  PAGE 1: COVER PAGE                                       */}
          {/* ════════════════════════════════════════════════════════════ */}
          <div className="relative px-6 sm:px-10 py-12 sm:py-16 text-slate-800 min-h-[60vh] flex flex-col justify-between border-b-4 border-teal-700 bg-white">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600" />

            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.3em] text-teal-700 font-semibold mb-1">
                AfCEN &mdash; Africa&apos;s Infrastructure Intelligence Layer
              </p>
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-10">
                Hydropower Pre-Feasibility Framework &bull; {docRef}
              </p>

              <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight text-slate-900 mb-2">
                Pre-Feasibility Study
              </h1>
              <h2 className="text-xl sm:text-2xl font-light text-teal-700 mb-10">{p.name}</h2>

              <Separator className="mb-6" />

              <div className="grid grid-cols-2 gap-x-8 sm:gap-x-10 gap-y-5 text-sm max-w-lg">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wide font-medium">Country</span>
                  <p className="font-semibold text-base sm:text-lg text-slate-800">{p.country}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wide font-medium">Region</span>
                  <p className="font-semibold text-base sm:text-lg text-slate-800">{p.region || "--"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wide font-medium">Project Type</span>
                  <p className="font-medium capitalize text-slate-700">{str(p.project_type).replace(/_/g, "-")}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wide font-medium">Capacity Class</span>
                  <p className="font-medium capitalize text-slate-700">{str(p.capacity_class)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between text-xs text-slate-400 border-t border-slate-200 pt-4 mt-8 gap-2">
              <div>
                <p className="text-slate-500 font-medium">Document Reference: {docRef}</p>
                <p>Revision: 1.0 &mdash; {today}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-slate-500 font-medium">AfCEN &mdash; Africa&apos;s Infrastructure Intelligence Layer</p>
                <p>HydroIQ Pre-Feasibility Assessment Tool</p>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════ */}
          {/*  PAGE 2: DOCUMENT CONTROL & ABBREVIATIONS                 */}
          {/* ════════════════════════════════════════════════════════════ */}
          <div className="px-6 sm:px-10 py-8 text-sm leading-relaxed text-slate-700 page-break">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Document Control</h2>
            <Table>
              <TableBody>
                <KVRow label="Document Reference" value={docRef} bold />
                <KVRow label="Project Name" value={p.name} />
                <KVRow label="Country / Region" value={`${p.country}${p.region ? `, ${p.region}` : ""}`} />
                <KVRow label="Date" value={today} />
                <KVRow label="Revision" value="1.0" />
                <KVRow label="Framework" value="AfCEN/HPF/001 (June 2026)" />
                <KVRow label="Classification" value="Pre-Feasibility — For Screening Purposes" />
              </TableBody>
            </Table>

            <h2 className="text-lg font-bold text-slate-800 mt-8 mb-4">Revision History</h2>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Role</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-slate-600">Developed by</TableCell>
                  <TableCell>HydroIQ</TableCell>
                  <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Complete</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-600">Quality Assurance</TableCell>
                  <TableCell>Jagath</TableCell>
                  <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Reviewed</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-slate-600">Approved by</TableCell>
                  <TableCell>Dennis</TableCell>
                  <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Approved</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <h2 className="text-lg font-bold text-slate-800 mt-8 mb-4">Abbreviations</h2>
            <div className="grid grid-cols-2 gap-x-6 text-xs text-slate-600">
              {[
                ["AfCEN","Africa's Infrastructure Intelligence Layer"],
                ["CAPEX","Capital Expenditure"],
                ["CF","Capacity Factor"],
                ["DEM","Digital Elevation Model"],
                ["DSCR","Debt Service Coverage Ratio"],
                ["ESIA","Environmental & Social Impact Assessment"],
                ["FDC","Flow Duration Curve"],
                ["GWh","Gigawatt-hour"],
                ["HPP","Hydropower Plant"],
                ["IRR","Internal Rate of Return"],
                ["LCOE","Levelized Cost of Energy"],
                ["LSTM","Long Short-Term Memory (neural network)"],
                ["MAF","Mean Annual Flow"],
                ["MW / kW","Megawatt / Kilowatt"],
                ["NPV","Net Present Value"],
                ["NSE","Nash-Sutcliffe Efficiency"],
                ["O&M","Operations & Maintenance"],
                ["PFS","Pre-Feasibility Study"],
                ["PPA","Power Purchase Agreement"],
                ["RoR","Run-of-River"],
                ["SRTM","Shuttle Radar Topography Mission"],
              ].map(([abbr, full]) => (
                <div key={abbr} className="flex py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-700 w-16 shrink-0">{abbr}</span>
                  <span>{full}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════ */}
          {/*  PAGE 3: TABLE OF CONTENTS                                */}
          {/* ════════════════════════════════════════════════════════════ */}
          <div className="px-6 sm:px-10 py-8 text-sm page-break">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Table of Contents</h2>
            <div className="space-y-2">
              {[
                { num: "1", title: "Executive Summary", sub: ["1.1 Key Features Table","1.2 Project Summary"] },
                { num: "2", title: "Introduction & Project Background", sub: ["2.1 Study Objectives","2.2 AfCEN Framework","2.3 Previous Studies"] },
                { num: "3", title: "Site Description & Topographic Assessment", sub: ["3.1 Project Location","3.2 Catchment Characteristics","3.3 Topographic Analysis"] },
                { num: "4", title: "Hydrological Analysis", sub: ["4.1 Data Sources & Methodology","4.2 LSTM Streamflow Prediction","4.3 Flow Duration Curve","4.4 Key Hydrological Parameters"] },
                { num: "5", title: "Power & Energy Assessment", sub: ["5.1 Design Parameters","5.2 Turbine Selection","5.3 Power & Energy Calculation","5.4 Energy Generation Performance"] },
                { num: "6", title: "Environmental & Social Assessment", sub: ["6.1 Environmental Flow Assessment","6.2 ESIA Screening Checklist","6.3 Social Impact & Mitigation"] },
                { num: "7", title: "Cost Estimation", sub: ["7.1 Methodology","7.2 Capital Cost Breakdown","7.3 Operating Costs"] },
                { num: "8", title: "Financial Viability Analysis", sub: ["8.1 Financial Assumptions","8.2 Key Financial Indicators","8.3 Sensitivity Analysis"] },
                { num: "9", title: "Risk Assessment", sub: ["9.1 Risk Matrix","9.2 Key Risks & Mitigation"] },
                { num: "10", title: "Conclusions & Recommendations", sub: ["10.1 Screening Result","10.2 Recommendation","10.3 Recommended Next Steps"] },
              ].map((sec) => (
                <div key={sec.num}>
                  <div className="flex items-baseline font-semibold text-slate-800">
                    <span className="text-teal-700 w-8">{sec.num}.</span>
                    <span className="flex-1">{sec.title}</span>
                  </div>
                  {sec.sub.map((s, i) => (
                    <div key={i} className="flex items-baseline text-slate-500 ml-8 text-xs">
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-1 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">List of Tables</p>
              <p>Table 1: Key Features Summary &bull; Table 2: Catchment Characteristics &bull; Table 3: Flow Statistics</p>
              <p>Table 4: Turbine Selection Parameters &bull; Table 5: ESIA Screening Checklist</p>
              <p>Table 6: CAPEX Breakdown &bull; Table 7: Financial Assumptions &bull; Table 8: Financial Indicators</p>
              <p>Table 9: Sensitivity Analysis Results &bull; Table 10: Risk Assessment Matrix</p>
              <p className="font-semibold text-slate-700 mt-3">List of Figures</p>
              <p>Figure 1: Flow Duration Curve &bull; Figure 2: Cost Breakdown &bull; Figure 3: Sensitivity Tornado</p>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════ */}
          {/*  REPORT CONTENT                                           */}
          {/* ════════════════════════════════════════════════════════════ */}
          <div className="px-6 sm:px-10 py-8 space-y-2 text-sm leading-relaxed text-slate-700">

            {/* ── SECTION 1: EXECUTIVE SUMMARY (Pages 4-5) ── */}
            <SectionHeading number="1" title="Executive Summary" />

            <SubHeading number="1.1" title="Key Features Summary" />
            <p className="text-xs text-slate-500 italic mb-2">Table 1: Key Features of the Proposed Hydroelectric Scheme</p>

            <Card className="border-slate-200 avoid-break">
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-1/3">Feature</TableHead>
                      <TableHead>Parameter</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {([
                      ["Location", "Country / Region", `${p.country}${p.region ? `, ${p.region}` : ""}`],
                      ["", "Coordinates", s.executive_summary?.coordinates as string],
                      ["", "Project Type", `${str(p.project_type).replace(/_/g, "-")} — ${str(p.capacity_class)}`],
                      ["Hydrology", "Catchment Area", `${fmtNumber(p.catchment_area_km2, 1)} km²`],
                      ["", "Mean Annual Flow", `${fmtNumber(p.mean_annual_flow_m3s, 2)} m³/s`],
                      ["", "Design Flow", `${fmtNumber(p.design_flow_m3s, 3)} m³/s`],
                      ["Topography", "Gross Head", `${fmtNumber(p.gross_head_m, 1)} m`],
                      ["", "Net Head", `${fmtNumber(p.net_head_m, 1)} m`],
                      ["Power", "Turbine Type", str(p.turbine_type)],
                      ["", "Installed Capacity", `${fmtNumber((p.installed_capacity_kw || 0) / 1000, 2)} MW`],
                      ["", "Annual Energy", `${fmtNumber((p.annual_energy_mwh || 0) / 1000, 2)} GWh/yr`],
                      ["", "Capacity Factor", p.capacity_factor ? fmtPct(p.capacity_factor * 100) : "--"],
                      ["Financial", "Total CAPEX", fmtCurrency(p.total_capex_usd)],
                      ["", "Specific Cost", p.specific_cost_usd_kw ? `${fmtNumber(p.specific_cost_usd_kw, 0)} USD/kW` : "--"],
                      ["", "LCOE", p.lcoe_usd_mwh ? `${fmtNumber(p.lcoe_usd_mwh, 1)} USD/MWh` : "--"],
                      ["", "IRR", p.irr_pct ? fmtPct(p.irr_pct) : "--"],
                      ["", "NPV", fmtCurrency(p.npv_usd)],
                      ["", "DSCR", p.dscr ? fmtNumber(p.dscr, 2) : "--"],
                      ["Assessment", "Recommendation", p.recommendation || "--"],
                    ] as [string, string, string][]).map(([feature, param, value], i) => (
                      <TableRow key={i} className={feature ? "border-t-2 border-slate-200" : ""}>
                        <TableCell className="font-semibold text-teal-700">{feature}</TableCell>
                        <TableCell className="text-slate-600">{param}</TableCell>
                        <TableCell className="text-right font-semibold">{value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <SubHeading number="1.2" title="Project Summary" />
            <p className="text-slate-600 leading-relaxed">{str(s.executive_summary?.summary_text)}</p>

            {/* ── SECTION 2: INTRODUCTION (Pages 6-7) ── */}
            <SectionHeading number="2" title="Introduction &amp; Project Background" />

            <SubHeading number="2.1" title="Study Objectives" />
            <p className="text-slate-600 mb-3">
              This pre-feasibility study assesses the technical, environmental, and financial viability of
              the {p.name} hydropower project in {p.country}. The study follows the standardised AfCEN
              Hydropower Pre-Feasibility Framework (AfCEN/HPF/001, June 2026), a systematic
              7-phase assessment methodology for hydropower projects across Africa developed by
              AfCEN &mdash; Africa&apos;s Infrastructure Intelligence Layer.
            </p>
            <p className="text-slate-600 mb-3">The specific objectives of this study are to:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-4">
              <li>Screen the site using topographic and hydrological data to confirm minimum viability thresholds</li>
              <li>Estimate streamflow using LSTM-based machine learning for ungauged or data-scarce basins</li>
              <li>Calculate installed capacity and annual energy generation with uncertainty quantification</li>
              <li>Assess environmental and social constraints through a rapid ESIA screening</li>
              <li>Estimate capital and operating costs using AfCEN benchmark data</li>
              <li>Evaluate financial viability through LCOE, NPV, IRR, DSCR, and sensitivity analysis</li>
              <li>Provide a recommendation on whether to advance to full feasibility study</li>
            </ol>

            <SubHeading number="2.2" title="AfCEN Framework" />
            <p className="text-slate-600 mb-3">
              The AfCEN 7-Phase Hydropower Pre-Feasibility Framework structures the assessment into the
              following sequential phases, each building on the outputs of the previous:
            </p>
            <Card className="border-slate-200 avoid-break">
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-16">Phase</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Key Outputs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["1","Scoping & Data Inventory","Coordinates, catchment, data readiness assessment"],
                      ["2","Topographic Screening","Gross/net head, DEM analysis, penstock corridor"],
                      ["3","ML Streamflow Prediction","FDC with P10/P50/P90 bounds, NSE score"],
                      ["4","Power & Energy Estimation","Installed capacity, annual energy, turbine selection"],
                      ["5","Environmental Screening","E-flow allocation, ESIA checklist, social assessment"],
                      ["6","Cost Estimation","CAPEX breakdown, specific cost, O&M estimate"],
                      ["7","Financial Viability","LCOE, NPV, IRR, DSCR, sensitivity, recommendation"],
                    ].map(([phase, title, outputs]) => (
                      <TableRow key={phase}>
                        <TableCell className="font-bold text-teal-700">{phase}</TableCell>
                        <TableCell className="font-semibold">{title}</TableCell>
                        <TableCell className="text-xs text-slate-500">{outputs}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <SubHeading number="2.3" title="Previous Studies & Data Sources" />
            <p className="text-slate-600">
              {p.description || `No previous studies are documented for this site. This PFS represents the initial screening assessment based on remote sensing data and the AfCEN benchmark database.`}
            </p>

            {/* ── SECTION 3: SITE DESCRIPTION (Pages 8-9) ── */}
            <SectionHeading number="3" title="Site Description &amp; Topographic Assessment" />

            <SubHeading number="3.1" title="Project Location" />
            <p className="text-slate-600 mb-4">{str(s.site_description?.description_text)}</p>

            <p className="text-xs text-slate-500 italic mb-2">Table 2: Site Location & Administrative Data</p>
            <Card className="border-slate-200 avoid-break mb-4">
              <CardContent className="pt-4">
                <Table>
                  <TableBody>
                    <KVRow label="Project Name" value={p.name} bold />
                    <KVRow label="Country / Region" value={`${p.country}${p.region ? `, ${p.region}` : ""}`} />
                    <KVRow label="Latitude" value={p.latitude != null ? `${fmtNumber(p.latitude, 5)}°` : "--"} />
                    <KVRow label="Longitude" value={p.longitude != null ? `${fmtNumber(p.longitude, 5)}°` : "--"} />
                    <KVRow label="Distance to Load Centre" value={s.site_description?.distance_to_load_km ? `${fmtNumber(s.site_description.distance_to_load_km, 1)} km` : "--"} />
                    <KVRow label="Gauge Data Available" value={str(s.site_description?.has_gauge_data).toUpperCase()} />
                    <KVRow label="Gauge Record Length" value={s.site_description?.gauge_years ? `${fmtNumber(s.site_description.gauge_years, 0)} years` : "--"} />
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <SubHeading number="3.2" title="Catchment Characteristics" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <MetricCard label="Catchment Area" value={fmtNumber(p.catchment_area_km2, 1)} unit="km²" />
              <MetricCard label="Mean Elevation" value={s.site_description?.mean_elevation ? fmtNumber(s.site_description.mean_elevation, 0) : "--"} unit="m.a.s.l." />
              <MetricCard label="Average Slope" value={s.site_description?.avg_slope ? fmtNumber(s.site_description.avg_slope, 1) : "--"} unit="%" />
              <MetricCard label="Stream Length" value={s.site_description?.stream_length_km ? fmtNumber(s.site_description.stream_length_km, 1) : "--"} unit="km" />
              <MetricCard label="Forest Fraction" value={s.site_description?.forest_fraction ? fmtPct(Number(s.site_description.forest_fraction) * 100) : "--"} />
              <MetricCard label="Soil Porosity" value={s.site_description?.soil_porosity ? fmtNumber(s.site_description.soil_porosity, 2) : "--"} />
            </div>

            <SubHeading number="3.3" title="Topographic Analysis" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <MetricCard label="Gross Head" value={fmtNumber(p.gross_head_m, 1)} unit="m" highlight />
              <MetricCard label="Net Head" value={fmtNumber(p.net_head_m, 1)} unit="m" highlight />
              <MetricCard label="DEM Resolution" value={str(s.site_description?.dem_resolution)} />
              <MetricCard label="Penstock Length" value={s.site_description?.penstock_length_m ? fmtNumber(s.site_description.penstock_length_m, 0) : "--"} unit="m" />
            </div>

            {/* ── SECTION 4: HYDROLOGICAL ANALYSIS (Pages 10-11) ── */}
            <SectionHeading number="4" title="Hydrological Analysis" />

            <SubHeading number="4.1" title="Data Sources &amp; Methodology" />
            <p className="text-slate-600 mb-4">{str(s.hydrology?.methodology_text)}</p>

            <SubHeading number="4.2" title="LSTM Streamflow Prediction" />
            <p className="text-slate-600 mb-3">
              The LSTM (Long Short-Term Memory) neural network approach follows Kratzert et al. (2019),
              using catchment attributes (area, elevation, slope, soil properties, aridity index) and
              meteorological forcing data (precipitation, temperature, PET) to predict daily streamflow.
              The model is trained on gauged African catchments and transferred to the target site.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <MetricCard label="ML Approach" value={str(s.hydrology?.ml_approach)} />
              <MetricCard label="NSE Score" value={p.nse_score ? fmtNumber(p.nse_score, 3) : "N/A"} highlight={!!p.nse_score && p.nse_score >= 0.6} />
              <MetricCard label="Ensemble Size" value={str(s.hydrology?.ensemble_size)} />
              <MetricCard label="Simulation Period" value={str(s.hydrology?.simulation_period)} />
            </div>

            <SubHeading number="4.3" title="Flow Duration Curve" />

            {(p.fdc_data?.length ?? 0) > 0 ? (
              <Card className="border-slate-200 mb-4 avoid-break">
                <CardHeader><CardTitle className="text-sm text-slate-600">Figure 1: Flow Duration Curve (FDC)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={p.fdc_data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="exceedance_pct"
                          label={{ value: "Exceedance Probability (%)", position: "insideBottomRight", offset: -5, style: { fontSize: 11, fill: "#64748b" } }}
                          tick={{ fontSize: 11, fill: "#64748b" }} />
                        <YAxis
                          label={{ value: "Flow (m³/s)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: "#64748b" } }}
                          tick={{ fontSize: 11, fill: "#64748b" }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
                          formatter={(value: unknown) => [`${fmtNumber(value, 3)} m³/s`]}
                          labelFormatter={(label: unknown) => `Exceedance: ${label}%`} />
                        <Legend wrapperStyle={{ fontSize: 12 }} iconType="line" />
                        <Line type="monotone" dataKey="flow_p10" name="P10 (Wet)" stroke="#0d9488" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                        <Line type="monotone" dataKey="flow_p50" name="P50 (Median)" stroke="#1e40af" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="flow_p90" name="P90 (Dry)" stroke="#dc2626" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center italic">
                    Figure 1 &mdash; Simulated Flow Duration Curve showing P10 (wet), P50 (median), and P90 (dry) ensemble bounds.
                    Environmental flow allocation shown where applicable.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <SubHeading number="4.4" title="Key Hydrological Parameters" />
            <p className="text-xs text-slate-500 italic mb-2">Table 3: Flow Statistics</p>
            <Card className="border-slate-200 avoid-break">
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Parameter</TableHead>
                      <TableHead className="text-right">Value (m³/s)</TableHead>
                      <TableHead className="text-right">Specific Discharge (L/s/km²)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["Mean Annual Flow (MAF)", p.mean_annual_flow_m3s],
                      ["Q10 (High flow, 10% exceedance)", p.q10_m3s],
                      ["Q40 (Moderate flow)", p.q40_m3s],
                      ["Q50 (Median flow)", p.q50_m3s],
                      ["Q90 (Low flow, 90% exceedance)", p.q90_m3s],
                    ].map(([label, val]) => (
                      <TableRow key={label as string}>
                        <TableCell className="font-medium text-slate-600">{label as string}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtNumber(val, 3)}</TableCell>
                        <TableCell className="text-right text-slate-500">
                          {(val as number) && p.catchment_area_km2
                            ? fmtNumber((val as number) / p.catchment_area_km2! * 1000, 2)
                            : "--"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            {s.hydrology?.flow_cv && (
              <p className="text-xs text-slate-500 mt-2">Coefficient of Variation (CV): {fmtNumber(s.hydrology.flow_cv, 2)}</p>
            )}

            {/* ── SECTION 5: POWER & ENERGY (Pages 12-13) ── */}
            <SectionHeading number="5" title="Power &amp; Energy Assessment" />

            <SubHeading number="5.1" title="Design Parameters" />
            <p className="text-slate-600 mb-3">{str(s.power_energy?.methodology_text)}</p>

            <Card className="border-slate-200 mb-4 avoid-break">
              <CardContent className="py-4">
                <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 font-mono text-center text-slate-700">
                  <span className="text-lg">P = &eta; &times; &rho; &times; g &times; Q &times; H</span>
                  <span className="block text-xs text-slate-400 mt-2 font-sans">
                    P = {fmtNumber(s.power_energy?.turbine_efficiency, 2)} &times; 1000 &times; 9.81 &times;
                    {fmtNumber(p.design_flow_m3s, 3)} &times; {fmtNumber(p.net_head_m, 1)} =
                    <strong className="text-teal-700 ml-1">{fmtNumber(p.installed_capacity_kw, 0)} kW ({fmtNumber((p.installed_capacity_kw || 0) / 1000, 2)} MW)</strong>
                  </span>
                </div>
              </CardContent>
            </Card>

            <SubHeading number="5.2" title="Turbine Selection" />
            <p className="text-xs text-slate-500 italic mb-2">Table 4: Turbine Selection Parameters</p>
            <Card className="border-slate-200 avoid-break mb-4">
              <CardContent className="pt-4">
                <Table>
                  <TableBody>
                    <KVRow label="Design Flow Exceedance" value={str(s.power_energy?.design_flow_exceedance)} />
                    <KVRow label="Design Flow" value={`${fmtNumber(p.design_flow_m3s, 3)} m³/s`} />
                    <KVRow label="Net Head" value={`${fmtNumber(p.net_head_m, 1)} m`} />
                    <KVRow label="Selected Turbine Type" value={str(p.turbine_type)} bold />
                    <KVRow label="Turbine Efficiency" value={s.power_energy?.turbine_efficiency ? fmtPct(Number(s.power_energy.turbine_efficiency) * 100) : "--"} />
                    <KVRow label="Plant Availability" value={s.power_energy?.plant_availability ? fmtPct(Number(s.power_energy.plant_availability) * 100) : "--"} />
                    <KVRow label="Auxiliary Consumption" value={s.power_energy?.auxiliary_consumption_pct ? `${fmtNumber(s.power_energy.auxiliary_consumption_pct, 1)}%` : "--"} />
                    <KVRow label="Transmission Losses" value={s.power_energy?.transmission_loss_pct ? `${fmtNumber(s.power_energy.transmission_loss_pct, 1)}%` : "--"} />
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <SubHeading number="5.3" title="Energy Generation Performance" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <MetricCard label="Installed Capacity" value={fmtNumber((p.installed_capacity_kw || 0) / 1000, 2)} unit="MW" highlight />
              <MetricCard label="Annual Energy" value={fmtNumber((p.annual_energy_mwh || 0) / 1000, 2)} unit="GWh/yr" highlight />
              <MetricCard label="Capacity Factor" value={p.capacity_factor ? fmtPct(p.capacity_factor * 100) : "--"} />
            </div>

            {/* ── SECTION 6: ENVIRONMENTAL (Pages 14-15) ── */}
            <SectionHeading number="6" title="Environmental &amp; Social Assessment" />

            <SubHeading number="6.1" title="Environmental Flow Assessment" />
            <p className="text-slate-600 mb-3">{str(s.environmental?.screening_text)}</p>

            <Card className="border-slate-200 mb-4 avoid-break">
              <CardHeader><CardTitle className="text-sm text-slate-600">Environmental Flow (E-flow) Allocation</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>E-flow Category</TableHead>
                      <TableHead className="text-right">% of MAF</TableHead>
                      <TableHead className="text-right">Flow (m³/s)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-slate-600">Minimum (Survival)</TableCell>
                      <TableCell className="text-right">10%</TableCell>
                      <TableCell className="text-right font-semibold">{s.environmental?.eflow_min ? fmtNumber(s.environmental.eflow_min, 3) : "--"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-slate-600">Fair (Degraded Habitat)</TableCell>
                      <TableCell className="text-right">30%</TableCell>
                      <TableCell className="text-right font-semibold">{s.environmental?.eflow_fair ? fmtNumber(s.environmental.eflow_fair, 3) : "--"}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-slate-600">Outstanding (Pristine)</TableCell>
                      <TableCell className="text-right">60%</TableCell>
                      <TableCell className="text-right font-semibold">{s.environmental?.eflow_outstanding ? fmtNumber(s.environmental.eflow_outstanding, 3) : "--"}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <p className="text-xs text-slate-400 mt-2">Method: {str(s.environmental?.eflow_method)} (Tennant, 1976)</p>
              </CardContent>
            </Card>

            <SubHeading number="6.2" title="ESIA Screening Checklist" />
            <p className="text-xs text-slate-500 italic mb-2">Table 5: Environmental & Social Screening Checklist</p>
            {Array.isArray(s.environmental?.esia_checklist) && (
              <Card className="border-slate-200 avoid-break mb-4">
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Criterion</TableHead>
                        <TableHead className="text-center w-24">Status</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(s.environmental.esia_checklist as Array<{ criterion: string; passed: boolean; notes?: string }>).map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-slate-600">{item.criterion}</TableCell>
                          <TableCell className="text-center">
                            {item.passed ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                                <CheckCircle className="size-4" /> Clear
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold">
                                <AlertTriangle className="size-4" /> Flagged
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">{item.notes ?? "--"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {s.environmental?.esia_notes && (
              <>
                <SubHeading number="6.3" title="Social Impact &amp; Mitigation Notes" />
                <p className="text-slate-600 bg-slate-50 border border-slate-200 rounded p-3 text-xs">
                  {str(s.environmental.esia_notes)}
                </p>
              </>
            )}

            {/* ── SECTION 7: COST ESTIMATION (Pages 16-17) ── */}
            <SectionHeading number="7" title="Cost Estimation" />

            <SubHeading number="7.1" title="Methodology" />
            <p className="text-slate-600 mb-4">{str(s.cost_estimate?.methodology_text)}</p>

            <SubHeading number="7.2" title="Capital Cost Breakdown" />
            <p className="text-xs text-slate-500 italic mb-2">Table 6: CAPEX Breakdown</p>

            {s.cost_estimate?.cost_breakdown && (
              <Card className="border-slate-200 avoid-break mb-4">
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Component</TableHead>
                        <TableHead className="text-right">Cost (USD)</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(s.cost_estimate.cost_breakdown as Record<string, number>).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="font-medium text-slate-600">{key}</TableCell>
                          <TableCell className="text-right font-semibold">{fmtCurrency(value)}</TableCell>
                          <TableCell className="text-right text-slate-500">
                            {p.total_capex_usd ? fmtPct((value / p.total_capex_usd) * 100) : "--"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className="font-bold text-slate-800">Total CAPEX</TableCell>
                        <TableCell className="text-right font-bold text-slate-800">{fmtCurrency(p.total_capex_usd)}</TableCell>
                        <TableCell className="text-right font-bold text-slate-800">100%</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Cost bar chart */}
            {s.cost_estimate?.cost_breakdown && (
              <Card className="border-slate-200 avoid-break mb-4">
                <CardHeader><CardTitle className="text-sm text-slate-600">Figure 2: Capital Cost Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(s.cost_estimate.cost_breakdown as Record<string, number>).map(([name, value]) => ({
                          name: name.length > 20 ? name.substring(0, 18) + "…" : name,
                          value: (value as number) / 1e6,
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} angle={-35} textAnchor="end" height={80} />
                        <YAxis label={{ value: "Cost ($M)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#64748b" } }}
                          tick={{ fontSize: 11, fill: "#64748b" }} />
                        <Tooltip formatter={(value: unknown) => [`$${fmtNumber(value, 2)}M`]} />
                        <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <SubHeading number="7.3" title="Operating Costs" />
            <div className="grid grid-cols-2 gap-4">
              <MetricCard label="Specific Cost" value={p.specific_cost_usd_kw ? `${fmtNumber(p.specific_cost_usd_kw, 0)}` : "--"} unit="USD/kW" />
              <MetricCard label="Annual O&M" value={s.cost_estimate?.annual_om_usd ? fmtCurrency(s.cost_estimate.annual_om_usd) : "--"} />
            </div>

            {/* ── SECTION 8: FINANCIAL ANALYSIS (Pages 18-19) ── */}
            <SectionHeading number="8" title="Financial Viability Analysis" />

            <SubHeading number="8.1" title="Financial Assumptions" />
            <p className="text-slate-600 mb-3">{str(s.financial_analysis?.methodology_text)}</p>

            <p className="text-xs text-slate-500 italic mb-2">Table 7: Financial Model Assumptions</p>
            <Card className="border-slate-200 avoid-break mb-4">
              <CardContent className="pt-4">
                <Table>
                  <TableBody>
                    <KVRow label="Energy Tariff" value={s.financial_analysis?.tariff_usd_kwh ? `$${fmtNumber(Number(s.financial_analysis.tariff_usd_kwh) * 1000, 1)}/MWh ($${fmtNumber(s.financial_analysis.tariff_usd_kwh, 3)}/kWh)` : "--"} />
                    <KVRow label="Discount Rate" value={s.financial_analysis?.discount_rate_pct ? `${fmtNumber(s.financial_analysis.discount_rate_pct, 1)}%` : "--"} />
                    <KVRow label="Project Life" value={s.financial_analysis?.project_life_years ? `${s.financial_analysis.project_life_years} years` : "--"} />
                    <KVRow label="Debt / Equity Ratio" value={s.financial_analysis?.debt_fraction ? `${fmtNumber(Number(s.financial_analysis.debt_fraction) * 100, 0)}% / ${fmtNumber((1 - Number(s.financial_analysis.debt_fraction)) * 100, 0)}%` : "--"} />
                    <KVRow label="Debt Interest Rate" value={s.financial_analysis?.debt_rate_pct ? `${fmtNumber(s.financial_analysis.debt_rate_pct, 1)}%` : "--"} />
                    <KVRow label="Debt Tenor" value={s.financial_analysis?.debt_term_years ? `${s.financial_analysis.debt_term_years} years` : "--"} />
                    <KVRow label="Annual O&M (% of CAPEX)" value={s.cost_estimate?.annual_om_pct ? `${fmtNumber(s.cost_estimate.annual_om_pct, 1)}%` : "2.5%"} />
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <SubHeading number="8.2" title="Key Financial Indicators" />
            <p className="text-xs text-slate-500 italic mb-2">Table 8: Financial Indicators</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <MetricCard label="LCOE" value={p.lcoe_usd_mwh ? `$${fmtNumber(p.lcoe_usd_mwh, 1)}` : "--"} unit="USD/MWh" highlight />
              <MetricCard label="NPV" value={fmtCurrency(p.npv_usd)} highlight />
              <MetricCard label="IRR" value={p.irr_pct ? fmtPct(p.irr_pct) : "--"} highlight />
              <MetricCard label="Simple Payback" value={p.payback_years ? fmtNumber(p.payback_years, 1) : "--"} unit="years" />
              <MetricCard label="DSCR" value={p.dscr ? fmtNumber(p.dscr, 2) : "--"} />
              <MetricCard label="B/C Ratio" value={p.npv_usd && p.total_capex_usd && p.npv_usd > 0 ? fmtNumber(1 + p.npv_usd / p.total_capex_usd, 2) : "--"} />
            </div>

            <SubHeading number="8.3" title="Sensitivity Analysis" />
            <p className="text-slate-600 mb-3">
              Sensitivity analysis tests the robustness of financial outcomes against variations in key input parameters
              including flow variability (±25%), capital cost (±25%), energy tariff (±30%/+50%), discount rate (6-15%),
              and plant availability (80-90%).
            </p>

            {p.sensitivity_results && p.sensitivity_results.length > 0 && (
              <>
                <p className="text-xs text-slate-500 italic mb-2">Table 9: Sensitivity Analysis Results</p>
                <Card className="border-slate-200 avoid-break">
                  <CardContent className="pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Parameter</TableHead>
                          <TableHead>Variation</TableHead>
                          <TableHead className="text-right">LCOE (USD/MWh)</TableHead>
                          <TableHead className="text-right">NPV (USD)</TableHead>
                          <TableHead className="text-right">IRR (%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const grouped: Record<string, SensitivityResult[]> = {};
                          for (const row of p.sensitivity_results!) {
                            if (!grouped[row.parameter]) grouped[row.parameter] = [];
                            grouped[row.parameter].push(row);
                          }
                          return Object.entries(grouped).flatMap(([param, rows], gi) =>
                            rows.map((row, ri) => (
                              <TableRow key={`${gi}-${ri}`} className={gi % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                {ri === 0 ? (
                                  <TableCell className="font-medium text-slate-700 align-top" rowSpan={rows.length}>
                                    {param.replace(/_/g, " ")}
                                  </TableCell>
                                ) : null}
                                <TableCell className="text-slate-600">{row.variation}</TableCell>
                                <TableCell className="text-right font-semibold">{fmtNumber(row.lcoe, 1)}</TableCell>
                                <TableCell className="text-right">{fmtCurrency(row.npv)}</TableCell>
                                <TableCell className="text-right">{fmtPct(row.irr)}</TableCell>
                              </TableRow>
                            ))
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── SECTION 9: RISK ASSESSMENT (Page 19) ── */}
            <SectionHeading number="9" title="Risk Assessment" />

            <SubHeading number="9.1" title="Risk Matrix" />
            <p className="text-xs text-slate-500 italic mb-2">Table 10: Risk Assessment Matrix</p>

            {Array.isArray(s.recommendation?.risk_matrix) && (
              <Card className="border-slate-200 avoid-break mb-4">
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-28">Category</TableHead>
                        <TableHead className="w-20 text-center">Impact</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Mitigation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(s.recommendation.risk_matrix as Array<{ category: string; impact: string; description: string; mitigation: string }>).map((risk, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-semibold text-slate-700">{risk.category}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-xs ${
                              risk.impact === "High" ? "bg-red-100 text-red-700 border-red-200" :
                              risk.impact === "Medium" ? "bg-amber-100 text-amber-700 border-amber-200" :
                              "bg-emerald-100 text-emerald-700 border-emerald-200"
                            }`}>{risk.impact}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{risk.description}</TableCell>
                          <TableCell className="text-xs text-slate-500">{risk.mitigation}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* ── SECTION 10: CONCLUSIONS & RECOMMENDATIONS (Page 20) ── */}
            <SectionHeading number="10" title="Conclusions &amp; Recommendations" />

            <SubHeading number="10.1" title="Screening Result" />
            <Card className={`border-2 mb-4 avoid-break ${
              rec.label === "ADVANCE" ? "border-emerald-300 bg-emerald-50/50" :
              rec.label === "CONDITIONAL" ? "border-amber-300 bg-amber-50/50" :
              "border-red-300 bg-red-50/50"
            }`}>
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className={`flex items-center justify-center rounded-full p-3 ${
                    rec.label === "ADVANCE" ? "bg-emerald-100 text-emerald-700" :
                    rec.label === "CONDITIONAL" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {rec.icon}
                  </div>
                  <div>
                    <Badge className={`mb-2 text-sm px-3 py-1 ${rec.bg}`}>{rec.label}</Badge>
                    <p className="text-slate-700 leading-relaxed">{str(s.recommendation?.description_text)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <SubHeading number="10.2" title="Assessment Summary" />
            <Card className="border-slate-200 avoid-break mb-4">
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Criterion</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Threshold</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">NSE Score</TableCell>
                      <TableCell className="text-right">{p.nse_score ? fmtNumber(p.nse_score, 3) : "N/A (ungauged)"}</TableCell>
                      <TableCell className="text-right">≥ 0.60</TableCell>
                      <TableCell className="text-center">
                        {!p.nse_score ? <span className="text-slate-400 text-xs">N/A</span> :
                         p.nse_score >= 0.6 ? <CheckCircle className="size-4 text-emerald-600 mx-auto" /> :
                         <XCircle className="size-4 text-red-600 mx-auto" />}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">LCOE</TableCell>
                      <TableCell className="text-right">{p.lcoe_usd_mwh ? `$${fmtNumber(p.lcoe_usd_mwh, 1)}/MWh` : "--"}</TableCell>
                      <TableCell className="text-right">&lt; 150 USD/MWh</TableCell>
                      <TableCell className="text-center">
                        {p.lcoe_usd_mwh && p.lcoe_usd_mwh < 150 ? <CheckCircle className="size-4 text-emerald-600 mx-auto" /> :
                         p.lcoe_usd_mwh && p.lcoe_usd_mwh <= 250 ? <AlertTriangle className="size-4 text-amber-500 mx-auto" /> :
                         <XCircle className="size-4 text-red-600 mx-auto" />}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">ESIA Fatal Constraints</TableCell>
                      <TableCell className="text-right">{s.environmental?.flagged_count ? `${s.environmental.flagged_count as number}/5 flagged` : "0/5 flagged"}</TableCell>
                      <TableCell className="text-right">No fatal flags</TableCell>
                      <TableCell className="text-center">
                        {!s.environmental?.flagged_count || (s.environmental.flagged_count as number) === 0 ?
                          <CheckCircle className="size-4 text-emerald-600 mx-auto" /> :
                          <AlertTriangle className="size-4 text-amber-500 mx-auto" />}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <SubHeading number="10.3" title="Recommended Next Steps" />
            {Array.isArray(s.recommendation?.next_steps) && (
              <Card className="border-slate-200 avoid-break">
                <CardContent className="pt-4">
                  <ol className="list-decimal list-inside space-y-2 text-slate-700">
                    {(s.recommendation.next_steps as string[]).map((step, i) => (
                      <li key={i} className="leading-relaxed pl-2">{step}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* ── FOOTER / DISCLAIMER ── */}
            <Separator className="mt-12 mb-6" />
            <div className="text-center text-xs text-slate-400 space-y-1 pb-6">
              <p className="font-semibold text-slate-500">Disclaimer</p>
              <p className="max-w-2xl mx-auto leading-relaxed">
                This pre-feasibility study is intended for screening purposes only and does not constitute
                a bankable feasibility study. The results are based on remote sensing data, regional hydrological
                models, and benchmark cost data. A full feasibility study by qualified engineers, including detailed
                topographic survey, geotechnical investigation, hydrological monitoring, and comprehensive ESIA,
                is required before any investment decisions are made.
              </p>
              <p className="mt-4">Document Reference: {docRef} | Generated: {today} | HydroIQ Platform v1.0</p>
              <p>&copy; {new Date().getFullYear()} AfCEN &mdash; Africa&apos;s Infrastructure Intelligence Layer</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
