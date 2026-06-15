from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from . import models, schemas, calculations
from .database import get_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    from .seed import seed_if_empty
    from .database import async_session
    async with async_session() as session:
        await seed_if_empty(session)
    yield


app = FastAPI(title="HydroIQ API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── Projects CRUD ──

@app.get("/api/projects")
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project).order_by(models.Project.updated_at.desc()))
    projects = result.scalars().all()
    return [schemas.ProjectResponse.model_validate(p) for p in projects]


@app.post("/api/projects", status_code=201)
async def create_project(data: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = models.Project(**data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return schemas.ProjectResponse.model_validate(project)


@app.get("/api/projects/{project_id}")
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return schemas.ProjectResponse.model_validate(project)


@app.patch("/api/projects/{project_id}")
async def update_project(project_id: int, data: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    for key, val in data.model_dump(exclude_none=True).items():
        setattr(project, key, val)
    await db.commit()
    await db.refresh(project)
    return schemas.ProjectResponse.model_validate(project)


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    await db.delete(project)
    await db.commit()
    return {"ok": True}


# ── Phase 1: Scoping & Data Inventory ──

@app.put("/api/projects/{project_id}/phase1")
async def save_phase1(project_id: int, data: schemas.Phase1Input, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    for key, val in data.model_dump(exclude_none=True).items():
        setattr(project, key, val)

    project.current_phase = max(project.current_phase, 2)
    await db.commit()
    await db.refresh(project)
    return schemas.ProjectResponse.model_validate(project)


# ── Phase 2: Topographic & Hydrological Screening ──

@app.put("/api/projects/{project_id}/phase2")
async def save_phase2(project_id: int, data: schemas.Phase2Input, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    for key, val in data.model_dump(exclude_none=True).items():
        setattr(project, key, val)

    project.net_head_m = calculations.calculate_net_head(data.gross_head_m)
    project.current_phase = max(project.current_phase, 3)
    await db.commit()
    await db.refresh(project)

    screening = calculations.check_screening(
        project.gross_head_m,
        project.catchment_area_km2 or 0,
        project.mean_annual_flow_m3s,
        project.capacity_class or "small",
    )

    resp = schemas.ProjectResponse.model_validate(project)
    return {"project": resp, "screening": screening}


# ── Phase 3: ML-Based Streamflow Prediction ──

@app.put("/api/projects/{project_id}/phase3")
async def save_phase3(project_id: int, data: schemas.Phase3Input, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    for key, val in data.model_dump(exclude_none=True).items():
        if key == "fdc_data" and val:
            setattr(project, key, [p.model_dump() for p in val])
        else:
            setattr(project, key, val)

    if not project.fdc_data:
        project.fdc_data = calculations.generate_default_fdc(
            data.mean_annual_flow_m3s, data.q10_m3s, data.q40_m3s, data.q50_m3s, data.q90_m3s
        )

    project.current_phase = max(project.current_phase, 4)
    await db.commit()
    await db.refresh(project)
    return schemas.ProjectResponse.model_validate(project)


# ── Phase 4: Power & Energy Estimation ──

@app.put("/api/projects/{project_id}/phase4")
async def save_phase4(project_id: int, data: schemas.Phase4Input, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    q_values = {
        "q40": project.q40_m3s or 0,
        "q50": project.q50_m3s or 0,
        "q90": project.q90_m3s or 0,
    }
    design_flow = calculations.get_design_flow(data.design_flow_exceedance, q_values)

    net_head = project.net_head_m or calculations.calculate_net_head(project.gross_head_m or 0)

    installed_kw = calculations.calculate_power_kw(design_flow, net_head, data.turbine_efficiency)

    cf = calculations.calculate_capacity_factor(
        project.fdc_data or [],
        net_head,
        design_flow,
        data.turbine_efficiency,
        data.plant_availability,
        data.auxiliary_consumption_pct,
        data.transmission_loss_pct,
    )

    annual_energy = calculations.calculate_annual_energy_mwh(installed_kw, cf)

    turbine = calculations.select_turbine(net_head, project.capacity_class or "small")

    project.design_flow_m3s = round(design_flow, 4)
    project.design_flow_exceedance = data.design_flow_exceedance
    project.turbine_efficiency = data.turbine_efficiency
    project.installed_capacity_kw = round(installed_kw, 2)
    project.annual_energy_mwh = round(annual_energy, 2)
    project.plant_availability = data.plant_availability
    project.auxiliary_consumption_pct = data.auxiliary_consumption_pct
    project.transmission_loss_pct = data.transmission_loss_pct
    project.turbine_type = turbine["type"]
    project.capacity_factor = round(cf, 4)
    project.current_phase = max(project.current_phase, 5)

    await db.commit()
    await db.refresh(project)

    resp = schemas.ProjectResponse.model_validate(project)
    return {
        "project": resp,
        "turbine_recommendation": turbine,
        "design_flow_sensitivity": [
            {
                "exceedance": f"Q{q}",
                "flow_m3s": round(calculations.get_design_flow(f"Q{q}", q_values), 4),
                "capacity_kw": round(
                    calculations.calculate_power_kw(
                        calculations.get_design_flow(f"Q{q}", q_values), net_head, data.turbine_efficiency
                    ), 2
                ),
            }
            for q in [30, 40, 50, 60]
        ],
    }


# ── Phase 5: Environmental & Social Screening ──

@app.put("/api/projects/{project_id}/phase5")
async def save_phase5(project_id: int, data: schemas.Phase5Input, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    for key, val in data.model_dump().items():
        setattr(project, key, val)

    maf = project.mean_annual_flow_m3s or 0
    eflows = calculations.environmental_flows(maf, data.env_flow_min_pct, data.env_flow_fair_pct, data.env_flow_outstanding_pct)
    project.env_flow_min_m3s = eflows["minimum_m3s"]
    project.env_flow_fair_m3s = eflows["fair_m3s"]
    project.env_flow_outstanding_m3s = eflows["outstanding_m3s"]

    esia_flags = [data.protected_area, data.endangered_species, data.community_dependency,
                  data.cultural_heritage, data.water_rights_affected]

    project.current_phase = max(project.current_phase, 6)
    await db.commit()
    await db.refresh(project)

    resp = schemas.ProjectResponse.model_validate(project)
    return {
        "project": resp,
        "environmental_flows": eflows,
        "esia_flags_count": sum(esia_flags),
        "requires_specialist_assessment": any(esia_flags),
    }


# ── Phase 6: Preliminary Cost Estimation ──

@app.put("/api/projects/{project_id}/phase6")
async def save_phase6(project_id: int, data: schemas.Phase6Input, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    costs = calculations.estimate_costs(
        project.installed_capacity_kw or 0,
        project.capacity_class or "small",
        data.civil_works_usd,
        data.electromechanical_usd,
        data.transmission_km,
        data.transmission_cost_per_km,
        data.environmental_social_pct,
        data.engineering_dev_pct,
        data.contingency_pct,
        data.annual_om_pct,
    )

    for key, val in costs.items():
        setattr(project, key, val)
    project.annual_om_pct = data.annual_om_pct

    project.current_phase = max(project.current_phase, 7)
    await db.commit()
    await db.refresh(project)

    return {
        "project": schemas.ProjectResponse.model_validate(project),
        "cost_breakdown": costs,
        "benchmark_range": calculations.COST_BENCHMARKS.get(project.capacity_class or "small"),
    }


# ── Phase 7: Financial Viability ──

@app.put("/api/projects/{project_id}/phase7")
async def save_phase7(project_id: int, data: schemas.Phase7Input, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    capex = project.total_capex_usd or 0
    om = project.annual_om_usd or 0
    energy = project.annual_energy_mwh or 0
    annual_revenue = energy * data.tariff_usd_kwh * 1000

    lcoe = calculations.calculate_lcoe(capex, om, energy, data.discount_rate_pct, data.project_life_years)
    npv = calculations.calculate_npv(capex, annual_revenue, om, data.discount_rate_pct, data.project_life_years)
    irr = calculations.calculate_irr(capex, annual_revenue, om, data.project_life_years)
    payback = calculations.calculate_payback(capex, annual_revenue, om)

    dscr = None
    if data.debt_fraction and data.debt_rate_pct and data.debt_term_years:
        debt_service = calculations.calculate_annual_debt_service(
            capex, data.debt_fraction, data.debt_rate_pct, data.debt_term_years
        )
        dscr = calculations.calculate_dscr(annual_revenue, om, debt_service)

    esia_fatal = any([
        project.protected_area, project.endangered_species,
        project.cultural_heritage, project.water_rights_affected,
    ])
    recommendation = calculations.determine_recommendation(project.nse_score, lcoe, esia_fatal)

    sensitivity = calculations.run_sensitivity(
        capex, om, energy, data.tariff_usd_kwh, data.discount_rate_pct, data.project_life_years
    )

    project.tariff_usd_kwh = data.tariff_usd_kwh
    project.discount_rate_pct = data.discount_rate_pct
    project.project_life_years = data.project_life_years
    project.debt_fraction = data.debt_fraction
    project.debt_rate_pct = data.debt_rate_pct
    project.debt_term_years = data.debt_term_years
    project.lcoe_usd_mwh = round(lcoe, 2)
    project.npv_usd = round(npv, 2)
    project.irr_pct = round(irr, 2) if irr else None
    project.payback_years = round(payback, 2) if payback else None
    project.dscr = round(dscr, 2) if dscr else None
    project.recommendation = recommendation
    project.sensitivity_results = sensitivity
    project.status = "completed"

    await db.commit()
    await db.refresh(project)

    return {
        "project": schemas.ProjectResponse.model_validate(project),
        "recommendation": recommendation,
        "sensitivity": sensitivity,
    }


# ── Report Generation ──

@app.get("/api/projects/{project_id}/report")
async def generate_report(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    return {
        "project": schemas.ProjectResponse.model_validate(project),
        "report_sections": {
            "executive_summary": _build_executive_summary(project),
            "site_description": _build_site_description(project),
            "hydrology": _build_hydrology_section(project),
            "power_energy": _build_power_section(project),
            "environmental": _build_environmental_section(project),
            "cost_estimate": _build_cost_section(project),
            "financial_analysis": _build_financial_section(project),
            "recommendation": _build_recommendation_section(project),
        },
    }


def _fmt(v, decimals=2):
    if v is None:
        return "N/A"
    return f"{v:,.{decimals}f}" if isinstance(v, (int, float)) else str(v)


def _build_executive_summary(p) -> dict:
    cap_mw = round(p.installed_capacity_kw / 1000, 2) if p.installed_capacity_kw else None
    energy_gwh = round(p.annual_energy_mwh / 1000, 2) if p.annual_energy_mwh else None
    summary = (
        f"This pre-feasibility study assesses the {p.name} hydropower project located in "
        f"{p.country}{f', {p.region}' if p.region else ''}. "
    )
    if cap_mw and energy_gwh:
        summary += (
            f"The proposed {p.project_type or 'run-of-river'} scheme has an estimated installed capacity of "
            f"{cap_mw} MW with mean annual energy generation of {energy_gwh} GWh. "
        )
    if p.lcoe_usd_mwh:
        summary += f"The levelized cost of energy is estimated at ${p.lcoe_usd_mwh:.1f}/MWh. "
    if p.recommendation:
        rec_labels = {"ADVANCE": "advance to full feasibility",
                      "CONDITIONAL": "proceed conditionally pending further data",
                      "DO_NOT_ADVANCE": "not advance at this time"}
        summary += f"Based on the AfCEN screening framework, the recommendation is to {rec_labels.get(p.recommendation, 'review')}."
    return {
        "summary_text": summary,
        "project_name": p.name,
        "country": p.country,
        "region": p.region,
        "coordinates": f"{p.latitude:.5f}, {p.longitude:.5f}" if p.latitude else "N/A",
        "project_type": p.project_type,
        "capacity_class": p.capacity_class,
        "installed_capacity_kw": p.installed_capacity_kw,
        "installed_capacity_mw": cap_mw,
        "annual_energy_mwh": p.annual_energy_mwh,
        "annual_energy_gwh": energy_gwh,
        "gross_head_m": p.gross_head_m,
        "net_head_m": p.net_head_m,
        "design_flow_m3s": p.design_flow_m3s,
        "turbine_type": p.turbine_type,
        "total_capex_usd": p.total_capex_usd,
        "specific_cost_usd_kw": p.specific_cost_usd_kw,
        "lcoe_usd_mwh": p.lcoe_usd_mwh,
        "irr_pct": p.irr_pct,
        "npv_usd": p.npv_usd,
        "dscr": p.dscr,
        "recommendation": p.recommendation,
    }


def _build_site_description(p) -> dict:
    desc = (
        f"The project site is located at coordinates {p.latitude:.5f}°, {p.longitude:.5f}° "
        if p.latitude else "The project site "
    )
    desc += f"in {p.country}{f', {p.region}' if p.region else ''}. "
    if p.catchment_area_km2:
        desc += f"The contributing catchment area is {p.catchment_area_km2:.1f} km². "
    if p.gross_head_m:
        desc += f"Topographic screening using {p.dem_resolution_m or 30}m DEM data identifies a gross head of {p.gross_head_m:.1f} m"
        if p.penstock_length_m:
            desc += f" over a penstock corridor of {p.penstock_length_m:.0f} m"
        desc += ". "
    if p.net_head_m:
        desc += f"After accounting for friction and minor losses, the net head is estimated at {p.net_head_m:.1f} m. "
    return {
        "description_text": desc,
        "catchment_area_km2": p.catchment_area_km2,
        "gross_head_m": p.gross_head_m,
        "net_head_m": p.net_head_m,
        "dem_resolution": f"{p.dem_resolution_m or 30} m SRTM" if p.dem_resolution_m else "30 m SRTM",
        "mean_elevation": p.elevation_mean_m,
        "avg_slope": p.mean_slope_pct,
        "penstock_length_m": p.penstock_length_m,
        "stream_length_km": p.stream_length_km,
        "forest_fraction": p.forest_fraction,
        "soil_porosity": p.soil_porosity,
        "has_gauge_data": p.has_gauge_data,
        "gauge_years": p.gauge_years,
        "distance_to_load_km": p.distance_to_load_km,
        "latitude": p.latitude,
        "longitude": p.longitude,
    }


def _build_hydrology_section(p) -> dict:
    method = (
        f"Streamflow estimation employs {p.lstm_model_approach or 'LSTM-based regional transfer'} "
        f"following the methodology of Kratzert et al. (2019). "
    )
    if p.has_gauge_data == "yes" and p.gauge_years:
        method += f"The site benefits from {p.gauge_years:.0f} years of gauge records for model calibration and validation. "
    elif p.has_gauge_data == "partial":
        method += "Limited gauge data is available for partial model calibration. "
    else:
        method += "As an ungauged basin, the model relies on regional transfer from donor catchments with similar physio-climatic attributes. "
    if p.nse_score:
        method += f"The model achieves a Nash-Sutcliffe Efficiency (NSE) of {p.nse_score:.3f}. "
    if p.ensemble_size:
        method += f"An ensemble of {p.ensemble_size} model realisations provides uncertainty quantification with P10/P50/P90 bounds on the flow duration curve."
    return {
        "methodology_text": method,
        "ml_approach": p.lstm_model_approach or "Regional LSTM",
        "nse_score": p.nse_score,
        "ensemble_size": p.ensemble_size,
        "simulation_period": f"{p.simulation_years} years" if p.simulation_years else "N/A",
        "simulation_years": p.simulation_years,
        "mean_annual_flow_m3s": p.mean_annual_flow_m3s,
        "q10": p.q10_m3s,
        "q40": p.q40_m3s,
        "q50": p.q50_m3s,
        "q90": p.q90_m3s,
        "flow_cv": p.flow_cv,
        "fdc_data": p.fdc_data,
        "has_gauge_data": p.has_gauge_data,
        "gauge_years": p.gauge_years,
    }


def _build_power_section(p) -> dict:
    method = (
        f"Power output is calculated using the standard hydropower equation P = η × ρ × g × Q × H, "
        f"where η = {p.turbine_efficiency or 0.80:.2f} (turbine efficiency), ρ = 1000 kg/m³, "
        f"g = 9.81 m/s², Q = design flow at {p.design_flow_exceedance or 'Q40'} exceedance, "
        f"and H = net head. "
    )
    if p.turbine_type:
        method += f"A {p.turbine_type} turbine is selected based on the head-flow operating envelope. "
    if p.plant_availability:
        method += f"Plant availability is assumed at {p.plant_availability*100:.0f}%. "
    if p.capacity_factor:
        method += f"The resulting capacity factor is {p.capacity_factor*100:.1f}%."
    return {
        "methodology_text": method,
        "design_flow_m3s": p.design_flow_m3s,
        "design_flow_exceedance": p.design_flow_exceedance,
        "turbine_type": p.turbine_type,
        "efficiency": p.turbine_efficiency,
        "turbine_efficiency": p.turbine_efficiency,
        "installed_capacity_kw": p.installed_capacity_kw,
        "capacity_factor": p.capacity_factor,
        "annual_energy_mwh": p.annual_energy_mwh,
        "plant_availability": p.plant_availability,
        "auxiliary_consumption_pct": p.auxiliary_consumption_pct,
        "transmission_loss_pct": p.transmission_loss_pct,
        "gross_head_m": p.gross_head_m,
        "net_head_m": p.net_head_m,
    }


def _build_environmental_section(p) -> dict:
    eflow_min = p.env_flow_min_m3s
    eflow_pct = None
    if eflow_min and p.mean_annual_flow_m3s and p.mean_annual_flow_m3s > 0:
        eflow_pct = round(eflow_min / p.mean_annual_flow_m3s * 100, 1)

    screen = (
        f"Environmental screening follows the {p.env_flow_method or 'Tennant'} method for environmental flow allocation. "
    )
    if eflow_min:
        screen += f"The minimum environmental flow requirement is {eflow_min:.3f} m³/s ({eflow_pct:.1f}% of MAF). "

    esia_items = [
        {"criterion": "Protected Area", "flagged": p.protected_area, "notes": "Site within or adjacent to a protected area"},
        {"criterion": "Endangered Species", "flagged": p.endangered_species, "notes": "Presence of IUCN-listed species in the project area"},
        {"criterion": "Community Water Dependency", "flagged": p.community_dependency, "notes": "Downstream communities depend on the river for water supply or livelihoods"},
        {"criterion": "Cultural Heritage Sites", "flagged": p.cultural_heritage, "notes": "Presence of cultural or archaeological sites in the affected area"},
        {"criterion": "Water Rights Conflict", "flagged": p.water_rights_affected, "notes": "Existing water rights or allocations may be affected"},
    ]
    flagged_count = sum(1 for i in esia_items if i["flagged"])
    screen += f"{flagged_count} of 5 ESIA screening criteria are flagged."
    if p.esia_notes:
        screen += f" {p.esia_notes}"

    return {
        "screening_text": screen,
        "eflow_method": p.env_flow_method,
        "eflow_min": eflow_min,
        "eflow_pct_maf": eflow_pct,
        "eflow_fair": p.env_flow_fair_m3s,
        "eflow_outstanding": p.env_flow_outstanding_m3s,
        "esia_checklist": [
            {"criterion": i["criterion"], "passed": not i["flagged"], "notes": i["notes"]}
            for i in esia_items
        ],
        "esia_notes": p.esia_notes,
        "flagged_count": flagged_count,
    }


def _build_cost_section(p) -> dict:
    method = "Capital costs are estimated using AfCEN benchmark data calibrated to African hydropower markets. "
    if p.civil_works_usd and p.electromechanical_usd:
        civil_pct = p.civil_works_usd / p.total_capex_usd * 100 if p.total_capex_usd else 0
        em_pct = p.electromechanical_usd / p.total_capex_usd * 100 if p.total_capex_usd else 0
        method += f"Civil works represent {civil_pct:.0f}% and electromechanical equipment {em_pct:.0f}% of total CAPEX. "
    if p.specific_cost_usd_kw:
        method += f"The specific cost of {p.specific_cost_usd_kw:,.0f} USD/kW "
        if p.specific_cost_usd_kw < 3000:
            method += "is within the competitive range for African hydropower projects."
        elif p.specific_cost_usd_kw < 5000:
            method += "is within the typical range for small-to-medium hydropower in Africa."
        else:
            method += "is above typical benchmarks, reflecting site-specific challenges."

    cost_breakdown = {}
    if p.civil_works_usd:
        cost_breakdown["Civil Works"] = p.civil_works_usd
    if p.electromechanical_usd:
        cost_breakdown["Electromechanical Equipment"] = p.electromechanical_usd
    if p.transmission_usd:
        cost_breakdown["Transmission & Grid Connection"] = p.transmission_usd
    if p.environmental_social_usd:
        cost_breakdown["Environmental & Social Mitigation"] = p.environmental_social_usd
    if p.engineering_dev_usd:
        cost_breakdown["Engineering & Development"] = p.engineering_dev_usd
    if p.contingency_usd:
        cost_breakdown["Contingency"] = p.contingency_usd

    return {
        "methodology_text": method,
        "cost_breakdown": cost_breakdown,
        "civil_works_usd": p.civil_works_usd,
        "electromechanical_usd": p.electromechanical_usd,
        "transmission_usd": p.transmission_usd,
        "environmental_social_usd": p.environmental_social_usd,
        "engineering_dev_usd": p.engineering_dev_usd,
        "contingency_usd": p.contingency_usd,
        "total_capex_usd": p.total_capex_usd,
        "specific_cost_usd_kw": p.specific_cost_usd_kw,
        "annual_om_usd": p.annual_om_usd,
        "annual_om_pct": p.annual_om_pct,
    }


def _build_financial_section(p) -> dict:
    method = (
        f"Financial viability is assessed over a {p.project_life_years or 30}-year project life "
        f"at a discount rate of {p.discount_rate_pct or 10}%. "
    )
    if p.tariff_usd_kwh:
        method += f"The assumed energy tariff is ${p.tariff_usd_kwh:.3f}/kWh. "
    if p.debt_fraction:
        method += f"The financing structure assumes {p.debt_fraction*100:.0f}% debt / {(1-p.debt_fraction)*100:.0f}% equity"
        if p.debt_rate_pct:
            method += f" with a debt interest rate of {p.debt_rate_pct}% over {p.debt_term_years or 15} years"
        method += ". "
    if p.lcoe_usd_mwh and p.tariff_usd_kwh:
        tariff_mwh = p.tariff_usd_kwh * 1000
        if p.lcoe_usd_mwh < tariff_mwh:
            method += f"The LCOE of ${p.lcoe_usd_mwh:.1f}/MWh is below the tariff of ${tariff_mwh:.0f}/MWh, indicating financial viability."
        else:
            method += f"The LCOE of ${p.lcoe_usd_mwh:.1f}/MWh exceeds the tariff of ${tariff_mwh:.0f}/MWh, indicating marginal financial performance."
    return {
        "methodology_text": method,
        "tariff_usd_kwh": p.tariff_usd_kwh,
        "discount_rate_pct": p.discount_rate_pct,
        "project_life_years": p.project_life_years,
        "debt_fraction": p.debt_fraction,
        "debt_rate_pct": p.debt_rate_pct,
        "debt_term_years": p.debt_term_years,
        "lcoe_usd_mwh": p.lcoe_usd_mwh,
        "npv_usd": p.npv_usd,
        "irr_pct": p.irr_pct,
        "payback_years": p.payback_years,
        "dscr": p.dscr,
        "sensitivity_results": p.sensitivity_results,
    }


def _build_recommendation_section(p) -> dict:
    rec_text = {
        "ADVANCE": (
            f"Based on the AfCEN pre-feasibility screening framework (AfCEN/HPF/001), "
            f"the {p.name} project demonstrates sufficient hydrological confidence "
            f"(NSE {'≥ 0.60' if not p.nse_score else f'= {p.nse_score:.3f}'}), "
            f"competitive LCOE (${p.lcoe_usd_mwh:.1f}/MWh), and no fatal environmental or social constraints. "
            f"The project is recommended to ADVANCE to a full feasibility study."
        ) if p.lcoe_usd_mwh else "The project is recommended to advance to a full feasibility study.",
        "CONDITIONAL": (
            f"The {p.name} project shows marginal indicators that require further investigation "
            f"before a definitive decision can be made. "
            f"{'The LCOE of $' + f'{p.lcoe_usd_mwh:.1f}/MWh is in the conditional range (150-250 USD/MWh). ' if p.lcoe_usd_mwh and 150 <= p.lcoe_usd_mwh <= 250 else ''}"
            f"The recommendation is CONDITIONAL, pending resolution of identified data gaps."
        ),
        "DO_NOT_ADVANCE": (
            f"The {p.name} project does not meet the minimum thresholds for advancement under the AfCEN framework. "
            f"{'Fatal environmental/social constraints were identified. ' if any([p.protected_area, p.endangered_species, p.cultural_heritage, p.water_rights_affected]) else ''}"
            f"Findings should be documented for the AfCEN resource database."
        ),
    }
    next_steps = {
        "ADVANCE": [
            "Commission a full feasibility study with detailed topographic survey (1:1000 scale, 0.5m contours)",
            "Install stream gauge stations for continuous flow monitoring (minimum 2-year record)",
            "Conduct comprehensive Environmental and Social Impact Assessment (ESIA)",
            "Complete geotechnical investigation programme (core drilling, in-situ testing)",
            "Develop detailed engineering design and tender documentation",
            "Initiate stakeholder engagement and community consultation",
            "Prepare project information memorandum for potential investors",
        ],
        "CONDITIONAL": [
            "Install gauge stations for a 1-2 year hydrological monitoring period",
            "Resolve identified environmental and social issues with targeted assessments",
            "Conduct additional site investigation to refine head and flow estimates",
            "Reassess financial viability with updated data",
            "Engage with regulatory authorities on permitting requirements",
        ],
        "DO_NOT_ADVANCE": [
            "Document findings in the AfCEN hydropower resource database",
            "Consider alternative sites in the same river basin",
            "Reassess if new data or changed conditions alter the screening outcome",
        ],
    }

    risk_matrix = [
        {"category": "Hydrological", "impact": "High" if not p.nse_score or p.nse_score < 0.6 else "Low",
         "description": "Flow estimation uncertainty due to limited gauge data",
         "mitigation": "Install gauging stations; extend LSTM training with regional data"},
        {"category": "Technical", "impact": "Medium",
         "description": "Head and geological conditions may differ from DEM-based estimates",
         "mitigation": "Detailed topographic and geotechnical survey required at feasibility stage"},
        {"category": "Financial", "impact": "High" if (p.irr_pct and p.irr_pct < 10) else "Medium",
         "description": "Sensitivity to tariff, CAPEX, and flow variability",
         "mitigation": "Sensitivity analysis conducted; negotiate PPA terms before commitment"},
        {"category": "Environmental", "impact": "High" if any([p.protected_area, p.endangered_species]) else "Medium",
         "description": "ESIA requirements and environmental flow obligations",
         "mitigation": "Full ESIA with stakeholder engagement; comply with national environmental regulations"},
        {"category": "Political / Regulatory", "impact": "Medium",
         "description": "Permitting timeline and regulatory framework uncertainty",
         "mitigation": "Early engagement with regulatory bodies; secure water rights and generation license"},
        {"category": "Construction", "impact": "Medium",
         "description": "Access, logistics, and construction cost escalation risk",
         "mitigation": "Contingency provisions in cost estimates; phased construction approach"},
    ]

    return {
        "recommendation": p.recommendation,
        "description_text": rec_text.get(p.recommendation, ""),
        "next_steps": next_steps.get(p.recommendation, []),
        "risk_matrix": risk_matrix,
    }
