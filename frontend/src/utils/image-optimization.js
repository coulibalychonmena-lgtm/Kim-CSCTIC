/**
 * Images allégées pour les visiteurs sur données mobiles (rapport, P3 « Finitions »).
 * Les photos du Centre sont hébergées sur Cloudinary, qui sait redimensionner et servir WebP/AVIF à la volée :
 * on insère simplement la transformation `f_auto,q_auto,w_<largeur>` dans l'adresse. Toute autre adresse reste inchangée.
 */
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?!(?:[a-z]_[^/]+,?)+\/)(.+)$/;

export function optimizedImageUrl(url, width) {
  if (!url) return url;
  const match = CLOUDINARY_UPLOAD.exec(url);
  return match ? `${match[1]}f_auto,q_auto,c_limit,w_${width}/${match[2]}` : url;
}

/** Attributs src / srcSet / sizes pour une carte : 360, 540 et 760 px de large. */
export function responsiveImageProps(url, sizes = '(max-width: 640px) 100vw, 340px') {
  const widths = [360, 540, 760];
  const isOptimizable = optimizedImageUrl(url, 1) !== url;
  return isOptimizable
    ? { src: optimizedImageUrl(url, 540), srcSet: widths.map((width) => `${optimizedImageUrl(url, width)} ${width}w`).join(', '), sizes }
    : { src: url };
}
