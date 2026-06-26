from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, JSON
from sqlalchemy.sql import func
from .database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    region = Column(String)
    description = Column(Text)
    status = Column(String, default="draft")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Phase 1 — Scoping & Data Inventory
    latitude = Column(Float)
    longitude = Column(Float)
    catchment_area_km2 = Column(Float)
    project_type = Column(String)  # run-of-river, pondage, large
    capacity_class = Column(String)  # micro, mini, small, medium, large
    distance_to_load_km = Column(Float)
    has_gauge_data = Column(String)  # yes, partial, no
    gauge_years = Column(Float)
    data_checklist = Column(JSON)

    # Phase 2 — Topographic & Hydrological Screening
    dem_resolution_m = Column(Float)
    gross_head_m = Column(Float)
    net_head_m = Column(Float)
    mean_slope_pct = Column(Float)
    elevation_mean_m = Column(Float)
    stream_length_km = Column(Float)
    penstock_length_m = Column(Float)

    # Catchment Attributes (for LSTM)
    aridity_index = Column(Float)
    forest_fraction = Column(Float)
    soil_porosity = Column(Float)
    soil_conductivity = Column(Float)
    geological_permeability = Column(Float)
    carbonate_rock_fraction = Column(Float)

    # Phase 3 — ML-Based Streamflow Prediction
    lstm_model_approach = Column(String)
    mean_annual_flow_m3s = Column(Float)
    q10_m3s = Column(Float)
    q40_m3s = Column(Float)
    q50_m3s = Column(Float)
    q90_m3s = Column(Float)
    flow_cv = Column(Float)
    nse_score = Column(Float)
    ensemble_size = Column(Integer, default=10)
    simulation_years = Column(Integer, default=20)
    fdc_data = Column(JSON)  # [{exceedance_pct, flow_p10, flow_p50, flow_p90}]

    # Phase 4 — Power & Energy Estimation
    design_flow_m3s = Column(Float)
    design_flow_exceedance = Column(String)  # Q30, Q40, Q50, Q60
    turbine_efficiency = Column(Float, default=0.80)
    installed_capacity_kw = Column(Float)
    annual_energy_mwh = Column(Float)
    plant_availability = Column(Float, default=0.87)
    auxiliary_consumption_pct = Column(Float, default=3.0)
    transmission_loss_pct = Column(Float, default=2.0)
    turbine_type = Column(String)
    capacity_factor = Column(Float)

    # Phase 5 — Environmental & Social Screening
    env_flow_method = Column(String, default="Tennant")
    env_flow_min_pct = Column(Float, default=10.0)
    env_flow_fair_pct = Column(Float, default=30.0)
    env_flow_outstanding_pct = Column(Float, default=60.0)
    env_flow_min_m3s = Column(Float)
    protected_area = Column(Boolean, default=False)
    endangered_species = Column(Boolean, default=False)
    community_dependency = Column(Boolean, default=False)
    cultural_heritage = Column(Boolean, default=False)
    land_area_affected_ha = Column(Float)
    water_rights_affected = Column(Boolean, default=False)
    esia_notes = Column(Text)

    # Phase 5 derived e-flows
    env_flow_fair_m3s = Column(Float)
    env_flow_outstanding_m3s = Column(Float)

    # Phase 6 — Preliminary Cost Estimation
    civil_works_usd = Column(Float)
    electromechanical_usd = Column(Float)
    transmission_usd = Column(Float)
    environmental_social_usd = Column(Float)
    engineering_dev_usd = Column(Float)
    contingency_usd = Column(Float)
    total_capex_usd = Column(Float)
    specific_cost_usd_kw = Column(Float)
    annual_om_usd = Column(Float)
    annual_om_pct = Column(Float, default=2.5)

    # Phase 7 — Financial Viability
    tariff_usd_kwh = Column(Float)
    discount_rate_pct = Column(Float, default=10.0)
    project_life_years = Column(Integer, default=30)
    debt_fraction = Column(Float)
    debt_rate_pct = Column(Float)
    debt_term_years = Column(Integer)
    lcoe_usd_mwh = Column(Float)
    npv_usd = Column(Float)
    irr_pct = Column(Float)
    payback_years = Column(Float)
    dscr = Column(Float)
    recommendation = Column(String)  # ADVANCE, CONDITIONAL, DO_NOT_ADVANCE
    sensitivity_results = Column(JSON)

    # Report & PFS Lock
    report_generated = Column(Boolean, default=False)
    pfs_completed_at = Column(DateTime)
    pfs_locked = Column(Boolean, default=False)
    current_phase = Column(Integer, default=1)

    # Pipeline Tracking
    priority = Column(Integer)
    feasibility_status = Column(String, default="not_started")  # not_started, in_progress, completed
    financial_model_status = Column(String, default="not_started")
    epc_status = Column(String, default="not_secured")  # not_secured, tendering, secured
    equity_status = Column(String, default="not_started")  # not_started, fundraising, partially_secured, secured
    debt_status = Column(String, default="not_started")  # not_started, mandated, term_sheet, secured
    potential_fc_date = Column(String)  # target financial close date
    timeline_status = Column(String, default="on_time")  # on_time, delayed, on_hold
    project_lead = Column(String)
