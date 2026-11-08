import test from 'node:test';
import assert from 'node:assert/strict';
import { noIndexApi, robotsTxt } from '../src/middlewares/robots.middleware.js';

const fakeResponse = () => {
  const response = { headers: {}, set(name, value) { this.headers[name] = value; return this; }, type(value) { this.contentType = value; return this; }, send(body) { this.body = body; return this; } };
  return response;
};

test('l\'API envoie X-Robots-Tag noindex et un robots.txt qui interdit tout', () => {
  const response = fakeResponse();
  let called = false;
  noIndexApi({}, response, () => { called = true; });
  assert.equal(called, true);
  assert.match(response.headers['X-Robots-Tag'], /noindex/);
  const robots = fakeResponse();
  robotsTxt({}, robots);
  assert.equal(robots.body, 'User-agent: *\nDisallow: /\n');
  assert.equal(robots.contentType, 'text/plain');
});
