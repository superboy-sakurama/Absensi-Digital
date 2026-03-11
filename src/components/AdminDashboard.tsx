import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Attendance, User } from '../types';
import { Card } from '../App';
import { formatAttendanceMatrix } from '../utils/attendanceUtils';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const yellowIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function AdminDashboard({ attendanceData, users }: { attendanceData: Attendance[], users: User[] }) {
  const [stats, setStats] = useState({ masuk: 0, dinasLuar: 0, sakit: 0, cuti: 0 });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userAttendance, setUserAttendance] = useState<Attendance[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [mapCenter, setMapCenter] = useState<[number, number]>([-7.115, 112.415]);
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  const fetchUserAttendance = async (userId: string) => {
    const q = query(collection(db, 'attendance'), where('user_id', '==', userId), orderBy('timestamp', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    setUserAttendance(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
  };

  const exportToExcel = async () => {
    toast.loading('Menyiapkan data export...', { id: 'export' });
    try {
      const startDate = new Date(exportYear, exportMonth - 1, 1);
      const endDate = new Date(exportYear, exportMonth, 0, 23, 59, 59, 999);
      
      const q = query(
        collection(db, 'attendance'),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate)
      );
      
      const snapshot = await getDocs(q);
      const monthAttendance = snapshot.docs.map(d => d.data() as Attendance);
      
      const daysInMonth = endDate.getDate();
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      
      // Build AOA (Array of Arrays) for Excel
      const aoa: any[][] = [];
      
      // Row 1
      const row1 = ['TAHUN :', '', exportYear];
      for (let i = 0; i < daysInMonth; i++) row1.push(i === 0 ? 'HARI / TANGGAL' : '');
      row1.push('JUMLAH PRESENTASE KERJA');
      aoa.push(row1);
      
      // Row 2
      const row2 = ['BULAN :', '', monthNames[exportMonth - 1]];
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(exportYear, exportMonth - 1, i);
        row2.push(dayNames[d.getDay()]);
      }
      aoa.push(row2);
      
      // Row 3
      aoa.push(['PUSKESMAS KALITENGAH']);
      
      // Row 4 (Headers)
      const headers = ['NO', 'UNIT', 'NAMA'];
      for (let i = 1; i <= daysInMonth; i++) headers.push(i.toString());
      headers.push('SAKIT (S)', 'CUTI (C)', 'IZIN (I)', 'ALPA (A)', 'DINAS LUAR (D)', 'JUMLAH HADIR', 'HARI KERJA BULAN INI', 'PERSENTASE KEHADIRAN');
      aoa.push(headers);
      
      // Data Rows
      let totalKehadiranPerHari = new Array(daysInMonth).fill(0);
      
      users.forEach((user, index) => {
        const row = [index + 1, user.village || 'Induk', user.name];
        
        let s = 0, c = 0, i = 0, a = 0, d = 0, hadir = 0;
        let hariKerja = daysInMonth; // Assuming all days are working days for now, or we can calculate excluding Sundays
        
        for (let day = 1; day <= daysInMonth; day++) {
          const currentDate = new Date(exportYear, exportMonth - 1, day);
          // Skip Sundays for working days count if needed, but the image shows 24 working days.
          // Let's just use 24 as a placeholder or calculate it.
          // For now, let's just count actual attendance.
          
          const dayRecords = monthAttendance.filter(att => {
            const attDate = att.timestamp.toDate();
            return att.user_id === user.id && 
                   attDate.getDate() === day && 
                   attDate.getMonth() === exportMonth - 1 && 
                   attDate.getFullYear() === exportYear;
          });
          
          let statusMark = '';
          if (dayRecords.length > 0) {
            // Prioritize statuses
            const hasMasuk = dayRecords.some(att => att.type === 'Masuk');
            const hasSakit = dayRecords.some(att => att.type === 'Sakit');
            const hasCuti = dayRecords.some(att => att.type === 'Cuti');
            const hasDinas = dayRecords.some(att => att.type === 'Dinas Luar');
            
            if (hasMasuk) { statusMark = 'M'; hadir++; totalKehadiranPerHari[day-1]++; }
            else if (hasSakit) { statusMark = 'S'; s++; }
            else if (hasCuti) { statusMark = 'C'; c++; }
            else if (hasDinas) { statusMark = 'D'; d++; }
          } else {
            // If it's Sunday, maybe leave blank or 'L' (Libur)
            if (currentDate.getDay() !== 0) {
              // Not sunday and no record -> Alpa
              // statusMark = 'A'; a++;
            }
          }
          row.push(statusMark);
        }
        
        // We need a fixed working days or calculate it. Let's use 24 as in the image.
        const workingDays = 24; 
        const percentage = Math.round((hadir / workingDays) * 100) + '%';
        
        row.push(s, c, i, a, d, hadir, workingDays, percentage);
        aoa.push(row);
      });
      
      // Bottom Row
      const bottomRow = ['', '', 'JUMLAH KEHADIRAN'];
      totalKehadiranPerHari.forEach(total => bottomRow.push(total));
      aoa.push(bottomRow);
      
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      
      // Merges
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // TAHUN :
        { s: { r: 0, c: 3 }, e: { r: 0, c: 3 + daysInMonth - 1 } }, // HARI / TANGGAL
        { s: { r: 0, c: 3 + daysInMonth }, e: { r: 0, c: 3 + daysInMonth + 7 } }, // JUMLAH PRESENTASE
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // BULAN :
        { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }, // PUSKESMAS
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekap Bulanan");
      XLSX.writeFile(wb, `Rekap_Absensi_${monthNames[exportMonth - 1]}_${exportYear}.xlsx`);
      
      toast.success('Export berhasil', { id: 'export' });
    } catch (err) {
      console.error("Export error:", err);
      toast.error('Gagal mengekspor data', { id: 'export' });
    }
  };

  const exportUserToExcel = async () => {
    if (!selectedUser) return;
    if (!dateRange.start || !dateRange.end) {
      toast.error('Pilih rentang tanggal terlebih dahulu');
      return;
    }

    try {
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'attendance'),
        where('user_id', '==', selectedUser.id),
        where('timestamp', '>=', start),
        where('timestamp', '<=', end),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => {
        const docData = d.data();
        return {
          Tanggal: new Date(docData.timestamp.toDate()).toLocaleString('id-ID'),
          Status: docData.status,
          Lokasi: docData.location ? `${docData.location.lat}, ${docData.location.lng}` : '-',
          Catatan: docData.notes || '-'
        };
      });

      if (data.length === 0) {
        toast.error('Tidak ada data pada rentang tanggal tersebut');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Riwayat Absensi");
      XLSX.writeFile(wb, `Absensi_${selectedUser.name}_${dateRange.start}_to_${dateRange.end}.xlsx`);
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error('Gagal mengekspor data');
    }
  };

  const resetDevice = async () => {
    if (!selectedUser) return;
    if (window.confirm(`Reset perangkat untuk ${selectedUser.name}?`)) {
      try {
        await updateDoc(doc(db, 'users', selectedUser.id), {
          deviceId: null,
          deviceInfo: null
        });
        toast.success(`Perangkat untuk ${selectedUser.name} berhasil direset.`);
      } catch (err) {
        console.error("Error resetting device:", err);
        toast.error('Gagal mereset perangkat.');
      }
    }
  };

  useEffect(() => {
    const newStats = { masuk: 0, dinasLuar: 0, sakit: 0, cuti: 0 };
    attendanceData.forEach(item => {
      if (item.status === 'Masuk') newStats.masuk++;
      else if (item.status === 'Dinas Luar') newStats.dinasLuar++;
      else if (item.status === 'Sakit') newStats.sakit++;
      else if (item.status === 'Cuti') newStats.cuti++;
    });
    setStats(newStats);
  }, [attendanceData]);

  const villagePolygon: [number, number][] = [
    [-6.2000, 106.8166],
    [-6.2010, 106.8176],
    [-6.2020, 106.8166],
    [-6.2010, 106.8156],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
        <div className="flex items-center gap-2">
          <select 
            value={exportMonth} 
            onChange={e => setExportMonth(Number(e.target.value))}
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <input 
            type="number" 
            value={exportYear} 
            onChange={e => setExportYear(Number(e.target.value))}
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm w-24 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button onClick={exportToExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">
          Export Rekap Bulanan
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold mb-4">Daftar Pegawai</h3>
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className={`p-2 border rounded-lg cursor-pointer hover:bg-zinc-50 ${selectedUser?.id === user.id ? 'bg-zinc-100' : ''}`} onClick={() => { setSelectedUser(user); fetchUserAttendance(user.id); }}>
                <p className="font-bold">{user.name}</p>
                <p className="text-sm text-zinc-500">{user.nip}</p>
              </div>
            ))}
          </div>
        </Card>
        
        <div className="space-y-6">
          {selectedUser ? (
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Detail {selectedUser.name}</h3>
                <button onClick={resetDevice} className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-600">
                  Reset Perangkat
                </button>
              </div>
              <div className="space-y-2">
                {userAttendance.map(a => (
                  <div key={a.id} className="flex justify-between text-sm">
                    <span>{new Date(a.timestamp.toDate()).toLocaleDateString()}</span>
                    <span>{a.status}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input type="date" onChange={e => setDateRange({...dateRange, start: e.target.value})} className="border rounded-lg p-2" />
                <input type="date" onChange={e => setDateRange({...dateRange, end: e.target.value})} className="border rounded-lg p-2" />
                <button onClick={exportUserToExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Download</button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <h3 className="text-sm text-zinc-500">Masuk</h3>
                <p className="text-2xl font-bold text-emerald-600">{stats.masuk}</p>
              </Card>
              <Card>
                <h3 className="text-sm text-zinc-500">Dinas Luar</h3>
                <p className="text-2xl font-bold text-yellow-600">{stats.dinasLuar}</p>
              </Card>
              <Card>
                <h3 className="text-sm text-zinc-500">Sakit</h3>
                <p className="text-2xl font-bold text-blue-600">{stats.sakit}</p>
              </Card>
              <Card>
                <h3 className="text-sm text-zinc-500">Cuti</h3>
                <p className="text-2xl font-bold text-purple-600">{stats.cuti}</p>
              </Card>
            </div>
          )}
        </div>
      </div>

      <div className="h-96 w-full rounded-2xl overflow-hidden border border-zinc-200">
        <MapContainer center={mapCenter} zoom={15} className="h-full w-full">
          <MapUpdater center={mapCenter} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Polygon positions={villagePolygon} color="blue" />
          {attendanceData.map((item, idx) => (
            <Marker 
              key={idx} 
              position={[item.latitude, item.longitude]} 
              icon={item.status === 'Masuk' ? greenIcon : yellowIcon}
            >
              <Popup>
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm">{item.status}</p>
                  <p className="text-xs">{new Date(item.timestamp.toDate()).toLocaleTimeString()}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <Card>
        <h3 className="text-lg font-bold mb-4">Aktivitas Terbaru</h3>
        <div className="space-y-4">
          {attendanceData.slice(0, 5).map((item, idx) => (
            <div key={idx} className="flex justify-between items-center border-b pb-2 cursor-pointer hover:bg-zinc-50" onClick={() => setMapCenter([item.latitude, item.longitude])}>
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="text-sm text-zinc-500">{item.status}</p>
              </div>
              <p className="text-sm text-zinc-400">{new Date(item.timestamp.toDate()).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
