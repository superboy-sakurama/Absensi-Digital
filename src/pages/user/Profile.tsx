import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Camera, Volume2 } from 'lucide-react';
import { playAlarmSound } from '@/utils/alarm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function UserProfile() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [alarmEnabled, setAlarmEnabled] = useState(localStorage.getItem('alarmEnabled') !== 'false');
  const [alarmBeforeMinutes, setAlarmBeforeMinutes] = useState(parseInt(localStorage.getItem('alarmBeforeMinutes') || '10'));
  const [alarmAfterMinutes, setAlarmAfterMinutes] = useState(parseInt(localStorage.getItem('alarmAfterMinutes') || '15'));

  // Password change state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const response = await fetch('/api/employees');
        if (response.ok) {
          const employees = await response.json();
          const currentEmployee = employees.find((emp: any) => emp.nip === user.nip);
          if (currentEmployee) {
            setEmployeeData(currentEmployee);
          }
        }
      } catch (error) {
        console.error('Failed to fetch employee data:', error);
      }
    };

    if (user.nip) {
      fetchEmployeeData();
    }
  }, [user.nip]);

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleToggleAlarm = (checked: boolean) => {
    setAlarmEnabled(checked);
    localStorage.setItem('alarmEnabled', String(checked));
    if (checked) requestNotificationPermission();
  };

  const handleBeforeMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    requestNotificationPermission();
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 0) {
      setAlarmBeforeMinutes(val);
      localStorage.setItem('alarmBeforeMinutes', String(val));
    } else if (e.target.value === '') {
      setAlarmBeforeMinutes(0);
      localStorage.setItem('alarmBeforeMinutes', '0');
    }
  };

  const handleAfterMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    requestNotificationPermission();
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 0) {
      setAlarmAfterMinutes(val);
      localStorage.setItem('alarmAfterMinutes', String(val));
    } else if (e.target.value === '') {
      setAlarmAfterMinutes(0);
      localStorage.setItem('alarmAfterMinutes', '0');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Password baru dan konfirmasi password tidak cocok');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id,
          role: user.role,
          oldPassword,
          newPassword,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        setIsDialogOpen(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.message || 'Gagal mengubah password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoClick = () => {
    if (employeeData?.photoUploadCount >= 5) {
      toast.error('Batas unggah foto telah mencapai maksimal (5 kali).');
      return;
    }
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Harap pilih file gambar');
      return;
    }

    if (employeeData?.photoUploadCount >= 5) {
      toast.error('Batas unggah foto telah mencapai maksimal (5 kali).');
      return;
    }

    setIsUploading(true);

    try {
      // Compress image
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise((resolve) => (reader.onload = resolve));
      
      const img = new Image();
      img.src = reader.result as string;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400;
      const MAX_HEIGHT = 400;
      let width = img.width;
      let height = img.height;

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

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

      const response = await fetch('/api/employees/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nip: user.nip, photoUrl: compressedBase64 })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        
        // Update local state
        setEmployeeData({
           ...employeeData, 
           photoUrl: data.photoUrl, 
           photoUploadCount: data.photoUploadCount 
        });

        // Update user state and broadcast change across tabs/components
        const updatedUser = { ...user, photoUrl: data.photoUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('storage'));
        
      } else {
        toast.error(data.message || 'Gagal menyimpan foto');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Terjadi kesalahan saat mengunggah foto');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Profil Saya</h1>
      </div>

      <div className="flex flex-col items-center space-y-4 mt-8">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-slate-200 dark:border-slate-800">
            {employeeData?.photoUrl || user.photoUrl ? (
              <img src={employeeData?.photoUrl || user.photoUrl} alt="Profile" className="object-cover h-full w-full" />
            ) : (
              <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 text-2xl">
                {user.name?.charAt(0) || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
          <button 
            type="button"
            onClick={handlePhotoClick}
            disabled={isUploading}
            className="absolute bottom-0 right-0 rounded-full bg-emerald-600 p-2 text-white shadow-sm hover:bg-emerald-700 transition"
          >
            {isUploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handlePhotoChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.name || 'Nama Pegawai'}</h2>
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">{user.nip || 'NIP Pegawai'}</p>
        </div>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-50 mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Pengaturan Aplikasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-slate-900 dark:text-slate-50">Alarm Pengingat Absensi</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">Aktifkan notifikasi untuk pengingat absensi masuk dan pulang shift</p>
            </div>
            <Switch checked={alarmEnabled} onCheckedChange={handleToggleAlarm} />
          </div>
          
          {alarmEnabled && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-700 dark:text-slate-300">Pengingat Masuk (Menit Sebelum Shift)</Label>
                <div className="w-24">
                  <Input 
                    type="number" 
                    min="0"
                    value={alarmBeforeMinutes} 
                    onChange={handleBeforeMinutesChange}
                    className="text-center"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-700 dark:text-slate-300">Pengingat Pulang (Menit Sesudah Shift)</Label>
                <div className="w-24">
                  <Input 
                    type="number" 
                    min="0"
                    value={alarmAfterMinutes} 
                    onChange={handleAfterMinutesChange}
                    className="text-center"
                  />
                </div>
              </div>
              <div className="pt-2">
                <Button 
                  onClick={() => {
                    playAlarmSound();
                    toast.success("Suara alarm diuji! Pastikan volume perangkat Anda aktif.");
                  }}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-dashed border-teal-500/50 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20"
                >
                  <Volume2 className="h-4 w-4" />
                  Uji Suara Alarm (Chime)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-50 mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Informasi Pegawai</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Kantor / Penempatan</p>
            <p className="font-medium">{employeeData?.office || 'Puskesmas Induk'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Unit</p>
            <p className="font-medium">{employeeData?.unit || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Email</p>
            <p className="font-medium">{employeeData?.email || user.email || 'pegawai@puskesmas.com'}</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger render={
          <Button variant="outline" className="w-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
            Ubah Password
          </Button>
        } />
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ubah Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Password Lama</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Password'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
