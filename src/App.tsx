import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import axios from 'axios';

interface User {
  id: string;
  nip: string;
  nama: string;
  role: string;
}

interface Settings {
  toleransi_menit: number;
  mulai_pagi: string;
  selesai_pagi: string;
  mulai_sore: string;
  selesai_sore: string;
  mulai_malam: string;
  selesai_malam: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [nip, setNip] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get('/api/settings');
        setSettings(response.data);
      } catch (error) {
        console.error("Gagal fetch settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleLogin = async () => {
    console.log("Tombol login diklik, NIP:", nip);
    try {
      const response = await axios.get('/api/users');
      console.log("Response users:", response.data);
      const users = response.data;
      const foundUser = users.find((u: any) => u.nip === nip);

      if (foundUser) {
        setUser(foundUser);
        toast.success(`Selamat datang, ${foundUser.nama}`);
      } else {
        alert("NIP tidak terdaftar!");
      }
    } catch (error) {
      console.error("Gagal login:", error);
      alert("Gagal login, cek konsol untuk detail.");
    }
  };

  const getCurrentShiftInfo = () => {
    if (!settings) return { shiftSkrg: "", isTerlambat: false, msg: "" };

    const sekarang = new Date();
    const jam = sekarang.getHours();
    const menit = sekarang.getMinutes();
    const waktuSekarangMenit = jam * 60 + menit;

    let shiftSkrg = "";
    let jamMulai = "";

    if (jam >= 7 && jam < 14) { shiftSkrg = "Pagi"; jamMulai = settings.mulai_pagi; }
    else if (jam >= 14 && jam < 20) { shiftSkrg = "Sore"; jamMulai = settings.mulai_sore; }
    else { shiftSkrg = "Malam"; jamMulai = settings.mulai_malam; }

    const [h, m] = jamMulai.split(":").map(Number);
    const waktuMulaiMenit = h * 60 + m;
    
    const isTerlambat = waktuSekarangMenit > (waktuMulaiMenit + Number(settings.toleransi_menit));
    const msg = isTerlambat ? `Terlambat (Masuk jam ${jam}:${menit}, Batas ${jamMulai})` : "TEPAT WAKTU";

    return { shiftSkrg, isTerlambat, msg };
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Si Abon Elite</h1>
        <input 
          className="p-2 border rounded mb-2" 
          placeholder="Masukkan NIP" 
          value={nip}
          onChange={(e) => setNip(e.target.value)}
        />
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleLogin}>Login</button>
      </div>
    );
  }

  const { shiftSkrg, isTerlambat, msg } = getCurrentShiftInfo();

  return (
    <div className="p-4">
      <Toaster />
      <h2 className="text-xl font-bold">Halo, {user.nama}</h2>
      {settings && (
        <div className="bg-blue-100 p-3 rounded my-4">
          <p>Shift Saat Ini: <strong>{shiftSkrg}</strong></p>
          <p className={isTerlambat ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
            Status: {msg}
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-2">
        <button className="bg-green-500 text-white p-4 rounded" onClick={() => {
          if (isTerlambat) toast.error("Peringatan: Anda Terlambat!");
          // Absen logic here
        }}>Absen</button>
        <button className="bg-yellow-500 text-white p-4 rounded">Izin</button>
        <button className="bg-gray-500 text-white p-4 rounded">Profil</button>
      </div>
    </div>
  );
}
