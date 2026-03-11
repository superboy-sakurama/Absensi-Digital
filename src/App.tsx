import React, { useState, useEffect, useRef } from 'react';
import { 
  User as UserIcon, 
  Camera, 
  MapPin, 
  History, 
  LogOut, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Download,
  Menu,
  X,
  ChevronRight,
  Briefcase,
  Calendar,
  Stethoscope,
  AlertCircle,
  RefreshCw,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { cn } from './lib/utils';
import { User, Attendance, Permission } from './types';

// Firebase Imports
import { auth, db, storage } from './lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import AdminDashboard from './components/AdminDashboard';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

const getDeviceInfo = () => {
  return navigator.userAgent;
};

// --- Components ---

const Button = ({ className, variant = 'primary', ...props }: any) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
    outline: 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  return (
    <button 
      className={cn('px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2', variants[variant as keyof typeof variants], className)} 
      {...props} 
    />
  );
};

export const Card = ({ children, className }: any) => (
  <div className={cn('bg-white rounded-2xl border border-zinc-100 shadow-sm p-6', className)}>
    {children}
  </div>
);

const formatTimestamp = (ts: any) => {
  if (!ts) return '-';
  if (typeof ts === 'object' && 'toDate' in ts) return ts.toDate().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  return new Date(ts).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<'login' | 'register' | 'dashboard' | 'attendance' | 'history' | 'admin' | 'permission' | 'profile' | 'forgot-password' | 'rekap' | 'notifications'>('login');
  const [history, setHistory] = useState<Attendance[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [indexErrorUrl, setIndexErrorUrl] = useState<string | null>(null);
  const [permissionsIndexErrorUrl, setPermissionsIndexErrorUrl] = useState<string | null>(null);
  const [isIndexBuilding, setIsIndexBuilding] = useState(false);
  const [isPermissionsIndexBuilding, setIsPermissionsIndexBuilding] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auto-logout after 10 hours of inactivity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 10 hours in milliseconds
      timeoutId = setTimeout(() => {
        if (auth.currentUser) {
          signOut(auth);
          toast.error('Sesi Anda telah berakhir karena tidak ada aktivitas selama 10 jam.');
        }
      }, 10 * 60 * 60 * 1000);
    };

    // Initialize timer
    resetTimer();

    // Add event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  // Shift end notification
  useEffect(() => {
    if (!user || user.role === 'admin') return;

    const checkShiftEnd = async () => {
      const now = new Date();
      // Check if it's past 16:00 (4 PM)
      if (now.getHours() >= 16) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        try {
          // Check if checked in today
          const qMasuk = query(
            collection(db, 'attendance'),
            where('user_id', '==', user.id),
            where('type', '==', 'Masuk'),
            where('timestamp', '>=', today),
            where('timestamp', '<', tomorrow)
          );
          const snapshotMasuk = await getDocs(qMasuk);

          if (!snapshotMasuk.empty) {
            // Check if already checked out
            const qPulang = query(
              collection(db, 'attendance'),
              where('user_id', '==', user.id),
              where('type', '==', 'Pulang'),
              where('timestamp', '>=', today),
              where('timestamp', '<', tomorrow)
            );
            const snapshotPulang = await getDocs(qPulang);

            if (snapshotPulang.empty) {
              // Check if we already notified today
              const lastNotified = localStorage.getItem(`shift_notified_${today.toISOString()}`);
              if (!lastNotified) {
                toast('Waktu shift Anda sudah berakhir. Silakan lakukan absensi pulang.', {
                  icon: '⏰',
                  duration: 8000,
                  style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                  },
                });
                // Play alarm sound
                try {
                  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                  audio.play().catch(e => console.log("Audio play failed:", e));
                } catch (e) {}
                
                localStorage.setItem(`shift_notified_${today.toISOString()}`, 'true');
              }
            }
          }
        } catch (err) {
          console.error("Error checking shift end:", err);
        }
      }
    };

    // Check immediately and then every 5 minutes
    checkShiftEnd();
    const intervalId = setInterval(checkShiftEnd, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUser({ ...userData, id: firebaseUser.uid as any });
            setView('dashboard');
            
            if (userData.role === 'admin') {
              const q = query(collection(db, 'users'), orderBy('name', 'asc'));
              const snapshot = await getDocs(q);
              setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User)));
            }
          } else {
            // User exists in Auth but not in Firestore
            // This can happen if registration was interrupted
            console.warn("User document not found in Firestore");
            setUser({ 
              id: firebaseUser.uid as any, 
              name: firebaseUser.displayName || 'User', 
              email: firebaseUser.email || '', 
              nip: '-', 
              role: 'user' 
            });
            setView('dashboard');
          }
        } else {
          setUser(null);
          setView('login');
        }
      } catch (err: any) {
        console.error("Auth state change error:", err);
        if (firebaseUser) {
          // If we have a firebaseUser but Firestore failed (likely permissions),
          // don't kick them out. Let them see the dashboard with limited info.
          setUser({ 
            id: firebaseUser.uid as any, 
            name: firebaseUser.displayName || 'User (Limited Profile)', 
            email: firebaseUser.email || '', 
            nip: '-', 
            role: 'user' 
          });
          setView('dashboard');
          if (err.message?.includes('permission')) {
            toast.error('Peringatan: Izin Firestore ditolak. Beberapa fitur mungkin tidak berfungsi.');
          }
        } else {
          setUser(null);
          setView('login');
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Berhasil keluar');
    } catch (err) {
      toast.error('Gagal keluar');
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    setIndexErrorUrl(null);
    setIsIndexBuilding(false);
    try {
      let q;
      if (user.role === 'admin') {
        q = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'));
      } else {
        q = query(collection(db, 'attendance'), where('user_id', '==', user.id), orderBy('timestamp', 'desc'));
      }
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Attendance));
      setHistory(data);
    } catch (err: any) {
      console.error("Fetch history error:", err);
      if (err.message?.includes('index')) {
        const isBuilding = err.message.includes('building');
        const indexUrl = err.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/)?.[0];
        
        setIndexErrorUrl(indexUrl || null);
        setIsIndexBuilding(isBuilding);

        toast.error(
          <div className="flex flex-col gap-2">
            <p className="font-bold">{isBuilding ? 'Indeks Sedang Dibuat' : 'Indeks Firestore Diperlukan'}</p>
            <p className="text-xs">
              {isBuilding 
                ? 'Indeks sedang dalam proses pembuatan. Silakan tunggu beberapa menit lalu segarkan halaman.' 
                : 'Klik tombol di bawah untuk membuat indeks yang diperlukan agar riwayat absensi bisa tampil.'}
            </p>
            {indexUrl && (
              <div className="flex flex-col gap-2">
                <a 
                  href={indexUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white text-emerald-600 px-3 py-1 rounded-lg text-xs font-bold text-center border border-emerald-200 hover:bg-emerald-50"
                >
                  {isBuilding ? 'Cek Status Indeks' : 'Buat Indeks Sekarang'}
                </a>
                <button
                  onClick={() => {
                    toast.dismiss();
                    fetchHistory();
                  }}
                  className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold text-center border border-emerald-200 hover:bg-emerald-700"
                >
                  Coba Lagi
                </button>
              </div>
            )}
          </div>,
          { duration: 15000 }
        );
      } else if (err.message?.includes('permission')) {
        toast.error('Gagal mengambil riwayat: Izin ditolak (Firestore Rules)');
      } else {
        toast.error('Gagal mengambil riwayat');
      }
    }
  };

  const fetchPermissions = async () => {
    if (!user) return;
    setPermissionsIndexErrorUrl(null);
    setIsPermissionsIndexBuilding(false);
    try {
      let q;
      if (user.role === 'admin') {
        q = query(collection(db, 'permissions'), orderBy('timestamp', 'desc'));
      } else {
        q = query(collection(db, 'permissions'), where('user_id', '==', user.id), orderBy('timestamp', 'desc'));
      }
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Permission));
      setPermissions(data);
    } catch (err: any) {
      console.error("Fetch permissions error:", err);
      if (err.message?.includes('index')) {
        const isBuilding = err.message.includes('building');
        const indexUrl = err.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/)?.[0];
        
        setPermissionsIndexErrorUrl(indexUrl || null);
        setIsPermissionsIndexBuilding(isBuilding);

        toast.error(
          <div className="flex flex-col gap-2">
            <p className="font-bold">{isBuilding ? 'Indeks Sedang Dibuat' : 'Indeks Firestore Diperlukan'}</p>
            <p className="text-xs">
              {isBuilding 
                ? 'Indeks sedang dalam proses pembuatan. Silakan tunggu beberapa menit lalu segarkan halaman.' 
                : 'Klik tombol di bawah untuk membuat indeks yang diperlukan agar data izin bisa tampil.'}
            </p>
            {indexUrl && (
              <div className="flex flex-col gap-2">
                <a 
                  href={indexUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-bold text-center border border-blue-200 hover:bg-blue-50"
                >
                  {isBuilding ? 'Cek Status Indeks' : 'Buat Indeks Sekarang'}
                </a>
                <button
                  onClick={() => {
                    toast.dismiss();
                    fetchPermissions();
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold text-center border border-blue-200 hover:bg-blue-700"
                >
                  Coba Lagi
                </button>
              </div>
            )}
          </div>,
          { duration: 15000 }
        );
      } else if (err.message?.includes('permission')) {
        toast.error('Gagal mengambil data izin: Izin ditolak (Firestore Rules)');
      } else {
        toast.error('Gagal mengambil data izin');
      }
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'notifications'), where('user_id', '==', user.id));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      // Sort in client
      data.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });
      setNotifications(data);
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  };

  useEffect(() => {
    if (user && (view === 'history' || view === 'admin' || view === 'dashboard')) {
      fetchHistory();
      fetchPermissions();
      fetchNotifications();
    }
  }, [view, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Toaster position="top-center" />
      
      <AnimatePresence mode="wait">
        {view === 'login' && (
          <LoginView 
            onSwitch={() => setView('register')} 
            onForgot={() => setView('forgot-password')}
            setView={setView}
          />
        )}
        
        {view === 'forgot-password' && (
          <ForgotPasswordView 
            onSuccess={() => setView('login')} 
            onBack={() => setView('login')} 
          />
        )}
        
        {view === 'register' && (
          <RegisterView 
            onSuccess={() => setView('login')} 
            onSwitch={() => setView('login')} 
          />
        )}

        {user && (
          <div className="pb-24 lg:pb-0 lg:pl-64">
            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-zinc-100 p-6">
              <div className="mb-10">
                <h1 className="text-xl font-bold text-emerald-600 tracking-tight">Si Abon Elite</h1>
                <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest mt-1">Attendance System</p>
              </div>

              <nav className="flex-1 space-y-2">
                <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Menu size={20} />} label="Menu Utama" />
                <NavItem active={view === 'attendance'} onClick={() => setView('attendance')} icon={<Camera size={20} />} label="Absensi" />
                <NavItem active={view === 'rekap'} onClick={() => setView('rekap')} icon={<Calendar size={20} />} label="Rekap Absensi" />
                <NavItem active={view === 'permission'} onClick={() => setView('permission')} icon={<FileText size={20} />} label="Izin / Sakit" />
                <NavItem active={view === 'history'} onClick={() => setView('history')} icon={<History size={20} />} label="Riwayat Saya" />
                {user.role === 'admin' && (
                  <NavItem active={view === 'admin'} onClick={() => setView('admin')} icon={<Shield size={20} />} label="Admin Panel" />
                )}
                <NavItem active={view === 'profile'} onClick={() => setView('profile')} icon={<UserIcon size={20} />} label="Profil" />
              </nav>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-auto font-medium"
              >
                <LogOut size={20} />
                <span>Keluar</span>
              </button>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-6 py-3 flex justify-between items-center z-50">
              <MobileNavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Menu size={24} />} />
              <MobileNavItem active={view === 'rekap'} onClick={() => setView('rekap')} icon={<Calendar size={24} />} />
              <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center -mt-10 shadow-lg shadow-emerald-200 border-4 border-white" onClick={() => setView('attendance')}>
                <CheckCircle size={24} className="text-white" />
              </div>
              <MobileNavItem active={view === 'permission'} onClick={() => setView('permission')} icon={<FileText size={24} />} />
              <MobileNavItem active={view === 'profile'} onClick={() => setView('profile')} icon={<UserIcon size={24} />} />
            </nav>

            {/* Main Content */}
            <main className="p-6 max-w-5xl mx-auto">
              {view === 'dashboard' && <DashboardView user={user} history={history} notifications={notifications} setView={setView} />}
              {view === 'attendance' && <AttendanceView user={user} onComplete={() => setView('rekap')} fetchNotifications={fetchNotifications} setView={setView} />}
              {view === 'rekap' && <RekapView user={user} />}
              {view === 'history' && <HistoryView history={history} indexErrorUrl={indexErrorUrl} isBuilding={isIndexBuilding} />}
              {view === 'permission' && <PermissionView user={user} permissions={permissions} onComplete={fetchPermissions} indexErrorUrl={permissionsIndexErrorUrl} isBuilding={isPermissionsIndexBuilding} />}
              {view === 'admin' && <AdminView history={history} permissions={permissions} users={users} />}
              {view === 'profile' && <ProfileView user={user} onLogout={handleLogout} />}
              {view === 'notifications' && <NotificationsView notifications={notifications} setView={setView} fetchNotifications={fetchNotifications} />}
            </main>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-Views ---

function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium",
        active ? "bg-emerald-50 text-emerald-600" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MobileNavItem({ active, onClick, icon }: any) {
  return (
    <button onClick={onClick} className={cn("p-2 transition-colors", active ? "text-emerald-600" : "text-zinc-400")}>
      {icon}
    </button>
  );
}

function LoginView({ onSwitch, onForgot, setView }: any) {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const trimmedNip = nip.trim();
    try {
      // Find email by NIP
      const q = query(collection(db, 'users'), where('nip', '==', trimmedNip));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('NIP tidak ditemukan. Pastikan NIP Anda benar.');
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const email = userData.email;

      // Check status
      if (userData.status === 'pending') {
        throw new Error('Akun Anda sedang menunggu persetujuan admin.');
      }

      // Check device binding
      const currentDeviceId = getDeviceId();
      if (userData.deviceId && userData.deviceId !== currentDeviceId && userData.role !== 'admin') {
        throw new Error('Akun ini sudah terikat dengan perangkat lain. Hubungi admin untuk mereset perangkat.');
      }

      await signInWithEmailAndPassword(auth, email, password);
      
      // Update deviceId if not set
      if (!userData.deviceId && userData.role !== 'admin') {
        await updateDoc(doc(db, 'users', userDoc.id), {
          deviceId: currentDeviceId,
          deviceInfo: getDeviceInfo()
        });
      }

      toast.success('Selamat datang kembali!');
      setView('dashboard');
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'permission-denied' || err.message?.includes('permissions')) {
        toast.error('Gagal akses database. Pastikan Firestore Security Rules sudah diatur ke "allow read: if true" untuk koleksi users.', { duration: 6000 });
      } else {
        toast.error(err.message || 'Gagal masuk. Periksa NIP dan password Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex items-center justify-center p-6"
    >
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Si Abon Elite</h1>
          <p className="text-zinc-500 mt-1">Masuk dengan NIP Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Nomor Induk Pegawai (NIP)</label>
            <input 
              type="text" 
              required
              value={nip}
              onChange={e => setNip(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="Masukkan NIP"
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium text-zinc-700">Kata Sandi</label>
              <button type="button" onClick={onForgot} className="text-xs text-emerald-600 font-semibold hover:underline">Lupa Password?</button>
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full py-3 text-lg" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk Sekarang'}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Belum punya akun?{' '}
          <button onClick={onSwitch} className="text-emerald-600 font-semibold hover:underline">Daftar di sini</button>
        </p>
      </Card>
    </motion.div>
  );
}

function ForgotPasswordView({ onSuccess, onBack }: any) {
  const [nip, setNip] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const trimmedNip = nip.trim();
    try {
      // Find email by NIP
      const q = query(collection(db, 'users'), where('nip', '==', trimmedNip));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('NIP tidak ditemukan. Pastikan NIP Anda benar.');
      }

      const userDoc = querySnapshot.docs[0];
      const email = userDoc.data().email;

      if (!email) {
        throw new Error('Email tidak ditemukan untuk NIP ini.');
      }

      await sendPasswordResetEmail(auth, email);
      
      // Mask email for privacy
      const [userPart, domainPart] = email.split('@');
      const maskedEmail = userPart.substring(0, 2) + '***@' + domainPart;
      
      toast.success(`Email reset password telah dikirim ke email terdaftar (${maskedEmail})!`, { duration: 5000 });
      onSuccess();
    } catch (err: any) {
      console.error("Forgot password error:", err);
      if (err.code === 'permission-denied' || err.message?.includes('permissions')) {
        toast.error('Gagal akses database. Periksa Firestore Security Rules Anda.', { duration: 6000 });
      } else {
        toast.error(err.message || 'Gagal mengirim email reset.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex items-center justify-center p-6"
    >
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Lupa Password</h1>
          <p className="text-zinc-500 mt-1">Masukkan NIP Anda untuk mereset password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">NIP Pegawai</label>
            <input 
              type="text" 
              required
              value={nip}
              onChange={e => setNip(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Masukkan NIP Anda"
            />
          </div>
          <Button type="submit" className="w-full py-3" disabled={loading}>
            {loading ? 'Mengirim...' : 'Kirim Email Reset'}
          </Button>
          <Button type="button" variant="outline" onClick={onBack} className="w-full py-3">
            Kembali ke Login
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}

function RegisterView({ onSuccess, onSwitch }: any) {
  const [formData, setFormData] = useState({ nip: '', email: '', password: '', name: '', secretCode: '', village: '' });
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const trimmedNip = formData.nip.trim();
    try {
      if (isAdmin && formData.secretCode !== 'Mastri123') {
        throw new Error('Kode rahasia admin salah.');
      }

      // Check if NIP already exists
      const qNip = query(collection(db, 'users'), where('nip', '==', trimmedNip));
      const nipSnapshot = await getDocs(qNip);
      if (!nipSnapshot.empty) {
        throw new Error('NIP sudah terdaftar. Gunakan NIP lain atau hubungi admin.');
      }

      // Check for similar names
      const allUsersSnapshot = await getDocs(collection(db, 'users'));
      const newNameLower = formData.name.toLowerCase().replace(/\s+/g, '');
      let isSimilar = false;
      
      allUsersSnapshot.forEach(doc => {
        const existingName = doc.data().name.toLowerCase().replace(/\s+/g, '');
        if (existingName === newNameLower || 
            (existingName.includes(newNameLower) && existingName.length - newNameLower.length < 3) ||
            (newNameLower.includes(existingName) && newNameLower.length - existingName.length < 3)) {
          isSimilar = true;
        }
      });

      if (isSimilar && !isAdmin) {
        throw new Error('Nama yang mirip sudah terdaftar. Silakan hubungi admin untuk mendaftar.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      // Save extra info to Firestore
      try {
        await setDoc(doc(db, 'users', user.uid), {
          nip: trimmedNip,
          email: formData.email,
          name: formData.name,
          role: isAdmin ? 'admin' : 'user',
          village: formData.village.trim(),
          deviceId: getDeviceId(),
          deviceInfo: getDeviceInfo(),
          status: 'active',
          createdAt: serverTimestamp()
        });
      } catch (firestoreErr: any) {
        console.error("Firestore user creation error:", firestoreErr);
        if (firestoreErr.code === 'permission-denied') {
          toast.error('Akun dibuat, tapi gagal menyimpan profil. Periksa Firestore Security Rules Anda.', { duration: 6000 });
        } else {
          toast.error('Akun dibuat, tapi gagal menyimpan profil ke Firestore');
        }
      }

      toast.success('Pendaftaran berhasil!');
      onSuccess();
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.code === 'permission-denied') {
        toast.error('Gagal akses database saat validasi NIP. Periksa Firestore Security Rules.', { duration: 6000 });
      } else {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex items-center justify-center p-6"
    >
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Daftar Akun Baru</h1>
          <p className="text-zinc-500 mt-1">Lengkapi data diri Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Nama Lengkap</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Nama Desa Tempat Bekerja</label>
            <input 
              type="text" 
              required
              placeholder="Contoh: Dibee"
              value={formData.village}
              onChange={e => setFormData({...formData, village: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">NIP</label>
            <input 
              type="text" 
              required
              value={formData.nip}
              onChange={e => setFormData({...formData, nip: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Kata Sandi</label>
            <input 
              type="password" 
              required
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="isAdmin" 
              checked={isAdmin} 
              onChange={e => setIsAdmin(e.target.checked)} 
              className="w-4 h-4 text-emerald-600 rounded border-zinc-300 focus:ring-emerald-500"
            />
            <label htmlFor="isAdmin" className="text-sm font-medium text-zinc-700">Daftar sebagai Admin</label>
          </div>
          {isAdmin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Kode Rahasia Admin</label>
              <input 
                type="password" 
                required={isAdmin}
                value={formData.secretCode}
                onChange={e => setFormData({...formData, secretCode: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Masukkan kode rahasia"
              />
            </motion.div>
          )}
          <Button type="submit" className="w-full py-3" disabled={loading}>
            {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Sudah punya akun?{' '}
          <button onClick={onSwitch} className="text-emerald-600 font-semibold hover:underline">Masuk di sini</button>
        </p>
      </Card>
    </motion.div>
  );
}

function NotificationsView({ notifications, setView, fetchNotifications }: any) {
  useEffect(() => {
    const markAsRead = async () => {
      const unread = notifications.filter((n: any) => !n.read);
      if (unread.length === 0) return;
      
      try {
        const batch = writeBatch(db);
        unread.forEach((n: any) => {
          const ref = doc(db, 'notifications', n.id);
          batch.update(ref, { read: true });
        });
        await batch.commit();
        fetchNotifications();
      } catch (err) {
        console.error("Error marking notifications as read:", err);
      }
    };
    markAsRead();
  }, [notifications, fetchNotifications]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notifikasi</h2>
        <Button variant="outline" onClick={() => setView('dashboard')}>Kembali</Button>
      </header>
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <p className="text-center text-zinc-500">Tidak ada notifikasi.</p>
        ) : (
          notifications.map((n: any) => (
            <Card key={n.id} className="p-4 flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${n.read ? 'bg-zinc-300' : 'bg-red-500'}`} />
              <div>
                <p className="text-sm">{n.message}</p>
                <p className="text-xs text-zinc-400">{n.timestamp?.toDate().toLocaleString()}</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </motion.div>
  );
}

function DashboardView({ user, history, notifications, setView }: any) {
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Halo, {user.name}</h2>
          <p className="text-zinc-500 font-medium">{today}</p>
          {user.village && (
            <p className="text-emerald-600 font-medium text-sm mt-1 flex items-center gap-1">
              <MapPin size={14} /> Lokasi Kerja: {user.village}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('notifications')}
            className="relative p-2 text-zinc-500 hover:bg-zinc-100 rounded-full"
          >
            <Bell size={24} />
            {notifications.filter((n: any) => !n.read).length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-zinc-100 shadow-sm">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <UserIcon size={20} />
            </div>
            <div className="pr-4">
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">NIP Pegawai</p>
              <p className="text-sm font-bold">{user.nip}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MenuCard 
          icon={<Camera className="text-emerald-600" />} 
          title="Absensi" 
          desc="Lakukan absensi masuk atau pulang" 
          onClick={() => setView('attendance')}
          color="bg-emerald-50"
        />
        <MenuCard 
          icon={<Calendar className="text-orange-600" />} 
          title="Rekap Absensi" 
          desc={user.role === 'admin' ? "Lihat rekapan absensi pegawai" : "Lihat rekapan absensi pribadi"} 
          onClick={() => setView('rekap')}
          color="bg-orange-50"
        />
        <MenuCard 
          icon={<FileText className="text-blue-600" />} 
          title="Izin / Sakit" 
          desc="Ajukan permohonan izin atau sakit" 
          onClick={() => setView('permission')}
          color="bg-blue-50"
        />
        {user.role === 'admin' && (
          <MenuCard 
            icon={<Shield className="text-red-600" />} 
            title="Admin Panel" 
            desc="Kelola data absensi, izin, dan pengaturan" 
            onClick={() => setView('admin')}
            color="bg-red-50"
          />
        )}
        <MenuCard 
          icon={<UserIcon className="text-purple-600" />} 
          title="Profil" 
          desc="Lihat dan ubah informasi profil" 
          onClick={() => setView('profile')}
          color="bg-purple-50"
        />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Aktivitas Terakhir</h3>
          <button onClick={() => setView('history')} className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:underline">
            Lihat Semua <ChevronRight size={16} />
          </button>
        </div>
        <div className="space-y-4">
          {history.slice(0, 3).map((item: Attendance, idx: number) => (
            <Card key={item.id || `hist-${idx}`} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  item.type === 'Masuk' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                )}>
                  {item.type === 'Masuk' ? <Clock size={24} /> : <LogOut size={24} />}
                </div>
                  <p className="font-bold">{item.type}</p>
                  <p className="text-xs text-zinc-500">
                    {formatTimestamp(item.timestamp)}
                  </p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-xs font-bold">
                  {item.status}
                </span>
              </div>
            </Card>
          ))}
          {history.length === 0 && (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-zinc-200">
              <p className="text-zinc-400">Belum ada riwayat absensi hari ini</p>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}

function MenuCard({ icon, title, desc, onClick, color }: any) {
  return (
    <button 
      onClick={onClick}
      className="group bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col gap-4 active:scale-95"
    >
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", color)}>
        {React.cloneElement(icon, { size: 28 })}
      </div>
      <div>
        <h4 className="text-lg font-bold">{title}</h4>
        <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
      </div>
    </button>
  );
}

function AttendanceView({ user, onComplete, fetchNotifications, setView }: any) {
  const [type, setType] = useState<'Masuk' | 'Pulang' | 'Dinas Luar'>('Masuk');
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng });
        
        // Fetch address from Nominatim
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          const data = await response.json();
          if (data && data.address) {
            const addr = data.address;
            const desa = addr.village || addr.suburb || addr.neighbourhood || addr.hamlet || '';
            const kecamatan = addr.city_district || addr.district || '';
            const kabupaten = addr.city || addr.regency || addr.county || '';
            
            const formattedAddress = [desa, kecamatan, kabupaten].filter(Boolean).join(', ');
            setAddress(formattedAddress || 'Lokasi tidak dikenal');
          }
        } catch (err) {
          console.error("Geocoding error:", err);
          setAddress('Gagal memuat alamat');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        toast.error('Gagal mendapatkan lokasi. Pastikan GPS aktif dan izin diberikan.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    const fetchBranches = async () => {
      const q = query(collection(db, 'branches'));
      const snapshot = await getDocs(q);
      setBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchBranches();
    fetchLocation();
  }, []);

  useEffect(() => {
    if (cameraActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraActive, stream]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(s);
      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      toast.error('Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.');
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 300;
        let width = videoRef.current.videoWidth;
        let height = videoRef.current.videoHeight;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvasRef.current.width = width;
        canvasRef.current.height = height;
        context.drawImage(videoRef.current, 0, 0, width, height);
        
        // Compress image to 30% quality JPEG
        const data = canvasRef.current.toDataURL('image/jpeg', 0.3);
        setPhoto(data);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const handleSubmit = async () => {
    if (!photo) {
      toast.error('Silakan ambil foto terlebih dahulu');
      return;
    }
    if (!location) {
      toast.error('Gagal mendapatkan lokasi GPS. Pastikan GPS aktif.');
      return;
    }
    
    if (!user) {
      toast.error('Sesi pengguna tidak valid. Silakan login ulang.');
      return;
    }

    setLoading(true);

    try {
      if (type === 'Masuk') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const qMasuk = query(
          collection(db, 'attendance'),
          where('user_id', '==', user.id),
          where('type', '==', 'Masuk'),
          where('timestamp', '>=', today),
          where('timestamp', '<', tomorrow)
        );
        
        const snapshotMasuk = await getDocs(qMasuk);
        if (!snapshotMasuk.empty) {
          toast.error('Anda sudah melakukan absensi pada periode shift saat ini, silahkan absensi pulang terlebih dulu');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Error checking previous attendance:", err);
    }

    // Validasi lokasi berdasarkan nama desa (hanya untuk absensi masuk)
    if (type === 'Masuk') {
      console.log("Validating location for Masuk");
      console.log("Address:", address);
      console.log("User Village:", user.village);
      console.log("Branches:", branches);

      // Check if user is in any branch
      const isAtBranch = branches.some(branch => {
        if (!branch.name || !address) return false;
        return address.toLowerCase().includes(branch.name.toLowerCase());
      });

      // Check if user is in their registered village
      const isAtVillage = user.village && address && address.toLowerCase().includes(user.village.toLowerCase());
      
      // Check for 'dibee' (special case)
      const isAtDibee = address && address.toLowerCase().includes('dibee');

      const isWithinRange = isAtBranch || isAtVillage || isAtDibee;

      console.log("Is at branch:", isAtBranch);
      console.log("Is at village:", isAtVillage);
      console.log("Is at dibee:", isAtDibee);
      console.log("Is within range:", isWithinRange);

      if (!isWithinRange) {
        setLoading(false);
        toast.error('Anda tidak sedang berada di wilayah kerja anda. Mengalihkan ke menu izin...', { duration: 4000 });
        setTimeout(() => {
          setView('permission');
        }, 2000);
        return;
      }
    }

    if (!navigator.onLine) {
      setLoading(false);
      toast.error('Tidak ada koneksi internet. Pastikan perangkat Anda terhubung ke internet.');
      return;
    }

    try {
      // 1. Upload photo to Firebase Storage
      let photoUrl = '';
      try {
        const timestamp = Date.now();
        const photoRef = ref(storage, `attendance/${user.id}/${timestamp}.jpg`);
        
        // Ensure photo is a valid data URL
        if (!photo.startsWith('data:image/')) {
          throw new Error('Format foto tidak valid');
        }

        // Upload to Firebase Storage
        await uploadString(photoRef, photo, 'data_url');
        photoUrl = await getDownloadURL(photoRef);
      } catch (storageErr: any) {
        console.warn("Storage upload error:", storageErr);
        if (storageErr.code === 'storage/unauthorized') {
          throw new Error('Gagal mengunggah foto: Izin ditolak. Periksa Firebase Storage Rules.');
        }
        
        if (storageErr.code === 'storage/retry-limit-exceeded') {
          console.warn("Storage retry limit exceeded, falling back to base64");
          photoUrl = photo;
        } else {
          // Fallback: Use base64 string directly if storage fails
          console.warn("Falling back to base64 photo due to storage error");
          photoUrl = photo;
        }
      }

      // 2. Save attendance to Firestore
      try {
        const attendanceData = {
          user_id: user.id,
          name: user.name || 'Pegawai',
          nip: user.nip || '-',
          type,
          latitude: location.lat,
          longitude: location.lng,
          address: address || '',
          photo: photoUrl,
          status: 'Hadir',
          timestamp: serverTimestamp()
        };

        await addDoc(collection(db, 'attendance'), attendanceData);

        // Add notification
        try {
          await addDoc(collection(db, 'notifications'), {
            user_id: user.id,
            message: `Absensi ${type} berhasil dicatat pada ${new Date().toLocaleString()}`,
            read: false,
            timestamp: serverTimestamp()
          });
          fetchNotifications(); // Refresh notifications
        } catch (notifErr) {
          console.error("Notification error:", notifErr);
        }
      } catch (firestoreErr: any) {
        console.error("Firestore attendance error:", firestoreErr);
        if (firestoreErr.code === 'permission-denied') {
          throw new Error('Gagal menyimpan data: Izin ditolak. Periksa Firestore Security Rules.');
        }
        throw new Error('Gagal menyimpan data absensi: ' + (firestoreErr.message || 'Error tidak diketahui'));
      }

      // Send to Webhook if configured
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists() && settingsDoc.data().webhookUrl) {
          const webhookUrl = settingsDoc.data().webhookUrl.trim();
          if (webhookUrl) {
            fetch(webhookUrl, {
              method: 'POST',
              mode: 'no-cors',
              keepalive: true,
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                recordType: 'Absensi',
                name: user.name || 'Pegawai',
                nip: user.nip || '-',
                type: type,
                status: 'Hadir',
                address: address || '',
                photo: photoUrl
              })
            }).catch(err => console.error("Webhook fetch error:", err));
          }
        }
      } catch (webhookErr) {
        console.error("Webhook error:", webhookErr);
      }

      toast.success('Absensi berhasil dicatat');
      setPhoto(''); // Clear photo after success
      onComplete();
    } catch (err: any) {
      console.error("Attendance submission error:", err);
      toast.error(err.message || 'Gagal mencatat absensi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl mx-auto space-y-6">
      <Card>
        <h2 className="text-2xl font-bold mb-6">Ambil Absensi</h2>
        
        <div className="flex gap-2 mb-6 p-1 bg-zinc-100 rounded-xl">
          {(['Masuk', 'Pulang', 'Dinas Luar'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                type === t ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden mb-6 border-4 border-white shadow-xl">
          {photo ? (
            <img src={photo} className="w-full h-full object-cover" alt="Captured" />
          ) : cameraActive ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
              <Camera size={48} className="opacity-20" />
              <Button onClick={startCamera} variant="secondary">Aktifkan Kamera</Button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {cameraActive && (
          <Button onClick={takePhoto} className="w-full mb-4 py-4 rounded-2xl flex items-center justify-center gap-2">
            <Camera size={20} /> Ambil Foto
          </Button>
        )}

        {photo && (
          <Button onClick={() => setPhoto(null)} variant="outline" className="w-full mb-4">Ulangi Foto</Button>
        )}

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
            <div className="flex items-center gap-3">
              <MapPin className="text-emerald-600" size={20} />
              <div>
                <p className="font-bold">Lokasi GPS</p>
                <p className="text-zinc-500">
                  {address ? address : location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : isLocating ? 'Mencari lokasi...' : 'Lokasi belum terdeteksi'}
                </p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={fetchLocation} 
              disabled={isLocating}
              className="p-2 text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
              title="Deteksi Ulang Lokasi"
            >
              <RefreshCw size={18} className={isLocating ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={loading || !photo || !location}
          className="w-full mt-8 py-4 text-lg rounded-2xl shadow-lg shadow-emerald-100"
        >
          {loading ? 'Mengirim...' : 'Kirim Absensi'}
        </Button>
      </Card>
    </motion.div>
  );
}

const getShiftInfo = (date: Date) => {
  const hour = date.getHours();
  if (hour >= 7 && hour < 14) return { name: 'Shift Pagi', range: '07.00 - 14.00' };
  if (hour >= 14 && hour < 20) return { name: 'Shift Siang', range: '14.00 - 20.00' };
  return { name: 'Shift Malam', range: '20.00 - 07.00' };
};

function RekapView({ user }: { user: User }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(user.role === 'admin' ? 'all' : user.id);

  const formatDateForInput = (date: any) => {
    if (!date) return '';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  };

  useEffect(() => {
    if (user.role === 'admin') {
      const fetchUsers = async () => {
        try {
          const q = query(collection(db, 'users'), orderBy('name', 'asc'));
          const snapshot = await getDocs(q);
          const userList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
          setUsers(userList);
        } catch (err) {
          console.error("Fetch users error:", err);
        }
      };
      fetchUsers();
    }
  }, [user.role]);

  useEffect(() => {
    if (user.role === 'admin') {
      const today = new Date();
      if (selectedUserId === 'all') {
        const todayStr = formatDateForInput(today);
        setStartDate(todayStr);
        setEndDate(todayStr);
        fetchData(todayStr, todayStr, 'all');
      } else {
        const tenDaysAgo = new Date(today);
        tenDaysAgo.setDate(today.getDate() - 10);
        const startStr = formatDateForInput(tenDaysAgo);
        const endStr = formatDateForInput(today);
        setStartDate(startStr);
        setEndDate(endStr);
        fetchData(startStr, endStr, selectedUserId);
      }
    }
  }, [selectedUserId, user.role]);

  const fetchData = async (startStr: string, endStr: string, userId: string) => {
    if (!startStr || !endStr) return;
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    // Max 1 month validation
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 31) {
      return toast.error('Maksimal rentang adalah 1 bulan');
    }

    if (start > end) {
      return toast.error('Tanggal mulai tidak boleh lebih besar dari tanggal selesai');
    }

    setLoading(true);
    try {
      let q;
      if (user.role === 'admin' && userId === 'all') {
        q = query(
          collection(db, 'attendance'),
          where('timestamp', '>=', Timestamp.fromDate(start)),
          where('timestamp', '<=', Timestamp.fromDate(new Date(end.getTime() + 86400000))),
          orderBy('timestamp', 'desc')
        );
      } else {
        q = query(
          collection(db, 'attendance'),
          where('user_id', '==', userId),
          where('timestamp', '>=', Timestamp.fromDate(start)),
          where('timestamp', '<=', Timestamp.fromDate(new Date(end.getTime() + 86400000))),
          orderBy('timestamp', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Attendance));
      setData(results);
      if (results.length === 0) {
        toast.error('Tidak ada data absensi pada rentang tanggal tersebut');
      } else {
        toast.success(`Berhasil memuat ${results.length} data`);
      }
    } catch (err: any) {
      console.error("Rekap fetch error:", err);
      toast.error('Gagal mengambil data rekap');
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async () => {
    if (!startDate || !endDate) return toast.error('Pilih rentang tanggal');
    fetchData(startDate, endDate, selectedUserId);
  };

  const exportToExcel = () => {
    if (data.length === 0) return toast.error('Tidak ada data untuk diekspor');
    
    if (selectedUserId === 'all') {
      const dateSet = new Set<string>();
      const userRecords: Record<string, any> = {};

      data.forEach(item => {
        const d = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
        const yyyymmdd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
        const [year, month, day] = yyyymmdd.split('-');
        const dateStr = `${day}-${month}-${year}`;
        
        dateSet.add(dateStr);

        const userId = item.user_id;
        if (!userRecords[userId]) {
          userRecords[userId] = {
            Nama: item.name || '-',
            NIP: item.nip || '-',
          };
        }

        if (!userRecords[userId][dateStr]) {
          userRecords[userId][dateStr] = item.type;
        } else {
          if (!userRecords[userId][dateStr].includes(item.type)) {
             userRecords[userId][dateStr] += `, ${item.type}`;
          }
        }
      });

      const sortedDates = Array.from(dateSet).sort((a, b) => {
        const [d1, m1, y1] = a.split('-');
        const [d2, m2, y2] = b.split('-');
        return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime();
      });

      const exportData = Object.values(userRecords).map(record => {
        const row: any = {
          Nama: record.Nama,
          NIP: record.NIP,
        };
        sortedDates.forEach(date => {
          row[date] = record[date] || '-';
        });
        return row;
      });

      exportData.sort((a, b) => a.Nama.localeCompare(b.Nama));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
      XLSX.writeFile(wb, `Rekap_Absensi_Semua_User_${startDate}_${endDate}.xlsx`);
    } else {
      const exportData = data.map(item => ({
        Nama: item.name || '-',
        NIP: item.nip || '-',
        Tanggal: formatTimestamp(item.timestamp),
        Tipe: item.type,
        Status: item.type === 'Pulang' ? 'Pulang' : item.status,
        Lokasi: item.address || `${item.latitude}, ${item.longitude}`
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
      
      const fileName = users.find(u => u.id === selectedUserId)?.name || user.name;
      XLSX.writeFile(wb, `Rekap_Absensi_${fileName}_${startDate}_${endDate}.xlsx`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user.role === 'admin' ? 'Rekap Absensi Pegawai' : 'Rekap Absensi Pribadi'}</h2>
            <p className="text-zinc-500 text-sm">Pilih rentang tanggal (maksimal 1 bulan)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {user.role === 'admin' && (
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Pilih Pegawai</label>
              <select 
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Pegawai</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.nip})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Tanggal Mulai</label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Tanggal Selesai</label>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <Button onClick={handleFetch} className="flex-1 py-3" disabled={loading}>
            {loading ? 'Memuat...' : 'Tampilkan Rekap'}
          </Button>
          {data.length > 0 && user.role === 'admin' && (
            <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2 py-3">
              <Download size={18} /> Ekspor Excel
            </Button>
          )}
        </div>
      </Card>

      {data.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  {user.role === 'admin' && <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Nama</th>}
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Waktu</th>
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Shift</th>
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Tipe</th>
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Lokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {data.map((item, idx) => {
                  const d = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
                  const shift = getShiftInfo(d);
                  return (
                  <tr key={item.id || idx} className="hover:bg-zinc-50/50 transition-colors">
                    {user.role === 'admin' && (
                      <td className="p-4">
                        <p className="text-sm font-bold">{item.name || '-'}</p>
                        <p className="text-xs text-zinc-400">{item.nip || '-'}</p>
                      </td>
                    )}
                    <td className="p-4 text-sm font-medium">{formatTimestamp(item.timestamp)}</td>
                    <td className="p-4 text-sm">
                      <p className="font-semibold">{shift.name}</p>
                      <p className="text-xs text-zinc-400">{shift.range}</p>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter",
                        item.type === 'Masuk' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      )}>
                        {item.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-600">{item.type === 'Pulang' ? 'Pulang' : item.status}</td>
                    <td className="p-4 text-xs text-zinc-500 max-w-[200px] truncate" title={item.address}>
                      {item.address || `${item.latitude}, ${item.longitude}`}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </motion.div>
  );
}

function HistoryView({ history, indexErrorUrl, isBuilding }: { history: Attendance[], indexErrorUrl?: string | null, isBuilding?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Riwayat Absensi</h2>
        <div className="bg-emerald-50 text-emerald-600 px-4 py-1 rounded-full text-sm font-bold">
          {history.length} Total
        </div>
      </div>

      {indexErrorUrl && (
        <Card className="bg-orange-50 border-orange-200 text-orange-800">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-full text-orange-600">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="font-bold text-lg">{isBuilding ? 'Indeks Sedang Dibuat' : 'Indeks Firestore Diperlukan'}</p>
              <p className="text-sm opacity-90">
                {isBuilding 
                  ? 'Database sedang menyiapkan indeks. Silakan tunggu beberapa menit lalu segarkan halaman ini.' 
                  : 'Sistem memerlukan konfigurasi indeks di Firebase agar riwayat absensi dapat ditampilkan.'}
              </p>
            </div>
            <a 
              href={indexErrorUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full md:w-auto px-6 py-2 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all text-center"
            >
              {isBuilding ? 'Pantau Status Indeks' : 'Buat Indeks Sekarang'}
            </a>
          </div>
        </Card>
      )}

      {history.length === 0 && !indexErrorUrl && (
        <div className="text-center py-12 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
          <p className="text-zinc-400 font-medium">Belum ada riwayat absensi</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {history.map((item, idx) => (
          <Card key={item.id || `hist-full-${idx}`} className="overflow-hidden p-0">
            <div className="aspect-video relative">
              <img src={item.photo} className="w-full h-full object-cover" alt="Attendance" referrerPolicy="no-referrer" />
              <div className="absolute top-4 left-4">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold shadow-lg",
                  item.type === 'Masuk' ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'
                )}>
                  {item.type}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                  <p className="text-sm text-zinc-400 font-medium uppercase tracking-wider">Waktu</p>
                  <p className="font-bold">
                    {formatTimestamp(item.timestamp)}
                  </p>
                <div className="text-right">
                  <p className="text-sm text-zinc-400 font-medium uppercase tracking-wider">Status</p>
                  <p className="font-bold text-emerald-600">{item.status}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-50 flex items-center gap-2 text-xs text-zinc-500">
                <MapPin size={14} />
                <span className="truncate">{item.address || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {history.length === 0 && (
        <div className="text-center py-20">
          <History size={64} className="mx-auto text-zinc-200 mb-4" />
          <p className="text-zinc-400 font-medium">Belum ada riwayat absensi</p>
        </div>
      )}
    </motion.div>
  );
}

function PermissionView({ user, permissions, onComplete, indexErrorUrl, isBuilding }: any) {
  const [formData, setFormData] = useState({ type: 'Sakit', reason: '', start_date: '', end_date: '' });
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng });
        
        // Fetch address from Nominatim
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          const data = await response.json();
          if (data && data.address) {
            const addr = data.address;
            const desa = addr.village || addr.suburb || addr.neighbourhood || addr.hamlet || '';
            const kecamatan = addr.city_district || addr.district || '';
            const kabupaten = addr.city || addr.regency || addr.county || '';
            
            const formattedAddress = [desa, kecamatan, kabupaten].filter(Boolean).join(', ');
            setAddress(formattedAddress || 'Lokasi tidak dikenal');
          }
        } catch (err) {
          console.error("Geocoding error:", err);
          setAddress('Gagal memuat alamat');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        toast.error('Gagal mendapatkan lokasi. Pastikan GPS aktif dan izin diberikan.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  useEffect(() => {
    if (cameraActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraActive, stream]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(s);
      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      toast.error('Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.');
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 300;
        let width = videoRef.current.videoWidth;
        let height = videoRef.current.videoHeight;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvasRef.current.width = width;
        canvasRef.current.height = height;
        context.drawImage(videoRef.current, 0, 0, width, height);
        
        // Compress image to 30% quality JPEG
        const data = canvasRef.current.toDataURL('image/jpeg', 0.3);
        setPhoto(data);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!location || !address) {
      toast.error('Lokasi belum terdeteksi. Harap tunggu sebentar atau pastikan GPS aktif.');
      return;
    }

    if (!photo) {
      toast.error('Silakan ambil foto bukti terlebih dahulu');
      return;
    }

    setLoading(true);

    if (!navigator.onLine) {
      setLoading(false);
      toast.error('Tidak ada koneksi internet. Pastikan perangkat Anda terhubung ke internet.');
      return;
    }

    try {
      // Upload photo
      let photoUrl = '';
      try {
        const timestamp = Date.now();
        const photoRef = ref(storage, `permissions/${user.id}/${timestamp}.jpg`);
        
        if (!photo.startsWith('data:image/')) {
          throw new Error('Format foto tidak valid');
        }

        // Upload to Firebase Storage
        await uploadString(photoRef, photo, 'data_url');
        photoUrl = await getDownloadURL(photoRef);
      } catch (storageErr: any) {
        console.warn("Storage upload error:", storageErr);
        if (storageErr.code === 'storage/unauthorized') {
          throw new Error('Gagal mengunggah foto: Izin ditolak. Periksa Firebase Storage Rules.');
        }
        
        if (storageErr.code === 'storage/retry-limit-exceeded') {
          console.warn("Storage retry limit exceeded, falling back to base64");
          photoUrl = photo;
        } else {
          // Fallback: Use base64 string directly if storage fails
          console.warn("Falling back to base64 photo due to storage error");
          photoUrl = photo;
        }
      }

      const batch = writeBatch(db);
      
      // 1. Buat Record Izin (Langsung Approved)
      const permissionRef = doc(collection(db, 'permissions'));
      const permissionData = {
        user_id: user.id,
        name: user.name || 'Pegawai',
        nip: user.nip || '-',
        type: formData.type,
        reason: formData.reason,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: 'approved',
        latitude: location?.lat || 0,
        longitude: location?.lng || 0,
        address: address || '',
        photo: photoUrl,
        timestamp: serverTimestamp()
      };
      batch.set(permissionRef, permissionData);

      // 2. Buat Record Absensi untuk setiap hari dalam rentang tanggal
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      let current = new Date(start);
      
      while (current <= end) {
        const attendanceRef = doc(collection(db, 'attendance'));
        // Set waktu ke jam 08:00:00 untuk record tersebut
        const recordDate = new Date(current);
        recordDate.setHours(8, 0, 0, 0);
        
        batch.set(attendanceRef, {
          user_id: user.id,
          name: user.name || 'Pegawai',
          nip: user.nip || '-',
          type: formData.type, // 'Sakit', 'Cuti', atau 'Dinas Luar'
          status: 'Izin Terverifikasi',
          address: address || 'Izin Terverifikasi',
          latitude: location?.lat || 0,
          longitude: location?.lng || 0,
          timestamp: Timestamp.fromDate(recordDate),
          photo: photoUrl
        });
        
        current.setDate(current.getDate() + 1);
      }

      await batch.commit();

      // Send to Webhook if configured
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists() && settingsDoc.data().webhookUrl) {
          const webhookUrl = settingsDoc.data().webhookUrl.trim();
          if (webhookUrl) {
            fetch(webhookUrl, {
              method: 'POST',
              mode: 'no-cors',
              keepalive: true,
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                recordType: 'Izin',
                name: user.name || 'Pegawai',
                nip: user.nip || '-',
                type: formData.type,
                status: 'Approved',
                address: address || '',
                photo: photoUrl
              })
            }).catch(err => console.error("Webhook fetch error:", err));
          }
        }
      } catch (webhookErr) {
        console.error("Webhook error:", webhookErr);
      }

      toast.success('Permohonan izin berhasil dikirim dan langsung terekap di absensi');
      setFormData({ type: 'Sakit', reason: '', start_date: '', end_date: '' });
      onComplete();
    } catch (err: any) {
      console.error("Permission submission error:", err);
      if (err.code === 'permission-denied') {
        toast.error('Gagal mengirim: Izin ditolak. Periksa Firestore Security Rules.');
      } else {
        toast.error('Gagal mengirim permohonan: ' + (err.message || 'Error tidak diketahui'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Card>
          <h2 className="text-2xl font-bold mb-6">Ajukan Izin / Sakit</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Jenis Izin</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Sakit">Sakit</option>
                <option value="Cuti">Cuti</option>
                <option value="Dinas Luar">Dinas Luar</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Tanggal Mulai</label>
                <input 
                  type="date" 
                  required
                  value={formData.start_date}
                  onChange={e => setFormData({...formData, start_date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Tanggal Selesai</label>
                <input 
                  type="date" 
                  required
                  value={formData.end_date}
                  onChange={e => setFormData({...formData, end_date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Alasan / Keterangan</label>
              <textarea 
                required
                rows={4}
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Berikan alasan yang jelas..."
              />
            </div>
            
            {/* Tampilkan Lokasi GPS */}
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-3">
                  <MapPin className="text-emerald-600" size={20} />
                  <div>
                    <p className="font-bold">Lokasi GPS</p>
                    <p className="text-zinc-500">
                      {address ? address : location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : isLocating ? 'Mencari lokasi...' : 'Lokasi belum terdeteksi'}
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={fetchLocation} 
                  disabled={isLocating}
                  className="p-2 text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Deteksi Ulang Lokasi"
                >
                  <RefreshCw size={18} className={isLocating ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Kamera untuk Foto Bukti */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700">Foto Bukti</label>
              <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden mb-6 border-4 border-white shadow-xl">
                {photo ? (
                  <img src={photo} className="w-full h-full object-cover" alt="Captured" />
                ) : cameraActive ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
                    <Camera size={48} className="opacity-20" />
                    <Button type="button" onClick={startCamera} variant="secondary">Aktifkan Kamera</Button>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {cameraActive && (
                <Button type="button" onClick={takePhoto} className="w-full mb-4 py-4 rounded-2xl flex items-center justify-center gap-2">
                  <Camera size={20} /> Ambil Foto
                </Button>
              )}

              {photo && (
                <Button type="button" onClick={() => setPhoto('')} variant="outline" className="w-full mb-4">Ulangi Foto</Button>
              )}
            </div>

            <Button type="submit" className="w-full py-4" disabled={loading || !location || !address || !photo}>
              {loading ? 'Mengirim...' : 'Kirim Permohonan'}
            </Button>
          </form>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
        <h3 className="text-xl font-bold">Riwayat Izin</h3>
        
        {indexErrorUrl && (
          <Card className="bg-orange-50 border-orange-200 text-orange-800 p-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle size={24} className="text-orange-600" />
              <div>
                <p className="font-bold text-sm">{isBuilding ? 'Indeks Sedang Dibuat' : 'Indeks Diperlukan'}</p>
                <p className="text-xs opacity-90 mb-3">
                  {isBuilding 
                    ? 'Database sedang menyiapkan indeks. Tunggu sebentar.' 
                    : 'Sistem memerlukan konfigurasi indeks di Firebase.'}
                </p>
                <a 
                  href={indexErrorUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition-all"
                >
                  {isBuilding ? 'Cek Status' : 'Buat Sekarang'}
                </a>
              </div>
            </div>
          </Card>
        )}

        {permissions.map((p: Permission, idx: number) => (
          <Card key={p.id || `perm-${idx}`} className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                p.type === 'Sakit' ? 'bg-red-50 text-red-600' : p.type === 'Cuti' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
              )}>
                {p.type === 'Sakit' ? <Stethoscope size={24} /> : p.type === 'Cuti' ? <Calendar size={24} /> : <Briefcase size={24} />}
              </div>
              <div>
                <p className="font-bold">{p.type}</p>
                <p className="text-xs text-zinc-500">{p.start_date} s/d {p.end_date}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold",
                p.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : p.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-500'
              )}>
                {p.status.toUpperCase()}
              </span>
            </div>
          </Card>
        ))}
        {permissions.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-zinc-200">
            <p className="text-zinc-400">Belum ada riwayat izin</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function AdminView({ history, permissions, users }: any) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance' | 'permissions' | 'branches' | 'settings'>('dashboard');
  const [exportDate, setExportDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [branches, setBranches] = useState<any[]>([]);
  const [newBranch, setNewBranch] = useState({ name: '', lat: '', lng: '' });
  const [webhookUrl, setWebhookUrl] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchBranches = async () => {
      const q = query(collection(db, 'branches'));
      const snapshot = await getDocs(q);
      setBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setWebhookUrl(docSnap.data().webhookUrl || '');
      }
    };
    fetchBranches();
    fetchSettings();
  }, []);

  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'general'), { webhookUrl }, { merge: true });
      toast.success('Pengaturan berhasil disimpan');
    } catch (err) {
      console.error("Error saving settings:", err);
      toast.error('Gagal menyimpan pengaturan');
    }
  };

  const addBranch = async () => {
    if (!newBranch.name) return toast.error('Lengkapi nama desa cabang');
    await addDoc(collection(db, 'branches'), {
      name: newBranch.name
    });
    setNewBranch({ name: '', lat: '', lng: '' });
    const snapshot = await getDocs(query(collection(db, 'branches')));
    setBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    toast.success('Cabang berhasil ditambah');
  };

  const deleteBranch = async (id: string) => {
    await deleteDoc(doc(db, 'branches', id));
    setBranches(branches.filter(b => b.id !== id));
    toast.success('Cabang berhasil dihapus');
  };
  const exportToExcel = (mode: 'all' | 'daily' | 'monthly') => {
    let dataToExport = activeTab === 'attendance' ? history : permissions;
    let filename = `Rekap_${activeTab === 'attendance' ? 'Absensi' : 'Izin'}`;

    if (mode === 'daily') {
      dataToExport = dataToExport.filter((item: any) => {
        const dateObj = item.timestamp && typeof item.timestamp === 'object' && 'toDate' in item.timestamp
          ? (item.timestamp as any).toDate()
          : new Date(item.timestamp || item.start_date);
        const itemDate = dateObj.toISOString().split('T')[0];
        return itemDate === exportDate;
      });
      filename += `_Harian_${exportDate}`;
    } else if (mode === 'monthly') {
      dataToExport = dataToExport.filter((item: any) => {
        const dateObj = item.timestamp && typeof item.timestamp === 'object' && 'toDate' in item.timestamp
          ? (item.timestamp as any).toDate()
          : new Date(item.timestamp || item.start_date);
        const itemMonth = dateObj.toISOString().slice(0, 7);
        return itemMonth === exportMonth;
      });
      filename += `_Bulanan_${exportMonth}`;
    } else {
      filename += `_Semua_${new Date().toISOString().split('T')[0]}`;
    }

    if (dataToExport.length === 0) {
      return toast.error('Tidak ada data untuk periode tersebut');
    }

    // Clean data for export (remove base64 photo)
    const cleanedData = dataToExport.map(({ photo, ...rest }: any) => {
      const formatted = { ...rest };
      if (formatted.timestamp && typeof formatted.timestamp === 'object' && 'toDate' in formatted.timestamp) {
        formatted.timestamp = (formatted.timestamp as any).toDate().toLocaleString('id-ID');
      } else if (formatted.timestamp) {
        formatted.timestamp = new Date(formatted.timestamp).toLocaleString('id-ID');
      }
      return formatted;
    });

    const worksheet = XLSX.utils.json_to_sheet(cleanedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'attendance' ? "Absensi" : "Izin");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    toast.success('Laporan berhasil diunduh');
  };

  const getFilteredAndSortedData = (data: any[]) => {
    let filteredData = data.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      return (item.name?.toLowerCase().includes(searchLower) || item.nip?.toLowerCase().includes(searchLower));
    });

    filteredData.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'name') {
        valA = a.name?.toLowerCase() || '';
        valB = b.name?.toLowerCase() || '';
      } else if (sortBy === 'status') {
        valA = a.status?.toLowerCase() || '';
        valB = b.status?.toLowerCase() || '';
      } else {
        // date
        const dateA = a.timestamp && typeof a.timestamp === 'object' && 'toDate' in a.timestamp ? a.timestamp.toDate() : new Date(a.timestamp || a.start_date);
        const dateB = b.timestamp && typeof b.timestamp === 'object' && 'toDate' in b.timestamp ? b.timestamp.toDate() : new Date(b.timestamp || b.start_date);
        valA = dateA.getTime();
        valB = dateB.getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filteredData;
  };

  const displayedHistory = getFilteredAndSortedData(history);
  const displayedPermissions = getFilteredAndSortedData(permissions);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Panel Administrator</h2>
          <p className="text-zinc-500 font-medium">Kelola seluruh aktivitas pegawai</p>
        </div>
        <div className="flex bg-zinc-100 p-1 rounded-xl">
          {(['dashboard', 'attendance', 'permissions', 'branches', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all",
                activeTab === tab ? "bg-white shadow-sm text-emerald-600" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <AdminDashboard attendanceData={history} users={users} />
      ) : activeTab === 'settings' ? (
        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="font-bold text-lg">Integrasi Google Spreadsheet</h3>
            <p className="text-sm text-zinc-500">
              Masukkan URL Webhook Google Apps Script untuk mengirim data absensi dan izin secara otomatis ke Google Spreadsheet.
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Webhook URL</label>
              <input 
                type="url" 
                placeholder="https://script.google.com/macros/s/.../exec" 
                value={webhookUrl} 
                onChange={e => setWebhookUrl(e.target.value)} 
                className="px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 w-full" 
              />
            </div>
            <Button onClick={saveSettings} variant="primary">Simpan Pengaturan</Button>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h4 className="font-bold text-blue-800 mb-2">Cara Setup Google Spreadsheet:</h4>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-2">
                <li>Buat Google Spreadsheet baru.</li>
                <li>Klik <strong>Ekstensi &gt; Apps Script</strong>.</li>
                <li>Paste kode berikut:</li>
              </ol>
              <pre className="mt-2 p-3 bg-white rounded-lg text-xs overflow-x-auto border border-blue-200 text-zinc-800">
{`function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = {};
    
    try {
      if (e.postData && e.postData.contents) {
        data = JSON.parse(e.postData.contents);
      } else {
        data = e.parameter;
      }
    } catch (parseErr) {
      data = e.parameter;
    }
    
    // Header (jika kosong)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Waktu', 'Tipe', 'Nama', 'NIP', 'Status', 'Lokasi', 'Foto']);
    }
    
    sheet.appendRow([
      new Date().toLocaleString('id-ID'),
      data.recordType || '-',
      data.name || '-',
      data.nip || '-',
      data.status || data.type || '-',
      data.address || '-',
      data.photo || '-'
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"error": error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
              </pre>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-2 mt-2" start={4}>
                <li>Klik <strong>Terapkan (Deploy) &gt; Deployment baru</strong>.</li>
                <li>Pilih jenis: <strong>Aplikasi Web</strong>.</li>
                <li>Akses: <strong>Siapa saja (Anyone)</strong>.</li>
                <li>Klik <strong>Terapkan</strong>, lalu copy URL Web App dan paste di form atas.</li>
              </ol>
            </div>
          </Card>
        </div>
      ) : activeTab === 'branches' ? (
        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="font-bold">Tambah Cabang Baru (Nama Desa)</h3>
            <div className="grid grid-cols-1 gap-4">
              <input type="text" placeholder="Masukkan Nama Desa (misal: Suka Maju)" value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} className="px-4 py-2 rounded-xl border border-zinc-200" />
            </div>
            <Button onClick={addBranch} variant="primary">Tambah Cabang</Button>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map(branch => (
              <Card key={branch.id} className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold">{branch.name}</h4>
                  <p className="text-sm text-zinc-500">Lokasi Absensi</p>
                </div>
                <Button onClick={() => deleteBranch(branch.id)} variant="danger">Hapus</Button>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="flex flex-col gap-4">
              <h3 className="font-bold flex items-center gap-2"><Download size={18} className="text-emerald-600" /> Rekap Harian</h3>
              <input 
                type="date" 
                value={exportDate}
                onChange={e => setExportDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Button onClick={() => exportToExcel('daily')} variant="primary" className="w-full">Unduh Harian</Button>
            </Card>
            <Card className="flex flex-col gap-4">
              <h3 className="font-bold flex items-center gap-2"><Download size={18} className="text-blue-600" /> Rekap Bulanan</h3>
              <input 
                type="month" 
                value={exportMonth}
                onChange={e => setExportMonth(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={() => exportToExcel('monthly')} variant="primary" className="w-full">Unduh Bulanan</Button>
            </Card>
            <Card className="flex flex-col gap-4">
              <h3 className="font-bold flex items-center gap-2"><Download size={18} className="text-purple-600" /> Rekap Semua</h3>
              <Button onClick={() => exportToExcel('all')} variant="primary" className="w-full">Unduh Semua Data</Button>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input 
              type="text" 
              placeholder="Cari nama atau NIP..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as any)}
              className="px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="date">Urutkan: Tanggal</option>
              <option value="name">Urutkan: Nama</option>
              <option value="status">Urutkan: Status</option>
            </select>
            <select 
              value={sortOrder} 
              onChange={e => setSortOrder(e.target.value as any)}
              className="px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="desc">Terbaru / Z-A</option>
              <option value="asc">Terlama / A-Z</option>
            </select>
          </div>

          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-bottom border-zinc-100">
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Pegawai</th>
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Tipe</th>
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Waktu / Durasi</th>
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Lokasi</th>
                  <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {activeTab === 'attendance' ? (
                  displayedHistory.length > 0 ? displayedHistory.map((item: any, idx: number) => (
                    <tr key={item.id || `admin-hist-${idx}`} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold">{item.name}</p>
                        <p className="text-xs text-zinc-400">{item.nip}</p>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter",
                          item.type === 'Masuk' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                        )}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium">
                          {formatTimestamp(item.timestamp)}
                        </p>
                      </td>
                      <td className="p-4 text-sm text-zinc-600">{item.address || '-'}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter",
                          item.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        )}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="p-8 text-center text-zinc-500">Tidak ada data absensi ditemukan</td></tr>
                  )
                ) : (
                  displayedPermissions.length > 0 ? displayedPermissions.map((p: any, idx: number) => (
                    <tr key={p.id || `admin-perm-${idx}`} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-zinc-400">{p.nip}</p>
                      </td>
                      <td className="p-4 font-bold">{p.type}</td>
                      <td className="p-4 text-sm text-zinc-600">{p.start_date} s/d {p.end_date}</td>
                      <td className="p-4 text-sm text-zinc-600">{p.reason}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter",
                          p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        )}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="p-8 text-center text-zinc-500">Tidak ada data izin ditemukan</td></tr>
                  )
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </motion.div>
  );
}

function ProfileView({ user, onLogout }: any) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('Konfirmasi password tidak cocok');
    }
    setLoading(true);
    try {
      if (auth.currentUser) {
        // Re-authenticate first
        const credential = EmailAuthProvider.credential(auth.currentUser.email!, passwords.oldPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, passwords.newPassword);
        toast.success('Password berhasil diubah');
        setShowChangePassword(false);
        setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      toast.error('Gagal mengubah password. Periksa password lama Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <Card className="text-center">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <UserIcon size={48} />
        </div>
        <h2 className="text-2xl font-bold">{user.name}</h2>
        <p className="text-zinc-500 font-medium mb-8">{user.role.toUpperCase()} • NIP: {user.nip}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8">
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">Email</p>
            <p className="font-bold">{user.email || 'pegawai@siabon.com'}</p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">Jabatan</p>
            <p className="font-bold">Staff Operasional</p>
          </div>
        </div>

        {showChangePassword ? (
          <form onSubmit={handleChangePassword} className="space-y-4 text-left border-t pt-8 mt-8">
            <h3 className="text-lg font-bold">Ganti Password</h3>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Password Lama</label>
              <input 
                type="password" 
                required
                value={passwords.oldPassword}
                onChange={e => setPasswords({...passwords, oldPassword: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Password Baru</label>
              <input 
                type="password" 
                required
                value={passwords.newPassword}
                onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Konfirmasi Password Baru</label>
              <input 
                type="password" 
                required
                value={passwords.confirmPassword}
                onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Password'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowChangePassword(false)}>Batal</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <Button variant="outline" onClick={() => setShowChangePassword(true)} className="w-full py-3">Ganti Password</Button>
            <Button variant="danger" onClick={onLogout} className="w-full py-3">Keluar dari Aplikasi</Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
