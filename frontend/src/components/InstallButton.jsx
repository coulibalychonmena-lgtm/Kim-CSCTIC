import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';

/** Propose l'installation de l'application (mobile et ordinateur) lorsque le navigateur la permet. */
export default function InstallButton() {
  const { translate } = useLanguage();
  const [installEvent, setInstallEvent] = useState(null);

  useEffect(() => {
    const onInstallAvailable = (event) => { event.preventDefault(); setInstallEvent(event); };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', onInstallAvailable);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallAvailable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!installEvent) return null;
  const install = async () => { installEvent.prompt(); await installEvent.userChoice; setInstallEvent(null); };
  return <button type="button" className="btn btn--small btn--soft" onClick={install}>{translate('install_app')}</button>;
}
