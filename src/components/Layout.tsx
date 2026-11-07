import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import AmbientMotes from './AmbientMotes';
import PixelCritters from './PixelCritters';
import SecretCritterUnlock from './SecretCritterUnlock';
import {
  Globe, BookOpen, Users, Sword, Bug, Network, GitBranch,
  ChevronLeft, ChevronRight, Plus, Home, Map, Shield, Package, Calendar, Menu, Compass, Info, Settings,
} from 'lucide-react';
import useStore from '../store/useStore';
import {
  DESKTOP_COMPANIONS_EVENT,
  getStoredDesktopCompanions,
} from '../theme';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/worlds', icon: Globe, label: 'Worlds' },
  { to: '/stories', icon: BookOpen, label: 'Stories' },
  { to: '/characters', icon: Users, label: 'Characters' },
  { to: '/locations', icon: Map, label: 'Locations' },
  { to: '/factions', icon: Shield, label: 'Factions' },
  { to: '/items', icon: Package, label: 'Items' },
  { to: '/events', icon: Calendar, label: 'Timeline' },
  { to: '/bestiary', icon: Bug, label: 'Bestiary' },
  { to: '/field-guide', icon: BookOpen, label: 'Field Guide' },
  { to: '/family', icon: GitBranch, label: 'Family Tree' },
  { to: '/map', icon: Compass, label: 'Map Creator' },
  { to: '/web', icon: Network, label: 'World Web' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCompanions, setDesktopCompanionsState] = useState(() => getStoredDesktopCompanions());
  /** Desktop overlay only exists in Electron; never hide in-app pets in the browser. */
  const electronDesktop =
    typeof window !== 'undefined' && Boolean(window.wurldingDesktop?.setDesktopCompanions);
  const { worlds, activeWorldId, setActiveWorld } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const activeWorld = worlds.find(w => w.id === activeWorldId);
  /** Map Creator manages its own viewport; skip the page-enter animation there so the canvas never blurs. */
  const pageKey = location.pathname;
  const animatePage = !location.pathname.startsWith('/map');

  useEffect(() => {
    const onDesktop = (e: Event) => {
      setDesktopCompanionsState(Boolean((e as CustomEvent<boolean>).detail));
    };
    window.addEventListener(DESKTOP_COMPANIONS_EVENT, onDesktop);
    return () => window.removeEventListener(DESKTOP_COMPANIONS_EVENT, onDesktop);
  }, []);

  return (
    <div className="relative flex h-screen overflow-hidden">
      <AmbientMotes />
      {/* Hide in-app pets only when the real Electron desktop overlay is active. */}
      {!(desktopCompanions && electronDesktop) && <PixelCritters />}
      <SecretCritterUnlock />

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static z-40 h-full bg-abyss border-r border-dusk flex flex-col transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className={`flex items-center gap-3 p-4 border-b border-dusk ${collapsed ? 'justify-center' : ''}`}>
          {!collapsed && (
            <h1 className="wz-wordmark text-xl font-bold text-moonlight font-[Cinzel] tracking-widest">
              WURLDING
            </h1>
          )}
          {collapsed && (
            <span className="text-xl font-bold text-arcane font-[Cinzel]">Wu</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-mist hover:text-moonlight hidden lg:block"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {!collapsed && (
          <div className="p-3 border-b border-dusk">
            <select
              value={activeWorldId || ''}
              onChange={(e) => setActiveWorld(e.target.value || null)}
              className="select text-sm"
            >
              <option value="">All Worlds</option>
              {worlds.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `wz-nav-link flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-arcane/15 text-arcane border border-arcane/20'
                    : 'text-mist hover:text-moonlight hover:bg-shadow'
                }`
              }
            >
              <Icon size={20} />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `wz-nav-link flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-arcane/15 text-arcane border border-arcane/20'
                  : 'text-mist hover:text-moonlight hover:bg-shadow'
              }`
            }
          >
            <Settings size={20} />
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </NavLink>
          <NavLink
            to="/about"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `wz-nav-link flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-arcane/15 text-arcane border border-arcane/20'
                  : 'text-mist hover:text-moonlight hover:bg-shadow'
              }`
            }
          >
            <Info size={20} />
            {!collapsed && <span className="text-sm font-medium">About</span>}
          </NavLink>
        </nav>

        {!collapsed && (
          <div className="p-3 border-t border-dusk">
            <button
              onClick={() => navigate('/worlds/new')}
              className="btn-primary w-full justify-center text-sm"
            >
              <Plus size={16} />
              New World
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-abyss border-b border-dusk flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-mist hover:text-moonlight"
          >
            <Menu size={22} />
          </button>
          {activeWorld && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeWorld.coverColor }}
              />
              <span className="text-sm text-mist">
                Working in <span className="text-moonlight font-medium">{activeWorld.name}</span>
              </span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Sword size={16} className="text-mist" />
            <span className="text-xs text-mist hidden sm:block">
              {worlds.length} world{worlds.length !== 1 ? 's' : ''} forged
            </span>
          </div>
        </header>

        <div className="relative z-[1] flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div key={pageKey} className={animatePage ? 'wz-page min-h-full' : 'min-h-full'}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
