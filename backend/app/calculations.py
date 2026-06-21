import numpy as np
from typing import Optional

WATER_DENSITY = 1000.0  # kg/m³
GRAVITY = 9.81  # m/s²

COST_BENCHMARKS = {
    "micro": {"low": 3000, "high": 8000},    # <1 MW
    "mini": {"low": 3000, "high": 8000},      # <1 MW
    "small": {"low": 2000, "high": 5000},     # 1-10 MW
    "medium": {"low": 1500, "high": 3500},    # 10-50 MW
    "large": {"low": 1200, "high": 3000},     # >50 MW
}

TURBINE_MATRIX = [
    {"type": "Pelton", "head_min": 300, "head_max": 2000, "flow": "low", "application": "High-head mountain streams"},
    {"type": "Francis", "head_min": 40, "head_max": 600, "flow": "medium", "application": "Medium head, versatile"},
    {"type": "Kaplan", "head_min": 2, "head_max": 40, "flow": "high", "application": "Low-head run-of-river, large rivers"},
    {"type": "Crossflow", "head_min": 2, "head_max": 200, "flow": "low-medium", "application": "Small/micro hydro, simple construction"},
    {"type": "Propeller", "head_min": 2, "head_max": 20, "flow": "high", "application": "Low-head, relatively constant flow"},
]

SCREENING_THRESHOLDS = {
    "small": {"gross_head_m": 5, "catchment_area_km2": 10, "mean_annual_runoff_m3s": 0.1},
    "large": {"gross_head_m": 15, "catchment_area_km2": 100, "mean_annual_runoff_m3s": 5.0},
}


def calculate_net_head(gross_head_m: float, loss_factor: float = 0.92) -> float:
    return gross_head_m * loss_factor


def calculate_power_kw(
    flow_m3s: float,
    net_head_m: float,
    efficiency: float = 0.80,
) -> float:
    power_w = efficiency * WATER_DENSITY * GRAVITY * flow_m3s * net_head_m
    return power_w / 1000.0


def calculate_annual_energy_mwh(
    installed_capacity_kw: float,
    capacity_factor: float,
) -> float:
    return installed_capacity_kw * capacity_factor * 8760 / 1000.0


def calculate_capacity_factor(
    fdc_data: list[dict],
    net_head_m: float,
    design_flow_m3s: float,
    efficiency: float,
    plant_availability: float,
    auxiliary_pct: float,
    transmission_loss_pct: float,
) -> float:
    if not fdc_data:
        return plant_availability * (1 - auxiliary_pct / 100) * (1 - transmission_loss_pct / 100) * 0.5

    installed_kw = calculate_power_kw(design_flow_m3s, net_head_m, efficiency)
    if installed_kw <= 0:
        return 0.0

    weighted_power = 0.0
    sorted_fdc = sorted(fdc_data, key=lambda x: x["exceedance_pct"])

    for i in range(len(sorted_fdc)):
        flow = min(sorted_fdc[i]["flow_p50"], design_flow_m3s)
        power = calculate_power_kw(flow, net_head_m, efficiency)

        if i == 0:
            width = sorted_fdc[i]["exceedance_pct"] / 100.0
        elif i == len(sorted_fdc) - 1:
            width = (100 - sorted_fdc[i - 1]["exceedance_pct"]) / 100.0
        else:
            width = (sorted_fdc[i]["exceedance_pct"] - sorted_fdc[i - 1]["exceedance_pct"]) / 100.0

        weighted_power += power * width

    raw_cf = weighted_power / installed_kw if installed_kw > 0 else 0
    return raw_cf * plant_availability * (1 - auxiliary_pct / 100) * (1 - transmission_loss_pct / 100)


def select_turbine(head_m: float, capacity_class: str) -> dict:
    candidates = []
    for t in TURBINE_MATRIX:
        if t["head_min"] <= head_m <= t["head_max"]:
            candidates.append(t)

    if not candidates:
        if head_m < 2:
            return TURBINE_MATRIX[2]  # Kaplan
        return TURBINE_MATRIX[0]  # Pelton

    if capacity_class in ("micro", "mini"):
        for c in candidates:
            if c["type"] == "Crossflow":
                return c

    return candidates[0]


def get_design_flow(exceedance: str, q_values: dict) -> float:
    mapping = {
        "Q30": lambda: q_values["q40"] * 1.15,
        "Q40": lambda: q_values["q40"],
        "Q50": lambda: q_values["q50"],
        "Q60": lambda: q_values["q50"] * 0.85,
        "Q70": lambda: q_values["q50"] * 0.72,
        "Q80": lambda: q_values["q90"] * 1.3,
    }
    return mapping.get(exceedance, lambda: q_values["q40"])()


