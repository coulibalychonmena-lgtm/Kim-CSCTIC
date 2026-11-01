import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import HomePage from './pages/HomePage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import MySpacePage from './pages/MySpacePage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/chat" element={<HomePage />} />
      <Route path="/connexion" element={<AccountPage />} />
      <Route path="/mon-espace" element={<ProtectedRoute><MySpacePage /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute administratorOnly><AdminDashboardPage /></ProtectedRoute>} />
      {/* Anciennes adresses : une seule connexion pour tous, le rôle choisit l'espace. */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/login" element={<Navigate to="/connexion" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
