import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { Attendance, User } from '../types';
import { Card } from '../App'; // Assuming Card is exported from App.tsx or I can redefine it

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

export default function AdminDashboard({ attendanceData }: { attendanceData: Attendance[] }) {
  const [stats, setStats] = useState({ masuk: 0, dinasLuar: 0, sakit: 0, cuti: 0 });

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      <div className="h-96 w-full rounded-2xl overflow-hidden border border-zinc-200">
        <MapContainer center={[-6.2000, 106.8166]} zoom={15} className="h-full w-full">
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
            <div key={idx} className="flex justify-between items-center border-b pb-2">
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
