import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { getServerTime } from '@/lib/time';

export default function UserHistory() {
  const [date, setDate] = useState<Date | undefined>(getServerTime());
  const [currentMonth, setCurrentMonth] = useState<Date>(getServerTime());
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const yyyy = currentMonth.getFullYear();
        const mm = String(currentMonth.getMonth() + 1).padStart(2, '0');
        const firstDay = `${yyyy}-${mm}-01`;
        const lastDayObj = new Date(yyyy, currentMonth.getMonth() + 1, 0);
        const lastDay = `${lastDayObj.getFullYear()}-${String(lastDayObj.getMonth() + 1).padStart(2, '0')}-${String(lastDayObj.getDate()).padStart(2, '0')}`;
        
        const [attRes, holRes] = await Promise.all([
           fetch(`/api/attendance?startDate=${firstDay}&endDate=${lastDay}`),
           fetch(`/api/holidays`)
        ]);

        if (attRes.ok) {
          const data = await attRes.json();
          // Filter for current user
          const userAttendance = data.filter((a: any) => a.nip === user.nip);
          setAttendanceData(userAttendance);
        }
        if (holRes && holRes.ok) {
           const data = await holRes.json();
           setHolidays(data);
        }
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) return;
        console.error('Failed to fetch attendance:', error);
      }
    };
    if (user.nip) {
      fetchAttendance();
    }
  }, [user.nip, currentMonth]);

  const selectedDateString = date ? format(date, 'yyyy-MM-dd') : '';
  const dayAttendance = attendanceData.filter(a => {
    if (a.date === selectedDateString) return true;
    if (typeof a.location === 'object' && a.location !== null && a.location.endDate) {
      return selectedDateString >= a.date && selectedDateString <= a.location.endDate;
    }
    return false;
  });
  
  const holidayToday = holidays.find(h => format(new Date(h.date), "yyyy-MM-dd") === selectedDateString);

  const inRecord = dayAttendance.find(a => a.type === 'in');
  const outRecord = dayAttendance.find(a => a.type === 'out');
  const leaveRecord = dayAttendance.find(a => ['izin', 'sakit', 'Cuti', 'dinas_luar'].includes(a.type));

  const jamMasuk = inRecord?.time || '-';
  const jamKeluar = outRecord?.time || '-';
  const status = leaveRecord ? (leaveRecord.type === 'Cuti' ? 'Cuti Tahunan' : leaveRecord.type === 'dinas_luar' ? 'Dinas Luar' : leaveRecord.type) : (dayAttendance.length > 0 ? dayAttendance[0].status : (holidayToday ? 'Libur' : 'Belum Absen'));

  let leaveReason = null;
  if (leaveRecord) {
    leaveReason = typeof leaveRecord.location === 'object' && leaveRecord.location !== null ? leaveRecord.location.reason : leaveRecord.location;
  }

  // Find all holiday dates for highlighting
  const holidayDates = holidays.map(h => new Date(h.date));

  return (
    <div className="p-4 space-y-6">
      <div className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Riwayat Absensi</h1>
        <p className="text-sm text-slate-400">Pantau kehadiran Anda bulan ini.</p>
      </div>

      <Card className="bg-slate-900 border-slate-800 text-slate-50">
        <CardContent className="p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            onMonthChange={setCurrentMonth}
            month={currentMonth}
            modifiers={{ holiday: holidayDates }}
            modifiersClassNames={{
              holiday: "text-red-400 font-bold"
            }}
            className="rounded-md border-0 w-full flex justify-center p-4"
            classNames={{
              day_selected: "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-500 focus:text-white",
              day_today: "bg-slate-800 text-emerald-400",
            }}
          />
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800 text-slate-50">
        <CardHeader>
          <CardTitle className="text-lg">Detail Tanggal: {date?.toLocaleDateString('id-ID')}</CardTitle>
          {holidayToday && (
            <p className="text-sm text-red-400 mt-1">{holidayToday.name}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!leaveRecord && (
            <>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Jam Masuk</span>
                <span className="font-medium text-emerald-400">{jamMasuk}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400">Jam Keluar</span>
                <span className="font-medium text-blue-400">{jamKeluar}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center pb-2">
            <span className="text-slate-400">Status</span>
            <span className={`font-medium px-2 py-1 capitalize rounded ${status === 'Belum Absen' ? 'text-slate-400 bg-slate-800' : status === 'Libur' ? 'text-red-400 bg-red-400/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
              {status} {leaveRecord && leaveRecord.status === 'pending' ? '(Menunggu)' : leaveRecord && leaveRecord.status === 'Ditolak' ? '(Ditolak)' : ''}
            </span>
          </div>
          {leaveRecord && leaveReason && leaveReason !== 'undefined' && (
            <div className="flex justify-between items-center mt-2 border-t border-slate-800 pt-2">
              <span className="text-slate-400">Keterangan</span>
              <span className="font-medium text-emerald-400 max-w-[200px] text-right truncate" title={leaveReason}>{leaveReason}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
