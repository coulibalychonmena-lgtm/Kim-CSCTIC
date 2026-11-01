import { useAuth } from '../../context/AuthContext.jsx';

const VISITOR_ROLE = 'Visiteur';

/** Jeton (pour rattacher la demande au compte) et coordonnées du visiteur connecté pour pré-remplir les formulaires. */
export function useAccountPrefill() {
  const { token, user } = useAuth();
  const isVisitor = user?.role === VISITOR_ROLE;
  const [firstname = '', ...otherNames] = isVisitor ? (user.name || '').trim().split(/\s+/) : [];
  return {
    token: isVisitor ? token : null,
    contact: {
      firstname, lastname: otherNames.join(' '),
      email: isVisitor ? user.email || '' : '', phone: isVisitor ? user.phone || '' : '',
    },
  };
}
