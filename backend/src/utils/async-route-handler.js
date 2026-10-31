/** Transmet à Express les erreurs levées par un contrôleur asynchrone. */
export const wrapAsyncRoute = (routeHandler) => (request, response, next) =>
  Promise.resolve(routeHandler(request, response, next)).catch(next);
