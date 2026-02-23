import requests
import json
import time

BASE_URL = "https://hubeau.eaufrance.fr/api/v2/hydrometrie"
DEPARTAMENTOS = ["64", "65"]  # Pyrénées-Atlantiques y Hautes-Pyrénées
SIZE = 5000
OUTPUT_FILE = "../data/estaciones_pirineos_actuales.geojson"

stations = []

for dept in DEPARTAMENTOS:
    stations_url = f"{BASE_URL}/referentiel/stations"
    params = {"code_departement_station": dept, "size": SIZE, "format": "json"}
    resp = requests.get(stations_url, params=params)
    data = resp.json()
    stations.extend(data.get("data", []))

features = []

for station in stations:
    code_station = station["code_station"]
    lat = station.get("latitude_station")
    lon = station.get("longitude_station")
    if not lat or not lon:
        continue

    obs_url = f"{BASE_URL}/observations_tr"
    obs_params = {"code_entite": code_station, "size": 2, "format": "json"}
    obs_resp = requests.get(obs_url, params=obs_params)
    obs_data = obs_resp.json().get("data", [])

    nivel = None
    caudal = None
    fecha = None

    for obs in obs_data:
        if obs["grandeur_hydro"] == "H":
            nivel = obs["resultat_obs"]
            fecha = obs["date_obs"]
        if obs["grandeur_hydro"] == "Q":
            caudal = obs["resultat_obs"]
            fecha = obs["date_obs"]

    feature = {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": {
            "code_station": code_station,
            "nombre": station.get("libelle_station"),
            "rio": station.get("libelle_cours_eau"),
            "nivel_m": nivel,
            "caudal_m3s": caudal,
            "fecha_obs": fecha
        }
    }

    features.append(feature)
    time.sleep(0.1)

geojson = {"type": "FeatureCollection", "features": features}

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)

print(f"GeoJSON generado: {OUTPUT_FILE}")