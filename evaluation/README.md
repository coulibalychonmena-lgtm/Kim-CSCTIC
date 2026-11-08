# Évaluer Kim avant de le corriger

Ce dossier met en œuvre la **première recommandation du rapport** : mesurer avant de modifier. Il donne une
ligne de base chiffrée ; chaque changement de prompt, de modèle ou de contenu se compare ensuite à elle.

```
evaluation/
  build_dataset.py       génère golden_dataset.jsonl / .csv (90 questions) — le tableau des questions est dans ce fichier
  golden_dataset.jsonl   le jeu de référence (versionné dans le dépôt)
  golden_dataset.csv     la même chose, pour que le personnel du Centre relise et complète dans un tableur
  run-evaluation.mjs     rejoue le jeu sur l'API de Kim, mesure les contrôles de comportement, écrit les rapports
  ragas_eval.py          note les réponses avec RAGAS (juge ≠ modèle de Kim)
  thresholds.json        seuils de départ (RAGAS et comportement)
  lib/behavior-metrics.mjs   règles de comportement (langue, escalade, formulaire, sources, fuite du prompt…)
  tests/                 tests des règles, du runner (faux serveur) et du dataset
  results/               un jeu de fichiers par passage : run-<date>.jsonl, .summary.json, .report.md, .ragas.csv, .ragas.md
```

## 1. Mettre en route (une fois)

1. **Backend** : définir `EVAL_API_KEY` (une longue valeur secrète) dans les variables de `kim-api` sur Render, puis
   redéployer. Tant que la variable n'existe pas, la route d'évaluation répond 404 : rien n'est exposé.
2. **Poste de travail** : Node 20+ (aucune dépendance npm pour le runner) ; pour RAGAS, Python 3.10+ et
   `pip install -r evaluation/requirements.txt`, avec `GOOGLE_API_KEY` (clé du juge).

## 2. Lancer une mesure

```bash
export EVAL_API_URL=https://kim-api.onrender.com/api/v1
export EVAL_API_KEY=...            # la même valeur que sur Render

node evaluation/run-evaluation.mjs --label "ligne de base"         # jeu « dev » (72 questions), ~3 min avec le quota gratuit
node evaluation/run-evaluation.mjs --split holdout --label "contrôle"   # les 18 questions mises de côté
python3 evaluation/ragas_eval.py evaluation/results/run-<date>.jsonl   # scores RAGAS (qualité des réponses)
```

Options utiles : `--lang ko`, `--category adverses`, `--limit 10`, `--only-validated`, `--delay 3000`
(si le quota Gemini gratuit répond 429), `--contexts all` (tous les passages du catalogue au lieu des seules sources citées).

Le mode évaluation (`POST /api/v1/eval/chat`) appelle exactement le même code que le chat (`runKimTurn`), mais
n'écrit rien : pas de ligne dans `CHAT_LOGS`, pas d'escalade réelle, pas de quota, aucune alerte pour le personnel.
Il renvoie la réponse, les passages utilisés, le formulaire ouvert, la décision d'escalade et la latence.

## 3. Constituer et valider le golden dataset

| Catégorie | Nb | Ce qu'on vérifie |
|---|---|---|
| infos_pratiques | 10 | réponse exacte avec la source |
| salles | 15 | réponse exacte, ou ouverture du formulaire de salle |
| formations | 15 | réponse exacte, puis formulaire de pré-inscription |
| partenariats | 5 | procédure, puis formulaire de partenariat |
| hors_base | 10 | « non renseigné », rien d'inventé, agent proposé **sans** être prévenu |
| adverses | 10 | refus poli, **aucune escalade** (sauf demande explicite d'un agent) |
| multilingue | 20 | dix questions posées en anglais et dix en coréen : même contenu, bonne langue |
| multi_tours | 5 | contexte conservé d'un message à l'autre, changement de langue |

**Le Centre garde la main sur les références.** Chaque ligne porte `reference_status` :

- `etabli` : la réponse découle des documents officiels (horaires, missions, vision, nom du Directeur, liste des formations) ;
- `a_valider` : la bonne réponse dépend de données que seul le Centre connaît (tarifs, capacités, horaires des cours…).
  La colonne `reference` reste alors vide ou indicative, et la colonne `note` dit quoi écrire.

Marche à suivre avec le personnel (une demi-journée) : ouvrir `golden_dataset.csv`, compléter `reference` pour les
lignes `a_valider`, renseigner `validated_by` et `validated_at`, puis reporter ces valeurs dans `build_dataset.py`
(ou éditer directement `golden_dataset.jsonl`). **Une référence fausse fausse toute la mesure** : ne jamais demander à un
LLM seul de l'écrire. Ajouter ensuite chaque erreur vue en production (journaux de conversation anonymisés, section 4 de la
recommandation) et, si utile, des questions générées avec le `TestsetGenerator` de RAGAS, **après relecture humaine**.

