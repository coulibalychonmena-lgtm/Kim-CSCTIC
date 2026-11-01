import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import StatsBar from '../components/admin/StatsBar.jsx';
import RoomRequestsTab from '../components/admin/RoomRequestsTab.jsx';
import ActivityRegistrationsTab from '../components/admin/ActivityRegistrationsTab.jsx';
import PartnershipRequestsTab from '../components/admin/PartnershipRequestsTab.jsx';
import HumanAssistanceTab from '../components/admin/HumanAssistanceTab.jsx';
import RoomCatalogTab from '../components/admin/RoomCatalogTab.jsx';
import ActivityCatalogTab from '../components/admin/ActivityCatalogTab.jsx';
import CenterInformationTab from '../components/admin/CenterInformationTab.jsx';
import PresentationsTab from '../components/admin/PresentationsTab.jsx';
import VideosTab from '../components/admin/VideosTab.jsx';
import SuggestionsTab from '../components/admin/SuggestionsTab.jsx';
import EventsTab from '../components/admin/EventsTab.jsx';
import NewsTab from '../components/admin/NewsTab.jsx';
import SiteImagesTab from '../components/admin/SiteImagesTab.jsx';

const DASHBOARD_TABS = [
  { id: 'room-requests', label: 'Réservations de salles', Component: RoomRequestsTab },
  { id: 'activity-registrations', label: 'Inscriptions aux formations', Component: ActivityRegistrationsTab },
  { id: 'partnership-requests', label: 'Partenariats', Component: PartnershipRequestsTab },
  { id: 'human-assistance', label: 'Assistance humaine', Component: HumanAssistanceTab },
  { id: 'room-catalog', label: 'Salles et espaces', Component: RoomCatalogTab },
  { id: 'activity-catalog', label: 'Formations', Component: ActivityCatalogTab },
  { id: 'center-information', label: 'Informations et horaires', Component: CenterInformationTab },
  { id: 'presentations', label: 'Présentation Kim', Component: PresentationsTab },
  { id: 'suggestions', label: 'Suggestions du chat', Component: SuggestionsTab },
  { id: 'videos', label: 'Vidéos', Component: VideosTab },
  { id: 'events', label: 'Événements', Component: EventsTab },
  { id: 'news', label: 'Actualités', Component: NewsTab },
  { id: 'site-images', label: 'Images du site', Component: SiteImagesTab },
];

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const [activeTabId, setActiveTabId] = useState(DASHBOARD_TABS[0].id);
  const { Component: ActiveTabContent } = DASHBOARD_TABS.find((tab) => tab.id === activeTabId);

  return (
    <div className="admin">
      <header className="admin__head">
        <div>
          <h1>Tableau de bord</h1>
          <p className="muted">{user?.name} · {user?.role}</p>
        </div>
        <div className="admin__actions">
          <Link to="/" className="btn btn--ghost">Voir le site</Link>
          <Link to="/chat" className="btn btn--ghost">Kim</Link>
          <button type="button" className="btn btn--soft" onClick={logout}>Se déconnecter</button>
        </div>
      </header>
      <StatsBar />
      <div role="tablist" aria-label="Sections" className="tabs">
        {DASHBOARD_TABS.map((tab) => (
          <button
            key={tab.id} type="button" role="tab" id={`dashboard-tab-${tab.id}`}
            aria-selected={activeTabId === tab.id} aria-controls="dashboard-panel"
            className={`tabs__btn${activeTabId === tab.id ? ' is-active' : ''}`}
            onClick={() => setActiveTabId(tab.id)}
          >{tab.label}</button>
        ))}
      </div>
      <div role="tabpanel" id="dashboard-panel" aria-labelledby={`dashboard-tab-${activeTabId}`} className="admin__panel">
        <ActiveTabContent />
      </div>
    </div>
  );
}