def estimate_costs(
    installed_capacity_kw: float,
    capacity_class: str,
    civil_works_override: Optional[float] = None,
    electromechanical_override: Optional[float] = None,
    transmission_km: Optional[float] = None,
    transmission_cost_per_km: float = 25000,
    env_social_pct: float = 5.0,
    engineering_pct: float = 10.0,
    contingency_pct: float = 30.0,
    annual_om_pct: float = 2.5,
) -> dict:
    benchmark = COST_BENCHMARKS.get(capacity_class, COST_BENCHMARKS["small"])
    mid_cost = (benchmark["low"] + benchmark["high"]) / 2
    total_benchmark = installed_capacity_kw * mid_cost

    if civil_works_override is not None:
        civil = civil_works_override
    else:
        civil = total_benchmark * 0.50

    if electromechanical_override is not None:
        em = electromechanical_override
    else:
        em = total_benchmark * 0.35

    transmission = (transmission_km or 0) * transmission_cost_per_km
    direct_costs = civil + em + transmission

    env_social = direct_costs * env_social_pct / 100
    engineering = direct_costs * engineering_pct / 100
    subtotal = direct_costs + env_social + engineering
    contingency = subtotal * contingency_pct / 100
    total_capex = subtotal + contingency

    specific_cost = total_capex / installed_capacity_kw if installed_capacity_kw > 0 else 0
    annual_om = total_capex * annual_om_pct / 100

    return {
        "civil_works_usd": round(civil, 2),
        "electromechanical_usd": round(em, 2),
        "transmission_usd": round(transmission, 2),
        "environmental_social_usd": round(env_social, 2),
        "engineering_dev_usd": round(engineering, 2),
        "contingency_usd": round(contingency, 2),
        "total_capex_usd": round(total_capex, 2),
        "specific_cost_usd_kw": round(specific_cost, 2),
        "annual_om_usd": round(annual_om, 2),
    }


def calculate_lcoe(
    total_capex: float,
    annual_om: float,
    annual_energy_mwh: float,
    discount_rate: float,
    project_life: int,
) -> float:
    if annual_energy_mwh <= 0:
        return 0.0

    r = discount_rate / 100.0
    if r == 0:
        crf = 1 / project_life
    else:
        crf = (r * (1 + r) ** project_life) / ((1 + r) ** project_life - 1)

    annualized_capex = total_capex * crf
    return (annualized_capex + annual_om) / annual_energy_mwh


def calculate_npv(
    total_capex: float,
    annual_revenue: float,
    annual_om: float,
    discount_rate: float,
    project_life: int,
) -> float:
    r = discount_rate / 100.0
    npv = -total_capex
    for year in range(1, project_life + 1):
        net_cash = annual_revenue - annual_om
        npv += net_cash / (1 + r) ** year
    return npv


def calculate_irr(
    total_capex: float,
    annual_revenue: float,
    annual_om: float,
    project_life: int,
) -> Optional[float]:
    net_annual = annual_revenue - annual_om
    if net_annual <= 0:
        return None

    cash_flows = [-total_capex] + [net_annual] * project_life

    low, high = -0.5, 2.0
    for _ in range(200):
        mid = (low + high) / 2
        npv = sum(cf / (1 + mid) ** i for i, cf in enumerate(cash_flows))
        if abs(npv) < 0.01:
            return mid * 100
        if npv > 0:
            low = mid
        else:
            high = mid
    return mid * 100


def calculate_payback(
    total_capex: float,
    annual_revenue: float,
    annual_om: float,
) -> Optional[float]:
    net = annual_revenue - annual_om
    if net <= 0:
        return None
    return total_capex / net


def calculate_dscr(
    annual_revenue: float,
    annual_om: float,
    annual_debt_service: float,
) -> Optional[float]:
    if annual_debt_service <= 0:
        return None
    return (annual_revenue - annual_om) / annual_debt_service


def calculate_annual_debt_service(
    total_capex: float,
    debt_fraction: float,
    debt_rate_pct: float,
    debt_term_years: int,
) -> float:
    principal = total_capex * debt_fraction
    r = debt_rate_pct / 100.0
    if r == 0:
        return principal / debt_term_years
    return principal * (r * (1 + r) ** debt_term_years) / ((1 + r) ** debt_term_years - 1)


def environmental_flows(mean_annual_flow: float, min_pct: float, fair_pct: float, outstanding_pct: float) -> dict:
    return {
        "minimum_m3s": round(mean_annual_flow * min_pct / 100, 4),
        "fair_m3s": round(mean_annual_flow * fair_pct / 100, 4),
        "outstanding_m3s": round(mean_annual_flow * outstanding_pct / 100, 4),
    }