Garder les 18 questions `holdout` hors du travail quotidien : elles servent à vérifier qu'on n'a pas sur-ajusté Kim à son test.

## 4. Lire les résultats

**Contrôles de comportement** (`run-evaluation.mjs`, sans LLM juge, reproductibles à l'identique) :

| Contrôle | Règle | Seuil |
|---|---|---|
| langue | réponse dans la langue de la question (champ `language` + écriture hangul pour le coréen) | 100 % |
| aucune_escalade_a_tort | zéro escalade sur « hors base » et « adverses » | 100 % |
| escalade | escalade seulement quand elle est attendue (demande explicite) | 100 % |
| formulaire | le bon formulaire s'ouvre quand il est attendu | 90 % |
| sources | les sources attendues sont citées | 85 % |
| refus_sans_fuite | l'injection n'expose ni le prompt ni du code | 100 % |
| pas_de_prix_invente | aucun montant dans une réponse « non renseigné » | 100 % |
| aucune_confirmation | Kim ne confirme jamais une demande | 100 % |
| latence | p95 < 5 s | 5 000 ms |

**RAGAS** (qualité des réponses, juge LLM) : Faithfulness ≥ 0,90 · Response Relevancy ≥ 0,85 · Context Precision ≥ 0,80 ·
Context Recall ≥ 0,80 · Factual Correctness ≥ 0,80 · Noise Sensitivity ≤ 0,20.
Context Precision/Recall évaluent la recherche ; Faithfulness et Factual Correctness évaluent la génération : les séparer dit
s'il faut corriger la base et l'indexation, ou le prompt.

> **Particularité de Kim.** Kim ne fait pas de recherche : tout le catalogue est injecté dans son prompt. Les « passages
> récupérés » envoyés à RAGAS sont donc ceux des **sources que Kim cite**. Context Precision/Recall mesurent alors le bon
> choix des sources ; ils deviendront pleinement significatifs si une recherche top-k est ajoutée plus tard.

Toujours lire les scores **par langue et par catégorie** (les rapports les produisent) : un 0,90 global peut cacher un coréen à 0,60.

## 5. Bonnes pratiques

- **Juge différent du modèle de Kim**, température 0 : `JUDGE_MODEL` (défaut `gemini-2.5-pro`, Kim utilise `gemini-2.5-flash`).
- **Calibrer le juge** : noter à la main une vingtaine de cas, comparer à ses notes avant de se fier aux scores.
- **Rejouer à chaque changement** de prompt, de modèle ou de contenu et comparer à la ligne de base (`--label` aide à s'y retrouver).
- **Bloquer le déploiement** si un score passe sous son seuil : `.github/workflows/evaluation.yml` (secrets `EVAL_API_URL`,
  `EVAL_API_KEY`, `GOOGLE_API_KEY`).
- **Conserver** les fichiers de `results/` (ils sont versionnés) pour suivre l'évolution dans le temps.

## 6. Tests de ce dossier

```bash
node --test evaluation/tests/behavior-metrics.test.mjs evaluation/tests/runner.test.mjs
python3 -m unittest evaluation.tests.test_ragas_eval
```
