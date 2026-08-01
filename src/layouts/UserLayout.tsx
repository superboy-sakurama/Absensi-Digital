import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarDays, User, FileText, LogOut } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function UserLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    navigate('/login');
  };

  const navItems = [
    { path: '/user', label: 'Beranda', icon: Home },
    { path: '/user/history', label: 'Riwayat', icon: CalendarDays },
    { path: '/user/leave', label: 'Izin', icon: FileText },
    { path: '/user/profile', label: 'Profil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col font-sans transition-colors duration-300">
      <div className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur rounded-full shadow-sm">
        <ThemeToggle />
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe z-50">
        <div className="flex justify-around items-center h-16 px-2 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-medium">Keluar</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
