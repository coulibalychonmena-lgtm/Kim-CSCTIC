import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ragas_eval  # noqa: E402  (les imports lourds de ragas sont dans main(), pas à l'import)


def row(**overrides):
    base = {"id": "x", "lang": "fr", "category": "salles", "split": "dev", "user_input": "Q", "response": "R", "retrieved_contexts": ["c"],
            "reference": "ref", "expected_behavior": "answer", "validated_by": None}
    base.update(overrides)
    return base


class ToRows(unittest.TestCase):
    def test_trois_jeux(self):
        run = [row(id="a"), row(id="b", retrieved_contexts=[]), row(id="c", error="HTTP 500", response=None), row(id="d", reference=None)]
        answers, grounded, references = ragas_eval.to_rows(run)
        self.assertEqual([r["id"] for r in answers], ["a", "b", "d"])
        self.assertEqual([r["id"] for r in grounded], ["a", "d"])
        self.assertEqual([r["id"] for r in references], ["a"])

    def test_reference_dependante_des_donnees_exige_validation(self):
        pending = row(id="p", expected_behavior="answer_or_unknown")
        validated = row(id="v", expected_behavior="answer_or_unknown", validated_by="Service communication")
        _, _, references = ragas_eval.to_rows([pending, validated])
        self.assertEqual([r["id"] for r in references], ["v"])
        _, _, strict = ragas_eval.to_rows([row(id="a")], require_validated=True)
        self.assertEqual(strict, [])

    def test_seuils(self):
        thresholds = {"faithfulness": {"min": 0.9}, "noise_sensitivity": {"max": 0.2}}
        self.assertEqual(ragas_eval.check_thresholds({"faithfulness": 0.95, "noise_sensitivity": 0.1}, thresholds), [])
        failures = ragas_eval.check_thresholds({"faithfulness": 0.8, "noise_sensitivity": 0.4}, thresholds)
        self.assertEqual(len(failures), 2)
        self.assertEqual(ragas_eval.check_thresholds({"faithfulness": float("nan")}, thresholds), [])

    def test_golden_dataset_coherent(self):
        path = Path(__file__).resolve().parents[1] / "golden_dataset.jsonl"
        records = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
        self.assertEqual(len(records), 90)
        self.assertEqual(len({r["id"] for r in records}), 90)
        holdout = sum(r["split"] == "holdout" for r in records)
        self.assertTrue(15 <= holdout <= 21, holdout)


if __name__ == "__main__":
    unittest.main()
