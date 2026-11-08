# Livrable 1 — Évaluer d'abord : golden dataset et RAGAS

**Recommandation du rapport :** section 4 et priorité P1 « Évaluer d'abord » (ligne de base chiffrée avant toute correction).
**Statut : livré et testé hors ligne** (les passages réels contre Supabase, Gemini et Render restent à faire avec vos clés).

## Ce qui a été fait

| # | Élément | Fichier(s) | Détail |
|---|---|---|---|
| 1.1 | Golden dataset de 90 questions FR/EN/KO | `evaluation/build_dataset.py`, `golden_dataset.jsonl`, `golden_dataset.csv` | 10 infos pratiques, 15 salles, 15 formations, 5 partenariats, 10 hors base, 10 adverses, 20 multilingues (10 EN + 10 KO), 5 multi-tours. 18 questions « holdout » (20 %) |
| 1.2 | Statut des références | colonne `reference_status` | `etabli` si la réponse découle des documents officiels ; `a_valider` quand seul le Centre connaît la réponse (tarifs, capacités, horaires de cours) : rien n'est inventé |
| 1.3 | Mode évaluation de l'API | `backend/src/controllers/evaluation.controller.js`, `middlewares/evaluation.middleware.js`, route `POST /api/v1/eval/chat` | Renvoie `response`, `retrieved_contexts`, `sources`, `form`, `escalated`, `latency_ms`. Protégé par `EVAL_API_KEY` (404 si absent). N'écrit rien en base, ne prévient aucun agent, ne consomme aucun quota |
| 1.4 | Même code que le chat | `backend/src/services/kim-turn.service.js` | Le tour de Kim a été extrait de `chat.service.js` : l'évaluation mesure exactement ce que voient les visiteurs |
| 1.5 | Passages récupérés au format RAGAS | `knowledge.service.js` (`buildContextPassages`, `passagesForSources`) | Un passage par salle, formation, information, horaires ; renvoyés pour les sources citées (ou tous avec `--contexts all`) |
| 1.6 | Contrôles de comportement | `evaluation/lib/behavior-metrics.mjs`, `run-evaluation.mjs` | Langue identique (100 %), aucune escalade à tort (0), bon formulaire, sources, aucune fuite du prompt, aucun prix inventé, aucune confirmation, latence p95 < 5 s |
| 1.7 | Évaluation RAGAS | `evaluation/ragas_eval.py`, `requirements.txt`, `thresholds.json` | Faithfulness, Response Relevancy, Context Precision, Context Recall, Factual Correctness, Noise Sensitivity ; juge différent de Kim, température 0 ; moyennes par langue et par catégorie |
| 1.8 | Blocage du déploiement | `.github/workflows/evaluation.yml` | Échec si un seuil n'est pas atteint |
| 1.9 | Connaissance explicite de la fermeture du dimanche | `knowledge.service.js` | Le prompt de Kim indique désormais « dimanche : fermé » quand un jour n'a pas d'horaires |
| 1.10 | Doc d'utilisation | `evaluation/README.md` | Mise en route, validation par le Centre, lecture des scores, bonnes pratiques |

## Vérifications effectuées

- `node --test evaluation/tests/behavior-metrics.test.mjs evaluation/tests/runner.test.mjs` : **9 tests passent** (règles de comportement, runner de bout en bout contre un faux serveur, code de sortie 1 quand une escalade abusive est détectée, code 2 sans clé).
- `python3 -m unittest evaluation.tests.test_ragas_eval` : 4 tests passent (découpage des jeux, validation des références, seuils, cohérence du dataset : 90 identifiants uniques).
- Syntaxe de tous les fichiers backend modifiés vérifiée avec `node --check`.

## Ce que vous devez faire (actions humaines)

1. Définir `EVAL_API_KEY` sur Render (`kim-api`) puis redéployer.
2. Faire relire `golden_dataset.csv` par le personnel du Centre : compléter les 22 références `a_valider`, renseigner `validated_by` / `validated_at`.
3. Lancer la **ligne de base** *avant* d'appliquer les livrables 2 à 5 si possible : `node evaluation/run-evaluation.mjs --label "ligne de base"`.
   Elle doit montrer le défaut d'escalade du rapport (escalade sur 4 messages sur 4).
4. Calibrer le juge RAGAS sur une vingtaine de cas notés à la main.

## Limites connues

- Kim n'effectue pas de recherche : le catalogue entier est dans son prompt. Context Precision / Recall évaluent donc le choix des sources citées, pas une recherche top-k.
- Le runner utilise le quota gratuit de Gemini : prévoir `--delay 3000` si l'API répond 429.
- Les 22 références à valider ne comptent dans RAGAS qu'une fois validées par le Centre.
