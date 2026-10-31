import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import { useFormState } from '../components/forms/useFormState.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const formState = useFormState({ email: '', password: '' });

  if (isAuthenticated) return <Navigate to="/admin/dashboard" replace />;

  const onSubmit = formState.handleSubmit(async (values) => {
    await login(values.email, values.password);
    navigate(location.state?.from?.pathname || '/admin/dashboard', { replace: true });
  });

  return (
    <main className="login">
      <form className="login__card" onSubmit={onSubmit} noValidate>
        <h1>Espace administration</h1>
        <p className="muted">Réservé à l'équipe du Centre.</p>
        <FormField label="Adresse e-mail" type="email" required autoComplete="username" error={formState.fieldErrors.email} {...formState.bindField('email')} />
        <FormField label="Mot de passe" type="password" required autoComplete="current-password" error={formState.fieldErrors.password} {...formState.bindField('password')} />
        {formState.formError && <p className="form-error" role="alert">{formState.formError}</p>}
        <button type="submit" className="btn btn--primary btn--block" disabled={formState.submitting}>
          {formState.submitting ? 'Connexion…' : 'Se connecter'}
        </button>
        <Link to="/" className="login__back">← Retour au site</Link>
      </form>
    </main>
  );
}
