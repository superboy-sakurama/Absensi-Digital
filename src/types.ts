export interface User {
  id: string;
  nip: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  village?: string;
  deviceId?: string;
  deviceInfo?: string;
  status?: 'active' | 'pending';
}

export interface Branch {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Attendance {
  id: string;
  user_id: string;
  type: 'Masuk' | 'Pulang' | 'Dinas Luar' | 'Sakit' | 'Cuti';
  status: string;
  timestamp: any;
  latitude: number;
  longitude: number;
  address?: string;
  photo: string;
  name?: string;
  nip?: string;
}

export interface Permission {
  id: string;
  user_id: string;
  type: 'Sakit' | 'Cuti' | 'Dinas Luar';
  reason: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: any;
  name?: string;
  nip?: string;
}
