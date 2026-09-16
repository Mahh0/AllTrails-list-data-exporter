# AllTrails-list-data-exporter
## Extraire les données
Le script JS alltrails_favs_extract.js permet d'extraire les randonnées d'une liste de favoris alltrails. Il est à copier dans le navigateur dans F12 > Console, en étant sur une liste (page accessible via partager, copier le lien, pas celle avec la map par défaut)

## Enrichir les données (temps de conduite vers les points de randonnées depuis plusieurs points/villes données)
Le script enrich.py permet d'enrichir le json de base en calculant le temp/la distance depuis plusieurs points données vers le départ des randonnées.
Utilisation : python3 enrich.py liste_extraire_du_js.json fichiers_points.json fichier_sortie.json

Exemple de fichier_points.json : 
[
  { "name": "La Grave",  "lat": 45.0610821, "lng": 6.2061994 },
  { "name": "Vallouise",    "lat": 44.8464181, "lng": 6.4874547 }
]
