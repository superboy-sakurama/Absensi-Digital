import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
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

  const fetchUserAttendance = async (userId: string) => {
    const q = query(collection(db, 'attendance'), where('user_id', '==', userId), orderBy('timestamp', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    setUserAttendance(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
  };

  const exportToExcel = () => {
    const matrixData = formatAttendanceMatrix(attendanceData, users);
    const ws = XLSX.utils.json_to_sheet(matrixData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "Attendance.xlsx");
  };

  const exportUserToExcel = () => {
    // Logic for custom date range export
    const filtered = userAttendance.filter(a => {
      const date = new Date(a.timestamp.toDate()).toLocaleDateString();
      return date >= dateRange.start && date <= dateRange.end;
    });
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "UserAttendance");
    XLSX.writeFile(wb, `Attendance_${selectedUser?.name}.xlsx`);
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
      <div className="flex justify-end">
        <button onClick={exportToExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Export Excel</button>
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
              <h3 className="text-lg font-bold mb-4">Detail {selectedUser.name}</h3>
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
