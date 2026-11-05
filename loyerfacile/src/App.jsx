import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/auth-context';
import { useRoute } from './router';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Invitation from './pages/Invitation';
import EspaceLocataire from './pages/EspaceLocataire';
import { Vide } from './components/ui';
import Icon from './components/Icon';
import { useEnLigne } from './pwa';

// Choisit la page à afficher selon l'URL (#/, #/biens, #/biens/3…).
// Tous les hooks sont appelés en haut, sans condition (règle des hooks React).
function AppContent() {
  const { estConnecte, verification, role } = useAuth();
  const { morceaux } = useRoute();

  // Lien d'invitation d'un locataire : accessible sans être connecté
  if (morceaux[0] === 'invitation' && morceaux[1]) return <Invitation jeton={morceaux[1]} />;

  if (verification) {
    return (
      <div className="ecran-chargement">
        <span className="spinner" aria-label="Chargement" />
      </div>
    );
  }

  if (!estConnecte) {
    return morceaux[0] === 'inscription' ? <Register /> : <Login />;
  }

  // Un locataire n'a accès qu'à son espace
  if (role === 'locataire') {
    return (
      <Layout morceaux={[]}>
        <EspaceLocataire />
      </Layout>
    );
  }

  let page;
  if (morceaux.length === 0 || morceaux[0] === 'inscription') page = <Dashboard />;
  else if (morceaux[0] === 'biens' && morceaux[1]) page = <PropertyDetail key={morceaux[1]} id={morceaux[1]} onglet={morceaux[2]} />;
  else if (morceaux[0] === 'biens') page = <Properties />;
  else
    page = (
      <Vide
        icone="alert"
        titre="Page introuvable"
        texte="Cette adresse n’existe pas."
        action={
          <a className="btn btn-primaire" href="#/">
            Retour au tableau de bord
          </a>
        }
      />
    );

  return <Layout morceaux={morceaux}>{page}</Layout>;
}

// Bandeau affiché quand le téléphone n'a plus de connexion
function BandeauHorsLigne() {
  const enLigne = useEnLigne();
  if (enLigne) return null;
  return (
    <div className="hors-ligne" role="status">
      <Icon name="wifiOff" size={16} /> Pas de connexion : vous pouvez consulter l’application, les données reviendront avec le réseau.
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BandeauHorsLigne />
      <AppContent />
    </AuthProvider>
  );
}
