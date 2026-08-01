import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Activity, Lock } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Token tidak valid atau tidak ditemukan');
      navigate('/login');
    }
  }, [token, navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Password tidak cocok');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Password berhasil diperbarui. Silakan login.');
        navigate('/login');
      } else {
        toast.error(data.message || 'Gagal memperbarui password');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan server');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 text-center">
            Perbarui Kata Sandi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
            Masukkan kata sandi baru untuk akun Anda
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">Kata Sandi Baru</Label>
            <Input 
              id="new-password" 
              type="password" 
              placeholder="Minimal 6 karakter" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="focus-visible:ring-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Konfirmasi Kata Sandi</Label>
            <Input 
              id="confirm-password" 
              type="password" 
              placeholder="Ulangi kata sandi baru" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="focus-visible:ring-emerald-500"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
            disabled={loading}
          >
            {loading ? 'Memperbarui...' : 'Perbarui Kata Sandi'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button 
            variant="link" 
            className="text-emerald-600 dark:text-emerald-500 p-0 h-auto font-medium"
            onClick={() => navigate('/login')}
          >
            Kembali ke Halaman Login
          </Button>
        </div>
      </div>
    </div>
  );
}
