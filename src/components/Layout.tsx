import { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Globe, BookOpen, Users, Sword, Bug, Network, GitBranch,
  ChevronLeft, ChevronRight, Plus, Home, Map, Shield, Package, Calendar, Menu, Compass, Info,
} from 'lucide-react';
import useStore from '../store/useStore';
import { APP_VERSION } from '../constants/appMeta';
import WhatsNewModal from './WhatsNewModal';
import { WHATS_NEW } from '../data/whatsNew';

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

const WHATS_NEW_SEEN_KEY = 'wurlding:lastSeenVersion';

function semverParts(v: string): [number, number, number] {
  const [a, b, c] = v.split('.').map((x) => Number.parseInt(x || '0', 10));
  return [a || 0, b || 0, c || 0];
}

function semverCompare(a: string, b: string): number {
  const pa = semverParts(a);
  const pb = semverParts(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { worlds, activeWorldId, setActiveWorld } = useStore();
  const navigate = useNavigate();
  const activeWorld = worlds.find(w => w.id === activeWorldId);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  const entriesToShow = useMemo(() => {
    const lastSeen = localStorage.getItem(WHATS_NEW_SEEN_KEY) || '';
    // Show notes for versions newer than lastSeen; fallback to the latest entry.
    const newer = WHATS_NEW.filter((e) => semverCompare(e.version, lastSeen) > 0);
    if (newer.length > 0) return newer;
    // If the app updated but notes list doesn't include the version, don't spam the user.
    return [];
  }, []);

  useEffect(() => {
    if (entriesToShow.length > 0) {
      setShowWhatsNew(true);
    }
  }, [entriesToShow.length]);

  return (
    <div className="flex h-screen overflow-hidden">
      {showWhatsNew && (
        <WhatsNewModal
          entries={entriesToShow}
          onClose={() => {
            // Mark the newest shown entry as "seen" so we only show once per What's New entry.
            const newestShown = entriesToShow[0]?.version || APP_VERSION;
            localStorage.setItem(WHATS_NEW_SEEN_KEY, newestShown);
            setShowWhatsNew(false);
          }}
        />
      )}

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
            <h1 className="text-xl font-bold text-moonlight font-[Cinzel] tracking-widest">
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
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
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
            to="/about"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
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

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
