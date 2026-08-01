import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { Resend } from 'resend';

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const app = express();
export default app;

const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Mock Database (In-Memory for Prototype)
  const db = {
    users: [
      { id: 1, nip: '12345678', name: 'Admin User', email: 'admin@puskesmas.com', role: 'admin', password: '12345678', office: 'Kantor Induk', group: 'Superadmin' },
      { id: 2, nip: '87654321', name: 'Regular User', email: 'user@puskesmas.com', role: 'user', password: '87654321', office: 'Pustu A' },
    ],
    employees: [
      { id: '1', name: 'Admin User', nip: '12345678', office: 'Kantor Induk', email: 'admin@puskesmas.com', gender: 'Laki-laki', cluster: 'Klaster 1', unit: 'Manajemen' },
      { id: '2', name: 'Regular User', nip: '87654321', office: 'Pustu A', email: 'user@puskesmas.com', gender: 'Perempuan', cluster: 'Klaster 2', unit: 'Pustu' }
    ],
    attendance: [],
    locations: [
      { id: 1, name: 'Kantor Induk', lat: -7.250445, lng: 112.768845, radius: 300 },
    ],
    settings: {
      appName: 'Si Abon ELite App',
      companyName: 'Puskesmas Sehat',
      headName: 'Dr. Budi Santoso',
      address: 'Jl. Kesehatan No. 1, Kota Sehat',
      mainLocation: '-7.250445, 112.768845',
      tolerance: 25,
    }
  };

  // Google Spreadsheet Setup
  let doc: GoogleSpreadsheet | null = null;
  let isDocLoaded = false;
  let docLoadPromise: Promise<void> | null = null;
  
  // Cache for spreadsheet data
  const cache: { [key: string]: { data: any; timestamp: number } } = {};
  const inFlightRequests: { [key: string]: Promise<any> } = {};
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  const syncedSheets = new Set<string>();
  
  async function getCachedData(key: string, fetchFn: () => Promise<any>) {
    if (cache[key] && Date.now() - cache[key].timestamp < CACHE_DURATION) {
      return cache[key].data;
    }
    if (inFlightRequests[key]) {
      return inFlightRequests[key];
    }
    const promise = fetchFn().then(data => {
      cache[key] = { data, timestamp: Date.now() };
      return data;
    }).finally(() => {
      delete inFlightRequests[key];
    });
    inFlightRequests[key] = promise;
    return promise;
  }
  if (process.env.SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
      console.log('Attempting to connect to Google Sheets...');
      const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth);
    } catch (error) {
      console.error('Failed to configure Google Spreadsheet:', error);
      doc = null;
    }
  } else {
    console.warn('Google Sheets environment variables are missing.');
  }

  // Helper to get or create sheet
  async function getSheet(title: string) {
    if (!doc) {
      console.error(`Cannot get sheet '${title}': Spreadsheet not connected.`);
      return null;
    }
    try {
      // Ensure doc is loaded
      if (!isDocLoaded) {
        if (!docLoadPromise) {
          docLoadPromise = (async () => {
            try {
              if (doc) await doc.loadInfo();
              isDocLoaded = true;
            } finally {
              docLoadPromise = null;
            }
          })();
        }
        await docLoadPromise;
      }
      const sheet = doc.sheetsByTitle[title];
      if (!sheet) {
        console.error(`Sheet '${title}' not found in spreadsheet.`);
        return null;
      }
      return sheet;
    } catch (error) {
      console.error(`Error getting sheet ${title}:`, error);
      return null;
    }
  }

  // Helper to get or create sheet
  async function getOrCreateSheet(title: string, headerValues: string[]) {
    let sheet = await getSheet(title);
    if (!sheet && doc) {
      sheet = await doc.addSheet({ title, headerValues });
      syncedSheets.add(title);
    } else if (sheet && !syncedSheets.has(title)) {
      try {
        await sheet.loadHeaderRow();
        const currentHeaders = sheet.headerValues;
        let headersChanged = false;
        const newHeaders = [...currentHeaders];
        for (const header of headerValues) {
          if (!newHeaders.includes(header)) {
            newHeaders.push(header);
            headersChanged = true;
          }
        }
        if (headersChanged) {
          await sheet.setHeaderRow(newHeaders);
        }
        syncedSheets.add(title);
      } catch (e) {
        // If sheet is empty, loadHeaderRow might throw. Set headers directly.
        await sheet.setHeaderRow(headerValues);
        syncedSheets.add(title);
      }
    }
    return sheet;
  }

  // API Routes

  // --- Employees API ---
  app.get('/api/employees', async (req, res) => {
    if (doc) {
      try {
        const employees = await getCachedData('employees', async () => {
          const sheet = await getOrCreateSheet('Employees', ['id', 'name', 'nip', 'office', 'office2', 'email', 'gender', 'cluster', 'unit', 'password', 'photoUrl', 'photoUploadCount']);
          if (sheet) {
            const rows = await sheet.getRows();
            return rows.map(row => ({
              id: row.get('id'),
              name: row.get('name'),
              nip: row.get('nip'),
              office: row.get('office'),
              office2: row.get('office2'),
              email: row.get('email'),
              gender: row.get('gender'),
              cluster: row.get('cluster'),
              unit: row.get('unit'),
              password: row.get('password'),
              photoUrl: row.get('photoUrl'),
              photoUploadCount: row.get('photoUploadCount') ? parseInt(row.get('photoUploadCount'), 10) : 0
            }));
          }
          return [];
        });
        return res.json(employees);
      } catch (error) {
        console.error('Error fetching employees from spreadsheet:', error);
      }
    }
    res.json(db.employees);
  });

  app.post('/api/employees', async (req, res) => {
    const employee = req.body;
    
    if (doc) {
      try {
        const sheet = await getOrCreateSheet('Employees', ['id', 'name', 'nip', 'office', 'office2', 'email', 'gender', 'cluster', 'unit', 'password', 'photoUrl', 'photoUploadCount']);
        if (sheet) {
          await sheet.addRow({
            ...employee,
            office2: employee.office2 || ''
          });
          delete cache['employees'];
        }
      } catch (error) {
        console.error('Error saving employee to spreadsheet:', error);
      }
    } else {
      db.employees.push(employee);
    }
    res.json({ success: true, message: 'Karyawan berhasil ditambahkan' });
  });

  app.post('/api/employees/bulk', async (req, res) => {
    const employeesData = req.body; // Array of employee objects
    
    if (!Array.isArray(employeesData)) {
      return res.status(400).json({ success: false, message: 'Data harus berupa array' });
    }

    if (doc) {
      try {
        const sheet = await getOrCreateSheet('Employees', ['id', 'name', 'nip', 'office', 'office2', 'email', 'gender', 'cluster', 'unit', 'password', 'photoUrl', 'photoUploadCount']);
        if (sheet) {
          // Flatten data and add rows
          const rows = employeesData.map(emp => ({
            ...emp,
            office2: emp.office2 || ''
          }));
          await sheet.addRows(rows);
          delete cache['employees'];
        }
      } catch (error) {
        console.error('Error saving bulk employees to spreadsheet:', error);
        return res.status(500).json({ success: false, message: `Gagal menyimpan data ke spreadsheet: ${error instanceof Error ? error.message : String(error)}` });
      }
    } else {
      db.employees.push(...employeesData);
    }
    res.json({ success: true, message: `${employeesData.length} karyawan berhasil ditambahkan` });
  });

  app.delete('/api/employees/:id', async (req, res) => {
    const { id } = req.params;
    if (doc) {
      try {
        const sheet = await getSheet('Employees');
        if (sheet) {
          const rows = await sheet.getRows();
          const rowToDelete = rows.find(r => r.get('id') === id);
          if (rowToDelete) {
            await rowToDelete.delete();
            delete cache['employees'];
          }
        }
      } catch (error) {
        console.error('Error deleting employee from spreadsheet:', error);
      }
    } else {
      db.employees = db.employees.filter(e => e.id !== id);
    }
    res.json({ success: true, message: 'Karyawan berhasil dihapus' });
  });

  app.post('/api/employees/photo', async (req, res) => {
    const { nip, photoUrl } = req.body;
    
    if (!nip || !photoUrl) {
      return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
    }

    if (doc) {
      try {
        const sheet = await getSheet('Employees');
        if (sheet) {
          const rows = await sheet.getRows();
          const empRow = rows.find(r => String(r.get('nip')) === String(nip));
          
          if (empRow) {
            const currentCount = empRow.get('photoUploadCount') ? parseInt(empRow.get('photoUploadCount'), 10) : 0;
            if (currentCount >= 5) {
              return res.status(400).json({ success: false, message: 'Batas unggah foto telah mencapai maksimal (5 kali).' });
            }
            
            empRow.set('photoUrl', photoUrl);
            empRow.set('photoUploadCount', String(currentCount + 1));
            await empRow.save();
            delete cache['employees'];
            
            return res.json({ 
              success: true, 
              message: `Foto berhasil disimpan. Sisa kesempatan: ${4 - currentCount} kali.`, 
              photoUrl, 
              photoUploadCount: currentCount + 1 
            });
          } else {
            return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
          }
        }
      } catch (error) {
        console.error('Error updating profile photo:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat menyimpan foto.' });
      }
    }
    
    // For mock DB
    const emp = db.employees.find((e: any) => e.nip === nip) as any;
    if (emp) {
      const currentCount = emp.photoUploadCount || 0;
      if (currentCount >= 5) {
         return res.status(400).json({ success: false, message: 'Batas unggah foto telah mencapai maksimal (5 kali).' });
      }
      emp.photoUrl = photoUrl;
      emp.photoUploadCount = currentCount + 1;
      return res.json({ 
        success: true, 
        message: `Foto berhasil disimpan. Sisa kesempatan: ${4 - currentCount} kali.`, 
        photoUrl, 
        photoUploadCount: currentCount + 1 
      });
    }
    
    res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
  });

  // --- Admins API ---
  app.get('/api/admins', async (req, res) => {
    if (doc) {
      try {
        const admins = await getCachedData('admins', async () => {
          const sheet = await getOrCreateSheet('Admins', ['id', 'name', 'nip', 'email', 'phone', 'group', 'isActive', 'access', 'password']);
          if (sheet) {
            const rows = await sheet.getRows();
            return rows.map(row => ({
              id: row.get('id'),
              name: row.get('name'),
              nip: row.get('nip'),
              email: row.get('email'),
              phone: row.get('phone'),
              group: row.get('group'),
              isActive: String(row.get('isActive')).toLowerCase() === 'true',
              access: row.get('access') ? JSON.parse(row.get('access')) : [],
              password: row.get('password')
            }));
          }
          return [];
        });
        return res.json(admins);
      } catch (error) {
        console.error('Error fetching admins from spreadsheet:', error);
      }
    }
    res.json([]);
  });

  app.post('/api/admins', async (req, res) => {
    const admin = req.body;
    
    if (doc) {
      try {
        const sheet = await getOrCreateSheet('Admins', ['id', 'name', 'nip', 'email', 'phone', 'group', 'isActive', 'access', 'password']);
        if (sheet) {
          await sheet.addRow({
            ...admin,
            isActive: admin.isActive.toString(),
            access: JSON.stringify(admin.access)
          });
          delete cache['admins'];
        }
      } catch (error) {
        console.error('Error saving admin to spreadsheet:', error);
      }
    }
    res.json({ success: true, message: 'Admin berhasil ditambahkan' });
  });

  app.delete('/api/admins/:id', async (req, res) => {
    const { id } = req.params;
    if (doc) {
      try {
        const sheet = await getSheet('Admins');
        if (sheet) {
          const rows = await sheet.getRows();
          const rowToDelete = rows.find(r => String(r.get('id')) === String(id));
          if (rowToDelete) {
            await rowToDelete.delete();
            delete cache['admins'];
          }
        }
      } catch (error) {
        console.error('Error deleting admin from spreadsheet:', error);
      }
    }
    res.json({ success: true, message: 'Admin berhasil dihapus' });
  });

  app.put('/api/admins/:id', async (req, res) => {
    const { id } = req.params;
    const admin = req.body;
    if (doc) {
      try {
        const sheet = await getSheet('Admins');
        if (sheet) {
          const rows = await sheet.getRows();
          const rowToUpdate = rows.find(r => String(r.get('id')) === String(id));
          if (rowToUpdate) {
            rowToUpdate.set('name', admin.name);
            rowToUpdate.set('nip', admin.nip);
            rowToUpdate.set('email', admin.email);
            rowToUpdate.set('phone', admin.phone);
            rowToUpdate.set('group', admin.group);
            rowToUpdate.set('isActive', admin.isActive.toString());
            rowToUpdate.set('access', JSON.stringify(admin.access));
            if (admin.password) rowToUpdate.set('password', admin.password);
            await rowToUpdate.save();
            delete cache['admins'];
          }
        }
      } catch (error) {
        console.error('Error updating admin in spreadsheet:', error);
        return res.status(500).json({ success: false, message: 'Gagal memperbarui admin di spreadsheet' });
      }
    }
    res.json({ success: true, message: 'Admin berhasil diperbarui' });
  });

  // --- Auth API ---
  app.post('/api/login', async (req, res) => {
    const nip = (req.body.nip || '').trim();
    const password = (req.body.password || '').trim();
    console.log(`Login attempt for NIP: ${nip}`);
    
    let user = null;
    if (doc) {
      try {
        // Check Admins first
        const adminSheet = await getSheet('Admins');
        if (adminSheet) {
          const rows = await adminSheet.getRows();
          const row = rows.find(r => String(r.get('nip') || '').trim() === nip && String(r.get('password') || '').trim() === password && String(r.get('isActive')).trim().toLowerCase() === 'true');
          if (row) {
            let access = [];
            try {
              access = JSON.parse(row.get('access'));
            } catch (e) {}
            user = { 
              id: row.get('id'), 
              nip: String(row.get('nip') || '').trim(), 
              name: row.get('name'), 
              role: 'admin',
              group: row.get('group'),
              access
            };
            console.log('Admin found:', user.name);
          }
        }

        // If not admin, check Users
        if (!user) {
          const userSheet = await getSheet('Users');
          if (userSheet) {
            const rows = await userSheet.getRows();
            const row = rows.find(r => String(r.get('nip') || '').trim() === nip && String(r.get('password') || '').trim() === password);
            if (row) {
              user = { id: row.get('id'), nip: String(row.get('nip') || '').trim(), name: row.get('name'), role: row.get('role'), office: row.get('office'), office2: row.get('office2'), unit: row.get('unit') || '' };
              console.log('User found:', user.name);
            }
          }
        }
      } catch (error) {
        console.error('Error logging in from spreadsheet:', error);
        // Add more context to the error
        console.error('Spreadsheet configuration might be invalid or sheet missing.');
      }
    }
    
    if (!user) {
      user = db.users.find(u => u.nip === nip && u.password === password);
      if (user) console.log('User found in mock DB:', user.name);
    }

    if (user) {
      if (user.role !== 'admin') {
        const deviceId = req.body.deviceId;
        if (deviceId && doc) {
          try {
            const deviceSheet = await getOrCreateSheet('DeviceBindings', ['nip', 'deviceId']);
            if (deviceSheet) {
              const rows = await deviceSheet.getRows();
              const existingDeviceRow = rows.find(r => r.get('deviceId') === deviceId);
              if (existingDeviceRow && existingDeviceRow.get('nip') !== nip) {
                return res.status(403).json({ success: false, message: 'Perangkat ini sudah digunakan oleh akun lain. Silahkan hubungi Admin untuk mereset perangkat jika fitur ini bermasalah.' });
              }

              const existingNipRow = rows.find(r => r.get('nip') === nip);
              if (existingNipRow && existingNipRow.get('deviceId') !== deviceId) {
                return res.status(403).json({ success: false, message: 'Akun Anda terdaftar di perangkat lain. Untuk pengguna iOS/iPhone yang baru menginstall ke Layar Utama, layar utama dianggap sebagai perangkat baru. Silahkan minta Admin untuk mereset perangkat Anda di menu Karyawan.' });
              }

              if (!existingDeviceRow && !existingNipRow) {
                await deviceSheet.addRow({ nip, deviceId });
              }
            }
          } catch (error) {
            console.error('Error verifying device binding:', error);
          }
        }
      }
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'NIP atau Password salah' });
    }
  });

  app.post('/api/change-password', async (req, res) => {
    const { id, role, oldPassword, newPassword } = req.body;
    
    if (!id || !role || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
    }

    let passwordUpdated = false;
    if (doc) {
      try {
        const sheetName = role === 'admin' ? 'Admins' : 'Users';
        const sheet = await getSheet(sheetName);
        let userNip = null;
        if (sheet) {
          const rows = await sheet.getRows();
          const userRow = rows.find(r => r.get('id') === id && String(r.get('password')) === String(oldPassword));
          
          if (userRow) {
            userRow.set('password', newPassword);
            await userRow.save();
            passwordUpdated = true;
            userNip = userRow.get('nip'); // Capture NIP to sync with Employees
            
            // Sync with employees sheet
            if (role !== 'admin' && userNip) {
              const empSheet = await getSheet('Employees');
              if (empSheet) {
                const empRows = await empSheet.getRows();
                const empRow = empRows.find(r => r.get('nip') === userNip);
                if (empRow) {
                  empRow.set('password', newPassword);
                  await empRow.save();
                }
              }
            }
          } else {
            return res.status(400).json({ success: false, message: 'Password lama salah' });
          }
        }
      } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem' });
      }
    }

    if (!passwordUpdated) {
      const user = db.users.find(u => String(u.id) === String(id));
      if (user) {
        if (user.password === oldPassword) {
          user.password = newPassword;
          passwordUpdated = true;
          // Sync with local employees db as well if mock
          if (role !== 'admin' && user.nip) {
            const emp = db.employees.find(e => e.nip === user.nip);
            if (emp) {
              (emp as any).password = newPassword;
            }
          }
        } else {
          return res.status(400).json({ success: false, message: 'Password lama salah' });
        }
      } else {
        return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
      }
    }

    res.json({ success: true, message: 'Password berhasil diubah' });
  });

  // --- API to Reset Device Binding ---
  app.delete('/api/device-bindings/:nip', async (req, res) => {
    const { nip } = req.params;
    if (doc) {
      try {
        const deviceSheet = await getSheet('DeviceBindings');
        if (deviceSheet) {
          const rows = await deviceSheet.getRows();
          const existingNipRow = rows.find(r => r.get('nip') === nip);
          if (existingNipRow) {
            await existingNipRow.delete();
            return res.json({ success: true, message: 'Binding perangkat berhasil dihapus.' });
          } else {
            return res.status(404).json({ success: false, message: 'Binding perangkat tidak ditemukan.' });
          }
        }
      } catch (error) {
        console.error('Error resetting device binding:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
      }
    }
    return res.status(500).json({ success: false, message: 'Spreadsheet tidak terkonfigurasi.' });
  });

  app.post('/api/register', async (req, res) => {
    const { nip, name, email, password, gender, cluster, unit, desa, office2 } = req.body;
    
    // 1. Validate NIP against Employees data
    let isValidEmployee = false;
    if (doc) {
      try {
        const empSheet = await getSheet('Employees');
        if (empSheet) {
          const rows = await empSheet.getRows();
          isValidEmployee = rows.some(r => String(r.get('nip')) === String(nip));
        }
      } catch (error) {
        console.error('Error validating employee NIP:', error);
      }
    }
    
    if (!isValidEmployee) {
      isValidEmployee = db.employees.some(e => e.nip === nip);
    }

    if (!isValidEmployee) {
      return res.status(400).json({ success: false, message: 'NIP tidak terdaftar sebagai karyawan. Hubungi Admin.' });
    }

    // 2. Check if user already exists
    let userExists = false;
    if (doc) {
      try {
        const userSheet = await getOrCreateSheet('Users', ['id', 'nip', 'name', 'email', 'role', 'password', 'gender', 'cluster', 'unit', 'office', 'office2']);
        if (userSheet) {
          const rows = await userSheet.getRows();
          userExists = rows.some(r => String(r.get('nip')) === String(nip));
        }
      } catch (error) {
        console.error('Error checking existing user:', error);
      }
    } else {
      userExists = db.users.some(u => u.nip === nip);
    }

    if (userExists) {
      return res.status(400).json({ success: false, message: 'NIP sudah terdaftar sebagai user' });
    }

    const newUser = {
      id: Date.now().toString(),
      nip,
      name,
      email,
      role: 'user',
      password,
      gender,
      cluster,
      unit,
      office: desa,
      office2: office2 || ''
    };

    // Save to Google Spreadsheet if configured
    if (doc) {
      try {
        const sheet = await getOrCreateSheet('Users', ['id', 'nip', 'name', 'email', 'role', 'password', 'gender', 'cluster', 'unit', 'office', 'office2']);
        if (sheet) {
          await sheet.addRow(newUser);
        }
      } catch (error) {
        console.error('Error saving user to spreadsheet:', error);
      }
    } else {
      db.users.push(newUser as any);
    }

    res.json({ success: true, message: 'Pendaftaran berhasil' });
  });

  app.get('/api/time', (req, res) => {
    // Return server time for client synchronization
    // Use Asia/Jakarta explicitly if needed, but returning timestamp is enough
    res.json({ timestamp: Date.now() });
  });

  // Auto Check-Out Helper Function
  async function runAutoCheckout() {
    let fixedCount = 0;
    try {
      let attendanceList: any[] = [];
      let employeeList: any[] = [];
      let shiftList: any[] = [];
      let attSheet: any = null;

      if (doc) {
        attSheet = await getOrCreateSheet('Attendance', ['id', 'nip', 'name', 'date', 'time', 'type', 'location', 'status', 'photoUrl', 'shift']);
        const empSheet = await getOrCreateSheet('Employees', ['id', 'name', 'nip', 'office', 'office2', 'email', 'gender', 'cluster', 'unit', 'password', 'photoUrl', 'photoUploadCount']);
        const shiftSheet = await getOrCreateSheet('Shifts', ['id', 'name', 'startTime', 'endTime', 'fridayEndTime', 'saturdayEndTime', 'checkInBeforeMinutes', 'checkInAfterMinutes', 'checkOutBeforeMinutes', 'checkOutAfterMinutes', 'crossesMidnight', 'isActive', 'unit', 'isOffSunday', 'isOffHoliday']);

        if (attSheet && empSheet && shiftSheet) {
          const [attRows, empRows, shiftRows] = await Promise.all([
            attSheet.getRows(),
            empSheet.getRows(),
            shiftSheet.getRows()
          ]);

          attendanceList = attRows.map(r => ({
            nip: r.get('nip'),
            name: r.get('name'),
            date: r.get('date'),
            time: r.get('time'),
            type: r.get('type'),
            location: r.get('location'),
            status: r.get('status'),
            shift: r.get('shift') || ''
          }));

          employeeList = empRows.map(r => ({ nip: r.get('nip'), unit: r.get('unit') }));
          shiftList = shiftRows.map(r => ({
            name: r.get('name'),
            startTime: r.get('startTime'),
            endTime: r.get('endTime'),
            fridayEndTime: r.get('fridayEndTime') || '',
            saturdayEndTime: r.get('saturdayEndTime') || '',
            checkOutAfterMinutes: parseInt(r.get('checkOutAfterMinutes') || '120', 10),
            crossesMidnight: String(r.get('crossesMidnight')).toLowerCase() === 'true',
            isActive: String(r.get('isActive')).toLowerCase() === 'true',
            unit: r.get('unit') || ''
          }));
        }
      } else {
        attendanceList = db.attendance;
        employeeList = db.employees;
        shiftList = [
          { name: 'Pagi', startTime: '07:00', endTime: '14:00', checkOutAfterMinutes: 120, crossesMidnight: false, isActive: true },
          { name: 'Sore', startTime: '14:00', endTime: '21:00', checkOutAfterMinutes: 120, crossesMidnight: false, isActive: true },
          { name: 'Malam', startTime: '21:00', endTime: '07:00', checkOutAfterMinutes: 120, crossesMidnight: true, isActive: true },
        ];
      }

      if (attendanceList.length === 0) return 0;

      const inRecords = attendanceList.filter(a => a.type === 'in');
      const outRecords = attendanceList.filter(a => a.type === 'out');
      const now = new Date();

      const getJakartaDateStr = (d: Date) => {
        const dateFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = dateFormatter.formatToParts(d);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        return `${year}-${month}-${day}`;
      };

      const todayStr = getJakartaDateStr(now);
      const missingOuts: any[] = [];

      for (const inRec of inRecords) {
        if (!inRec.nip || !inRec.date) continue;

        // Check if there is already an 'out' record matching this NIP and date
        if (outRecords.some(o => o.nip === inRec.nip && o.date === inRec.date)) continue;

        // Find matching shift
        let targetShift = shiftList.find(s => s.name && inRec.shift && s.name.trim().toLowerCase() === inRec.shift.trim().toLowerCase());
        
        if (!targetShift && inRec.time) {
          const timeMatch = String(inRec.time).match(/(\d+)[.:](\d+)/);
          if (timeMatch) {
            let inHr = parseInt(timeMatch[1], 10);
            let inMin = parseInt(timeMatch[2], 10);
            const lowerTime = String(inRec.time).toLowerCase();
            if (lowerTime.includes('pm') && inHr < 12) inHr += 12;
            else if (lowerTime.includes('am') && inHr === 12) inHr = 0;
            
            const inMinutes = inHr * 60 + inMin;
            let minDiff = Infinity;

            shiftList.filter(s => s.isActive !== false).forEach(s => {
              if (!s.startTime) return;
              const [sHr, sMin] = s.startTime.split(':').map(Number);
              let diff = Math.abs(inMinutes - (sHr * 60 + sMin));
              if (diff > 720) diff = 1440 - diff;
              if (diff < minDiff) {
                minDiff = diff;
                targetShift = s;
              }
            });
          }
        }

        if (!targetShift) {
          const empUnit = employeeList.find(e => e.nip === inRec.nip)?.unit || '';
          const activeShifts = shiftList.filter(s => s.isActive !== false);
          targetShift = activeShifts.find(s => s.unit && s.unit === empUnit) || activeShifts[0] || {
            name: inRec.shift || 'Pagi',
            startTime: '07:00',
            endTime: '14:00',
            checkOutAfterMinutes: 120,
            crossesMidnight: false
          };
        }

        const recDateObj = new Date(inRec.date + 'T00:00:00');
        const isFriday = recDateObj.getDay() === 5;
        const isSaturday = recDateObj.getDay() === 6;

        let endTimeStr = targetShift.endTime;
        if (isFriday && targetShift.fridayEndTime) endTimeStr = targetShift.fridayEndTime;
        if (isSaturday && targetShift.saturdayEndTime) endTimeStr = targetShift.saturdayEndTime;

        if (!endTimeStr) {
          const lowerName = (targetShift.name || inRec.shift || '').toLowerCase();
          if (lowerName.includes('pagi')) endTimeStr = '14:00';
          else if (lowerName.includes('sore')) endTimeStr = '21:00';
          else if (lowerName.includes('malam')) endTimeStr = '07:00';
          else endTimeStr = '16:00';
        }

        const [endHr, endMin] = endTimeStr.split(':').map(Number);
        const endDateTime = new Date(inRec.date + 'T00:00:00');
        endDateTime.setHours(endHr, endMin, 0, 0);

        const isCrossesMidnight = targetShift.crossesMidnight || (targetShift.startTime && parseInt(targetShift.startTime.split(':')[0], 10) > endHr);
        if (isCrossesMidnight) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }

        const checkOutAfterMinutes = targetShift.checkOutAfterMinutes || 120;
        endDateTime.setMinutes(endDateTime.getMinutes() + checkOutAfterMinutes);

        const isPastDate = inRec.date < todayStr && (!isCrossesMidnight || inRec.date < getJakartaDateStr(new Date(now.getTime() - 86400000)));

        if (now > endDateTime || isPastDate) {
          // Auto checkout time: shift end time minus 1 hour
          const autoCheckoutHour = (endHr - 1 + 24) % 24;
          const autoCheckoutTimeStr = `${autoCheckoutHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

          const statusToSave = inRec.status || 'Hadir';

          missingOuts.push({
            id: (Date.now() + missingOuts.length).toString(),
            nip: inRec.nip,
            name: inRec.name,
            date: inRec.date,
            time: autoCheckoutTimeStr,
            type: 'out',
            location: inRec.location,
            status: statusToSave,
            photoUrl: '',
            shift: targetShift.name || inRec.shift || 'Reguler'
          });
        }
      }

      if (missingOuts.length > 0) {
        if (doc && attSheet) {
          const rowsToAdd = missingOuts.map(rec => ({
            ...rec,
            location: typeof rec.location === 'object' ? JSON.stringify(rec.location) : rec.location
          }));
          await attSheet.addRows(rowsToAdd);
          delete cache['attendance'];
        } else {
          missingOuts.forEach(rec => db.attendance.push(rec));
        }
        fixedCount = missingOuts.length;
        console.log(`[Auto-Checkout] Recorded ${fixedCount} auto check-outs at shift end minus 1 hour.`);
      }
    } catch (error) {
      console.error('Error during auto-checkout:', error);
    }
    return fixedCount;
  }

  app.get('/api/attendance', async (req, res) => {
    const { startDate, endDate } = req.query;
    
    // Trigger auto-checkout check before retrieving records
    await runAutoCheckout();

    let allAttendance: any[] = [];
    if (doc) {
      try {
        allAttendance = await getCachedData('attendance', async () => {
          const sheet = await getOrCreateSheet('Attendance', ['id', 'nip', 'name', 'date', 'time', 'type', 'location', 'status', 'photoUrl', 'shift']);
          if (sheet) {
            const rows = await sheet.getRows();
            return rows.map(row => ({
              id: row.get('id'),
              nip: row.get('nip'),
              name: row.get('name'),
              date: row.get('date'),
              time: row.get('time'),
              type: row.get('type'),
              location: (() => {
                try { return JSON.parse(row.get('location')); }
                catch (e) { return row.get('location'); }
              })(),
              status: row.get('status'),
              photoUrl: row.get('photoUrl') && row.get('photoUrl').startsWith('data:image') 
                ? `/api/attendance/${row.get('id')}/photo`
                : (row.get('photoUrl') || ''),
              shift: row.get('shift')
            }));
          }
          return [];
        });
      } catch (error) {
        console.error('Error fetching attendance from spreadsheet:', error);
      }
    } else {
      allAttendance = db.attendance;
    }

    const filterByDateRange = (start: string, end: string) => {
      return allAttendance.filter(a => {
        const aStart = a.date;
        const aEnd = (a.location && typeof a.location === 'object' && a.location.endDate) ? a.location.endDate : a.date;
        return aStart <= end && aEnd >= start;
      });
    };

    let filteredAttendance = allAttendance;
    if (startDate && endDate) {
      filteredAttendance = filterByDateRange(startDate as string, endDate as string);
    } else {
      // Default to last month and current month if no range given 
      const today = new Date();
      const prevMonthObj = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const firstDay = `${prevMonthObj.getFullYear()}-${String(prevMonthObj.getMonth() + 1).padStart(2, '0')}-01`;
      
      const nextMonthObj = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const nextMonthEnd = `${nextMonthObj.getFullYear()}-${String(nextMonthObj.getMonth() + 1).padStart(2, '0')}-${String(nextMonthObj.getDate()).padStart(2, '0')}`;
      filteredAttendance = filterByDateRange(firstDay, nextMonthEnd);
    }

    return res.json(filteredAttendance);
  });

  app.get('/api/attendance/:id/photo', async (req, res) => {
    try {
      const sheet = await getOrCreateSheet('Attendance', ['id', 'nip', 'name', 'date', 'time', 'type', 'location', 'status', 'photoUrl', 'shift']);
      if (!sheet) return res.status(500).send('Database unavailable');
      
      const rows = await sheet.getRows();
      const targetRow = rows.find(row => row.get('id') === req.params.id);
      
      if (!targetRow) return res.status(404).send('Not found');
      
      const photoUrl = targetRow.get('photoUrl');
      if (!photoUrl || !photoUrl.startsWith('data:image')) {
        return res.status(404).send('No image for this record');
      }
      
      // photoUrl format is usually like: data:image/jpeg;base64,/9j/4AAQ...
      const matches = photoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
         return res.status(400).send('Invalid image data');
      }
      
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      
      res.set('Content-Type', mimeType);
      res.send(buffer);
    } catch (e) {
      console.error(e);
      res.status(500).send('Internal error');
    }
  });

  app.post('/api/attendance', async (req, res) => {
    const attendanceData = req.body;
    // attendanceData: { nip, name, date, time, type, location, status, photoUrl }
    
    // Prevent overriding timezone from client. Enforce Server Time (Asia/Jakarta)
    if (attendanceData.type === 'in' || attendanceData.type === 'out') {
      const now = new Date();
      
      const timeFormatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
      let serverTimeStr = timeFormatter.format(now).replace('.', ':');
      attendanceData.time = serverTimeStr;

      if (attendanceData.type === 'in') {
        const dateFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = dateFormatter.formatToParts(now);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        attendanceData.date = `${year}-${month}-${day}`;
      }
    }

    if (doc) {
      try {
        const sheet = await getOrCreateSheet('Attendance', ['id', 'nip', 'name', 'date', 'time', 'type', 'location', 'status', 'photoUrl']);
        if (sheet) {
          // Google Sheets cell limit is 50,000 characters.
          // Base64 images can easily exceed this.
          let photoUrlToSave = attendanceData.photoUrl || '';
          if (photoUrlToSave.length > 49000) {
             // If it's too large, we can't save the full image in a single cell.
             // Ideally, save to cloud storage and store URL. For now, truncate or store a placeholder.
             photoUrlToSave = 'Image too large to save in spreadsheet';
             console.warn('Attendance photoUrl exceeded 50000 characters, replacing with placeholder.');
          }

          await sheet.addRow({
            id: Date.now().toString(),
            ...attendanceData,
            photoUrl: photoUrlToSave,
            location: typeof attendanceData.location === 'object' ? JSON.stringify(attendanceData.location) : attendanceData.location
          });
          delete cache['attendance'];
        }
      } catch (error) {
        console.error('Error saving attendance to spreadsheet:', error);
        return res.status(500).json({ success: false, message: 'Gagal menyimpan absensi ke spreadsheet. Mungkin ukuran foto terlalu besar.' });
      }
    } else {
      db.attendance.push({ id: Date.now().toString(), ...attendanceData } as any);
    }

    res.json({ success: true, message: 'Absensi berhasil dicatat' });
  });

  app.post('/api/attendance/bulk', async (req, res) => {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.json({ success: true, message: 'No records to add' });
    }
    
    if (doc) {
      try {
        const sheet = await getOrCreateSheet('Attendance', ['id', 'nip', 'name', 'date', 'time', 'type', 'location', 'status', 'photoUrl', 'shift']);
        if (sheet) {
          const rowsToAdd = records.map((attendanceData: any, index: number) => ({
            id: (Date.now() + index).toString(),
            ...attendanceData,
            photoUrl: attendanceData.photoUrl || '',
            location: typeof attendanceData.location === 'object' ? JSON.stringify(attendanceData.location) : attendanceData.location
          }));
          await sheet.addRows(rowsToAdd);
          delete cache['attendance'];
        }
      } catch (error) {
        console.error('Error saving bulk attendance:', error);
        return res.status(500).json({ success: false, message: 'Gagal menyimpan bulk absensi.' });
      }
    } else {
      records.forEach((rec: any, i: number) => {
        db.attendance.push({ id: (Date.now() + i).toString(), ...rec } as any);
      });
    }

    res.json({ success: true, message: 'Bulk absensi berhasil dicatat' });
  });

  app.post('/api/attendance/auto-checkout-check', async (req, res) => {
    try {
      const fixedCount = await runAutoCheckout();
      return res.json({ success: true, fixedCount });
    } catch (error) {
      console.error('Error in /api/attendance/auto-checkout-check:', error);
      return res.status(500).json({ success: false, message: 'Gagal auto-checkout' });
    }
  });

  app.put('/api/attendance/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (doc) {
      try {
        const sheet = await getSheet('Attendance');
        if (sheet) {
          const rows = await sheet.getRows();
          const rowToUpdate = rows.find(r => r.get('id') === id);
          if (rowToUpdate) {
            rowToUpdate.set('status', status);
            await rowToUpdate.save();
            delete cache['attendance'];
            return res.json({ success: true, message: 'Status berhasil diperbarui' });
          } else {
            return res.status(404).json({ success: false, message: 'Absensi tidak ditemukan' });
          }
        }
      } catch (error) {
        console.error('Error updating attendance status:', error);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan' });
      }
    }
    
    // In-memory fallback
    const record = db.attendance.find((a: any) => a.id === id);
    if (record) {
      record.status = status;
      return res.json({ success: true, message: 'Status berhasil diperbarui' });
    }
    return res.status(404).json({ success: false, message: 'Absensi tidak ditemukan' });
  });

  app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    let foundUser = null;
    let userType = '';

    if (doc) {
      try {
        // Check Admins
        const adminSheet = await getSheet('Admins');
        if (adminSheet) {
          const rows = await adminSheet.getRows();
          const admin = rows.find(r => r.get('email') === email);
          if (admin) {
            foundUser = { id: admin.get('id'), name: admin.get('name'), email: admin.get('email') };
            userType = 'admin';
          }
        }

        // Check Employees if not found
        if (!foundUser) {
          const empSheet = await getSheet('Employees');
          if (empSheet) {
            const rows = await empSheet.getRows();
            const emp = rows.find(r => r.get('email') === email);
            if (emp) {
              foundUser = { id: emp.get('id'), name: emp.get('name'), email: emp.get('email') };
              userType = 'employee';
            }
          }
        }
        
        // Check Users if not found
        if (!foundUser) {
          const userSheet = await getSheet('Users');
          if (userSheet) {
            const rows = await userSheet.getRows();
            const user = rows.find(r => r.get('email') === email);
            if (user) {
              foundUser = { id: user.get('id'), name: user.get('name'), email: user.get('email') };
              userType = 'user';
            }
          }
        }
      } catch (error) {
        console.error('Error checking email in spreadsheet:', error);
      }
    }

    if (!foundUser) {
      const user = db.users.find(u => u.email === email);
      if (user) {
        foundUser = user;
        userType = 'user';
      } else {
        const emp = db.employees.find(e => e.email === email);
        if (emp) {
          foundUser = emp;
          userType = 'employee';
        }
      }
    }

    if (!foundUser) {
      // Return success anyway to prevent email enumeration
      return res.json({ success: true, message: 'Jika email terdaftar, tautan reset telah dikirim.' });
    }

    // Generate a simple token (in a real app, use a secure random token and save it to DB with expiration)
    const token = Buffer.from(`${foundUser.id}:${userType}:${Date.now()}`).toString('base64');
    
    // Save token to spreadsheet
    if (doc) {
      try {
        const resetSheet = await getOrCreateSheet('PasswordResets', ['token', 'userId', 'userType', 'expiresAt']);
        if (resetSheet) {
          await resetSheet.addRow({
            token,
            userId: foundUser.id,
            userType,
            expiresAt: Date.now() + 3600000 // 1 hour
          });
        }
      } catch (error) {
        console.error('Error saving reset token:', error);
      }
    }

    const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    if (resend) {
      try {
        await resend.emails.send({
          from: 'Si Abon Megilan <onboarding@resend.dev>',
          to: foundUser.email,
          subject: 'Reset Password - Si Abon Megilan',
          html: `<p>Halo ${foundUser.name},</p><p>Klik tautan berikut untuk mereset password Anda:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Tautan ini akan kedaluwarsa dalam 1 jam.</p>`,
        });
      } catch (error) {
        console.error('Error sending email via Resend:', error);
        return res.status(500).json({ success: false, message: 'Gagal mengirim email. Pastikan API Key Resend valid.' });
      }
    } else {
      console.log(`[MOCK EMAIL] To: ${foundUser.email}, Subject: Reset Password, Link: ${resetLink}`);
      // For testing without Resend API key, we return the link in the response (only in dev!)
      return res.json({ success: true, message: 'Email reset password telah dikirim (Mock Mode)', mockLink: resetLink });
    }

    res.json({ success: true, message: 'Email reset password telah dikirim' });
  });

  app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token dan password baru wajib diisi' });
    }

    let userId = '';
    let userType = '';
    let isValidToken = false;

    if (doc) {
      try {
        const resetSheet = await getSheet('PasswordResets');
        if (resetSheet) {
          const rows = await resetSheet.getRows();
          const tokenRow = rows.find(r => r.get('token') === token);
          
          if (tokenRow) {
            const expiresAt = parseInt(tokenRow.get('expiresAt'));
            if (Date.now() > expiresAt) {
              return res.status(400).json({ success: false, message: 'Token reset password telah kedaluwarsa' });
            }
            userId = tokenRow.get('userId');
            userType = tokenRow.get('userType');
            isValidToken = true;
            
            // Delete used token
            await tokenRow.delete();
          }
        }
      } catch (error) {
        console.error('Error verifying token:', error);
      }
    }

    // Fallback to decoding token if not using spreadsheet (for mock DB)
    if (!isValidToken) {
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const parts = decoded.split(':');
        if (parts.length === 3) {
          userId = parts[0];
          userType = parts[1];
          const timestamp = parseInt(parts[2]);
          if (Date.now() - timestamp < 3600000) {
            isValidToken = true;
          } else {
            return res.status(400).json({ success: false, message: 'Token reset password telah kedaluwarsa' });
          }
        }
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Token tidak valid' });
      }
    }

    if (!isValidToken) {
      return res.status(400).json({ success: false, message: 'Token tidak valid' });
    }

    // Update password
    let passwordUpdated = false;
    if (doc) {
      try {
        let sheetName = '';
        if (userType === 'admin') sheetName = 'Admins';
        else if (userType === 'employee') sheetName = 'Employees';
        else if (userType === 'user') sheetName = 'Users';

        if (sheetName) {
          const sheet = await getSheet(sheetName);
          if (sheet) {
            const rows = await sheet.getRows();
            const userRow = rows.find(r => r.get('id') === userId);
            if (userRow) {
              userRow.set('password', newPassword);
              await userRow.save();
              passwordUpdated = true;
              
              if (userType === 'user') {
                const userNip = userRow.get('nip');
                if (userNip) {
                  const empSheet = await getSheet('Employees');
                  if (empSheet) {
                    const empRows = await empSheet.getRows();
                    const empRow = empRows.find(r => r.get('nip') === userNip);
                    if (empRow) {
                      empRow.set('password', newPassword);
                      await empRow.save();
                    }
                  }
                }
              }
              
              // Clear cache
              if (sheetName === 'Admins') delete cache['admins'];
              if (sheetName === 'Employees') delete cache['employees'];
            }
          }
        }
      } catch (error) {
        console.error('Error updating password:', error);
        return res.status(500).json({ success: false, message: 'Gagal memperbarui password' });
      }
    }

    if (!passwordUpdated) {
      // Update mock DB
      if (userType === 'admin' || userType === 'user') {
        const user = db.users.find(u => u.id.toString() === userId);
        if (user) {
          user.password = newPassword;
          passwordUpdated = true;
        }
      } else if (userType === 'employee') {
        const emp = db.employees.find(e => e.id === userId);
        if (emp) {
          (emp as any).password = newPassword;
          passwordUpdated = true;
        }
      }
    }

    if (passwordUpdated) {
      res.json({ success: true, message: 'Password berhasil diperbarui' });
    } else {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }
  });

  app.get('/api/users', (req, res) => {
    res.json(db.users.map(u => ({ id: u.id, nip: u.nip, name: u.name, role: u.role })));
  });

  // --- Locations API ---
  app.get('/api/locations', async (req, res) => {
    if (doc) {
      try {
        const locations = await getCachedData('locations', async () => {
          const sheet = await getOrCreateSheet('Locations', ['id', 'name', 'desa', 'kecamatan', 'kabupaten', 'coordinates', 'radius']);
          if (sheet) {
            const rows = await sheet.getRows();
            return rows.map(row => ({
              id: row.get('id'),
              desa: row.get('desa') || row.get('name') || '',
              kecamatan: row.get('kecamatan') || '',
              kabupaten: row.get('kabupaten') || '',
              coordinates: row.get('coordinates'),
              radius: row.get('radius') || 250
            }));
          }
          return [];
        });
        return res.json(locations);
      } catch (error) {
        console.error('Error fetching locations from spreadsheet:', error);
      }
    }
    res.json([
      { id: "1", desa: "Kantor Induk", kecamatan: "", kabupaten: "", coordinates: "-7.1234, 112.1234", radius: 250 },
      { id: "2", desa: "Pustu A", kecamatan: "", kabupaten: "", coordinates: "-7.1235, 112.1235", radius: 250 }
    ]);
  });

  app.post('/api/locations', async (req, res) => {
    const location = req.body;
    if (doc) {
      try {
        const sheet = await getOrCreateSheet('Locations', ['id', 'name', 'desa', 'kecamatan', 'kabupaten', 'coordinates', 'radius']);
        if (sheet) {
          await sheet.addRow({
            id: Date.now().toString(),
            name: location.desa || '',
            desa: location.desa || '',
            kecamatan: location.kecamatan || '',
            kabupaten: location.kabupaten || '',
            coordinates: location.coordinates || '',
            radius: location.radius || 250
          });
          delete cache['locations'];
        }
      } catch (error) {
        console.error('Error saving location to spreadsheet:', error);
      }
    }
    res.json({ success: true, message: 'Lokasi berhasil ditambahkan' });
  });

  app.delete('/api/locations/:id', async (req, res) => {
    const { id } = req.params;
    if (doc) {
      try {
        const sheet = await getSheet('Locations');
        if (sheet) {
          const rows = await sheet.getRows();
          const rowToDelete = rows.find(r => String(r.get('id')) === String(id));
          if (rowToDelete) {
            await rowToDelete.delete();
            delete cache['locations'];
          }
        }
      } catch (error) {
        console.error('Error deleting location from spreadsheet:', error);
      }
    }
    res.json({ success: true, message: 'Lokasi berhasil dihapus' });
  });

  // --- Units API ---
  app.get('/api/units', async (req, res) => {
    if (doc) {
      try {
        const units = await getCachedData('units', async () => {
          const sheet = await getOrCreateSheet('Units', ['id', 'name']);
          if (sheet) {
            const rows = await sheet.getRows();
            return rows.map(row => ({
              id: row.get('id'),
              name: row.get('name')
            }));
          }
          return [];
        });
        return res.json(units);
      } catch (error) {
        console.error('Error fetching units:', error);
      }
    }
    res.json((db as any).units || []);
  });

  app.post('/api/units', async (req, res) => {
    const unit = req.body;
    if (doc) {
      try {
        const sheet = await getOrCreateSheet('Units', ['id', 'name']);
        if (sheet) {
          if (unit.id) {
            const rows = await sheet.getRows();
            const existingRow = rows.find(r => r.get('id') === unit.id);
            if (existingRow) {
              existingRow.set('name', unit.name || '');
              await existingRow.save();
            } else {
              await sheet.addRow(unit);
            }
          } else {
            unit.id = Date.now().toString();
            await sheet.addRow(unit);
          }
          delete cache['units'];
        }
      } catch (error) {
        console.error('Error saving unit:', error);
      }
    } else {
      unit.id = unit.id || Date.now().toString();
      if (!(db as any).units) (db as any).units = [];
      const index = (db as any).units.findIndex((u: any) => u.id === unit.id);
      if (index >= 0) (db as any).units[index] = unit;
      else (db as any).units.push(unit);
    }
    res.json({ success: true, message: 'Unit berhasil disimpan' });
  });

  app.delete('/api/units/:id', async (req, res) => {
    const { id } = req.params;
    if (doc) {
      try {
        const sheet = await getSheet('Units');
        if (sheet) {
          const rows = await sheet.getRows();
          const rowToDelete = rows.find(r => String(r.get('id')) === String(id));
          if (rowToDelete) {
            await rowToDelete.delete();
            delete cache['units'];
          }
        }
      } catch (error) {
        console.error('Error deleting unit:', error);
      }
    } else {
       if ((db as any).units) (db as any).units = (db as any).units.filter((u: any) => u.id !== id);
    }
    res.json({ success: true, message: 'Unit berhasil dihapus' });
  });

  // --- Shifts API ---
  app.get('/api/shifts', async (req, res) => {
    if (doc) {
      try {
        const shifts = await getCachedData('shifts', async () => {
          const sheet = await getOrCreateSheet('Shifts', ['id', 'name', 'startTime', 'endTime', 'fridayEndTime', 'saturdayEndTime', 'checkInBeforeMinutes', 'checkInAfterMinutes', 'checkOutBeforeMinutes', 'checkOutAfterMinutes', 'crossesMidnight', 'isActive', 'unit', 'isOffSunday', 'isOffHoliday']);
          if (sheet) {
            const rows = await sheet.getRows();
            return rows.map(row => ({
              id: row.get('id'),
              name: row.get('name'),
              startTime: row.get('startTime'),
              endTime: row.get('endTime'),
              fridayEndTime: row.get('fridayEndTime') || '',
              saturdayEndTime: row.get('saturdayEndTime') || '',
              checkInBeforeMinutes: parseInt(row.get('checkInBeforeMinutes') || '60'),
              checkInAfterMinutes: parseInt(row.get('checkInAfterMinutes') || '15'),
              checkOutBeforeMinutes: parseInt(row.get('checkOutBeforeMinutes') || '10'),
              checkOutAfterMinutes: parseInt(row.get('checkOutAfterMinutes') || '120'),
              crossesMidnight: String(row.get('crossesMidnight')).toLowerCase() === 'true',
              isActive: String(row.get('isActive')).toLowerCase() === 'true',
              unit: row.get('unit') || '',
              isOffSunday: String(row.get('isOffSunday')).toLowerCase() === 'true',
              isOffHoliday: String(row.get('isOffHoliday')).toLowerCase() === 'true'
            }));
          }
          return [];
        });
        return res.json(shifts);
      } catch (error) {
        console.error('Error fetching shifts from spreadsheet:', error);
      }
    }
    res.json([
      { id: "1", name: "Pagi", startTime: "08:00", endTime: "16:00", fridayEndTime: "10:50", saturdayEndTime: "12:30", checkInBeforeMinutes: 60, checkInAfterMinutes: 15, checkOutBeforeMinutes: 10, checkOutAfterMinutes: 120, crossesMidnight: false, isActive: true, unit: "" },
      { id: "2", name: "Malam", startTime: "20:00", endTime: "04:00", fridayEndTime: "", saturdayEndTime: "", checkInBeforeMinutes: 60, checkInAfterMinutes: 15, checkOutBeforeMinutes: 10, checkOutAfterMinutes: 120, crossesMidnight: true, isActive: true, unit: "" }
    ]);
  });

  app.post('/api/shifts', async (req, res) => {
    const shift = req.body;
    if (doc) {
      try {
        const sheet = await getOrCreateSheet('Shifts', ['id', 'name', 'startTime', 'endTime', 'fridayEndTime', 'saturdayEndTime', 'checkInBeforeMinutes', 'checkInAfterMinutes', 'checkOutBeforeMinutes', 'checkOutAfterMinutes', 'crossesMidnight', 'isActive', 'unit', 'isOffSunday', 'isOffHoliday']);
        if (sheet) {
          await sheet.addRow({
            ...shift,
            checkInBeforeMinutes: (shift.checkInBeforeMinutes || 60).toString(),
            checkInAfterMinutes: (shift.checkInAfterMinutes || 15).toString(),
            checkOutBeforeMinutes: (shift.checkOutBeforeMinutes || 10).toString(),
            checkOutAfterMinutes: (shift.checkOutAfterMinutes || 120).toString(),
            crossesMidnight: shift.crossesMidnight.toString(),
            isActive: shift.isActive.toString(),
            unit: shift.unit || '',
            isOffSunday: (shift.isOffSunday || false).toString(),
            isOffHoliday: (shift.isOffHoliday || false).toString()
          });
          delete cache['shifts'];
        }
      } catch (error) {
        console.error('Error saving shift to spreadsheet:', error);
      }
    }
    res.json({ success: true, message: 'Shift berhasil ditambahkan' });
  });

  app.delete('/api/shifts/:id', async (req, res) => {
    const { id } = req.params;
    if (doc) {
      try {
        const sheet = await getSheet('Shifts');
        if (sheet) {
          const rows = await sheet.getRows();
          const rowToDelete = rows.find(r => r.get('id') === id);
          if (rowToDelete) {
            await rowToDelete.delete();
            delete cache['shifts'];
          }
        }
      } catch (error) {
        console.error('Error deleting shift from spreadsheet:', error);
      }
    }
    res.json({ success: true, message: 'Shift berhasil dihapus' });
  });

  app.put('/api/shifts/:id', async (req, res) => {
    const { id } = req.params;
    const shift = req.body;
    if (doc) {
      try {
        const sheet = await getSheet('Shifts');
        if (sheet) {
          const rows = await sheet.getRows();
          const rowToUpdate = rows.find(r => String(r.get('id')) === String(id));
          if (rowToUpdate) {
            rowToUpdate.set('name', shift.name);
            rowToUpdate.set('startTime', shift.startTime);
            rowToUpdate.set('endTime', shift.endTime);
            rowToUpdate.set('fridayEndTime', shift.fridayEndTime || '');
            rowToUpdate.set('saturdayEndTime', shift.saturdayEndTime || '');
            rowToUpdate.set('checkInBeforeMinutes', (shift.checkInBeforeMinutes || 60).toString());
            rowToUpdate.set('checkInAfterMinutes', (shift.checkInAfterMinutes || 15).toString());
            rowToUpdate.set('checkOutBeforeMinutes', (shift.checkOutBeforeMinutes || 10).toString());
            rowToUpdate.set('checkOutAfterMinutes', (shift.checkOutAfterMinutes || 120).toString());
            rowToUpdate.set('crossesMidnight', shift.crossesMidnight.toString());
            rowToUpdate.set('isActive', shift.isActive.toString());
            rowToUpdate.set('unit', shift.unit || '');
            rowToUpdate.set('isOffSunday', (shift.isOffSunday || false).toString());
            rowToUpdate.set('isOffHoliday', (shift.isOffHoliday || false).toString());
            await rowToUpdate.save();
            delete cache['shifts'];
          }
        }
      } catch (error) {
        console.error('Error updating shift in spreadsheet:', error);
        return res.status(500).json({ success: false, message: 'Gagal memperbarui shift di spreadsheet' });
      }
    }
    res.json({ success: true, message: 'Shift berhasil diperbarui' });
  });

  // --- Announcements API ---
  app.get('/api/announcements', async (req, res) => {
    if (doc) {
      try {
        const announcements = await getCachedData('announcements', async () => {
          const sheet = await getOrCreateSheet('Announcements', ['id', 'title', 'content', 'date', 'expiryDate', 'isActive']);
          if (sheet) {
            const rows = await sheet.getRows();
            return rows.map(row => ({
              id: row.get('id'),
              title: row.get('title'),
              content: row.get('content'),
              date: row.get('date'),
              expiryDate: row.get('expiryDate'),
              isActive: String(row.get('isActive')).toLowerCase() === 'true'
            }));
          }
          return [];
        });
        return res.json(announcements);
      } catch (error) {
        console.error('Error fetching announcements from spreadsheet:', error);
      }
    }
    res.json([]);
  });

  app.post('/api/announcements', async (req, res) => {
    const announcement = req.body;
    if (doc) {
      try {
        const sheet = await getOrCreateSheet('Announcements', ['id', 'title', 'content', 'date', 'expiryDate', 'isActive']);
        if (sheet) {
          await sheet.addRow({
            ...announcement,
            isActive: announcement.isActive.toString(),
            date: announcement.date || new Date().toISOString().split('T')[0]
          });
          delete cache['announcements'];
        }
      } catch (error) {
        console.error('Error saving announcement to spreadsheet:', error);
        return res.status(500).json({ success: false, message: 'Gagal menyimpan pengumuman' });
      }
    }
    res.json({ success: true, message: 'Pengumuman berhasil ditambahkan' });
  });

  app.put('/api/announcements/:id', async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    if (doc) {
      try {
        const sheet = await getSheet('Announcements');
        if (sheet) {
          const rows = await sheet.getRows();
          const rowToUpdate = rows.find(r => r.get('id') === id);
          if (rowToUpdate) {
            rowToUpdate.set('isActive', isActive.toString());
            await rowToUpdate.save();
            delete cache['announcements'];
          }
        }
      } catch (error) {
        console.error('Error updating announcement:', error);
        return res.status(500).json({ success: false, message: 'Gagal update pengumuman' });
      }
    }
    res.json({ success: true, message: 'Pengumuman diupdate' });
  });

  app.delete('/api/announcements/:id', async (req, res) => {
    const { id } = req.params;
    if (doc) {
      try {
        const sheet = await getSheet('Announcements');
        if (sheet) {
          const rows = await sheet.getRows();
          const rowToDelete = rows.find(r => r.get('id') === id);
          if (rowToDelete) {
            await rowToDelete.delete();
            delete cache['announcements'];
          }
        }
      } catch (error) {
        console.error('Error deleting announcement:', error);
        return res.status(500).json({ success: false, message: 'Gagal menghapus pengumuman' });
      }
    }
    res.json({ success: true, message: 'Pengumuman dihapus' });
  });

  // --- Holidays API ---
  app.get('/api/holidays', async (req, res) => {
    if (doc) {
      try {
        const items = await getCachedData('holidays', async () => {
          const sheet = await getOrCreateSheet('Holidays', ['id', 'date', 'name']);
          if (sheet) {
            const rows = await sheet.getRows();
            return rows.map(row => ({
              id: row.get('id'),
              date: row.get('date'),
              name: row.get('name')
            }));
          }
          return [];
        });
        return res.json(items);
      } catch (error) {
        console.error('Error fetching from spreadsheet:', error);
      }
    }
    res.json([]);
  });

  app.post('/api/holidays', async (req, res) => {
    const item = req.body;
    if (doc) {
      try {
        const sheet = await getOrCreateSheet('Holidays', ['id', 'date', 'name']);
        if (sheet) {
          await sheet.addRow({
            id: item.id || Date.now().toString(),
            date: item.date,
            name: item.name
          });
          delete cache['holidays'];
          return res.json({ success: true, message: 'Added successfully' });
        }
      } catch (error) {
        console.error('Error adding to spreadsheet:', error);
        return res.status(500).json({ success: false, message: 'Failed to add item' });
      }
    }
    res.json({ success: false, message: 'No connection' });
  });

  app.delete('/api/holidays/:id', async (req, res) => {
    const { id } = req.params;
    if (doc) {
      try {
        const sheet = await getSheet('Holidays');
        if (sheet) {
          const rows = await sheet.getRows();
          const rowToDelete = rows.find(r => r.get('id') === id);
          if (rowToDelete) {
            await rowToDelete.delete();
            delete cache['holidays'];
            return res.json({ success: true });
          } else {
            return res.status(404).json({ success: false });
          }
        }
      } catch (error) {
        return res.status(500).json({ success: false });
      }
    }
    res.json({ success: false });
  });

  // --- Settings API ---
  app.get('/api/settings', async (req, res) => {
    if (doc) {
      try {
        const settingsPayload = await getCachedData('settings', async () => {
          const sheet = await getOrCreateSheet('Settings', ['key', 'value']);
          if (sheet) {
            const rows = await sheet.getRows();
            const settings: any = {};
            rows.forEach(row => {
              try {
                settings[row.get('key')] = JSON.parse(row.get('value'));
              } catch (e) {
                settings[row.get('key')] = row.get('value');
              }
            });
            return settings;
          }
          return {};
        });
        if (Object.keys(settingsPayload).length > 0) {
          return res.json(settingsPayload);
        }
      } catch (error) {
        console.error('Error fetching settings from spreadsheet:', error);
      }
    }
    res.json(db.settings);
  });

  app.post('/api/settings', async (req, res) => {
    const { key, value } = req.body;
    db.settings = { ...db.settings, [key]: value };
    
    if (doc) {
      try {
        const sheet = await getOrCreateSheet('Settings', ['key', 'value']);
        if (sheet) {
          const rows = await sheet.getRows();
          const existingRow = rows.find(r => r.get('key') === key);
          
          // Google Sheets cell limit is 50,000 characters.
          // If value is a large object (like generalSettings with appLogo), we might need to handle it carefully.
          // For now, we stringify it. If it fails, we catch the error.
          const stringifiedValue = JSON.stringify(value);
          
          if (existingRow) {
            existingRow.set('value', stringifiedValue);
            await existingRow.save();
          } else {
            await sheet.addRow({ key, value: stringifiedValue });
          }
          delete cache['settings'];
        }
      } catch (error) {
        console.error('Error saving settings to spreadsheet:', error);
        return res.status(500).json({ success: false, message: 'Gagal menyimpan ke spreadsheet. Mungkin ukuran data terlalu besar (misal: gambar logo).' });
      }
    }
    res.json({ success: true, message: 'Pengaturan berhasil disimpan' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    (async () => {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    })();
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
