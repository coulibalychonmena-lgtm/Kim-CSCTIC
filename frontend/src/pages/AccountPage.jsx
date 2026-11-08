import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import FormField from '../components/FormField.jsx';
import ConsentField from '../components/forms/ConsentField.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import { useFormState } from '../components/forms/useFormState.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useBackendStatus } from '../context/BackendStatusContext.jsx';

/** Connexion et création de compte sur la même page : le rôle du compte choisit l'espace affiché ensuite. */
export default function AccountPage() {
  const { translate, lang } = useLanguage();
  const { login, register, isAuthenticated, isAdministrator } = useAuth();
  const { isReady } = useBackendStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const isRegistering = mode === 'register';
  // 8 caractères minimum : contrôlé ici pour aider la saisie, et imposé par le serveur.
  const validate = (values) => (isRegistering && values.password.length < 8 ? { password: translate('password_min') } : {});
  const formState = useFormState(
    { full_name: '', email: '', phone: '', password: '', consent: false },
    { required: isRegistering ? ['full_name', 'email', 'password'] : ['email', 'password'], mustBeTrue: isRegistering ? ['consent'] : [], validate },
  );

  if (isAuthenticated) return <Navigate to={isAdministrator ? '/admin/dashboard' : '/mon-espace'} replace />;

  const onSubmit = formState.handleSubmit(async (values) => {
    const user = isRegistering ? await register({ ...values, language: lang }) : await login(values.email, values.password);
    const fallbackPath = user.role === 'Administrateur' ? '/admin/dashboard' : '/mon-espace';
    navigate(location.state?.from?.pathname || fallbackPath, { replace: true });
  });

  return (
    <>
      <Header />
      <main className="login">
        <form className="login__card" onSubmit={onSubmit} noValidate>
          <h1>{translate(isRegistering ? 'acc_register_title' : 'acc_login_title')}</h1>
          <p className="muted">{translate('acc_intro')}</p>
          <GoogleSignInButton onSuccess={(user) => navigate(location.state?.from?.pathname || (user.role === 'Administrateur' ? '/admin/dashboard' : '/mon-espace'), { replace: true })} />
          {isRegistering && <FormField label={translate('acc_name')} required autoComplete="name" error={formState.fieldErrors.full_name} {...formState.bindField('full_name')} />}
          <FormField label={translate('f_email')} type="email" required autoComplete="username" error={formState.fieldErrors.email} {...formState.bindField('email')} />
          {isRegistering && <FormField label={translate('f_phone')} type="tel" autoComplete="tel" error={formState.fieldErrors.phone} {...formState.bindField('phone')} />}
          <FormField label={translate(isRegistering ? 'acc_password_new' : 'acc_password')} type="password" required minLength={isRegistering ? 8 : undefined} autoComplete={isRegistering ? 'new-password' : 'current-password'} error={formState.fieldErrors.password} {...formState.bindField('password')} />
          {isRegistering && <ConsentField error={formState.fieldErrors.consent} {...formState.bindCheckbox('consent')} />}
          {!isRegistering && <Link to="/mot-de-passe-oublie" className="login__forgot">{translate('acc_forgot')}</Link>}
          {formState.formError && <p className="form-error" role="alert">{formState.formError}</p>}
          {!isReady && <p className="muted" role="status">{translate('wake_text')}</p>}
          <button type="submit" className="btn btn--primary btn--block" disabled={formState.submitting}>
            {formState.submitting ? translate('sending') : translate(isRegistering ? 'acc_submit_register' : 'acc_submit_login')}
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => setMode(isRegistering ? 'login' : 'register')}>
            {translate(isRegistering ? 'acc_switch_login' : 'acc_switch_register')}
          </button>
          <Link to="/" className="login__back">{translate('acc_back')}</Link>
        </form>
      </main>
    </>
  );
}
