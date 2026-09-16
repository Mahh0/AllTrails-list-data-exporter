(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clean = s => (s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

  if (!document.querySelector('li[data-rbd-draggable-id]')) {
    console.error("❌ Aucune randonnée trouvée. Ouvre d'abord la page de la liste AllTrails.");
    return;
  }

  // ============ ÉTAPE 1 : liste des randos sur la page ============
  const items = document.querySelectorAll("li[data-rbd-draggable-id]");
  const trails = [];

  items.forEach(item => {
    const id       = item.getAttribute("data-rbd-draggable-id");
    const titleEl  = item.querySelector('[data-testid$="_Title"]');
    const ratingEl = item.querySelector('[data-testid$="_Rating"]');
    const reviewEl = item.querySelector('[data-testid$="_ReviewCount"]');
    const diffEl   = item.querySelector('[data-testid$="_Difficulty"]');
    const statsEl  = item.querySelector('[data-testid$="_Stats"]');
    const linkEl   = item.querySelector('a[href*="/randonnee/"]');
    if (!titleEl || !linkEl) return;

    trails.push({
      id,
      name: clean(titleEl.textContent),
      url: new URL(linkEl.getAttribute("href"), location.origin).href,
      rating: ratingEl ? clean(ratingEl.textContent).replace(",", ".") : null,
      reviewsCount: reviewEl
        ? clean(reviewEl.textContent).replace(/[()·]/g, "").trim()
        : null,
      difficulty: diffEl ? clean(diffEl.textContent) : null,
      distance: statsEl ? clean(statsEl.textContent).replace(/^Distance\s*:\s*/i, "") : null,
      elevationGain: null,
      startCoords: null,
    });
  });

  console.log(`📋 ${trails.length} randonnées trouvées.`);

  // ============ ÉTAPE 2 : page de chaque rando ============
  for (let i = 0; i < trails.length; i++) {
    const t = trails[i];
    try {
      const res = await fetch(t.url, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      // --- Dénivelé positif via "Statistiques de l'itinéraire" ---
      const statsRegion =
        doc.querySelector('[role="region"][aria-label*="Statistiques"]') ||
        doc.querySelector('[aria-label*="Statistiques"]');

      if (statsRegion) {
        statsRegion.querySelectorAll('[class*="statLabel"]').forEach(labelEl => {
          const label = clean(labelEl.textContent);
          const parent = labelEl.parentElement;
          const value = clean(parent?.querySelector('[class*="statValue"]')?.textContent);
          if (!label || !value) return;
          if (/^distance$/i.test(label))              t.distance      = value;
          if (/d[ée]nivel[ée]\s*positif/i.test(label)) t.elevationGain = value;
        });
      }

      // --- Coordonnées de départ via JSON-LD (geo.latitude / geo.longitude) ---
      for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const j = JSON.parse(script.textContent);
          const geo = j.geo || j.location?.geo;
          if (geo?.latitude && geo?.longitude) {
            t.startCoords = {
              lat: parseFloat(geo.latitude),
              lng: parseFloat(geo.longitude),
            };
            break;
          }
        } catch (_) { /* JSON-LD invalide, on ignore */ }
      }

      // --- Fallback : lien Google Maps "Obtenir les directions" ---
      if (!t.startCoords) {
        const dirLink = doc.querySelector('a[href*="google.com/maps/dir"]');
        const m = dirLink?.getAttribute("href")?.match(/\/([-\d.]+),([-\d.]+)/);
        if (m) t.startCoords = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
      }
    } catch (e) {
      console.warn(`⚠️ Erreur sur "${t.name}" :`, e.message);
    }

    console.log(
      `[${i + 1}/${trails.length}] ${t.name} → ` +
      `D+=${t.elevationGain || "?"} | ` +
      `départ=${t.startCoords ? `${t.startCoords.lat},${t.startCoords.lng}` : "?"}`
    );
    await sleep(400);
  }

  // ============ ÉTAPE 3 : export JSON ============
  const json = JSON.stringify(trails, null, 2);
  console.log("✅ JSON final :", trails);

  try {
    await navigator.clipboard.writeText(json);
    console.log("📋 JSON copié dans le presse-papier.");
  } catch (_) {}

  const blob = new Blob([json], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ecrins-trails.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  console.log("💾 Fichier ecrins-trails.json téléchargé.");
  return trails;
})();