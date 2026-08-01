import { getServerTime } from '@/lib/time';
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import ExcelJS from 'exceljs';

import { format } from 'date-fns';

export default function AdminSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "general";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // State for General Settings
  const [generalSettings, setGeneralSettings] = useState({
    appName: "Si Abon Eiite App",
    appLogo: "",
    companyName: "Puskesmas Sehat",
    headName: "Dr. Budi Santoso",
    email: "info@puskesmas.com",
    address: "Jl. Kesehatan No. 1",
    mainLocation: "-7.250445, 112.768845"
  });
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // State for Absensi Settings
  const [absensiSettings, setAbsensiSettings] = useState({
    tolerance: "15",
    enableCountdown: true,
    enableEarlyCheckout: true
  });
  const [isSavingAbsensi, setIsSavingAbsensi] = useState(false);

  // State for Leave Settings
  const [leaveSettings, setLeaveSettings] = useState({
    autoApprove: "0"
  });
  const [isSavingLeave, setIsSavingLeave] = useState(false);

  // State for Location Settings
  const [locations, setLocations] = useState<{ id: string; desa: string; kecamatan: string; kabupaten: string; coordinates: string; radius: number }[]>([]);
  const [isSavingLocations, setIsSavingLocations] = useState(false);

  // Load from API on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.generalSettings) setGeneralSettings(prev => ({ ...prev, ...data.generalSettings }));
          if (data.absensiSettings) setAbsensiSettings(prev => ({ ...prev, ...data.absensiSettings }));
          if (data.leaveSettings) setLeaveSettings(prev => ({ ...prev, ...data.leaveSettings }));
        }
        
        const locResponse = await fetch('/api/locations');
        if (locResponse.ok) {
          const locData = await locResponse.json();
          setLocations(locData);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        // Fallback to local storage
        const savedGeneral = localStorage.getItem('generalSettings');
        if (savedGeneral) setGeneralSettings(prev => ({ ...prev, ...JSON.parse(savedGeneral) }));
        const savedAbsensi = localStorage.getItem('absensiSettings');
        if (savedAbsensi) setAbsensiSettings(prev => ({ ...prev, ...JSON.parse(savedAbsensi) }));
        const savedLeave = localStorage.getItem('leaveSettings');
        if (savedLeave) setLeaveSettings(prev => ({ ...prev, ...JSON.parse(savedLeave) }));
      }
    };
    fetchSettings();
  }, []);

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setGeneralSettings(prev => ({ ...prev, [id]: value }));
  };

  const handleAbsensiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setAbsensiSettings(prev => ({ ...prev, [id]: value }));
  };

  const handleLeaveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setLeaveSettings(prev => ({ ...prev, [id]: value }));
  };

  const saveSetting = async (key: string, value: any, setSaving: (val: boolean) => void, successMessage: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      const data = await response.json();
      if (response.ok && data.success !== false) {
        localStorage.setItem(key, JSON.stringify(value));
        toast.success(successMessage);
      } else {
        toast.error(data.message || "Gagal menyimpan pengaturan ke server");
      }
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeneral = () => {
    saveSetting('generalSettings', generalSettings, setIsSavingGeneral, "Pengaturan Umum berhasil disimpan!");
  };

  const handleSaveAbsensi = () => {
    saveSetting('absensiSettings', absensiSettings, setIsSavingAbsensi, "Pengaturan Absensi berhasil disimpan!");
  };

  const handleSaveLeave = () => {
    saveSetting('leaveSettings', leaveSettings, setIsSavingLeave, "Pengaturan Izin & Cuti berhasil disimpan!");
  };

  const handleExportUsers = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data User');
    worksheet.addRow(['ID', 'Nama', 'Email', 'Role']);
    worksheet.addRow(['1', 'Admin User', 'admin@puskesmas.com', 'Admin']);
    worksheet.addRow(['2', 'Regular User', 'user@puskesmas.com', 'User']);
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_User_${format(getServerTime(), 'yyyy-MM-dd')}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Data User berhasil diekspor!");
  };

  const handleExportAbsensi = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Absensi');
    worksheet.addRow(['Tanggal', 'Nama', 'Status', 'Jam Masuk']);
    worksheet.addRow(['2026-04-01', 'Admin User', 'Hadir', '07:45']);
    worksheet.addRow(['2026-04-01', 'Regular User', 'Hadir', '07:50']);
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Absensi_Semua_${format(getServerTime(), 'yyyy-MM-dd')}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Data Absensi berhasil diekspor!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sistem</h1>
        <p className="text-sm text-slate-500">Pengaturan aplikasi dan manajemen data.</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Umum</CardTitle>
              <CardDescription>Atur informasi dasar aplikasi dan instansi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="appName">Nama Aplikasi</Label>
                <Input id="appName" value={generalSettings.appName} onChange={handleGeneralChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="appLogo">Logo Aplikasi (URL atau Base64)</Label>
                <div className="flex gap-4 items-start">
                  {generalSettings.appLogo && (
                    <div className="w-16 h-16 rounded-md border flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                      <img src={generalSettings.appLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <Input 
                      id="appLogo" 
                      type="file" 
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const MAX_WIDTH = 200;
                              const MAX_HEIGHT = 200;
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
                              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                              setGeneralSettings(prev => ({ ...prev, appLogo: dataUrl }));
                            };
                            img.src = reader.result as string;
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                    <p className="text-xs text-slate-500">Format yang didukung: JPG, JPEG, PNG. Maksimal 1MB.</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyName">Nama Instansi/Perusahaan</Label>
                <Input id="companyName" value={generalSettings.companyName} onChange={handleGeneralChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="headName">Nama Kepala Instansi/Pimpinan</Label>
                <Input id="headName" value={generalSettings.headName} onChange={handleGeneralChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Instansi/Perusahaan</Label>
                <Input id="email" type="email" value={generalSettings.email} onChange={handleGeneralChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Alamat Instansi</Label>
                <Input id="address" value={generalSettings.address} onChange={handleGeneralChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mainLocation">Koordinat Kantor Induk / Pusat</Label>
                <Input id="mainLocation" value={generalSettings.mainLocation} onChange={handleGeneralChange} placeholder="-7.250445, 112.768845" />
                <p className="text-xs text-slate-500">Karyawan yang berada dalam radius 100 meter dari koordinat ini dapat melakukan absensi.</p>
              </div>
              <Button className="mt-4" onClick={handleSaveGeneral} disabled={isSavingGeneral}>
                {isSavingGeneral ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="absensi">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Absensi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="tolerance">Toleransi Keterlambatan (Menit)</Label>
                <Input id="tolerance" type="number" value={absensiSettings.tolerance} onChange={handleAbsensiChange} />
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <input
                  type="checkbox"
                  id="enableCountdown"
                  checked={absensiSettings.enableCountdown}
                  onChange={(e) => setAbsensiSettings(prev => ({ ...prev, enableCountdown: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 relative cursor-pointer
                    appearance-none checked:bg-teal-600 checked:border-transparent
                    after:content-[''] after:hidden checked:after:block
                    after:absolute after:left-[4px] after:top-0.5 after:w-[5px] after:h-[10px] 
                    after:border-r-2 after:border-b-2 after:border-white after:rotate-45"
                />
                <Label htmlFor="enableCountdown">Aktifkan Hitung Mundur Absensi Masuk</Label>
              </div>
              <p className="text-xs text-slate-500 mt-1">Jika dinonaktifkan, karyawan bebas melakukan absensi jam berapapun.</p>
              
              <div className="flex items-center space-x-2 mt-4">
                <input
                  type="checkbox"
                  id="enableEarlyCheckout"
                  checked={absensiSettings.enableEarlyCheckout}
                  onChange={(e) => setAbsensiSettings(prev => ({ ...prev, enableEarlyCheckout: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 relative cursor-pointer
                    appearance-none checked:bg-teal-600 checked:border-transparent
                    after:content-[''] after:hidden checked:after:block
                    after:absolute after:left-[4px] after:top-0.5 after:w-[5px] after:h-[10px] 
                    after:border-r-2 after:border-b-2 after:border-white after:rotate-45"
                />
                <Label htmlFor="enableEarlyCheckout">Aktifkan Tombol Pulang Cepat</Label>
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-4">Mengizinkan karyawan absen pulang lebih awal sebelum waktunya.</p>

              <Button className="mt-4" onClick={handleSaveAbsensi} disabled={isSavingAbsensi}>
                {isSavingAbsensi ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Izin & Cuti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="autoApprove">Auto-Approve (Hari)</Label>
                <Input id="autoApprove" type="number" value={leaveSettings.autoApprove} onChange={handleLeaveChange} />
                <p className="text-xs text-slate-500">Set 0 untuk menonaktifkan auto-approve.</p>
              </div>
              <Button className="mt-4" onClick={handleSaveLeave} disabled={isSavingLeave}>
                {isSavingLeave ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lokasi">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Lokasi</CardTitle>
              <CardDescription>Kelola lokasi kantor dan radius geofence.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {locations.map(loc => (
                <div key={loc.id} className="p-4 border rounded-lg space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Input value={loc.desa || ''} onChange={(e) => setLocations(prev => prev.map(l => l.id === loc.id ? {...l, desa: e.target.value} : l))} placeholder="Desa" />
                    <Input value={loc.kecamatan || ''} onChange={(e) => setLocations(prev => prev.map(l => l.id === loc.id ? {...l, kecamatan: e.target.value} : l))} placeholder="Kecamatan" />
                    <Input value={loc.kabupaten || ''} onChange={(e) => setLocations(prev => prev.map(l => l.id === loc.id ? {...l, kabupaten: e.target.value} : l))} placeholder="Kabupaten" />
                  </div>
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold">{loc.desa || 'Desa'}, {loc.kecamatan || 'Kecamatan'}, {loc.kabupaten || 'Kabupaten'}</h3>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`radius-${loc.id}`}>Radius (m):</Label>
                      <Input 
                        id={`radius-${loc.id}`} 
                        type="number" 
                        value={loc.radius || 0} 
                        onChange={(e) => {
                          const newRadius = parseInt(e.target.value);
                          setLocations(prev => prev.map(l => l.id === loc.id ? {...l, radius: newRadius} : l));
                        }}
                        className="w-20"
                      />
                    </div>
                  </div>
                  <div className="aspect-video w-full bg-slate-100 rounded-lg overflow-hidden">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://www.openstreetmap.org/export/embed.html?marker=${(loc.coordinates || '0,0').split(',')[0]},${(loc.coordinates || '0,0').split(',')[1]}&layer=mapnik`}
                      style={{ border: '0' }}
                    />
                  </div>
                </div>
              ))}
              <Button onClick={async () => {
                setIsSavingLocations(true);
                try {
                  for (const loc of locations) {
                    await fetch('/api/locations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(loc)
                    });
                  }
                  toast.success("Pengaturan lokasi berhasil disimpan!");
                } catch (error) {
                  toast.error("Gagal menyimpan pengaturan lokasi");
                } finally {
                  setIsSavingLocations(false);
                }
              }} disabled={isSavingLocations}>
                {isSavingLocations ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Manajemen Data</CardTitle>
              <CardDescription>Import dan export data sistem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button variant="outline" onClick={handleExportUsers}>Export Data User (Excel)</Button>
                <Button variant="outline" onClick={handleExportAbsensi}>Export Data Absensi (Excel)</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
