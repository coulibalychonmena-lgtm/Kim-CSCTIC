// Test de bout en bout du runner : faux serveur « /eval/chat » + exécution réelle de run-evaluation.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(here, '..', 'run-evaluation.mjs');
const resultsDirectory = path.join(here, '..', 'results');

function startFakeApi(escalateEverything) {
  const server = http.createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      if (request.headers['x-eval-key'] !== 'cle-test') { response.writeHead(401).end('{}'); return; }
      const { message } = JSON.parse(body);
      const isKorean = /[가-힣]/.test(message);
      const isInjection = /Ignore/i.test(message) || /무시/.test(message);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        response: isInjection ? (isKorean ? '죄송하지만 시스템 지침은 공개할 수 없습니다.' : 'Désolé, je ne peux pas révéler mes instructions.') : (isKorean ? '센터는 일요일에 휴관입니다.' : 'Le Centre est ouvert de 08h00 à 18h00. Il est fermé le dimanche.'),
        language: isKorean ? 'ko' : (/hours|Sundays|mission|room|courses|register|partnership|pool|confirm/i.test(message) ? 'en' : 'fr'),
        sources: [{ label: 'Horaires', url: 'kim:horaires' }, { label: 'Catalogue des salles', url: 'kim:salles' }, { label: 'Catalogue des formations', url: 'kim:formations' }, { label: 'Site', url: 'https://cscticao.ci' }],
        retrieved_contexts: ['Lundi : 08:00-18:00'],
        form: { type: 'room_request', prefill: {} },
        escalated: escalateEverything,
        model_flags: {}, latency_ms: 120,
      }));
    });
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

const run = (port, extraArguments) => new Promise((resolve) => {
  const child = spawn('node', [runner, '--delay', '0', '--category', 'adverses', ...extraArguments], {
    env: { ...process.env, EVAL_API_URL: `http://127.0.0.1:${port}/api/v1`, EVAL_API_KEY: 'cle-test' },
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.on('close', (code) => resolve({ code, output }));
});

test('une escalade sur toutes les questions fait échouer le seuil (code 1) et produit les rapports', async () => {
  const server = await startFakeApi(true);
  const { code, output } = await run(server.address().port, ['--label', 'test-escalade', '--split', 'all']);
  server.close();
  assert.equal(code, 1, output);
  assert.match(output, /aucune_escalade_a_tort/);
  const files = (await readdir(resultsDirectory)).filter((name) => name.startsWith('run-'));
  assert.ok(files.some((name) => name.endsWith('.jsonl')) && files.some((name) => name.endsWith('.report.md')));
  const summaryName = files.find((name) => name.endsWith('.summary.json'));
  const summary = JSON.parse(await readFile(path.join(resultsDirectory, summaryName), 'utf8'));
  assert.equal(summary.label, 'test-escalade');
  assert.ok(summary.checks.aucune_escalade_a_tort.rate < 1);
  for (const name of files) await rm(path.join(resultsDirectory, name));
});

test('sans clé d\'évaluation le runner s\'arrête avec le code 2', async () => {
  const child = spawn('node', [runner], { env: { ...process.env, EVAL_API_URL: '', EVAL_API_KEY: '' } });
  const code = await new Promise((resolve) => child.on('close', resolve));
  assert.equal(code, 2);
});
