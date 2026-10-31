import { useId } from 'react';

/** Champ de formulaire accessible (input, textarea ou select). */
export default function FormField({ label, error, as = 'input', options, children, ...props }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : undefined;
  const common = { id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, ...props };
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>{label}{props.required ? ' *' : ''}</label>
      {as === 'textarea' && <textarea rows={4} {...common} />}
      {as === 'select' && <select {...common}>{children}</select>}
      {as === 'input' && <input {...common} />}
      {error && <p className="field__error" id={`${id}-err`}>{error}</p>}
    </div>
  );
}
