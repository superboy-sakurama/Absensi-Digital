import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, LayoutDashboard, Users, Clock, Settings, LogOut, Menu, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [appName, setAppName] = useState("Si Abon Megilan");
  const [appLogo, setAppLogo] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [setRes, attRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/attendance')
        ]);

        if (setRes.ok) {
          const data = await setRes.json();
          if (data.generalSettings?.appName) setAppName(data.generalSettings.appName);
          if (data.generalSettings?.appLogo) setAppLogo(data.generalSettings.appLogo);
        }

        if (attRes.ok) {
          const attData = await attRes.json();
          const count = attData.filter((a: any) => a.status === 'pending').length;
          setPendingCount(count);
        }
      } catch (error) {
        console.error('Failed to fetch:', error);
      }
    };
    fetchSettings();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchSettings, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    navigate('/login');
  };

  const isPathActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const hasAccess = (menuName: string) => {
    if (user?.group === 'Superadmin') return true;
    if (!user?.access) return false;
    return user.access.includes(menuName);
  };

  const getCurrentMenu = () => {
    if (location.pathname === '/admin') return 'Dashboard';
    if (location.pathname.startsWith('/admin/attendance')) return 'Absensi';
    if (location.pathname.startsWith('/admin/employees')) return 'Master Data';
    if (location.pathname.startsWith('/admin/settings')) return 'Sistem';
    return null;
  };

  const currentMenu = getCurrentMenu();
  const isAuthorized = currentMenu ? hasAccess(currentMenu) : true;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      {/* Top Header & Navigation */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Desktop Nav */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center mr-8">
                {appLogo ? (
                  <img src={appLogo} alt="Logo" className="h-8 w-8 mr-2 object-contain" />
                ) : (
                  <Activity className="h-8 w-8 text-emerald-600 dark:text-emerald-500 mr-2" />
                )}
                <span className="font-bold text-xl text-slate-900 dark:text-slate-50 tracking-tight">{appName}</span>
              </div>
              
              <nav className="hidden md:flex space-x-1">
                {hasAccess('Dashboard') && (
                  <Link
                    to="/admin"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isPathActive('/admin') 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </div>
                  </Link>
                )}

                {hasAccess('Absensi') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center focus:outline-none relative ${
                      isPathActive('/admin/attendance') 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50'
                    }`}>
                      <Clock className="mr-2 h-4 w-4" />
                      Absensi
                      <ChevronDown className="ml-1 h-4 w-4 opacity-50" />
                      {pendingCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                          {pendingCount}
                        </span>
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem render={<Link to="/admin/attendance?tab=harian" className="w-full cursor-pointer" />}>
                        Absen Harian
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/attendance?tab=bulanan" className="w-full cursor-pointer" />}>
                        Absensi Bulanan
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/attendance?tab=analisa" className="w-full cursor-pointer" />}>
                        Analisa Data
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/attendance?tab=persetujuan" className="w-full cursor-pointer flex justify-between items-center" />}>
                        <span>Persetujuan Izin</span>
                        {pendingCount > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/attendance?tab=holidays" className="w-full cursor-pointer" />}>
                        Hari Libur
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/attendance?tab=pengumuman" className="w-full cursor-pointer" />}>
                        Pengumuman
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {hasAccess('Master Data') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center focus:outline-none ${
                      isPathActive('/admin/employees') 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50'
                    }`}>
                      <Users className="mr-2 h-4 w-4" />
                      Master Data
                      <ChevronDown className="ml-1 h-4 w-4 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem render={<Link to="/admin/employees?tab=karyawan" className="w-full cursor-pointer" />}>
                        Karyawan
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/employees?tab=lokasi" className="w-full cursor-pointer" />}>
                        Alamat Kantor
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/employees?tab=unit" className="w-full cursor-pointer" />}>
                        Unit Layanan
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/employees?tab=shift" className="w-full cursor-pointer" />}>
                        Shift
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/employees?tab=admin" className="w-full cursor-pointer" />}>
                        Administrator
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {hasAccess('Sistem') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center focus:outline-none ${
                      isPathActive('/admin/settings') 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50'
                    }`}>
                      <Settings className="mr-2 h-4 w-4" />
                      Sistem
                      <ChevronDown className="ml-1 h-4 w-4 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem render={<Link to="/admin/settings?tab=general" className="w-full cursor-pointer" />}>
                        Umum
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/settings?tab=absensi" className="w-full cursor-pointer" />}>
                        Absensi
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/settings?tab=leave" className="w-full cursor-pointer" />}>
                        Izin & Cuti
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/settings?tab=lokasi" className="w-full cursor-pointer" />}>
                        Lokasi
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to="/admin/settings?tab=data" className="w-full cursor-pointer" />}>
                        Manajemen Data
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </nav>
            </div>

            {/* Mobile Menu Button & User Profile */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50 h-9 w-9">
                    <Menu className="h-6 w-6" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {hasAccess('Dashboard') && (
                      <>
                        <DropdownMenuItem render={<Link to="/admin" className="w-full cursor-pointer" />}>
                          <LayoutDashboard className="mr-2 h-4 w-4"/> Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    
                    {hasAccess('Absensi') && (
                      <>
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Absensi</DropdownMenuLabel>
                          <DropdownMenuItem render={<Link to="/admin/attendance?tab=harian" className="w-full cursor-pointer pl-6" />}>Absen Harian</DropdownMenuItem>
                          <DropdownMenuItem render={<Link to="/admin/attendance?tab=bulanan" className="w-full cursor-pointer pl-6" />}>Absensi Bulanan</DropdownMenuItem>
                          <DropdownMenuItem render={<Link to="/admin/attendance?tab=analisa" className="w-full cursor-pointer pl-6" />}>Analisa Data</DropdownMenuItem>
                          <DropdownMenuItem render={<Link to="/admin/attendance?tab=persetujuan" className="w-full cursor-pointer pl-6 flex justify-between items-center" />}>
                            <span>Persetujuan Izin</span>
                            {pendingCount > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
                          </DropdownMenuItem>
                          <DropdownMenuItem render={<Link to="/admin/attendance?tab=holidays" className="w-full cursor-pointer pl-6" />}>Hari Libur</DropdownMenuItem>
                          <DropdownMenuItem render={<Link to="/admin/attendance?tab=pengumuman" className="w-full cursor-pointer pl-6" />}>Pengumuman</DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    {hasAccess('Master Data') && (
                      <>
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Master Data</DropdownMenuLabel>
                          <DropdownMenuItem render={<Link to="/admin/employees?tab=karyawan" className="w-full cursor-pointer pl-6" />}>Karyawan</DropdownMenuItem>
                          <DropdownMenuItem render={<Link to="/admin/employees?tab=lokasi" className="w-full cursor-pointer pl-6" />}>Alamat Kantor</DropdownMenuItem>
                          <DropdownMenuItem render={<Link to="/admin/employees?tab=unit" className="w-full cursor-pointer pl-6" />}>Unit Layanan</DropdownMenuItem>
                          <DropdownMenuItem render={<Link to="/admin/employees?tab=shift" className="w-full cursor-pointer pl-6" />}>Shift</DropdownMenuItem>
                          <DropdownMenuItem render={<Link to="/admin/employees?tab=admin" className="w-full cursor-pointer pl-6" />}>Administrator</DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    {hasAccess('Sistem') && (
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Sistem</DropdownMenuLabel>
                        <DropdownMenuItem render={<Link to="/admin/settings?tab=general" className="w-full cursor-pointer pl-6" />}>Umum</DropdownMenuItem>
                        <DropdownMenuItem render={<Link to="/admin/settings?tab=absensi" className="w-full cursor-pointer pl-6" />}>Absensi</DropdownMenuItem>
                        <DropdownMenuItem render={<Link to="/admin/settings?tab=leave" className="w-full cursor-pointer pl-6" />}>Izin & Cuti</DropdownMenuItem>
                        <DropdownMenuItem render={<Link to="/admin/settings?tab=lokasi" className="w-full cursor-pointer pl-6" />}>Lokasi</DropdownMenuItem>
                        <DropdownMenuItem render={<Link to="/admin/settings?tab=data" className="w-full cursor-pointer pl-6" />}>Manajemen Data</DropdownMenuItem>
                      </DropdownMenuGroup>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger className="relative h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
                  <Avatar className="h-8 w-8">
                    {user.photoUrl ? (
                      <img src={user.photoUrl} alt="Profile" className="object-cover h-full w-full" />
                    ) : (
                      <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                        {user.name?.charAt(0) || 'A'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.nip}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {isAuthorized ? (
            <Outlet />
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="bg-red-50 dark:bg-red-500/10 text-red-500 p-4 rounded-full mb-4">
                <Activity className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">Akses Ditolak</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md">
                Anda tidak memiliki hak akses untuk membuka halaman ini. Silakan hubungi Superadmin jika Anda membutuhkan akses.
              </p>
              <Button className="mt-6" onClick={() => navigate('/admin')}>
                Kembali ke Dashboard
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
