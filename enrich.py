#!/usr/bin/env python3
"""
Ajoute à chaque randonnée d'un JSON la distance et la durée en voiture
depuis un ou plusieurs points de départ, via OSRM (gratuit, sans clé).

Usage:
    python enrich_driving.py trails.json points.json enriched.json
"""

import json
import sys
import time
import urllib.parse
import urllib.request

OSRM_BASE = "http://router.project-osrm.org/route/v1/driving"


def osrm_route(origin_lat, origin_lng, dest_lat, dest_lng):
    """Retourne (distance_km, durée_min) ou None en cas d'échec."""
    coords = f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
    url = f"{OSRM_BASE}/{coords}?overview=false"
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data.get("code") != "Ok" or not data.get("routes"):
            return None
        route = data["routes"][0]
        return round(route["distance"] / 1000, 1), round(route["duration"] / 60)
    except Exception as e:
        print(f"    ⚠️  OSRM erreur : {e}")
        return None


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)

    trails_file, points_file, out_file = sys.argv[1], sys.argv[2], sys.argv[3]

    with open(trails_file, encoding="utf-8") as f:
        trails = json.load(f)
    with open(points_file, encoding="utf-8") as f:
        origins = json.load(f)

    total = len(trails) * len(origins)
    done = 0
    print(f"🚗 {len(trails)} randonnées × {len(origins)} points = {total} calculs\n")

    for trail in trails:
        dest = trail.get("startCoords")
        if not dest:
            trail["driving"] = {o["name"]: None for o in origins}
            print(f"⏭️  {trail['name']} — pas de coordonnées de départ")
            continue

        print(f"📍 {trail['name']}")
        trail["driving"] = {}
        for origin in origins:
            done += 1
            result = osrm_route(
                origin["lat"], origin["lng"],
                dest["lat"],    dest["lng"],
            )
            if result:
                km, min_ = result
                trail["driving"][origin["name"]] = {
                    "distance_km": km,
                    "duration_min": min_,
                }
                h, m = divmod(min_, 60)
                dur = f"{h}h{m:02d}" if h else f"{m} min"
                print(f"    [{done}/{total}] {origin['name']} → {km} km · {dur}")
            else:
                trail["driving"][origin["name"]] = None
                print(f"    [{done}/{total}] {origin['name']} → échec")
            time.sleep(0.2)  # respect du fair-use

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(trails, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Écrit dans {out_file}")


if __name__ == "__main__":
    main()
