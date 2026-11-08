import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizedImageUrl, responsiveImageProps } from '../src/utils/image-optimization.js';

const photo = 'https://res.cloudinary.com/demo/image/upload/v1700000000/kim/gymnase.jpg';

test('Cloudinary : transformation WebP/AVIF automatique et largeur limitée', () => {
  assert.equal(optimizedImageUrl(photo, 540), 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_540/v1700000000/kim/gymnase.jpg');
});

test('une adresse déjà transformée ou étrangère reste inchangée', () => {
  const transformed = 'https://res.cloudinary.com/demo/image/upload/w_300,f_auto/v1/a.jpg';
  assert.equal(optimizedImageUrl(transformed, 540), transformed);
  assert.equal(optimizedImageUrl('https://exemple.ci/a.jpg', 540), 'https://exemple.ci/a.jpg');
  assert.equal(optimizedImageUrl('', 540), '');
});

test('srcSet à trois largeurs pour Cloudinary, simple src sinon', () => {
  assert.match(responsiveImageProps(photo).srcSet, /w_360.* 360w, .*w_540.* 540w, .*w_760.* 760w/);
  assert.deepEqual(responsiveImageProps('https://exemple.ci/a.jpg'), { src: 'https://exemple.ci/a.jpg' });
});
