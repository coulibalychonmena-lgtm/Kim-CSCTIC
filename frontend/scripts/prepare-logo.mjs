// Prépare le logo officiel : fond blanc → transparence propre (« couleur vers alpha », bords lissés conservés),
// recadrage des marges, puis icônes PWA / Apple et image de partage.
//   node scripts/prepare-logo.mjs chemin/vers/logo.jpg      (nécessite le paquet « sharp » : npm i -D sharp)
import sharp from 'sharp';

const source = process.argv[2];
if (!source) { console.error('Usage : node scripts/prepare-logo.mjs <logo.jpg>'); process.exit(2); }

/**
 * Retire le fond blanc d'un logo à deux couleurs (orange et bleu). Chaque pixel est un mélange « couleur du logo + blanc » :
 * on retrouve la couleur du logo la plus proche et la part de blanc, ce qui donne une transparence exacte (bords lissés sans liseré
 * clair ni halo) et des aplats nets, bruit de compression du JPEG supprimé.
 */
export async function whiteToTransparent(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const count = info.width * info.height;

  // 1. Couleurs pleines du logo, mesurées dans l'image : moyenne des pixels nettement orange puis nettement bleus.
  const sums = { orange: [0, 0, 0, 0], blue: [0, 0, 0, 0] };
  for (let pixel = 0; pixel < count; pixel += 1) {
    const [red, green, blue] = [data[pixel * 3], data[pixel * 3 + 1], data[pixel * 3 + 2]];
    const bucket = red > 220 && red - blue > 150 && green > 90 && green < 170 ? sums.orange : (blue > 130 && blue - red > 110 && red < 40 ? sums.blue : null);
    if (bucket) { bucket[0] += red; bucket[1] += green; bucket[2] += blue; bucket[3] += 1; }
  }
  const mean = (bucket) => bucket.slice(0, 3).map((total) => total / bucket[3]);
  const foregrounds = [mean(sums.orange), mean(sums.blue)];
  const away = foregrounds.map((color) => color.map((value) => 255 - value)); // « distance au blanc » de chaque couleur pleine
  const squaredNorm = away.map((vector) => vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);

  // 2. Pour chaque pixel : part de couleur (alpha) la mieux expliquée par l'orange ou le bleu.
  const out = Buffer.alloc(count * 4);
  for (let pixel = 0; pixel < count; pixel += 1) {
    const delta = [255 - data[pixel * 3], 255 - data[pixel * 3 + 1], 255 - data[pixel * 3 + 2]];
    let best = { residual: Infinity, alpha: 0, color: foregrounds[0] };
    foregrounds.forEach((color, index) => {
      const alpha = Math.max(0, Math.min(1, (delta[0] * away[index][0] + delta[1] * away[index][1] + delta[2] * away[index][2]) / squaredNorm[index]));
      const residual = (delta[0] - alpha * away[index][0]) ** 2 + (delta[1] - alpha * away[index][1]) ** 2 + (delta[2] - alpha * away[index][2]) ** 2;
      if (residual < best.residual) best = { residual, alpha, color };
    });
    const alpha = best.alpha < 0.07 ? 0 : (best.alpha > 0.94 ? 1 : best.alpha);
    out[pixel * 4] = Math.round(best.color[0]); out[pixel * 4 + 1] = Math.round(best.color[1]); out[pixel * 4 + 2] = Math.round(best.color[2]);
    out[pixel * 4 + 3] = Math.round(alpha * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

const transparent = await whiteToTransparent(source);
const logo = await sharp(transparent).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }).png({ compressionLevel: 9 }).toBuffer();
// 480 px de large suffisent (affiché à moins de 200 px, écrans Retina compris) : fichier léger.
await sharp(logo).resize({ width: 480, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile('public/logo.png');

const square = async (size, logoShare, file, background) => {
  const inner = await sharp(logo).resize({ width: Math.round(size * logoShare), height: Math.round(size * logoShare), fit: 'inside' }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } }).composite([{ input: inner, gravity: 'centre' }]).png({ compressionLevel: 9 }).toFile(file);
};
const white = { r: 255, g: 255, b: 255, alpha: 1 };
await square(192, 0.86, 'public/icons/icon-192.png', white);
await square(512, 0.86, 'public/icons/icon-512.png', white);
await square(512, 0.62, 'public/icons/icon-maskable-512.png', white); // zone de sécurité « maskable » : le logo reste entier sous tout masque
await square(180, 0.86, 'public/icons/apple-touch-icon.png', white);
console.log('logo.png, icônes PWA et apple-touch-icon régénérés.');
