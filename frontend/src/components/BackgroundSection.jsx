import { optimizedImageUrl } from '../utils/image-optimization.js';

/** Section dont l'image d'arrière-plan est assombrie pour garder le texte lisible. */
export default function BackgroundSection({ imageUrl, className = '', children, ...props }) {
  return (
    <section
      className={`bg-section ${className}`.trim()}
      style={{ backgroundImage: `url(${JSON.stringify(optimizedImageUrl(imageUrl, 1600))})` }}
      {...props}
    >
      <div className="bg-section__inner">{children}</div>
    </section>
  );
}
