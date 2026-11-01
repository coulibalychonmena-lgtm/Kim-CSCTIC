import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/** Réserve une page aux comptes connectés ; `administratorOnly` la réserve à l'équipe du Centre. */
export default function ProtectedRoute({ children, administratorOnly = false }) {
  const { isAuthenticated, isAdministrator } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/connexion" replace state={{ from: location }} />;
  if (administratorOnly && !isAdministrator) return <Navigate to="/mon-espace" replace />;
  return children;
}
