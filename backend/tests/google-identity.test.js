import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyGoogleIdToken, createGoogleChallenge, readGoogleState, GoogleTokenError } from '../src/services/google-identity.js';

const CLIENT_ID = 'kim-test.apps.googleusercontent.com';
const NOW = 1_800_000_000_000;
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'kid-1', alg: 'RS256', use: 'sig' };
const getKeys = async () => [jwk];

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
function makeToken(claimOverrides = {}, { key = privateKey, header = {} } = {}) {
  const claims = {
    iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: '1234567890', email: 'Amina@Example.com', email_verified: true,
    name: 'Amina Koné', nonce: 'nonce-1', iat: NOW / 1000 - 10, exp: NOW / 1000 + 3000, ...claimOverrides,
  };
  const signingInput = `${b64({ alg: 'RS256', kid: 'kid-1', typ: 'JWT', ...header })}.${b64(claims)}`;
  return `${signingInput}.${sign('RSA-SHA256', Buffer.from(signingInput), key).toString('base64url')}`;
}
const verifyToken = (token, overrides = {}) => verifyGoogleIdToken(token, { clientId: CLIENT_ID, expectedNonce: 'nonce-1', getKeys, now: NOW, ...overrides });
const rejects = (promise, pattern) => assert.rejects(promise, (error) => error instanceof GoogleTokenError && pattern.test(error.message));

test('un jeton valide donne le profil (e-mail en minuscules)', async () => {
  const profile = await verifyToken(makeToken());
  assert.deepEqual(profile, { sub: '1234567890', email: 'amina@example.com', name: 'Amina Koné', picture: null });
});

test('signature falsifiée, mauvais algorithme, clé inconnue', async () => {
  await rejects(verifyToken(makeToken({}, { key: otherKey.privateKey })), /Signature/);
  await rejects(verifyToken(makeToken({}, { header: { alg: 'none' } })), /Algorithme/);
  await rejects(verifyToken(makeToken({}, { header: { kid: 'autre' } })), /Clé de signature/);
  await rejects(verifyToken('abc.def'), /invalide/);
});

test('audience, émetteur, expiration, date d\'émission', async () => {
  await rejects(verifyToken(makeToken({ aud: 'autre-app' })), /autre application/);
  await rejects(verifyToken(makeToken({ iss: 'https://evil.example' })), /Émetteur/);
  await rejects(verifyToken(makeToken({ exp: NOW / 1000 - 600 })), /expiré/);
  await rejects(verifyToken(makeToken({ iat: NOW / 1000 + 3600 })), /date/);
});

test('e-mail non vérifié, profil incomplet', async () => {
  await rejects(verifyToken(makeToken({ email_verified: false })), /pas vérifiée/);
  await rejects(verifyToken(makeToken({ email: undefined })), /incomplet/);
});

test('nonce absent ou différent : refusé', async () => {
  await rejects(verifyToken(makeToken({ nonce: 'rejoue' })), /Nonce/);
  await rejects(verifyToken(makeToken(), { expectedNonce: '' }), /Nonce/);
});

test('sans identifiant client la connexion Google est désactivée', async () => {
  await rejects(verifyToken(makeToken(), { clientId: '' }), /non configurée/);
});

test('le state signé par le serveur porte le nonce et refuse les falsifications', () => {
  const { nonce, state } = createGoogleChallenge('secret-de-test');
  assert.equal(readGoogleState(state, 'secret-de-test'), nonce);
  assert.throws(() => readGoogleState(state, 'autre-secret'), GoogleTokenError);
  assert.throws(() => readGoogleState('n-importe-quoi', 'secret-de-test'), GoogleTokenError);
  const { state: old } = createGoogleChallenge('secret-de-test', NOW);
  assert.throws(() => readGoogleState(old, 'secret-de-test', NOW + 11 * 60_000), GoogleTokenError);
});
