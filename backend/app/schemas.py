from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class FDCPoint(BaseModel):
    exceedance_pct: float
    flow_p10: float
    flow_p50: float
    flow_p90: float


class SensitivityResult(BaseModel):
    parameter: str
    variation: str
    lcoe: float
    npv: float
    irr: float


class ProjectCreate(BaseModel):
    name: str
    country: str
    region: Optional[str] = None
    description: Optional[str] = None


class Phase1Input(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    catchment_area_km2: float = Field(gt=0)
    project_type: str = Field(pattern="^(run_of_river|pondage|large)$")
    capacity_class: str = Field(pattern="^(micro|mini|small|medium|large)$")
    distance_to_load_km: Optional[float] = None
    has_gauge_data: str = Field(pattern="^(yes|partial|no)$")
    gauge_years: Optional[float] = None
    data_checklist: Optional[dict] = None


class Phase2Input(BaseModel):
    dem_resolution_m: float = Field(default=30.0, gt=0)
    gross_head_m: float = Field(gt=0)
    mean_slope_pct: Optional[float] = None
    elevation_mean_m: Optional[float] = None
    stream_length_km: Optional[float] = None
    penstock_length_m: Optional[float] = None
    aridity_index: Optional[float] = None
    forest_fraction: Optional[float] = Field(default=None, ge=0, le=1)
    soil_porosity: Optional[float] = Field(default=None, ge=0, le=1)
    soil_conductivity: Optional[float] = None
    geological_permeability: Optional[float] = None
    carbonate_rock_fraction: Optional[float] = Field(default=None, ge=0, le=1)


class Phase3Input(BaseModel):
    lstm_model_approach: str
    mean_annual_flow_m3s: float = Field(gt=0)
    q10_m3s: float = Field(gt=0)
    q40_m3s: float = Field(gt=0)
    q50_m3s: float = Field(gt=0)
    q90_m3s: float = Field(gt=0)
    flow_cv: Optional[float] = None
    nse_score: Optional[float] = None
    ensemble_size: int = Field(default=10, ge=1)
    simulation_years: int = Field(default=20, ge=5)
    fdc_data: Optional[list[FDCPoint]] = None


class Phase4Input(BaseModel):
    design_flow_exceedance: str = Field(default="Q40", pattern="^Q(30|40|50|60|70|80)$")
    turbine_efficiency: float = Field(default=0.80, ge=0.5, le=0.95)
    plant_availability: float = Field(default=0.87, ge=0.5, le=1.0)
    auxiliary_consumption_pct: float = Field(default=3.0, ge=0, le=20)
    transmission_loss_pct: float = Field(default=2.0, ge=0, le=20)


class Phase5Input(BaseModel):
    env_flow_method: str = Field(default="Tennant")
    env_flow_min_pct: float = Field(default=10.0, ge=0, le=100)
    env_flow_fair_pct: float = Field(default=30.0, ge=0, le=100)
    env_flow_outstanding_pct: float = Field(default=60.0, ge=0, le=100)
    protected_area: bool = False
    endangered_species: bool = False
    community_dependency: bool = False
    cultural_heritage: bool = False
    land_area_affected_ha: Optional[float] = None
    water_rights_affected: bool = False
    esia_notes: Optional[str] = None


class Phase6Input(BaseModel):
    civil_works_usd: Optional[float] = None
    electromechanical_usd: Optional[float] = None
    transmission_usd: Optional[float] = None
    environmental_social_pct: float = Field(default=5.0, ge=0, le=30)
    engineering_dev_pct: float = Field(default=10.0, ge=0, le=30)
    contingency_pct: float = Field(default=30.0, ge=0, le=50)
    annual_om_pct: float = Field(default=2.5, ge=0, le=15)
    transmission_km: Optional[float] = None
    transmission_cost_per_km: float = Field(default=25000, ge=0)


class Phase7Input(BaseModel):
    tariff_usd_kwh: float = Field(gt=0)
    discount_rate_pct: float = Field(default=10.0, ge=1, le=30)
    project_life_years: int = Field(default=30, ge=10, le=60)
    debt_fraction: Optional[float] = Field(default=None, ge=0, le=1)
    debt_rate_pct: Optional[float] = Field(default=None, ge=0, le=30)
    debt_term_years: Optional[int] = Field(default=None, ge=1, le=30)


class PipelineUpdate(BaseModel):
    priority: Optional[int] = None
    feasibility_status: Optional[str] = None
    financial_model_status: Optional[str] = None
    epc_status: Optional[str] = None
    equity_status: Optional[str] = None
    debt_status: Optional[str] = None
    potential_fc_date: Optional[str] = None
    timeline_status: Optional[str] = None
    project_lead: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    country: str
    region: Optional[str]
    description: Optional[str]
    status: str
    current_phase: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    catchment_area_km2: Optional[float] = None
    project_type: Optional[str] = None
    capacity_class: Optional[str] = None
    gross_head_m: Optional[float] = None
    net_head_m: Optional[float] = None
    mean_annual_flow_m3s: Optional[float] = None
    q10_m3s: Optional[float] = None
    q40_m3s: Optional[float] = None
    q50_m3s: Optional[float] = None
    q90_m3s: Optional[float] = None
    nse_score: Optional[float] = None
    design_flow_m3s: Optional[float] = None
    installed_capacity_kw: Optional[float] = None
    annual_energy_mwh: Optional[float] = None
    turbine_type: Optional[str] = None
    capacity_factor: Optional[float] = None
    total_capex_usd: Optional[float] = None
    specific_cost_usd_kw: Optional[float] = None
    lcoe_usd_mwh: Optional[float] = None
    npv_usd: Optional[float] = None
    irr_pct: Optional[float] = None
    payback_years: Optional[float] = None
    dscr: Optional[float] = None
    recommendation: Optional[str] = None
    fdc_data: Optional[list] = None
    sensitivity_results: Optional[list] = None
    report_generated: bool = False

    priority: Optional[int] = None
    feasibility_status: Optional[str] = None
    financial_model_status: Optional[str] = None
    epc_status: Optional[str] = None
    equity_status: Optional[str] = None
    debt_status: Optional[str] = None
    potential_fc_date: Optional[str] = None
    timeline_status: Optional[str] = None
    project_lead: Optional[str] = None

    model_config = {"from_attributes": True}
