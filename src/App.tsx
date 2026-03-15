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
  desa: string;
}

const LoadingSpinner = () => (
  <div className="flex justify-center items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

export const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 ${className}`}>
    {children}
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [nip, setNip] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [address, setAddress] = useState("");
  const [mode, setMode] = useState("Dinas Luar");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get('/api/settings');
        setSettings(response.data);
        
        // Geolocation check
        if (navigator.geolocation && response.data.desa) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              const data = await res.json();
              const addr = data.display_name;
              setAddress(addr);
              if (addr.includes(response.data.desa)) {
                setMode("Normal");
              } else {
                setMode("Dinas Luar");
              }
            } catch (err) {
              console.error("Gagal reverse geocoding:", err);
            }
          });
        }
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

    if (!jamMulai) return { shiftSkrg: shiftSkrg, isTerlambat: false, msg: "Pengaturan jam shift tidak lengkap" };

    const [h, m] = jamMulai.split(":").map(Number);
    const waktuMulaiMenit = h * 60 + m;
    
    const isTerlambat = waktuSekarangMenit > (waktuMulaiMenit + Number(settings.toleransi_menit || 0));
    const msg = isTerlambat ? `Terlambat (Masuk jam ${jam}:${menit}, Batas ${jamMulai})` : "TEPAT WAKTU";

    return { shiftSkrg, isTerlambat, msg };
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
        <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Si Abon Elite</h1>
          {isLoading ? <LoadingSpinner /> : (
            <>
              <input 
                className="w-full p-3 border border-gray-300 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none" 
                placeholder="Masukkan NIP" 
                value={nip}
                onChange={(e) => setNip(e.target.value)}
              />
              <button 
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-4 py-3 rounded-xl font-semibold hover:opacity-90 transition-all" 
                onClick={async () => {
                  setIsLoading(true);
                  await handleLogin();
                  setIsLoading(false);
                }}
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const { shiftSkrg, isTerlambat, msg } = getCurrentShiftInfo();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Toaster />
      <div className="max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Halo, {user.nama}</h2>
        {settings && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 mb-6">
            <p className="text-gray-600">Shift Saat Ini: <strong className="text-gray-900">{shiftSkrg}</strong></p>
            <p className="text-gray-600">Mode: <strong className="text-indigo-600">{mode}</strong></p>
            <p className={`mt-2 font-bold ${isTerlambat ? "text-red-600" : "text-green-600"}`}>
              Status: {msg}
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-4">
          <button 
            className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white p-4 rounded-2xl font-semibold shadow-lg hover:opacity-90 transition-all" 
            onClick={() => {
              if (isTerlambat) toast.error("Peringatan: Anda Terlambat!");
              // Absen logic here
            }}
          >
            Absen
          </button>
          <button className="bg-gradient-to-br from-amber-400 to-orange-500 text-white p-4 rounded-2xl font-semibold shadow-lg hover:opacity-90 transition-all">Izin</button>
          <button className="bg-gradient-to-br from-gray-400 to-slate-600 text-white p-4 rounded-2xl font-semibold shadow-lg hover:opacity-90 transition-all">Profil</button>
        </div>
      </div>
    </div>
  );
}
