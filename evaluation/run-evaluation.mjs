#!/usr/bin/env node
// Rejoue le golden dataset sur l'API de Kim (mode évaluation) et mesure les contrôles de comportement.
//
//   EVAL_API_URL=https://kim-api.onrender.com/api/v1 EVAL_API_KEY=... node evaluation/run-evaluation.mjs [options]
//
// Options : --split dev|holdout|all (défaut dev)   --lang fr|en|ko   --category <nom>   --limit <n>
//           --only-validated   --delay <ms> (défaut 1500, quota Gemini gratuit)   --contexts cited|all   --label <texte>
// Sorties : evaluation/results/run-<date>.jsonl (une ligne par question : réponse + passages, pour RAGAS)
//           evaluation/results/run-<date>.summary.json et .report.md (taux par contrôle, catégorie, langue ; latence p95)
// Code de sortie 1 si un seuil de comportement n'est pas atteint (voir thresholds.json) : utilisable en intégration continue.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateBehavior, summarize } from './lib/behavior-metrics.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).flatMap((argument, position, all) => (argument.startsWith('--')
  ? [[argument.slice(2), all[position + 1] && !all[position + 1].startsWith('--') ? all[position + 1] : true]] : [])));

const apiUrl = (process.env.EVAL_API_URL || args.url || '').replace(/\/+$/, '');
const apiKey = process.env.EVAL_API_KEY || args.key || '';
if (!apiUrl || !apiKey) {
  console.error('EVAL_API_URL (adresse de l\'API, avec /api/v1) et EVAL_API_KEY (identique à EVAL_API_KEY de kim-api) sont obligatoires.');
  process.exit(2);
}
const delayMilliseconds = Number(args.delay ?? 1500);
const contextsMode = args.contexts === 'all' ? 'all' : 'cited';
const split = args.split || 'dev';

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function askKim(message, language, history) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    let httpResponse;
    try {
      httpResponse = await fetch(`${apiUrl}/eval/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-eval-key': apiKey },
        body: JSON.stringify({ message, language, history, contexts_mode: contextsMode }),
      });
    } catch (error) {
      if (attempt === 4) throw error;
      await sleep(2000 * attempt);
      continue;
    }
    if (httpResponse.ok) return httpResponse.json();
    if ([429, 500, 502, 503, 504].includes(httpResponse.status) && attempt < 4) { await sleep(4000 * attempt); continue; }
    throw new Error(`HTTP ${httpResponse.status} : ${(await httpResponse.text()).slice(0, 200)}`);
  }
  throw new Error('Échec après plusieurs tentatives.');
}

const records = (await readFile(path.join(here, 'golden_dataset.jsonl'), 'utf8')).split('\n').filter(Boolean).map((line) => JSON.parse(line))
  .filter((record) => split === 'all' || record.split === split)
  .filter((record) => !args.lang || record.lang === args.lang)
  .filter((record) => !args.category || record.category === args.category)
  .filter((record) => !args['only-validated'] || record.validated_by)
  .slice(0, args.limit ? Number(args.limit) : undefined);

if (!records.length) { console.error('Aucune question ne correspond aux filtres.'); process.exit(2); }
console.log(`${records.length} question(s) — jeu « ${split} » — ${apiUrl}`);

const evaluations = [];
for (const [position, record] of records.entries()) {
  const history = [];
  let result;
  let totalLatency = 0;
  try {
    for (const turn of record.turns) {
      result = await askKim(turn, record.lang, history);
      totalLatency += result.latency_ms;
      history.push({ user_message: turn, kim_response: result.response, agent_offered: Boolean(result.agent_offer) });
      if (delayMilliseconds) await sleep(delayMilliseconds);
    }
  } catch (error) {
    console.error(`✗ ${record.id} : ${error.message}`);
    evaluations.push({ ...record, error: error.message, checks: [], latency_ms: null });
    continue;
  }
  const checks = evaluateBehavior(record, result);
  const failed = checks.filter((item) => item.applicable && !item.passed).map((item) => item.name);
  console.log(`${failed.length ? '✗' : '✓'} [${position + 1}/${records.length}] ${record.id}${failed.length ? ` — ${failed.join(', ')}` : ''} (${result.latency_ms} ms)`);
  evaluations.push({
    ...record,
    user_input: record.turns.at(-1),
    response: result.response,
    retrieved_contexts: result.retrieved_contexts,
    returned_language: result.language,
    returned_sources: result.sources,
    returned_form: result.form,
    escalated: result.escalated,
    model_flags: result.model_flags,
    latency_ms: result.latency_ms,
    total_latency_ms: totalLatency,
    checks,
  });
}

const scored = evaluations.filter((evaluation) => !evaluation.error);
const summary = {
  generated_at: new Date().toISOString(), label: args.label || null, api_url: apiUrl, split, contexts_mode: contextsMode,
  questions: records.length, errors: evaluations.length - scored.length, ...summarize(scored),
};

const thresholds = JSON.parse(await readFile(path.join(here, 'thresholds.json'), 'utf8')).behavior;
const failures = [];
for (const [name, minimumRate] of Object.entries(thresholds.minimum_rate)) {
  const measured = summary.checks[name];
  if (measured?.total && measured.rate < minimumRate) failures.push(`${name} : ${(measured.rate * 100).toFixed(0)} % < ${(minimumRate * 100).toFixed(0)} %`);
}
if (summary.latency_ms.p95 !== null && summary.latency_ms.p95 > thresholds.max_p95_latency_ms) failures.push(`latence p95 : ${summary.latency_ms.p95} ms > ${thresholds.max_p95_latency_ms} ms`);
if (summary.errors) failures.push(`${summary.errors} question(s) en erreur`);
summary.failures = failures;

const percent = (rate) => (rate === null ? '—' : `${Math.round(rate * 100)} %`);
const reportLines = [
  `# Évaluation de Kim — ${summary.generated_at.slice(0, 10)}${summary.label ? ` (${summary.label})` : ''}`, '',
  `Jeu « ${split} » : ${records.length} question(s), ${summary.errors} erreur(s). Mode des passages : ${contextsMode}.`, '',
  '## Contrôles de comportement', '', '| Contrôle | Réussite | Seuil |', '|---|---|---|',
  ...Object.entries(summary.checks).map(([name, value]) => `| ${name} | ${percent(value.rate)} (${value.passed}/${value.total}) | ${thresholds.minimum_rate[name] !== undefined ? percent(thresholds.minimum_rate[name]) : '—'} |`),
  '', `Latence : p50 ${summary.latency_ms.p50} ms, **p95 ${summary.latency_ms.p95} ms** (cible < ${thresholds.max_p95_latency_ms} ms), max ${summary.latency_ms.max} ms.`, '',
  '## Par langue (un 0,90 global peut cacher un coréen à 0,60)', '', '| Langue | ' + Object.keys(summary.checks).join(' | ') + ' |', '|---|' + Object.keys(summary.checks).map(() => '---').join('|') + '|',
  ...Object.entries(summary.by_lang).map(([group, checks]) => `| ${group} | ${Object.keys(summary.checks).map((name) => percent(checks[name]?.rate ?? null)).join(' | ')} |`),
  '', '## Par catégorie', '', '| Catégorie | ' + Object.keys(summary.checks).join(' | ') + ' |', '|---|' + Object.keys(summary.checks).map(() => '---').join('|') + '|',
  ...Object.entries(summary.by_category).map(([group, checks]) => `| ${group} | ${Object.keys(summary.checks).map((name) => percent(checks[name]?.rate ?? null)).join(' | ')} |`),
  '', '## Questions en échec', '',
  ...(scored.filter((evaluation) => evaluation.checks.some((item) => item.applicable && !item.passed)).map((evaluation) => `- **${evaluation.id}** (${evaluation.lang}, ${evaluation.category}) : ${evaluation.checks.filter((item) => item.applicable && !item.passed).map((item) => `${item.name} — ${item.detail}`).join(' ; ')}`)),
  '', failures.length ? `## Seuils non atteints\n\n${failures.map((failure) => `- ${failure}`).join('\n')}` : '## Tous les seuils de comportement sont atteints',
];

await mkdir(path.join(here, 'results'), { recursive: true });
const stamp = summary.generated_at.replace(/[:.]/g, '-');
const base = path.join(here, 'results', `run-${stamp}`);
await writeFile(`${base}.jsonl`, `${evaluations.map((evaluation) => JSON.stringify(evaluation)).join('\n')}\n`);
await writeFile(`${base}.summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(`${base}.report.md`, `${reportLines.join('\n')}\n`);
console.log(`\nRapport : ${path.relative(process.cwd(), `${base}.report.md`)}`);
if (failures.length) { console.error(`\nSeuils non atteints :\n- ${failures.join('\n- ')}`); process.exit(1); }
