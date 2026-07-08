import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { Layout } from './components/layout/Layout';
import { MyPayments } from './pages/MyPayments';
import { NewPayment } from './pages/NewPayment';
import { Approvals } from './pages/Approvals';
import { ToPay } from './pages/ToPay';
import { Register } from './pages/Register';
import { Banks } from './pages/Banks';
import { Users } from './pages/Users';
import { defaultView, navForRole, View } from './constants/domain';
import { UserRole } from './types/database';

function AuthedApp({ role }: { role: UserRole }) {
  const nav = navForRole(role);
  const [view, setView] = useState<View>(defaultView(role));

  // Guard: if the role can't access the current view, snap back to its default.
  const allowed = nav.some((n) => n.view === view);
  const active: View = allowed ? view : defaultView(role);

  const render = () => {
    switch (active) {
      case 'my':
        return <MyPayments onNew={() => setView('new')} />;
      case 'new':
        return <NewPayment onCreated={() => setView('my')} />;
      case 'approve':
        return <Approvals />;
      case 'pay':
        return <ToPay />;
      case 'register':
        return <Register />;
      case 'banks':
        return <Banks />;
      case 'users':
        return <Users />;
      default:
        return <MyPayments onNew={() => setView('new')} />;
    }
  };

  return (
    <Layout nav={nav} active={active} onNavigate={setView}>
      {render()}
    </Layout>
  );
}

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Завантаження...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  if (!profile || profile.role === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Обліковий запис не налаштований</h1>
        <p className="text-gray-500 mb-2 max-w-md">
          Вашому обліковому запису ще не призначено роль. Зверніться до адміністратора.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Увійшли як: <span className="font-medium text-gray-600">{user.email}</span>
        </p>
        <button
          onClick={() => signOut()}
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700"
        >
          Вийти з системи
        </button>
      </div>
    );
  }

  return <AuthedApp role={profile.role} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
