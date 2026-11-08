#!/usr/bin/env python3
"""Évaluation RAGAS des réponses de Kim (rapport de recommandations, section 4.2).

Entrée  : un fichier evaluation/results/run-*.jsonl produit par run-evaluation.mjs.
Sorties : <run>.ragas.csv (scores par question), <run>.ragas.md (moyennes par métrique, catégorie, langue)
          et un code de sortie 1 si un seuil de thresholds.json n'est pas atteint (intégration continue).

Installation : pip install -r evaluation/requirements.txt    (ragas >= 0.2 ; vérifier les noms de classes selon la version)
Juge         : un modèle DIFFÉRENT de celui de Kim (Gemini Flash), température 0 : variable JUDGE_MODEL (défaut gemini-2.5-pro).
               Clé : GOOGLE_API_KEY. Calibrer le juge sur ~20 cas notés à la main avant de se fier aux scores (README).

Particularité de Kim : tout le catalogue est injecté dans son prompt (pas de recherche vectorielle). Les « passages récupérés »
sont donc ceux des sources que Kim a CITÉES. Context Precision / Context Recall mesurent alors le choix des sources ;
ils deviendront significatifs si une vraie recherche (top-k) est ajoutée plus tard.
"""
import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAGAS_COLUMNS = ["user_input", "retrieved_contexts", "response", "reference"]


def load_run(path):
    return [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]


def to_rows(run, require_validated=False):
    """Découpe un passage d'évaluation en trois jeux selon ce que chaque métrique exige.

    - answer_rows  : toutes les réponses obtenues (Response Relevancy : question + réponse + passages) ;
    - grounded_rows: réponses qui citent au moins un passage (Faithfulness) ;
    - reference_rows: + une référence écrite par le Centre (Context Precision/Recall, Factual Correctness, Noise Sensitivity).
    """
    usable = [row for row in run if not row.get("error") and row.get("response")]
    answer_rows = [row for row in usable]
    grounded_rows = [row for row in usable if row.get("retrieved_contexts")]
    reference_rows = []
    for row in grounded_rows:
        if not row.get("reference"):
            continue
        if require_validated and not row.get("validated_by"):
            continue
        # « answer_or_unknown » : la référence dépend des données saisies, elle n'est exploitable qu'une fois validée.
        if row.get("expected_behavior") == "answer_or_unknown" and not row.get("validated_by"):
            continue
        reference_rows.append(row)
    return answer_rows, grounded_rows, reference_rows


def ragas_samples(rows):
    return [{"user_input": r["user_input"], "retrieved_contexts": r["retrieved_contexts"], "response": r["response"], "reference": r.get("reference") or ""} for r in rows]


