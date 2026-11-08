import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateQuota, DEFAULT_QUOTA_LIMITS } from '../src/utils/anonymous-quota-policy.js';
import { noticeText } from '../src/utils/chat-notices.js';

const usage = (overrides) => ({ sessionCount: 0, deviceCount: 0, clientCountLastHour: 0, accountCountLastHour: 0, ...overrides });

test('un visiteur anonyme peut poser 5 questions, puis doit se connecter', () => {
  assert.equal(evaluateQuota({ usage: usage({ sessionCount: 0 }) }).remaining, 4);
  assert.equal(evaluateQuota({ usage: usage({ sessionCount: 4 }) }).remaining, 0);
  const blocked = evaluateQuota({ usage: usage({ sessionCount: 5 }) });
  assert.deepEqual([blocked.allowed, blocked.reason], [false, 'login_required']);
});

test('un nouvel onglet (nouvelle session) ne remet pas le compteur à zéro : le compteur d\'appareil compte aussi', () => {
  const newTab = evaluateQuota({ usage: usage({ sessionCount: 0, deviceCount: 5 }) });
  assert.deepEqual([newTab.allowed, newTab.reason], [false, 'login_required']);
});

test('plafond par réseau plus large que le quota individuel : 30 par heure', () => {
  assert.equal(evaluateQuota({ usage: usage({ clientCountLastHour: 29 }) }).allowed, true);
  const blocked = evaluateQuota({ usage: usage({ clientCountLastHour: 30 }) });
  assert.deepEqual([blocked.allowed, blocked.reason, blocked.retryAfterSeconds], [false, 'client_cap', 3600]);
});

test('un visiteur connecté n\'est pas soumis au quota anonyme ; l\'administrateur à aucun plafond', () => {
  assert.equal(evaluateQuota({ isAuthenticated: true, usage: usage({ sessionCount: 50, deviceCount: 50, clientCountLastHour: 500 }) }).allowed, true);
  assert.equal(evaluateQuota({ isAuthenticated: true, usage: usage({ accountCountLastHour: DEFAULT_QUOTA_LIMITS.accountPerHour }) }).reason, 'account_cap');
  assert.equal(evaluateQuota({ isAdministrator: true, isAuthenticated: true, usage: usage({ accountCountLastHour: 9999 }) }).allowed, true);
});

test('messages du quota dans la langue du visiteur, anglais par défaut', () => {
  assert.match(noticeText('login_required', 'fr'), /connectez-vous/);
  assert.match(noticeText('login_required', 'ko'), /로그인/);
  assert.match(noticeText('login_required', 'es'), /sign in/);
});
