import { Attendance, User } from '../types';
import { safeToDate } from './dateUtils';

export const formatAttendanceMatrix = (attendanceData: Attendance[], users: User[]) => {
  const dates = Array.from(new Set(attendanceData.map(a => safeToDate(a.timestamp).toLocaleDateString()))).sort();
  
  const matrix = users.map(user => {
    const row: any = { NIP: user.nip, Nama: user.name };
    dates.forEach(date => {
      const dayAttendance = attendanceData.filter(a => a.user_id === user.id && safeToDate(a.timestamp).toLocaleDateString() === date);
      
      const masuk = dayAttendance.find(a => a.type === 'Masuk');
      const pulang = dayAttendance.find(a => a.type === 'Pulang');
      
      let status = 'Tidak Hadir';
      let durasi = '00:00';
      
      if (masuk) {
        status = masuk.status;
        if (pulang) {
          let masukTime = safeToDate(masuk.timestamp);
          let pulangTime = safeToDate(pulang.timestamp);
          
          if (pulangTime < masukTime) {
            pulangTime.setDate(pulangTime.getDate() + 1);
          }
          
          const diff = pulangTime.getTime() - masukTime.getTime();
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          durasi = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      } else {
        // Check for other statuses
        const other = dayAttendance.find(a => ['Sakit', 'Cuti', 'Dinas Luar'].includes(a.type));
        if (other) {
          status = other.type;
          if (other.type === 'Dinas Luar') durasi = '08:00';
        }
      }
      
      row[`${date} (Status)`] = status;
      row[`${date} (Durasi)`] = durasi;
    });
    return row;
  });
  
  return matrix;
};
