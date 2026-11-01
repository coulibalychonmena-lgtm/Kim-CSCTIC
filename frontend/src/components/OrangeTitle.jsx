/** Titre orange souligné d'un zigzag, dans l'esprit du site officiel du Centre. */
export default function OrangeTitle({ as: Tag = 'h2', id, children }) {
  return (
    <div className="orange-title">
      <Tag id={id}>{children}</Tag>
      <svg className="zigzag" viewBox="0 0 120 20" width="96" height="16" aria-hidden="true" focusable="false">
        <polyline points="2,16 14,4 26,16 38,4 50,16 62,4 74,16 86,4 98,16 110,4" fill="none" stroke="currentColor" strokeWidth="4" />
      </svg>
    </div>
  );
}