def check_thresholds(means, thresholds):
    """Compare les moyennes aux seuils ; renvoie la liste des échecs (vide = tout est bon)."""
    failures = []
    for metric, rule in thresholds.items():
        value = means.get(metric)
        if value is None or value != value:  # None ou NaN : non mesuré
            continue
        if "min" in rule and value < rule["min"]:
            failures.append(f"{metric} : {value:.2f} < {rule['min']:.2f}")
        if "max" in rule and value > rule["max"]:
            failures.append(f"{metric} : {value:.2f} > {rule['max']:.2f}")
    return failures


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("run", help="fichier run-*.jsonl")
    parser.add_argument("--require-validated", action="store_true", help="ne garder que les références validées par le Centre")
    parser.add_argument("--judge-model", default=None)
    parser.add_argument("--embedding-model", default="models/gemini-embedding-001")
    args = parser.parse_args()

    run = load_run(args.run)
    answer_rows, grounded_rows, reference_rows = to_rows(run, args.require_validated)
    print(f"{len(answer_rows)} réponses, {len(grounded_rows)} avec passages cités, {len(reference_rows)} avec référence exploitable.")
    if not reference_rows:
        print("⚠ Aucune référence validée par le Centre : Factual Correctness, Context Precision/Recall et Noise Sensitivity sont ignorés.")

    import os
    import pandas as pd
    from ragas import EvaluationDataset, evaluate
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from ragas.llms import LangchainLLMWrapper
    from ragas.metrics import (FactualCorrectness, Faithfulness, LLMContextPrecisionWithReference, LLMContextRecall,
                               NoiseSensitivity, ResponseRelevancy)
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

    judge_name = args.judge_model or os.environ.get("JUDGE_MODEL", "gemini-2.5-pro")
    judge = LangchainLLMWrapper(ChatGoogleGenerativeAI(model=judge_name, temperature=0))
    embeddings = LangchainEmbeddingsWrapper(GoogleGenerativeAIEmbeddings(model=args.embedding_model))
    print(f"Juge : {judge_name} (température 0)")

    scores = {}  # id -> {métrique: valeur}

    def run_metrics(rows, metrics):
        if not rows:
            return
        result = evaluate(dataset=EvaluationDataset.from_list(ragas_samples(rows)), metrics=metrics, llm=judge, embeddings=embeddings)
        frame = result.to_pandas()
        for row, (_, scored) in zip(rows, frame.iterrows()):
            for column in frame.columns:
                if column not in RAGAS_COLUMNS and column not in ("retrieved_contexts", "reference_contexts", "user_input", "response", "reference"):
                    scores.setdefault(row["id"], {})[column] = scored[column]

    run_metrics(answer_rows, [ResponseRelevancy()])
    run_metrics(grounded_rows, [Faithfulness()])
    run_metrics(reference_rows, [LLMContextPrecisionWithReference(), LLMContextRecall(), FactualCorrectness(), NoiseSensitivity()])

    # Noms de colonnes produits par RAGAS -> noms des seuils.
    aliases = {"answer_relevancy": "response_relevancy", "response_relevancy": "response_relevancy", "faithfulness": "faithfulness",
               "llm_context_precision_with_reference": "context_precision", "context_precision": "context_precision",
               "context_recall": "context_recall", "factual_correctness(mode=f1)": "factual_correctness", "factual_correctness": "factual_correctness",
               "noise_sensitivity(mode=relevant)": "noise_sensitivity", "noise_sensitivity": "noise_sensitivity"}
    by_id = {row["id"]: row for row in run}
    records = []
    for identifier, metrics in scores.items():
        record = {"id": identifier, "lang": by_id[identifier]["lang"], "category": by_id[identifier]["category"], "split": by_id[identifier]["split"]}
        for column, value in metrics.items():
            record[aliases.get(column, column)] = value
        records.append(record)
    frame = pd.DataFrame(records)
    metric_columns = [column for column in frame.columns if column not in ("id", "lang", "category", "split")]
    out_base = Path(args.run).with_suffix("")
    frame.to_csv(f"{out_base}.ragas.csv", index=False)

    means = {column: float(frame[column].mean()) for column in metric_columns}
    thresholds = json.loads((HERE / "thresholds.json").read_text(encoding="utf-8"))["ragas"]
    failures = check_thresholds(means, thresholds)

    def table(group):
        grouped = frame.groupby(group)[metric_columns].mean().round(2)
        return grouped.to_markdown() if hasattr(grouped, "to_markdown") else grouped.to_string()

    report = ["# Scores RAGAS", "", f"Juge : {judge_name}. Réponses notées : {len(answer_rows)} (références exploitables : {len(reference_rows)}).", "",
              "## Moyennes", "", "| Métrique | Moyenne | Seuil |", "|---|---|---|"]
    for column in metric_columns:
        rule = thresholds.get(column, {})
        seuil = f"≥ {rule['min']}" if "min" in rule else (f"≤ {rule['max']}" if "max" in rule else "—")
        report.append(f"| {column} | {means[column]:.2f} | {seuil} |")
    report += ["", "## Par langue", "", table("lang"), "", "## Par catégorie", "", table("category"), ""]
    report.append("## Seuils non atteints\n\n" + "\n".join(f"- {failure}" for failure in failures) if failures else "## Tous les seuils RAGAS sont atteints")
    Path(f"{out_base}.ragas.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
