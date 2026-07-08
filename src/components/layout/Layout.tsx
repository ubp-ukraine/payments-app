import { ReactNode, useEffect, useState } from 'react';
import {
  Wallet,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NavItem, ROLE_LABELS, View } from '../../constants/domain';

interface LayoutProps {
  nav: NavItem[];
  active: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}

function LogoBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${compact ? 'w-8 h-8' : 'w-9 h-9'} rounded-xl bg-brand-600 flex items-center justify-center shrink-0`}>
        <Wallet className={compact ? 'w-5 h-5 text-white' : 'w-5 h-5 text-white'} />
      </div>
      <div className="min-w-0">
        <span className="text-sm font-semibold text-gray-900 leading-none block truncate">Оплати</span>
        <span className="text-[11px] text-gray-400 leading-none mt-0.5 block truncate">UBP Ukraine</span>
      </div>
    </div>
  );
}

export function Layout({ nav, active, onNavigate, children }: LayoutProps) {
  const { profile, user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem('oplaty_sidebar_collapsed') === '1'
  );

  useEffect(() => {
    localStorage.setItem('oplaty_sidebar_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  const initials = (profile?.full_name || user?.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const go = (view: View) => {
    onNavigate(view);
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden transition-colors"
            aria-label="Меню"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 hidden lg:inline-flex transition-colors"
            title={collapsed ? 'Показати бічну панель' : 'Приховати бічну панель'}
            aria-label={collapsed ? 'Показати бічну панель' : 'Приховати бічну панель'}
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <div className={collapsed ? 'hidden lg:flex' : 'flex lg:hidden'}>
            <LogoBlock compact />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profile && (
            <div className="hidden sm:flex items-center gap-2.5 mr-1">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 leading-none">
                  {profile.full_name || user?.email}
                </p>
                <p className="text-xs text-gray-400 leading-none mt-0.5">
                  {profile.role ? ROLE_LABELS[profile.role] : 'Не налаштовано'}
                </p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">
                {initials}
              </div>
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline font-medium">Вийти</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${
            collapsed ? 'lg:hidden' : 'lg:translate-x-0'
          } fixed lg:sticky lg:top-14 inset-y-0 left-0 z-30 w-60 bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out shrink-0 flex flex-col mt-14 lg:mt-0 lg:h-[calc(100vh-3.5rem)]`}
        >
          <div className="hidden lg:flex items-center px-3 py-3 border-b border-gray-100 shrink-0">
            <LogoBlock />
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
            {nav.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => go(item.view)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={17} className="shrink-0" />
                  <span className="text-sm font-medium flex-1 leading-snug">{item.label}</span>
                  {isActive && <ChevronRight size={14} className="opacity-70" />}
                </button>
              );
            })}
          </nav>

          {profile && (
            <div className="px-3 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2.5 px-3 py-2">
                <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {profile.full_name || user?.email}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {profile.role ? ROLE_LABELS[profile.role] : 'Не налаштовано'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 min-w-0 overflow-auto">
          <div className="p-4 sm:p-5 lg:p-6 w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
