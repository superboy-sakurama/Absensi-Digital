import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Activity } from 'lucide-react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export default function Login() {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Login state
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Register state
  const [regNip, setRegNip] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regGender, setRegGender] = useState('');
  const [regCluster, setRegCluster] = useState('');
  const [regUnit, setRegUnit] = useState('');
  const [regDesa, setRegDesa] = useState('');
  const [regOffice2, setRegOffice2] = useState('');
  const [regOffice3, setRegOffice3] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');

  const [units, setUnits] = useState<{id: string, name: string}[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [appName, setAppName] = useState("Si Abon Eiite App");
  const [appLogo, setAppLogo] = useState("");

  useEffect(() => {
    // Check persist login 36 hours
    const loginTime = localStorage.getItem('loginTime');
    if (loginTime) {
      const now = Date.now();
      const elapsed = now - parseInt(loginTime, 10);
      if (elapsed > 36 * 60 * 60 * 1000) {
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
      } else {
        const user = localStorage.getItem('user');
        if (user) {
           const userData = JSON.parse(user);
           navigate(userData.role === 'admin' ? '/admin' : '/user');
        }
      }
    }

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.generalSettings?.appName) {
            setAppName(data.generalSettings.appName);
          }
          if (data.generalSettings?.appLogo) {
            setAppLogo(data.generalSettings.appLogo);
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };
    fetchSettings();

    const fetchUnits = async () => {
      try {
        const response = await fetch('/api/units');
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setUnits(data);
          } else {
            const savedUnits = localStorage.getItem('unitsData');
            if (savedUnits) {
              setUnits(JSON.parse(savedUnits));
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch units:', error);
        const savedUnits = localStorage.getItem('unitsData');
        if (savedUnits) {
          setUnits(JSON.parse(savedUnits));
        }
      }
    };
    fetchUnits();

    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/locations');
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setLocations(data);
          } else {
            const savedLocations = localStorage.getItem('locationsData');
            if (savedLocations) {
              setLocations(JSON.parse(savedLocations));
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
        const savedLocations = localStorage.getItem('locationsData');
        if (savedLocations) {
          setLocations(JSON.parse(savedLocations));
        }
      }
    };
    fetchLocations();
  }, [navigate]);

  const generateDeviceId = async () => {
    let deviceId = localStorage.getItem('deviceId');
    if (deviceId && deviceId.length > 20) return deviceId;

    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      deviceId = result.visitorId;
    } catch (e) {
      // Fallback
      if (window.crypto && window.crypto.randomUUID) {
        deviceId = window.crypto.randomUUID();
      } else {
        deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }
    }

    localStorage.setItem('deviceId', deviceId);
    return deviceId;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const deviceId = await generateDeviceId();

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nip, password, deviceId }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('loginTime', Date.now().toString());
        toast.success('Login berhasil');
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/user');
        }
      } else {
        toast.error(data.message || 'Login gagal');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan server');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nip: regNip, 
          name: regName, 
          email: regEmail, 
          password: regPassword,
          gender: regGender,
          cluster: regCluster,
          unit: regUnit,
          desa: regDesa === 'none' ? '' : regDesa,
          office2: regOffice2 === 'none' ? '' : regOffice2,
          office3: regOffice3 === 'none' ? '' : regOffice3
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Pendaftaran berhasil, silakan login');
        setRegNip('');
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegGender('');
        setRegCluster('');
        setRegUnit('');
        setRegDesa('');
        setRegOffice2('');
        setRegOffice3('');
        setView('login');
      } else {
        toast.error(data.message || 'Pendaftaran gagal');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan server');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Email reset password telah dikirim');
        if (data.mockLink) {
          console.log('Reset Link (Mock Mode):', data.mockLink);
          // In a real app, we wouldn't show this in a toast, but it's helpful for testing without an email provider
          toast.info('Mode Testing: Cek console untuk link reset, atau klik link ini', {
            action: {
              label: 'Buka Link',
              onClick: () => window.location.href = data.mockLink
            },
            duration: 10000
          });
        }
        setForgotEmail('');
        setView('login');
      } else {
        toast.error(data.message || 'Gagal mengirim email');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8">
        
        <div className="flex flex-col items-center mb-8">
          {/* Logo Joko Tingkir Placeholder */}
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4 overflow-hidden">
            {appLogo ? (
              <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Activity className="w-10 h-10 text-emerald-600 dark:text-emerald-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 text-center">
            {view === 'login' ? `Welcome To ${appName}` : view === 'register' ? 'Buat Akun Baru' : 'Lupa Kata Sandi'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
            {view === 'login' ? 'Masuk untuk mengakses dasbor Anda' : view === 'register' ? 'Daftar untuk mulai menggunakan aplikasi' : 'Masukkan email untuk mereset kata sandi Anda'}
          </p>
        </div>

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nip">Nomor Induk Pegawai (NIP)</Label>
              <Input 
                id="nip" 
                type="text" 
                placeholder="Masukkan NIP/ NIK(jika belum punya NIP)" 
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                required
                className="focus-visible:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="focus-visible:ring-emerald-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600 dark:text-slate-300"
                >
                  Ingat saya
                </label>
              </div>
              <button 
                type="button" 
                onClick={() => setView('forgot')}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
              >
                Lupa kata sandi?
              </button>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-xl text-md font-semibold mt-2" 
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">
                  Atau lanjutkan dengan
                </span>
              </div>
            </div>

            <div className="text-center text-sm text-slate-600 dark:text-slate-400">
              Belum punya akun?{' '}
              <button 
                type="button" 
                onClick={() => setView('register')}
                className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
              >
                Daftar
              </button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="regNip">Nomor Induk Pegawai (NIP)</Label>
              <Input 
                id="regNip" 
                type="text" 
                placeholder="Masukkan NIP/ NIK(jika belum punya NIP)" 
                value={regNip}
                onChange={(e) => setRegNip(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regName">Nama Lengkap</Label>
              <Input 
                id="regName" 
                type="text" 
                placeholder="Nama Lengkap" 
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regEmail">Email</Label>
              <Input 
                id="regEmail" 
                type="email" 
                placeholder="email@puskesmas.com" 
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regGender">Jenis Kelamin</Label>
                <Select value={regGender} onValueChange={setRegGender} required>
                  <SelectTrigger id="regGender">
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="regCluster">Klaster</Label>
                <Select value={regCluster} onValueChange={setRegCluster} required>
                  <SelectTrigger id="regCluster">
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Klaster 1">Klaster 1</SelectItem>
                    <SelectItem value="Klaster 2">Klaster 2</SelectItem>
                    <SelectItem value="Klaster 3">Klaster 3</SelectItem>
                    <SelectItem value="Klaster 4">Klaster 4</SelectItem>
                    <SelectItem value="Klaster 5">Klaster 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="regUnit">Unit kerja/Unit Layanan</Label>
              <Select value={regUnit} onValueChange={setRegUnit} required>
                <SelectTrigger id="regUnit">
                  <SelectValue placeholder="Pilih Unit Kerja" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regDesa">Lokasi Kantor 1</Label>
              <Select value={regDesa} onValueChange={setRegDesa} required>
                <SelectTrigger id="regDesa">
                  <SelectValue placeholder="Pilih Lokasi Kantor 1" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.desa}>{loc.desa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regOffice2">Lokasi Kantor 2 (Opsional)</Label>
              <Select value={regOffice2} onValueChange={setRegOffice2}>
                <SelectTrigger id="regOffice2">
                  <SelectValue placeholder="Pilih Lokasi Kantor 2 (Opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Kosongkan --</SelectItem>
                  {locations.map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.desa}>{loc.desa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regOffice3">Lokasi Kantor 3 (Opsional)</Label>
              <Select value={regOffice3} onValueChange={setRegOffice3}>
                <SelectTrigger id="regOffice3">
                  <SelectValue placeholder="Pilih Lokasi Kantor 3 (Opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Kosongkan --</SelectItem>
                  {locations.map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.desa}>{loc.desa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regPassword">Kata Sandi</Label>
              <Input 
                id="regPassword" 
                type="password" 
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-xl text-md font-semibold mt-4" 
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
            </Button>

            <div className="text-center text-sm text-slate-600 dark:text-slate-400 mt-4">
              Sudah punya akun?{' '}
              <button 
                type="button" 
                onClick={() => setView('login')}
                className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
              >
                Masuk
              </button>
            </div>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgotEmail">Email</Label>
              <Input 
                id="forgotEmail" 
                type="email" 
                placeholder="email@puskesmas.com" 
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-xl text-md font-semibold mt-4" 
              disabled={loading}
            >
              {loading ? 'Mengirim...' : 'Kirim Email Reset'}
            </Button>

            <div className="text-center text-sm text-slate-600 dark:text-slate-400 mt-4">
              Kembali ke{' '}
              <button 
                type="button" 
                onClick={() => setView('login')}
                className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
              >
                Masuk
              </button>
            </div>
          </form>
        )}
      </div>
      
      <footer className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        © 2026 Alielafroh. All rights reserved.
      </footer>
    </div>
  );
}
