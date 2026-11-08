import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountToken, hashToken, isTokenUsable, passwordProblem } from '../src/utils/account-tokens.js';
import { buildAccountEmail } from '../src/utils/mail-templates.js';

test('le jeton envoyé par e-mail n\'est jamais stocké : seule son empreinte l\'est', () => {
  const { token, tokenHash, expiresAt } = createAccountToken('reset_password', 1_000_000);
  assert.ok(token.length >= 43);
  assert.equal(tokenHash, hashToken(token));
  assert.notEqual(tokenHash, token);
  assert.equal(expiresAt.getTime(), 1_000_000 + 60 * 60_000);
  assert.equal(createAccountToken('verify_email', 0).expiresAt.getTime(), 24 * 60 * 60_000);
  assert.notEqual(createAccountToken('reset_password').token, createAccountToken('reset_password').token);
});

test('un jeton est inutilisable s\'il a servi, a expiré ou n\'existe pas', () => {
  const now = Date.now();
  assert.equal(isTokenUsable({ used_at: null, expires_at: new Date(now + 1000) }, now), true);
  assert.equal(isTokenUsable({ used_at: new Date(), expires_at: new Date(now + 1000) }, now), false);
  assert.equal(isTokenUsable({ used_at: null, expires_at: new Date(now - 1) }, now), false);
  assert.equal(isTokenUsable(undefined, now), false);
});

test('règle des 8 caractères appliquée côté serveur', () => {
  assert.match(passwordProblem('1234567'), /8 caractères/);
  assert.equal(passwordProblem('12345678'), null);
  assert.match(passwordProblem('Mon.Email@Exemple.com', 'mon.email@exemple.com'), /adresse e-mail/);
  assert.match(passwordProblem('x'.repeat(201)), /200/);
});

test('e-mails dans la langue du visiteur, lien échappé en HTML', () => {
  const korean = buildAccountEmail('reset_password', 'ko', 'https://site/reset?token=a&b=1');
  assert.match(korean.subject, /비밀번호/);
  assert.match(korean.html, /token=a&amp;b=1/);
  assert.match(buildAccountEmail('verify_email', 'es', 'https://x').subject, /Confirm your email/);
});
