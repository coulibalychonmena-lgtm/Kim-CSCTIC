// Régénère public/og-image.jpg (1200×630) : photo d'accueil assombrie + logo sur carte blanche. À relancer si le logo change.
//   node scripts/prepare-share-image.mjs     (nécessite « sharp »)
import sharp from 'sharp';

const WIDTH = 1200; const HEIGHT = 630;
const base = await sharp('public/backgrounds/hero.webp').resize(WIDTH, HEIGHT, { fit: 'cover' }).modulate({ brightness: 0.55 }).toBuffer();
const logo = await sharp('public/logo.png').resize({ width: 300 }).toBuffer();
const { height: logoHeight } = await sharp(logo).metadata();
const card = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="${logoHeight + 60}"><rect width="360" height="${logoHeight + 60}" rx="24" fill="#ffffff"/></svg>`);
const font = 'DejaVu Sans, Arial, sans-serif';
const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect x="0" y="560" width="${WIDTH}" height="70" fill="#f04c23"/>
  <text x="60" y="606" font-family="${font}" font-size="30" font-weight="bold" fill="#fff">Centre Sportif, Culturel et TIC Ivoiro-Coréen Alassane Ouattara</text>
  <text x="430" y="270" font-family="${font}" font-size="84" font-weight="bold" fill="#fff">CSCTICAO</text>
  <text x="430" y="335" font-family="${font}" font-size="34" fill="#fff">Salles · Formations · Partenariats · Kim</text></svg>`);
await sharp(base).composite([{ input: card, left: 60, top: 150 }, { input: logo, left: 90, top: 180 }, { input: text, left: 0, top: 0 }]).jpeg({ quality: 82, mozjpeg: true }).toFile('public/og-image.jpg');
console.log('og-image.jpg régénérée.');
