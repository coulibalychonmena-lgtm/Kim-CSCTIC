import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import FormField from '../components/FormField.jsx';
import { useFormState } from '../components/forms/useFormState.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { authService } from '../services/authService.js';

const MINIMUM_PASSWORD_LENGTH = 8;

function Shell({ title, children }) {
  const { translate } = useLanguage();
  return (
    <>
      <Header />
      <main className="login">
        <div className="login__card">
          <h1>{title}</h1>
          {children}
          <Link to="/connexion" className="login__back">{translate('acc_login_title')}</Link>
        </div>
      </main>
    </>
  );
}

/** Mot de passe oublié : la réponse est la même que l'adresse existe ou non. */
export function ForgotPasswordPage() {
  const { translate, lang } = useLanguage();
  const [sent, setSent] = useState(false);
  const formState = useFormState({ email: '' }, { required: ['email'] });
  const onSubmit = formState.handleSubmit(async (values) => { await authService.forgotPassword(values.email, lang); setSent(true); });
  return (
    <Shell title={translate('forgot_title')}>
      {sent ? <p role="status">{translate('forgot_sent')}</p> : (
        <form onSubmit={onSubmit} noValidate>
          <p className="muted">{translate('forgot_text')}</p>
          <FormField label={translate('f_email')} type="email" required autoComplete="username" error={formState.fieldErrors.email} {...formState.bindField('email')} />
          {formState.formError && <p className="form-error" role="alert">{formState.formError}</p>}
          <button type="submit" className="btn btn--primary btn--block" disabled={formState.submitting}>{formState.submitting ? translate('sending') : translate('forgot_submit')}</button>
        </form>
      )}
    </Shell>
  );
}

/** Nouveau mot de passe, depuis le lien reçu par e-mail (?token=…). */
export function ResetPasswordPage() {
  const { translate } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [done, setDone] = useState(false);
  const validate = (values) => (values.password.length < MINIMUM_PASSWORD_LENGTH ? { password: translate('password_min') } : {});
  const formState = useFormState({ password: '' }, { required: ['password'], validate });
  const onSubmit = formState.handleSubmit(async (values) => { await authService.resetPassword(token, values.password); setDone(true); });
  if (!token) return <Shell title={translate('reset_title')}><p className="form-error" role="alert">{translate('reset_invalid')}</p></Shell>;
  return (
    <Shell title={translate('reset_title')}>
      {done ? <p role="status">{translate('reset_done')}</p> : (
        <form onSubmit={onSubmit} noValidate>
          <FormField label={translate('acc_password_new')} type="password" required minLength={MINIMUM_PASSWORD_LENGTH} autoComplete="new-password" error={formState.fieldErrors.password} {...formState.bindField('password')} />
          {formState.formError && <p className="form-error" role="alert">{formState.formError}</p>}
          <button type="submit" className="btn btn--primary btn--block" disabled={formState.submitting}>{formState.submitting ? translate('sending') : translate('reset_submit')}</button>
        </form>
      )}
    </Shell>
  );
}

/** Confirmation de l'adresse e-mail, depuis le lien reçu par e-mail (?token=…). */
export function VerifyEmailPage() {
  const { translate } = useLanguage();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('loading');
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setState('error'); return; }
    authService.verifyEmail(token).then(() => setState('ok')).catch(() => setState('error'));
  }, [searchParams]);
  return (
    <Shell title={translate('verify_title')}>
      {state === 'loading' && <p role="status">{translate('loading')}</p>}
      {state === 'ok' && <p role="status">{translate('verify_ok')}</p>}
      {state === 'error' && <p className="form-error" role="alert">{translate('verify_fail')}</p>}
    </Shell>
  );
}
