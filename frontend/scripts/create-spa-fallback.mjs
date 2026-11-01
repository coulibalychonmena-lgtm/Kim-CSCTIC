// Copie index.html en 404.html : sur un hébergement statique sans règle de réécriture,
// un lien direct ou une actualisation (ex. /mon-espace) affiche quand même l'application.
import { copyFile } from 'node:fs/promises';
await copyFile('dist/index.html', 'dist/404.html');
console.log('dist/404.html créé (repli SPA).');
