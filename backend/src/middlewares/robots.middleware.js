// L'API n'a rien à faire dans un moteur de recherche : en-tête X-Robots-Tag sur toutes ses réponses et robots.txt qui interdit tout.
export function noIndexApi(_request, response, next) {
  response.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
}

export function robotsTxt(_request, response) {
  response.type('text/plain').set('Cache-Control', 'public, max-age=86400').send('User-agent: *\nDisallow: /\n');
}
