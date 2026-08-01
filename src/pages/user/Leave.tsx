import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getServerTime } from '@/lib/time';

export default function UserLeave() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [leaveType, setLeaveType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [attachment, setAttachment] = useState<File | null>(null);

  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    
    // Fetch settings for autoApprove
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error('Error fetching settings:', err));

    // Fetch leave history
    fetch('/api/attendance')
      .then(res => res.json())
      .then(data => {
        const history = data.filter((a: any) => 
          a.nip === userData.nip && 
          ['izin', 'sakit', 'cuti', 'Cuti', 'dinas_luar'].includes(a.type)
        );
        setLeaveHistory(history.reverse()); // Show latest first
      })
      .catch(err => console.error('Error fetching history:', err));
  }, []);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 400; 
          const MAX_HEIGHT = 400;
          
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
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const getLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung oleh browser ini'));
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveType) {
      toast.error('Pilih jenis izin terlebih dahulu');
      return;
    }

    setLoading(true);

    try {
      // Check if already checked in on the requested start date
      const attResponse = await fetch('/api/attendance');
      if (attResponse.ok) {
         const attData = await attResponse.json();
         const hasCheckedInOnStartDate = attData.some((a: any) => a.nip === user?.nip && a.date === startDate && a.type === 'in');
         if (hasCheckedInOnStartDate) {
           toast.error('Anda sudah melakukan absen masuk pada tanggal tersebut, tidak bisa mengajukan izin.');
           setLoading(false);
           return;
         }
      }

      let lat = null;
      let lng = null;
      try {
        toast.info('Mengambil lokasi Anda...');
        const pos = await getLocation();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (locErr: any) {
        toast.error('Gagal mendapatkan lokasi: ' + locErr.message);
      }

      let type = '';
      let status = '';

      if (leaveType === 'izin') {
        type = 'izin';
      } else if (leaveType === 'sakit') {
        type = 'sakit';
      } else if (leaveType === 'cuti') {
        type = 'Cuti';
      } else if (leaveType === 'dinas_luar') {
        type = 'dinas_luar';
      }

      // Check autoApprove setting
      const autoApprove = settings?.leaveSettings?.autoApprove;
      
      // If autoApprove is false/string false/0, require manual approval
      if (!autoApprove || autoApprove === "false" || autoApprove === false || autoApprove === "0" || autoApprove === 0) {
        status = 'pending';
      } else {
        // Auto approve immediately
        if (type === 'izin') status = 'izin';
        else if (type === 'sakit') status = 'Sakit';
        else if (type === 'Cuti') status = 'Cuti';
        else if (type === 'dinas_luar') status = 'Dinas Luar';
      }

      let fileData = '';
      if (attachment) {
        if (attachment.type.startsWith('image/')) {
          fileData = await compressImage(attachment);
        } else {
          fileData = await getBase64(attachment);
        }
      }

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nip: user?.nip || 'N/A',
          name: user?.name || 'N/A',
          date: startDate,
          time: getServerTime().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          type: type,
          location: { lat, lng, reason, endDate }, 
          status: status,
          photoUrl: fileData,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Gagal mengajukan izin');
      }

      toast.success('Permintaan izin berhasil diajukan');
      setLoading(false);
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      setAttachment(null);
      
      setTimeout(() => {
        navigate('/user');
      }, 1000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Terjadi kesalahan saat mengajukan izin');
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Pengajuan Izin</h1>
        <p className="text-sm text-slate-400">Ajukan izin tidak masuk kerja.</p>
      </div>

      <Card className="bg-slate-900 border-slate-800 text-slate-50">
        <CardHeader>
          <CardTitle className="text-lg">Formulir Izin</CardTitle>
          <CardDescription className="text-slate-400">Isi detail izin Anda di bawah ini.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-slate-300">Jenis Izin</Label>
              <Select required value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-50">
                  <SelectValue placeholder="Pilih jenis izin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-50">
                  <SelectItem value="sakit">Sakit</SelectItem>
                  <SelectItem value="cuti">Cuti Tahunan</SelectItem>
                  <SelectItem value="izin">Izin Keperluan Pribadi</SelectItem>
                  <SelectItem value="dinas_luar">Dinas Luar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-slate-300">Mulai Tanggal</Label>
                <Input id="startDate" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-950 border-slate-800 text-slate-50 [color-scheme:dark]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-slate-300">Sampai Tanggal</Label>
                <Input id="endDate" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-950 border-slate-800 text-slate-50 [color-scheme:dark]" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-slate-300">Keterangan / Alasan</Label>
              <Input id="reason" placeholder="Tuliskan alasan..." required value={reason} onChange={(e) => setReason(e.target.value)} className="bg-slate-950 border-slate-800 text-slate-50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment" className="text-slate-300">Lampiran (Surat Dokter/Bukti)</Label>
              <Input id="attachment" type="file" onChange={(e) => setAttachment(e.target.files?.[0] || null)} className="bg-slate-950 border-slate-800 text-slate-50 file:text-emerald-400" />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
              disabled={loading}
            >
              {loading ? 'Mengirim...' : 'Ajukan Izin'}
            </Button>
          </CardContent>
        </form>
      </Card>

      <div className="mt-8">
        <h3 className="text-lg font-medium text-white mb-4">Riwayat Pengajuan</h3>
        <div className="space-y-3 pb-8">
          {leaveHistory.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Belum ada riwayat pengajuan.</p>
          ) : (
            leaveHistory.map((history, idx) => {
              let displayReason = history.location;
              let hasAttachment = !!history.photoUrl && history.photoUrl !== 'Image too large to save in spreadsheet';
              if (typeof history.location === 'object' && history.location !== null) {
                displayReason = history.location.reason;
              }
              return (
              <Card key={idx} className="bg-slate-900 border-slate-800 text-slate-50">
                <CardContent className="p-4 flex flex-col justify-between items-start gap-2">
                  <div className="w-full flex justify-between items-center">
                    <div>
                      <p className="font-medium capitalize">{history.type.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-400">
                        {history.date} {(typeof history.location === 'object' && history.location !== null && history.location.endDate && history.location.endDate !== history.date) ? `s/d ${history.location.endDate}` : ""}
                      </p>
                      {displayReason && (
                        <p className="text-xs text-slate-500 mt-1 italic">"{displayReason}"</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded border ${
                      history.status === 'pending' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                        : history.status === 'Ditolak'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {history.status === 'pending' ? 'Menunggu' : history.status === 'Ditolak' ? 'Ditolak' : 'Disetujui'}
                    </span>
                  </div>
                  {hasAttachment && (
                    <a href={history.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 underline mt-1">
                      Lihat Lampiran
                    </a>
                  )}
                </CardContent>
              </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

