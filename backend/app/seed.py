"""Auto-seed the database with pipeline projects on cold start."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from . import models, calculations

PIPELINE = [
    {"name":"[GEN-001] Bumbuna I Upgrade","country":"Sierra Leone","region":"West Africa","description":"Type: Rehabilitation. 50MW existing dam. Rokel River.",
     "lat":8.5,"lon":-11.8,"catch":100,"type":"run_of_river","cap":"large","gauge":"partial","head":30},
    {"name":"[GEN-002] Bumbuna 2 (Yieben) Hydro","country":"Sierra Leone","region":"West Africa","description":"Type: Dam. 143MW proposed. Seli River tributary.",
     "lat":8.5,"lon":-11.8,"catch":100,"type":"run_of_river","cap":"large","gauge":"partial","head":60},
    {"name":"[GEN-003] Bekongor Dam (120MW Hydro)","country":"Cameroon","region":"Central Africa","description":"Type: Dam. 120MW. Sanaga River basin.",
     "lat":5.9,"lon":10.6,"catch":100,"type":"run_of_river","cap":"large","gauge":"partial","head":80},
    {"name":"[GEN-004] Betmai I (Betmai Hydro)","country":"Sierra Leone","region":"West Africa","description":"Type: Run-of-River. Small hydro.",
     "lat":8.5,"lon":-11.8,"catch":100,"type":"run_of_river","cap":"small","gauge":"partial","head":50},
    {"name":"[GEN-005] Betmai II","country":"Sierra Leone","region":"West Africa","description":"Type: Run-of-River. Small hydro adjacent to Betmai I.",
     "lat":8.5,"lon":-11.8,"catch":80,"type":"run_of_river","cap":"small","gauge":"partial","head":100},
    {"name":"[GEN-009] Tiyapata I HPP","country":"Guinea","region":"West Africa","description":"Type: Run-of-River. Small hydro.",
     "lat":9.5,"lon":-11.5,"catch":50,"type":"run_of_river","cap":"small","gauge":"no","head":40},
    {"name":"[GEN-010] Tiyapata II HPP","country":"Guinea","region":"West Africa","description":"Type: Run-of-River. Small hydro.",
     "lat":9.5,"lon":-11.5,"catch":50,"type":"run_of_river","cap":"small","gauge":"no","head":35},
    {"name":"[GEN-011] Cote d'Ivoire HPP (TBD)","country":"Côte d'Ivoire","region":"West Africa","description":"Type: TBD. Site identification pending.",
     "lat":6.8,"lon":-5.3,"catch":200,"type":"run_of_river","cap":"small","gauge":"no","head":30},
    {"name":"[GEN-013] Luvua Cascade I–III (DRC)","country":"DRC","region":"Central Africa","description":"Type: Run-of-River. 3-site cascade. Katanga province.",
     "lat":-10.5,"lon":27.5,"catch":300,"type":"run_of_river","cap":"medium","gauge":"no","head":60},
    {"name":"[GEN-015] Tana River Cascade","country":"Kenya","region":"East Africa","description":"Type: Run-of-River. Multiple sites on Tana River.",
     "lat":-0.5,"lon":37.5,"catch":500,"type":"run_of_river","cap":"large","gauge":"no","head":40},
    {"name":"[GEN-018] Lake Malawi Damming","country":"Malawi","region":"Southern Africa","description":"Type: Dam. Large-scale Shire River outlet.",
     "lat":-14.3,"lon":35.2,"catch":1000,"type":"large","cap":"large","gauge":"no","head":20},
    {"name":"[GEN-019] Lake Malombe Pumped Storage","country":"Malawi","region":"Southern Africa","description":"Type: Pumped Storage.",
     "lat":-14.7,"lon":35.3,"catch":200,"type":"large","cap":"small","gauge":"no","head":50},
    {"name":"[GEN-020] Zambia Hydro Sites (Multiple)","country":"Zambia","region":"Southern Africa","description":"Type: Multiple sites under assessment.",
     "lat":-15.4,"lon":28.3,"catch":400,"type":"run_of_river","cap":"large","gauge":"no","head":40},
    {"name":"[GEN-021] Mocuba I","country":"Mozambique","region":"Southern Africa","description":"Type: Run-of-River. Licungo River.",
     "lat":-16.8,"lon":36.9,"catch":300,"type":"run_of_river","cap":"small","gauge":"no","head":25},
    {"name":"[GEN-022] Cahora Basa","country":"Mozambique","region":"Southern Africa","description":"Type: Dam. Expansion of existing facility.",
     "lat":-15.6,"lon":32.7,"catch":800,"type":"large","cap":"large","gauge":"no","head":100},
    {"name":"[GEN-023] Pajobi HPP (Uganda)","country":"Uganda","region":"East Africa",
     "description":"Type: Run-of-River. 6-7.5 MW. 110m gross head. Up to 8 m³/s. West Nile / Albertine region.",
     "lat":2.549,"lon":31.0,"catch":150,"type":"run_of_river","cap":"small","gauge":"no","head":110,"penstock":5600,"dist":15},
    {"name":"[GEN-024] Charlotte Falls HPP","country":"Sierra Leone","region":"West Africa",
     "description":"Type: Run-of-River. 2.2 MW. 54.09m head. Francis. Commissioned 2017 (China Aid). Weir silted.",
     "lat":8.425099,"lon":-13.197282,"catch":30,"type":"run_of_river","cap":"small","gauge":"no","head":54.09,"penstock":163},
    {"name":"[GEN-025] Bankasoka HPP","country":"Sierra Leone","region":"West Africa",
     "description":"Type: Run-of-River. 2 MW (4x0.54MW). 9m head. Horizontal Kaplan.",
     "lat":8.756521,"lon":-12.785037,"catch":200,"type":"run_of_river","cap":"small","gauge":"no","head":9,"penstock":35},
    {"name":"[GEN-026] Makali HPP","country":"Sierra Leone","region":"West Africa",
     "description":"Type: Run-of-River. 0.132 MW. 5.6m head. Horizontal Kaplan.",
     "lat":8.637334,"lon":-11.645980,"catch":25,"type":"run_of_river","cap":"micro","gauge":"no","head":5.6,"penstock":50},
]

FULL_PROJECTS = [
    {
        "name":"[GEN-006] Bumbuna VI","country":"Sierra Leone","region":"West Africa",
        "description":"Type: Run-of-River. 30MW on Rokel River. Downstream of Bumbuna I dam. 45m head.",
        "p1":{"latitude":9.07,"longitude":-11.74,"catchment_area_km2":500,"project_type":"run_of_river",
              "capacity_class":"medium","has_gauge_data":"yes","gauge_years":20,"distance_to_load_km":10},
        "p2":{"gross_head_m":45.0,"dem_resolution_m":30,"penstock_length_m":3000,"elevation_mean_m":244},
        "p3":{"lstm_model_approach":"Regional LSTM with local fine-tuning","mean_annual_flow_m3s":60.0,
              "q10_m3s":90.0,"q40_m3s":70.0,"q50_m3s":60.0,"q90_m3s":35.0,"flow_cv":0.45,"ensemble_size":10,"simulation_years":20},
        "p4":{"design_flow_exceedance":"Q40","turbine_efficiency":0.82,"plant_availability":0.87,
              "auxiliary_consumption_pct":3,"transmission_loss_pct":2},
        "p5":{"env_flow_method":"Tennant","env_flow_min_pct":10,"env_flow_fair_pct":30,"env_flow_outstanding_pct":60,
              "protected_area":False,"endangered_species":False,"community_dependency":True,
              "cultural_heritage":False,"water_rights_affected":False,
              "esia_notes":"Downstream of existing Bumbuna I dam. Run-of-river on Rokel River."},
        "p6":{"civil_works_usd":25230000,"electromechanical_usd":12000000,"transmission_km":10,
              "transmission_cost_per_km":580000,"environmental_social_pct":3,"engineering_dev_pct":5,"contingency_pct":10,"annual_om_pct":2.5},
        "p7":{"tariff_usd_kwh":0.10,"discount_rate_pct":10,"project_life_years":30,
              "debt_fraction":0.7,"debt_rate_pct":8,"debt_term_years":15},
    },
    {
        "name":"[GEN-008] Dodo HPP (Goma)","country":"Sierra Leone","region":"West Africa",
        "description":"Type: Run-of-River. 4x1.5MW Francis turbines. 66.4m head. Rehabilitation needed.",
        "p1":{"latitude":8.135484,"longitude":-11.247212,"catchment_area_km2":80,"project_type":"run_of_river",
              "capacity_class":"small","has_gauge_data":"partial","gauge_years":5},
        "p2":{"gross_head_m":66.4,"dem_resolution_m":30,"penstock_length_m":650},
        "p3":{"lstm_model_approach":"Regional LSTM with validation","mean_annual_flow_m3s":3.0,
              "q10_m3s":6.0,"q40_m3s":3.5,"q50_m3s":2.5,"q90_m3s":0.5,"flow_cv":0.8,"ensemble_size":10,"simulation_years":20},
        "p4":{"design_flow_exceedance":"Q30","turbine_efficiency":0.82,"plant_availability":0.85,
              "auxiliary_consumption_pct":3,"transmission_loss_pct":2},
        "p5":{"env_flow_method":"Tennant","env_flow_min_pct":10,"env_flow_fair_pct":30,"env_flow_outstanding_pct":60,
              "protected_area":False,"endangered_species":False,"community_dependency":True,
              "cultural_heritage":False,"water_rights_affected":False,
              "esia_notes":"Existing plant since 1986. Rehabilitation needed. Connected to CLSG line."},
        "p6":{"civil_works_usd":2500000,"electromechanical_usd":4000000,"transmission_km":5,
              "transmission_cost_per_km":25000,"environmental_social_pct":5,"engineering_dev_pct":8,"contingency_pct":15,"annual_om_pct":3.0},
        "p7":{"tariff_usd_kwh":0.12,"discount_rate_pct":10,"project_life_years":25,
              "debt_fraction":0.6,"debt_rate_pct":6,"debt_term_years":12},
    },
    {
        "name":"[GEN-012] Noun River Cascade (I–III)","country":"Cameroon","region":"Central Africa",
        "description":"Type: Run-of-River. 3x20MW cascade on Noun River downstream of Lake Bamendjing.",
        "p1":{"latitude":5.9,"longitude":10.6,"catchment_area_km2":800,"project_type":"run_of_river",
              "capacity_class":"large","has_gauge_data":"partial","gauge_years":10,"distance_to_load_km":30},
        "p2":{"gross_head_m":50.0,"dem_resolution_m":30,"penstock_length_m":1500,"elevation_mean_m":900},
        "p3":{"lstm_model_approach":"Regional LSTM with validation","mean_annual_flow_m3s":42.5,
              "q10_m3s":65.0,"q40_m3s":50.0,"q50_m3s":42.5,"q90_m3s":25.0,"flow_cv":0.4,"ensemble_size":10,"simulation_years":20},
        "p4":{"design_flow_exceedance":"Q40","turbine_efficiency":0.82,"plant_availability":0.87,
              "auxiliary_consumption_pct":3,"transmission_loss_pct":2},
        "p5":{"env_flow_method":"Tennant","env_flow_min_pct":10,"env_flow_fair_pct":30,"env_flow_outstanding_pct":60,
              "protected_area":False,"endangered_species":False,"community_dependency":True,
              "cultural_heritage":False,"water_rights_affected":False,
              "esia_notes":"3x20MW cascade downstream of Lake Bamendjing (1.8B m³ storage). Developer ECI in place."},
        "p6":{"civil_works_usd":67890000,"electromechanical_usd":24000000,"transmission_km":30,
              "transmission_cost_per_km":480000,"environmental_social_pct":3,"engineering_dev_pct":5,"contingency_pct":5,"annual_om_pct":2.5},
        "p7":{"tariff_usd_kwh":0.10,"discount_rate_pct":10,"project_life_years":30,
              "debt_fraction":0.7,"debt_rate_pct":8,"debt_term_years":15},
    },
    {
        "name":"[GEN-014] Nyamindi Cascade (Kenya)","country":"Kenya","region":"East Africa",
        "description":"3 RoR sub-projects on River Nyamindi: Gitie (5MW), Kiamutugu (9.3MW), Mbiri (4.1MW). Total 18.5MW. Full feasibility by EPHL (2017). 36yr gauge data.",
        "p1":{"latitude":-0.55,"longitude":37.36,"catchment_area_km2":199,"project_type":"run_of_river",
              "capacity_class":"medium","has_gauge_data":"yes","gauge_years":36,"distance_to_load_km":18.2},
        "p2":{"gross_head_m":151.0,"dem_resolution_m":30,"penstock_length_m":2864,"elevation_mean_m":1637,
              "mean_slope_pct":15,"stream_length_km":25,"forest_fraction":0.35,"soil_porosity":0.4},
        "p3":{"lstm_model_approach":"Regional LSTM with local fine-tuning","mean_annual_flow_m3s":6.5,
              "q10_m3s":13.24,"q40_m3s":5.64,"q50_m3s":4.67,"q90_m3s":1.95,"flow_cv":0.65,"nse_score":0.75,
              "ensemble_size":10,"simulation_years":36},
        "p4":{"design_flow_exceedance":"Q30","turbine_efficiency":0.85,"plant_availability":0.87,
              "auxiliary_consumption_pct":3,"transmission_loss_pct":2},
        "p5":{"env_flow_method":"Tennant","env_flow_min_pct":10,"env_flow_fair_pct":30,"env_flow_outstanding_pct":60,
              "protected_area":False,"endangered_species":False,"community_dependency":True,
              "cultural_heritage":False,"water_rights_affected":False,
              "esia_notes":"NEMA EIA + IFC PS1-PS8. Burial grounds avoided in design. RAP developed. ESMP complete."},
        "p6":{"civil_works_usd":10000000,"electromechanical_usd":6000000,"transmission_km":18.2,
              "transmission_cost_per_km":55000,"environmental_social_pct":5,"engineering_dev_pct":8,"contingency_pct":15,"annual_om_pct":2.0},
        "p7":{"tariff_usd_kwh":0.09,"discount_rate_pct":10,"project_life_years":30,
              "debt_fraction":0.7,"debt_rate_pct":7,"debt_term_years":14},
    },
]


async def seed_if_empty(db: AsyncSession):
    count = await db.scalar(select(func.count()).select_from(models.Project))
    if count and count > 0:
        return

    for proj in PIPELINE:
        p = models.Project(name=proj["name"], country=proj["country"], region=proj["region"], description=proj["description"])
        p.latitude = proj["lat"]
        p.longitude = proj["lon"]
        p.catchment_area_km2 = proj["catch"]
        p.project_type = proj["type"]
        p.capacity_class = proj["cap"]
        p.has_gauge_data = proj["gauge"]
        p.gross_head_m = proj["head"]
        p.dem_resolution_m = 30
        p.net_head_m = proj["head"] * 0.92
        p.penstock_length_m = proj.get("penstock")
        p.distance_to_load_km = proj.get("dist")
        p.current_phase = 3
        p.feasibility_status = "in_progress"
        p.financial_model_status = "not_started"
        p.epc_status = "not_secured"
        p.equity_status = "not_started"
        p.debt_status = "not_started"
        p.timeline_status = "on_time"
        db.add(p)

    for fp in FULL_PROJECTS:
        p = models.Project(name=fp["name"], country=fp["country"], region=fp["region"], description=fp["description"])

        for k, v in fp["p1"].items():
            setattr(p, k, v)

        for k, v in fp["p2"].items():
            setattr(p, k, v)
        p.net_head_m = fp["p2"]["gross_head_m"] * 0.92

        for k, v in fp["p3"].items():
            setattr(p, k, v)

        fdc = calculations.generate_default_fdc(
            fp["p3"]["mean_annual_flow_m3s"], fp["p3"]["q10_m3s"],
            fp["p3"]["q40_m3s"], fp["p3"]["q50_m3s"], fp["p3"]["q90_m3s"]
        )
        p.fdc_data = fdc

        p4 = fp["p4"]
        q_key = p4["design_flow_exceedance"].replace("Q", "q") + "_m3s"
        p.design_flow_m3s = fp["p3"].get(q_key, fp["p3"]["q40_m3s"])
        p.design_flow_exceedance = p4["design_flow_exceedance"]
        p.turbine_efficiency = p4["turbine_efficiency"]
        p.plant_availability = p4["plant_availability"]
        p.auxiliary_consumption_pct = p4["auxiliary_consumption_pct"]
        p.transmission_loss_pct = p4["transmission_loss_pct"]

        cap = calculations.calculate_power_kw(p.design_flow_m3s, p.net_head_m, p4["turbine_efficiency"])
        p.installed_capacity_kw = cap
        p.turbine_type = calculations.select_turbine(p.gross_head_m, p.capacity_class or "small")["type"]
        cf = calculations.calculate_capacity_factor(
            fdc, p.net_head_m, p.design_flow_m3s, p4["turbine_efficiency"],
            p4["plant_availability"], p4["auxiliary_consumption_pct"], p4["transmission_loss_pct"])
        p.capacity_factor = round(cf, 4)
        energy = calculations.calculate_annual_energy_mwh(cap, cf)
        p.annual_energy_mwh = round(energy, 2)

        p5 = fp["p5"]
        for k, v in p5.items():
            setattr(p, k, v)
        maf = fp["p3"]["mean_annual_flow_m3s"]
        eflows = calculations.environmental_flows(maf, p5["env_flow_min_pct"], p5["env_flow_fair_pct"], p5["env_flow_outstanding_pct"])
        p.env_flow_min_m3s = eflows["minimum_m3s"]
        p.env_flow_fair_m3s = eflows["fair_m3s"]
        p.env_flow_outstanding_m3s = eflows["outstanding_m3s"]

        p6 = fp["p6"]
        costs = calculations.estimate_costs(cap, p.capacity_class or "small",
            p6.get("civil_works_usd"), p6.get("electromechanical_usd"),
            p6.get("transmission_km"), p6.get("transmission_cost_per_km"),
            p6.get("environmental_social_pct", 5), p6.get("engineering_dev_pct", 10),
            p6.get("contingency_pct", 30), p6.get("annual_om_pct", 2.5))
        for k, v in costs.items():
            setattr(p, k, v)
        p.annual_om_pct = p6.get("annual_om_pct", 2.5)

        p7 = fp["p7"]
        p.tariff_usd_kwh = p7["tariff_usd_kwh"]
        p.discount_rate_pct = p7["discount_rate_pct"]
        p.project_life_years = p7["project_life_years"]
        p.debt_fraction = p7.get("debt_fraction")
        p.debt_rate_pct = p7.get("debt_rate_pct")
        p.debt_term_years = p7.get("debt_term_years")

        capex = p.total_capex_usd or 0
        om = p.annual_om_usd or 0
        revenue = energy * p7["tariff_usd_kwh"] * 1000
        p.lcoe_usd_mwh = round(calculations.calculate_lcoe(capex, om, energy, p7["discount_rate_pct"], p7["project_life_years"]), 2)
        p.npv_usd = round(calculations.calculate_npv(capex, revenue, om, p7["discount_rate_pct"], p7["project_life_years"]), 2)
        irr = calculations.calculate_irr(capex, revenue, om, p7["project_life_years"])
        p.irr_pct = round(irr, 2) if irr else None
        payback = calculations.calculate_payback(capex, revenue, om)
        p.payback_years = round(payback, 2) if payback else None

        if p7.get("debt_fraction") and p7.get("debt_rate_pct") and p7.get("debt_term_years"):
            ds = calculations.calculate_annual_debt_service(capex, p7["debt_fraction"], p7["debt_rate_pct"], p7["debt_term_years"])
            dscr = calculations.calculate_dscr(revenue, om, ds)
            p.dscr = round(dscr, 2) if dscr else None

        esia_fatal = any([p.protected_area, p.endangered_species, p.cultural_heritage, p.water_rights_affected])
        p.recommendation = calculations.determine_recommendation(p.nse_score, p.lcoe_usd_mwh, esia_fatal)
        p.sensitivity_results = calculations.run_sensitivity(capex, om, energy, p7["tariff_usd_kwh"], p7["discount_rate_pct"], p7["project_life_years"])
        p.status = "completed"
        p.current_phase = 7
        p.feasibility_status = "completed"
        p.financial_model_status = "completed"
        p.epc_status = "tendering"
        p.equity_status = "fundraising"
        p.debt_status = "not_started"
        p.timeline_status = "on_time"

        db.add(p)

    await db.commit()