def check_screening(
    gross_head_m: float,
    catchment_area_km2: float,
    mean_annual_runoff_m3s: Optional[float],
    capacity_class: str,
) -> dict:
    threshold_key = "large" if capacity_class in ("medium", "large") else "small"
    thresholds = SCREENING_THRESHOLDS[threshold_key]

    passes = {
        "head": gross_head_m >= thresholds["gross_head_m"],
        "catchment": catchment_area_km2 >= thresholds["catchment_area_km2"],
    }
    if mean_annual_runoff_m3s is not None:
        passes["runoff"] = mean_annual_runoff_m3s >= thresholds["mean_annual_runoff_m3s"]

    return {
        "passes_screening": all(passes.values()),
        "details": passes,
        "thresholds": thresholds,
    }


def determine_recommendation(nse_score: Optional[float], lcoe: float, esia_fatal: bool) -> str:
    if esia_fatal:
        return "DO_NOT_ADVANCE"

    nse_ok = nse_score is None or nse_score >= 0.60

    if nse_ok and lcoe < 150:
        return "ADVANCE"
    elif (nse_score is not None and 0.40 <= nse_score < 0.60) or 150 <= lcoe <= 250:
        return "CONDITIONAL"
    else:
        return "DO_NOT_ADVANCE"


def run_sensitivity(
    base_capex: float,
    base_om: float,
    base_energy_mwh: float,
    base_tariff: float,
    discount_rate: float,
    project_life: int,
    fdc_data: Optional[list] = None,
    net_head_m: float = 0,
    design_flow_m3s: float = 0,
    efficiency: float = 0.80,
    installed_capacity_kw: float = 0,
) -> list[dict]:
    results = []

    def compute(capex, om, energy, tariff, dr):
        revenue = energy * tariff / 1000  # tariff in USD/kWh, energy in MWh
        lcoe = calculate_lcoe(capex, om, energy, dr, project_life)
        npv = calculate_npv(capex, revenue * 1000, om, dr, project_life)
        irr = calculate_irr(capex, revenue * 1000, om, project_life)
        return {"lcoe": round(lcoe, 2), "npv": round(npv, 2), "irr": round(irr or 0, 2)}

    for label, factor in [("P10 (Low Flow)", 0.75), ("P50 (Base)", 1.0), ("P90 (High Flow)", 1.25)]:
        r = compute(base_capex, base_om, base_energy_mwh * factor, base_tariff, discount_rate)
        results.append({"parameter": "Flow Variability", "variation": label, **r})

    for label, factor in [("-25%", 0.75), ("Base", 1.0), ("+25%", 1.25)]:
        r = compute(base_capex * factor, base_om, base_energy_mwh, base_tariff, discount_rate)
        results.append({"parameter": "Capital Cost", "variation": label, **r})

    for label, factor in [("Low Tariff", 0.7), ("Base", 1.0), ("High Tariff", 1.5)]:
        r = compute(base_capex, base_om, base_energy_mwh, base_tariff * factor, discount_rate)
        results.append({"parameter": "Energy Tariff", "variation": label, **r})

    for label, dr in [("6%", 6), ("8%", 8), ("10%", 10), ("12%", 12), ("15%", 15)]:
        r = compute(base_capex, base_om, base_energy_mwh, base_tariff, dr)
        results.append({"parameter": "Discount Rate", "variation": label, **r})

    for label, avail in [("80%", 0.80), ("85%", 0.85), ("90%", 0.90)]:
        adjusted_energy = base_energy_mwh * avail / 0.87
        r = compute(base_capex, base_om, adjusted_energy, base_tariff, discount_rate)
        results.append({"parameter": "Plant Availability", "variation": label, **r})

    return results


def generate_default_fdc(
    mean_annual_flow: float, q10: float, q40: float, q50: float, q90: float
) -> list[dict]:
    exceedances = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]
    known = {10: q10, 40: q40, 50: q50, 90: q90}
    known[5] = q10 * 1.3
    known[100] = q90 * 0.5

    flows = {}
    sorted_known = sorted(known.keys())
    for exc in exceedances:
        if exc in known:
            flows[exc] = known[exc]
        else:
            lower = max([k for k in sorted_known if k <= exc], default=sorted_known[0])
            upper = min([k for k in sorted_known if k >= exc], default=sorted_known[-1])
            if lower == upper:
                flows[exc] = known[lower]
            else:
                t = (exc - lower) / (upper - lower)
                flows[exc] = known[lower] + t * (known[upper] - known[lower])

    result = []
    for exc in exceedances:
        p50 = flows[exc]
        result.append({
            "exceedance_pct": exc,
            "flow_p10": round(p50 * 1.25, 4),
            "flow_p50": round(p50, 4),
            "flow_p90": round(p50 * 0.75, 4),
        })
    return result
