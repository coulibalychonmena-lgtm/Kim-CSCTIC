const YOUTUBE_PATTERN = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;
const VIMEO_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)/;
const VIDEO_FILE_PATTERN = /\.(mp4|webm|ogg)(\?.*)?$|\/video\/upload\//i;

/** Lecteur intégré : YouTube, Vimeo ou fichier vidéo (mp4, webm, Cloudinary) ; sinon un simple lien. */
export default function VideoPlayer({ video }) {
  const youtube = video.video_url.match(YOUTUBE_PATTERN);
  const vimeo = video.video_url.match(VIMEO_PATTERN);
  let player;
  if (youtube) {
    player = <iframe src={`https://www.youtube-nocookie.com/embed/${youtube[1]}`} title={video.title} loading="lazy" allowFullScreen allow="encrypted-media; picture-in-picture; fullscreen" />;
  } else if (vimeo) {
    player = <iframe src={`https://player.vimeo.com/video/${vimeo[1]}`} title={video.title} loading="lazy" allowFullScreen allow="fullscreen; picture-in-picture" />;
  } else if (VIDEO_FILE_PATTERN.test(video.video_url)) {
    player = <video src={video.video_url} controls preload="metadata" playsInline aria-label={video.title} />;
  } else {
    player = <a className="video__link" href={video.video_url} target="_blank" rel="noopener noreferrer">{video.title}</a>;
  }
  return (
    <figure className="video">
      <div className="video__frame">{player}</div>
      <figcaption><strong>{video.title}</strong>{video.description && <span>{video.description}</span>}</figcaption>
    </figure>
  );
}

export function VideoList({ videos }) {
  return <div className="video-grid">{videos.map((video) => <VideoPlayer key={video.id} video={video} />)}</div>;
}
