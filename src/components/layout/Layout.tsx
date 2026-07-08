import { ReactNode } from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NavItem, ROLE_LABELS, View } from '../../constants/domain';

interface LayoutProps {
  nav: NavItem[];
  active: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}

export function Layout({ nav, active, onNavigate, children }: LayoutProps) {
  const { profile, user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Оплати</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right leading-tight">
                <div className="text-sm text-gray-900">{profile?.full_name || user?.email}</div>
                <div className="text-xs text-gray-500">
                  {profile?.role ? ROLE_LABELS[profile.role] : ''}
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4" />
                Вийти
              </button>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto -mb-px">
            {nav.map((item) => (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active === item.view
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
