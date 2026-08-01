import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";
import { Plus, Trash2, Upload, FileSpreadsheet, MonitorX } from "lucide-react";
import { toast } from "sonner";

export default function AdminEmployees() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "karyawan";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // State for Employees
  const [employees, setEmployees] = useState<{id: string, name: string, nip: string, office: string, office2?: string, email: string, password?: string, gender?: string, cluster?: string, unit?: string}[]>([]);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpNip, setNewEmpNip] = useState("");
  const [newEmpOffice, setNewEmpOffice] = useState("");
  const [newEmpOffice2, setNewEmpOffice2] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpGender, setNewEmpGender] = useState("");
  const [newEmpCluster, setNewEmpCluster] = useState("");
  const [newEmpUnit, setNewEmpUnit] = useState("");
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // State for Locations
  const [locations, setLocations] = useState<{id: string, desa: string, kecamatan: string, kabupaten: string, coordinates: string, radius: number}[]>([]);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [newLocName, setNewLocName] = useState("");
  const [newLocKecamatan, setNewLocKecamatan] = useState("");
  const [newLocCoords, setNewLocCoords] = useState("");

  // State for Units
  const [units, setUnits] = useState<{id: string, name: string}[]>([]);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  // State for Shifts
  const [shifts, setShifts] = useState<{
    id: string, 
    name: string, 
    startTime: string, 
    endTime: string, 
    fridayEndTime?: string,
    saturdayEndTime?: string,
    checkInBeforeMinutes?: number,
    checkInAfterMinutes?: number,
    checkOutBeforeMinutes?: number,
    checkOutAfterMinutes?: number,
    crossesMidnight: boolean, 
    isActive: boolean
  }[]>([]);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [newShiftName, setNewShiftName] = useState("");
  const [newShiftStart, setNewShiftStart] = useState("");
  const [newShiftEnd, setNewShiftEnd] = useState("");
  const [newShiftFridayEnd, setNewShiftFridayEnd] = useState("");
  const [newShiftSaturdayEnd, setNewShiftSaturdayEnd] = useState("");
  const [newShiftCheckInBefore, setNewShiftCheckInBefore] = useState(60);
  const [newShiftCheckInAfter, setNewShiftCheckInAfter] = useState(15);
  const [newShiftCheckOutBefore, setNewShiftCheckOutBefore] = useState(10);
  const [newShiftCheckOutAfter, setNewShiftCheckOutAfter] = useState(120);
  const [newShiftCrossesMidnight, setNewShiftCrossesMidnight] = useState(false);
  const [newShiftIsActive, setNewShiftIsActive] = useState(true);
  const [newShiftUnit, setNewShiftUnit] = useState("");
  const [newShiftIsOffSunday, setNewShiftIsOffSunday] = useState(false);
  const [newShiftIsOffHoliday, setNewShiftIsOffHoliday] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  // State for Admins
  const [admins, setAdmins] = useState<{id: string, name: string, nip: string, email: string, phone: string, group: string, isActive: boolean, access: string[]}[]>([]);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminNip, setNewAdminNip] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminGroup, setNewAdminGroup] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [newAdminAccess, setNewAdminAccess] = useState<string[]>([]);
  const [newAdminIsActive, setNewAdminIsActive] = useState(true);

  useEffect(() => {
    // Fetch employees from API
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees');
        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
        }
      } catch (error) {
        console.error('Failed to fetch employees:', error);
        // Fallback to local storage if API fails
        const savedEmployees = localStorage.getItem('employeesData');
        if (savedEmployees) {
          setEmployees(JSON.parse(savedEmployees));
        }
      }
    };
    fetchEmployees();

    // Fetch admins from API
    const fetchAdmins = async () => {
      try {
        const response = await fetch('/api/admins');
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setAdmins(data);
          } else {
            // Fallback to local storage or mock
            const savedAdmins = localStorage.getItem('adminsData');
            if (savedAdmins) {
              setAdmins(JSON.parse(savedAdmins));
            } else {
              setAdmins([
                { id: "1", name: "Super Admin", nip: "000000", email: "super@admin.com", phone: "081234567890", group: "Superadmin", isActive: true, access: ["Absensi", "Master Data", "Sistem"] }
              ]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch admins:', error);
        const savedAdmins = localStorage.getItem('adminsData');
        if (savedAdmins) {
          setAdmins(JSON.parse(savedAdmins));
        } else {
          setAdmins([
            { id: "1", name: "Super Admin", nip: "000000", email: "super@admin.com", phone: "081234567890", group: "Superadmin", isActive: true, access: ["Absensi", "Master Data", "Sistem"] }
          ]);
        }
      }
    };
    fetchAdmins();

    // Fetch units from API
    const fetchUnits = async () => {
      try {
        const response = await fetch('/api/units');
        if (response.ok) {
          const data = await response.json();
          setUnits(data);
        }
      } catch (error) {
        console.error('Failed to fetch units:', error);
      }
    };
    fetchUnits();

    // Fetch locations from API
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/locations');
        if (response.ok) {
          const data = await response.json();
          setLocations(data);
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
        const savedLocations = localStorage.getItem('locationsData');
        if (savedLocations) {
          setLocations(JSON.parse(savedLocations));
        } else {
          setLocations([
            { id: "1", desa: "Kantor Induk", kecamatan: "", kabupaten: "", coordinates: "-7.1234, 112.1234", radius: 100 },
            { id: "2", desa: "Pustu A", kecamatan: "", kabupaten: "", coordinates: "-7.1235, 112.1235", radius: 100 }
          ]);
        }
      }
    };
    fetchLocations();

    // Fetch shifts from API
    const fetchShifts = async () => {
      try {
        const response = await fetch('/api/shifts');
        if (response.ok) {
          const data = await response.json();
          setShifts(data);
        }
      } catch (error) {
        console.error('Failed to fetch shifts:', error);
        const savedShifts = localStorage.getItem('shiftsData');
        if (savedShifts) {
          setShifts(JSON.parse(savedShifts));
        } else {
          setShifts([
            { id: "1", name: "Pagi", startTime: "08:00", endTime: "16:00", crossesMidnight: false, isActive: true },
            { id: "2", name: "Malam", startTime: "20:00", endTime: "04:00", crossesMidnight: true, isActive: true }
          ]);
        }
      }
    };
    fetchShifts();
  }, []);

  const handleAddEmployee = async () => {
    if (newEmpName && newEmpNip && newEmpOffice && newEmpEmail && newEmpGender && newEmpCluster && newEmpUnit) {
      const newEmployee = {
        id: Date.now().toString(),
        name: newEmpName,
        nip: newEmpNip,
        office: newEmpOffice,
        office2: newEmpOffice2 === "none" ? "" : newEmpOffice2,
        email: newEmpEmail,
        gender: newEmpGender,
        cluster: newEmpCluster,
        unit: newEmpUnit,
        password: "123456" // Default password
      };
      
      try {
        const response = await fetch('/api/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newEmployee),
        });

        if (response.ok) {
          const updatedEmployees = [...employees, newEmployee];
          setEmployees(updatedEmployees);
          localStorage.setItem('employeesData', JSON.stringify(updatedEmployees));
          
          toast.success("Karyawan berhasil ditambahkan dengan password default: 123456");
          
          setNewEmpName("");
          setNewEmpNip("");
          setNewEmpOffice("");
          setNewEmpOffice2("");
          setNewEmpEmail("");
          setNewEmpGender("");
          setNewEmpCluster("");
          setNewEmpUnit("");
          setIsAddEmployeeOpen(false);
        } else {
          toast.error("Gagal menambahkan karyawan ke server");
        }
      } catch (error) {
        console.error("Error adding employee:", error);
        toast.error("Terjadi kesalahan jaringan");
      }
    } else {
      toast.error("Mohon lengkapi semua data");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedEmployees = employees.filter(emp => emp.id !== id);
        setEmployees(updatedEmployees);
        localStorage.setItem('employeesData', JSON.stringify(updatedEmployees));
        toast.success("Karyawan berhasil dihapus");
      } else {
        toast.error("Gagal menghapus karyawan dari server");
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Terjadi kesalahan jaringan");
    }
  };

  const handleResetDevice = async (nip: string) => {
    if (!confirm(`Apakah Anda yakin ingin mereset perangkat untuk NIP ${nip}?`)) return;
    try {
      const response = await fetch(`/api/device-bindings/${nip}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || "Perangkat berhasil direset");
      } else {
        toast.error(data.message || "Gagal mereset perangkat");
      }
    } catch (error) {
      console.error("Error resetting device:", error);
      toast.error("Terjadi kesalahan jaringan");
    }
  };

  const downloadTemplate = () => {
    const wsData = [
      ["Nama", "NIP", "Gender", "Klaster", "Unit", "Kantor", "Kantor2", "Email"],
      ["Budi Santoso", "198001012005011001", "Laki-laki", "1", "Poli Umum", "Puskesmas Maju Jaya", "", "budi@example.com"],
      ["Siti Aminah", "198502022010012002", "Perempuan", "2", "Poli Gigi", "Puskesmas Maju Jaya", "Pustu B", "siti@example.com"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto-size columns
    ws['!cols'] = [
      { wch: 20 }, // Nama
      { wch: 25 }, // NIP
      { wch: 15 }, // Gender
      { wch: 10 }, // Klaster
      { wch: 15 }, // Unit
      { wch: 25 }, // Kantor
      { wch: 25 }, // Kantor2
      { wch: 25 }  // Email
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Format Template Karyawan");
    XLSX.writeFile(wb, "Template_Karyawan.xlsx");
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Expected headers mapping (adjust as needed based on Excel format)
        // name, nip, office, office2, email, gender, cluster, unit
        const formattedEmployees = jsonData.map((row, index) => ({
          id: (Date.now() + index).toString(),
          name: row.Nama || row.name || "",
          nip: String(row.NIP || row.nip || ""),
          office: row.Kantor || row.office || "",
          office2: row.Kantor2 || row.office2 || "",
          email: row.Email || row.email || "",
          gender: row.Gender || row.gender || row["Jenis Kelamin"] || "",
          cluster: row.Klaster || row.cluster || "",
          unit: row.Unit || row.unit || "",
          password: "123456"
        })).filter(emp => emp.name && emp.nip);

        if (formattedEmployees.length === 0) {
          toast.error("Tidak ada data valid yang ditemukan (Minimal perlukan Nama dan NIP)");
          setIsUploading(false);
          return;
        }

        const response = await fetch('/api/employees/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedEmployees),
        });

        if (response.ok) {
          const fetchedRes = await fetch('/api/employees');
          if (fetchedRes.ok) {
            const freshData = await fetchedRes.json();
            setEmployees(freshData);
            localStorage.setItem('employeesData', JSON.stringify(freshData));
          }
          toast.success(`${formattedEmployees.length} karyawan berhasil diimpor`);
          setIsBulkUploadOpen(false);
        } else {
          try {
            const errorData = await response.json();
            toast.error(errorData.message || "Gagal mengimpor data ke server");
          } catch {
            toast.error("Gagal mengimpor data ke server");
          }
        }
      } catch (error) {
        console.error("Bulk upload error:", error);
        toast.error("Terjadi kesalahan saat memproses file Excel");
      } finally {
        setIsUploading(false);
        // Reset file input
        event.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddLocation = async () => {
    if (newLocName && newLocKecamatan && newLocCoords) {
      const newLocation = {
        id: Date.now().toString(),
        desa: newLocName,
        kecamatan: newLocKecamatan,
        kabupaten: "",
        coordinates: newLocCoords,
        radius: 100
      };
      
      try {
        const response = await fetch('/api/locations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newLocation),
        });

        if (response.ok) {
          const updatedLocations = [...locations, newLocation];
          setLocations(updatedLocations);
          localStorage.setItem('locationsData', JSON.stringify(updatedLocations));
          toast.success("Lokasi berhasil ditambahkan");
          setNewLocName("");
          setNewLocKecamatan("");
          setNewLocCoords("");
          setIsAddLocationOpen(false);
        } else {
          toast.error("Gagal menambahkan lokasi ke server");
        }
      } catch (error) {
        console.error("Error adding location:", error);
        toast.error("Terjadi kesalahan jaringan");
      }
    } else {
      toast.error("Mohon lengkapi semua data");
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedLocations = locations.filter(loc => loc.id !== id);
        setLocations(updatedLocations);
        localStorage.setItem('locationsData', JSON.stringify(updatedLocations));
        toast.success("Lokasi berhasil dihapus");
      } else {
        toast.error("Gagal menghapus lokasi dari server");
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("Terjadi kesalahan jaringan");
    }
  };

  const handleAddUnit = async () => {
    if (newUnitName) {
      const unitData = {
        id: editingUnitId || Date.now().toString(),
        name: newUnitName
      };

      try {
        const response = await fetch('/api/units', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(unitData),
        });

        if (response.ok) {
          if (editingUnitId) {
            const updatedUnits = units.map(u => u.id === editingUnitId ? unitData : u);
            setUnits(updatedUnits);
            toast.success("Unit Layanan berhasil diperbarui");
          } else {
            setUnits([...units, unitData]);
            toast.success("Unit Layanan berhasil ditambahkan");
          }
          setIsAddUnitOpen(false);
          setNewUnitName("");
          setEditingUnitId(null);
        } else {
          toast.error("Gagal menyimpan Unit Layanan di server");
        }
      } catch (error) {
        console.error("Error saving unit:", error);
        toast.error("Terjadi kesalahan jaringan");
      }
    } else {
      toast.error("Nama unit harus diisi");
    }
  };

  const handleEditUnit = (unit: any) => {
    setEditingUnitId(unit.id);
    setNewUnitName(unit.name);
    setIsAddUnitOpen(true);
  };

  const handleDeleteUnit = async (id: string) => {
    try {
      const response = await fetch(`/api/units/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setUnits(units.filter(u => u.id !== id));
        toast.success("Unit Layanan berhasil dihapus");
      } else {
        toast.error("Gagal menghapus Unit Layanan di server");
      }
    } catch (error) {
      console.error("Error deleting unit:", error);
      toast.error("Terjadi kesalahan jaringan");
    }
  };

  const handleAddShift = async () => {
    if (newShiftName && newShiftStart && newShiftEnd) {
      const shiftData = {
        name: newShiftName,
        startTime: newShiftStart,
        endTime: newShiftEnd,
        fridayEndTime: newShiftFridayEnd,
        saturdayEndTime: newShiftSaturdayEnd,
        checkInBeforeMinutes: newShiftCheckInBefore,
        checkInAfterMinutes: newShiftCheckInAfter,
        checkOutBeforeMinutes: newShiftCheckOutBefore,
        checkOutAfterMinutes: newShiftCheckOutAfter,
        crossesMidnight: newShiftCrossesMidnight,
        isActive: newShiftIsActive,
        unit: newShiftUnit === "none" ? "" : newShiftUnit,
        isOffSunday: newShiftIsOffSunday,
        isOffHoliday: newShiftIsOffHoliday
      };
      
      try {
        const url = editingShiftId ? `/api/shifts/${editingShiftId}` : '/api/shifts';
        const method = editingShiftId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...shiftData, id: editingShiftId || Date.now().toString() }),
        });

        if (response.ok) {
          const fetchedRes = await fetch('/api/shifts');
          if (fetchedRes.ok) {
            const data = await fetchedRes.json();
            setShifts(data);
          }
          toast.success(editingShiftId ? "Shift berhasil diperbarui" : "Shift berhasil ditambahkan");
          resetShiftForm();
          setIsAddShiftOpen(false);
        } else {
          toast.error("Gagal menyimpan shift ke server");
        }
      } catch (error) {
        console.error("Error saving shift:", error);
        toast.error("Terjadi kesalahan jaringan");
      }
    } else {
      toast.error("Mohon lengkapi semua data shift");
    }
  };

  const resetShiftForm = () => {
    setNewShiftName("");
    setNewShiftStart("");
    setNewShiftEnd("");
    setNewShiftFridayEnd("");
    setNewShiftSaturdayEnd("");
    setNewShiftCheckInBefore(60);
    setNewShiftCheckInAfter(15);
    setNewShiftCheckOutBefore(10);
    setNewShiftCheckOutAfter(120);
    setNewShiftCrossesMidnight(false);
    setNewShiftIsActive(true);
    setNewShiftIsOffSunday(false);
    setNewShiftIsOffHoliday(false);
    setEditingShiftId(null);
  };

  const handleEditShift = (shift: any) => {
    setNewShiftName(shift.name);
    setNewShiftStart(shift.startTime);
    setNewShiftEnd(shift.endTime);
    setNewShiftFridayEnd(shift.fridayEndTime || "");
    setNewShiftSaturdayEnd(shift.saturdayEndTime || "");
    setNewShiftCheckInBefore(shift.checkInBeforeMinutes || 60);
    setNewShiftCheckInAfter(shift.checkInAfterMinutes || 15);
    setNewShiftCheckOutBefore(shift.checkOutBeforeMinutes || 10);
    setNewShiftCheckOutAfter(shift.checkOutAfterMinutes || 120);
    setNewShiftCrossesMidnight(shift.crossesMidnight);
    setNewShiftIsActive(shift.isActive);
    setNewShiftUnit(shift.unit || "none");
    setNewShiftIsOffSunday(shift.isOffSunday || false);
    setNewShiftIsOffHoliday(shift.isOffHoliday || false);
    setEditingShiftId(shift.id);
    setIsAddShiftOpen(true);
  };

  const handleDeleteShift = async (id: string) => {
    try {
      const response = await fetch(`/api/shifts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedShifts = shifts.filter(shift => shift.id !== id);
        setShifts(updatedShifts);
        localStorage.setItem('shiftsData', JSON.stringify(updatedShifts));
        toast.success("Shift berhasil dihapus");
      } else {
        toast.error("Gagal menghapus shift dari server");
      }
    } catch (error) {
      console.error("Error deleting shift:", error);
      toast.error("Terjadi kesalahan jaringan");
    }
  };

  const handleToggleShiftStatus = async (id: string) => {
    const shiftToUpdate = shifts.find(s => s.id === id);
    if (!shiftToUpdate) return;

    const updatedShift = { ...shiftToUpdate, isActive: !shiftToUpdate.isActive };
    
    try {
      const response = await fetch(`/api/shifts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedShift),
      });

      if (response.ok) {
        const updatedShifts = shifts.map(shift => shift.id === id ? updatedShift : shift);
        setShifts(updatedShifts);
        localStorage.setItem('shiftsData', JSON.stringify(updatedShifts));
        toast.success("Status shift berhasil diubah");
      } else {
        toast.error("Gagal mengubah status shift di server");
      }
    } catch (error) {
      console.error("Error toggling shift status:", error);
      toast.error("Terjadi kesalahan jaringan");
    }
  };

  const handleAddAdmin = async () => {
    if (newAdminName && newAdminNip && newAdminEmail && newAdminPassword && newAdminGroup && newAdminPhone) {
      const newAdmin = {
        id: Date.now().toString(),
        name: newAdminName,
        nip: newAdminNip,
        email: newAdminEmail,
        password: newAdminPassword,
        group: newAdminGroup,
        phone: newAdminPhone,
        isActive: newAdminIsActive,
        access: newAdminAccess
      };
      
      try {
        const response = await fetch('/api/admins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newAdmin),
        });

        if (response.ok) {
          const updatedAdmins = [...admins, newAdmin];
          setAdmins(updatedAdmins);
          localStorage.setItem('adminsData', JSON.stringify(updatedAdmins));
          toast.success("Admin berhasil ditambahkan");
          setNewAdminName("");
          setNewAdminNip("");
          setNewAdminEmail("");
          setNewAdminPassword("");
          setNewAdminGroup("");
          setNewAdminPhone("");
          setNewAdminAccess([]);
          setNewAdminIsActive(true);
          setIsAddAdminOpen(false);
        } else {
          toast.error("Gagal menambahkan admin ke server");
        }
      } catch (error) {
        console.error("Error adding admin:", error);
        toast.error("Terjadi kesalahan jaringan");
      }
    } else {
      toast.error("Mohon lengkapi semua data admin");
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    try {
      const response = await fetch(`/api/admins/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedAdmins = admins.filter(admin => admin.id !== id);
        setAdmins(updatedAdmins);
        localStorage.setItem('adminsData', JSON.stringify(updatedAdmins));
        toast.success("Admin berhasil dihapus");
      } else {
        toast.error("Gagal menghapus admin dari server");
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast.error("Terjadi kesalahan jaringan");
    }
  };

  const handleToggleAdminStatus = async (id: string) => {
    const adminToUpdate = admins.find(a => a.id === id);
    if (!adminToUpdate) return;

    const updatedAdmin = { ...adminToUpdate, isActive: !adminToUpdate.isActive };
    
    try {
      const response = await fetch(`/api/admins/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedAdmin),
      });

      if (response.ok) {
        const updatedAdmins = admins.map(admin => admin.id === id ? updatedAdmin : admin);
        setAdmins(updatedAdmins);
        localStorage.setItem('adminsData', JSON.stringify(updatedAdmins));
        toast.success("Status admin berhasil diubah");
      } else {
        toast.error("Gagal mengubah status admin di server");
      }
    } catch (error) {
      console.error("Error toggling admin status:", error);
      toast.error("Terjadi kesalahan jaringan");
    }
  };

  const handleAccessToggle = (menu: string) => {
    setNewAdminAccess(prev => 
      prev.includes(menu) ? prev.filter(item => item !== menu) : [...prev, menu]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Master Data</h1>
        <p className="text-sm text-slate-500">Kelola data karyawan, lokasi, shift, dan administrator.</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsContent value="karyawan">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kelola Tenaga Kerja</CardTitle>
              <div className="flex gap-2">
                <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
                  <DialogTrigger render={
                    <Button variant="outline" className="flex items-center gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                      <FileSpreadsheet className="h-4 w-4" />
                      Import Excel
                    </Button>
                  } />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Karyawan via Excel</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 text-center">
                      <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 flex flex-col items-center justify-center gap-3 relative transition-colors hover:bg-slate-100">
                        <Upload className="h-10 w-10 text-emerald-500" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Klik untuk mengupload file Excel (.xlsx, .xls)</p>
                          <p className="text-xs text-slate-500">Gunakan kolom: Nama, NIP, Gender, Klaster, Unit, Kantor, Kantor2, Email</p>
                        </div>
                        <Input 
                          type="file" 
                          accept=".xlsx, .xls" 
                          onChange={handleBulkUpload}
                          disabled={isUploading}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          title="Klik untuk memilih file excel"
                        />
                        {isUploading && (
                          <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium animate-pulse">
                            Memproses file...
                          </div>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={downloadTemplate}
                          className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 w-full"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Download Format Template Excel
                        </Button>
                      </div>
                      <div className="text-left text-xs space-y-2 p-3 bg-emerald-50 rounded border border-emerald-100">
                        <p className="font-semibold text-emerald-800">Petunjuk Format Excel:</p>
                        <ul className="list-disc list-inside space-y-1 text-emerald-700">
                          <li>Sangat disarankan memakai <strong>Format Template Excel</strong> di atas.</li>
                          <li>Pastikan kolom NIP diformat sebagai <kbd className="px-1 py-0.5 bg-emerald-100 rounded text-[10px]">Text</kbd> (atau awali dengan petik satu <code>'198...</code>) agar angkanya tidak terpotong.</li>
                          <li>File harus berekstensi .xlsx atau .xls</li>
                          <li>Password default saat mengunggah karyawan akan diatur otomatis menjadi <strong>123456</strong>.</li>
                        </ul>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBulkUploadOpen(false)}>Tutup</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                  <DialogTrigger render={
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Tambah Karyawan
                    </Button>
                  } />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Karyawan Baru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="emp-name">Nama Lengkap</Label>
                      <Input 
                        id="emp-name" 
                        placeholder="Masukkan nama lengkap" 
                        value={newEmpName}
                        onChange={(e) => setNewEmpName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emp-nip">NIP</Label>
                      <Input 
                        id="emp-nip" 
                        placeholder="Masukkan NIP /NIK (jika belum punya NIP)" 
                        value={newEmpNip}
                        onChange={(e) => setNewEmpNip(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="emp-gender">Jenis Kelamin</Label>
                        <Select value={newEmpGender} onValueChange={setNewEmpGender}>
                          <SelectTrigger id="emp-gender">
                            <SelectValue placeholder="Pilih Jenis Kelamin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                            <SelectItem value="Perempuan">Perempuan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emp-cluster">Klaster</Label>
                        <Select value={newEmpCluster} onValueChange={setNewEmpCluster}>
                          <SelectTrigger id="emp-cluster">
                            <SelectValue placeholder="Pilih Klaster" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Klaster 1">Klaster 1</SelectItem>
                            <SelectItem value="Klaster 2">Klaster 2</SelectItem>
                            <SelectItem value="Klaster 3">Klaster 3</SelectItem>
                            <SelectItem value="Klaster 4">Klaster 4</SelectItem>
                            <SelectItem value="Klaster 5">Klaster 5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emp-unit">Unit kerja/Unit Layanan</Label>
                      <Select value={newEmpUnit} onValueChange={setNewEmpUnit}>
                        <SelectTrigger id="emp-unit">
                          <SelectValue placeholder="Pilih Unit Kerja" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emp-office">Alamat Kantor 1</Label>
                      <Select value={newEmpOffice} onValueChange={setNewEmpOffice}>
                        <SelectTrigger id="emp-office">
                          <SelectValue placeholder="Pilih Alamat Kantor" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map(loc => (
                            <SelectItem key={loc.id} value={loc.desa}>{loc.desa}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emp-office2">Alamat Kantor 2 (Opsional)</Label>
                      <Select value={newEmpOffice2} onValueChange={setNewEmpOffice2}>
                        <SelectTrigger id="emp-office2">
                          <SelectValue placeholder="Pilih Alamat Kantor 2" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tidak Ada</SelectItem>
                          {locations.map(loc => (
                            <SelectItem key={loc.id} value={loc.desa}>{loc.desa}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emp-email">Email</Label>
                      <Input 
                        id="emp-email" 
                        type="email"
                        placeholder="email@puskesmas.com" 
                        value={newEmpEmail}
                        onChange={(e) => setNewEmpEmail(e.target.value)}
                      />
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-md border border-amber-200">
                      <strong>Catatan:</strong> Password default untuk karyawan baru adalah <strong>123456</strong>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddEmployeeOpen(false)}>Batal</Button>
                    <Button onClick={handleAddEmployee}>Simpan ke Database</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-10 text-slate-500">Belum ada data karyawan.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>NIP</TableHead>
                        <TableHead>L/P</TableHead>
                        <TableHead>Klaster</TableHead>
                        <TableHead>Unit Kerja</TableHead>
                        <TableHead>Alamat Kantor 1</TableHead>
                        <TableHead>Alamat Kantor 2</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp, index) => (
                        <TableRow key={`${emp.id}-${index}`}>
                          <TableCell className="font-medium">{emp.name}</TableCell>
                          <TableCell>{emp.nip}</TableCell>
                          <TableCell>{emp.gender === "Laki-laki" ? "L" : emp.gender === "Perempuan" ? "P" : "-"}</TableCell>
                          <TableCell>{emp.cluster || "-"}</TableCell>
                          <TableCell>{emp.unit || "-"}</TableCell>
                          <TableCell>{emp.office}</TableCell>
                          <TableCell>{emp.office2 || "-"}</TableCell>
                          <TableCell>{emp.email}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost" 
                              size="icon" 
                              title="Reset Perangkat"
                              className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 mr-1"
                              onClick={() => handleResetDevice(emp.nip)}
                            >
                              <MonitorX className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Hapus Karyawan"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteEmployee(emp.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lokasi">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pengaturan Lokasi Kantor</CardTitle>
              <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
                <DialogTrigger render={
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Tambah Lokasi
                  </Button>
                } />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Lokasi Baru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="loc-name">Nama Desa / Lokasi</Label>
                      <Input 
                        id="loc-name" 
                        placeholder="Contoh: Blawi" 
                        value={newLocName}
                        onChange={(e) => setNewLocName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loc-kecamatan">Kecamatan</Label>
                      <Input 
                        id="loc-kecamatan" 
                        placeholder="Contoh: Karangbinangun" 
                        value={newLocKecamatan}
                        onChange={(e) => setNewLocKecamatan(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loc-coords">Koordinat (Google Maps)</Label>
                      <Input 
                        id="loc-coords" 
                        placeholder="Contoh: -7.123456, 112.123456" 
                        value={newLocCoords}
                        onChange={(e) => setNewLocCoords(e.target.value)}
                      />
                      <p className="text-xs text-slate-500">Koordinat ini akan digunakan untuk validasi jarak saat absensi.</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddLocationOpen(false)}>Batal</Button>
                    <Button onClick={handleAddLocation}>Simpan ke Database</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <div className="text-center py-10 text-slate-500">Belum ada data lokasi.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Desa / Lokasi</TableHead>
                        <TableHead>Koordinat</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map((loc, index) => (
                        <TableRow key={`${loc.id}-${index}`}>
                          <TableCell className="font-medium">{loc.desa || (loc as any).name}</TableCell>
                          <TableCell>{loc.coordinates}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteLocation(loc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unit">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Daftar Unit Layanan</CardTitle>
              <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
                <DialogTrigger render={
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Tambah Unit Layanan
                  </Button>
                } onClick={() => {
                  setEditingUnitId(null);
                  setNewUnitName("");
                }} />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingUnitId ? 'Edit Unit Layanan' : 'Tambah Unit Layanan Baru'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit-name">Nama Unit Layanan</Label>
                      <Input 
                        id="unit-name" 
                        placeholder="Contoh: Manajemen, UGD, Rawat Jalan" 
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddUnit}>{editingUnitId ? 'Simpan Perubahan' : 'Simpan'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Unit Layanan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">{unit.name}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditUnit(unit)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteUnit(unit.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {units.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-6 text-slate-500">
                          Belum ada data Unit Layanan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shift">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Konfigurasi Jadwal Kerja</CardTitle>
              <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
                <DialogTrigger render={
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Tambah Shift
                  </Button>
                } onClick={resetShiftForm} />
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingShiftId ? 'Edit Shift' : 'Tambah Shift Baru'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="shift-name">Nama Shift</Label>
                      <Input 
                        id="shift-name" 
                        placeholder="Contoh: Pagi, Malam" 
                        value={newShiftName}
                        onChange={(e) => setNewShiftName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shift-start">Jam Awal (Senin-Kamis/Umum)</Label>
                        <Input 
                          id="shift-start" 
                          type="time"
                          value={newShiftStart}
                          onChange={(e) => setNewShiftStart(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shift-end">Jam Akhir (Senin-Kamis/Umum)</Label>
                        <Input 
                          id="shift-end" 
                          type="time"
                          value={newShiftEnd}
                          onChange={(e) => setNewShiftEnd(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="shift-friday-end" className="text-blue-600">Jam Akhir Hari Jumat (Opsional)</Label>
                        <Input 
                          id="shift-friday-end" 
                          type="time"
                          value={newShiftFridayEnd}
                          onChange={(e) => setNewShiftFridayEnd(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-500">Kosongkan jika sama dengan jam akhir umum.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shift-saturday-end" className="text-orange-600">Jam Akhir Hari Sabtu (Opsional)</Label>
                        <Input 
                          id="shift-saturday-end" 
                          type="time"
                          value={newShiftSaturdayEnd}
                          onChange={(e) => setNewShiftSaturdayEnd(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-500">Kosongkan jika sama dengan jam akhir umum.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div className="space-y-2">
                        <Label>Toleransi Absen Masuk</Label>
                        <div className="flex items-center gap-2">
                          <Input type="number" value={newShiftCheckInBefore} onChange={e => setNewShiftCheckInBefore(parseInt(e.target.value))} className="w-20" />
                          <span className="text-xs text-slate-500">Menit sebelum</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input type="number" value={newShiftCheckInAfter} onChange={e => setNewShiftCheckInAfter(parseInt(e.target.value))} className="w-20" />
                          <span className="text-xs text-slate-500">Menit sesudah</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Toleransi Absen Pulang</Label>
                        <div className="flex items-center gap-2">
                          <Input type="number" value={newShiftCheckOutBefore} onChange={e => setNewShiftCheckOutBefore(parseInt(e.target.value))} className="w-20" />
                          <span className="text-xs text-slate-500">Menit sebelum</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input type="number" value={newShiftCheckOutAfter} onChange={e => setNewShiftCheckOutAfter(parseInt(e.target.value))} className="w-20" />
                          <span className="text-xs text-slate-500">Menit sesudah</span>
                        </div>
                        <p className="text-[10px] text-amber-600">Ulangi: Isi "Menit sesudah" minimal 250 jika ingin absen sampai jam 15:00 di hari Jumat/Sabtu.</p>
                      </div>
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="shift-unit">Unit Berlaku (Opsional)</Label>
                        <Select value={newShiftUnit} onValueChange={setNewShiftUnit}>
                          <SelectTrigger id="shift-unit">
                            <SelectValue placeholder="Pilih Unit Layanan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Pilih Unit (Opsional)</SelectItem>
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t">
                      <Checkbox 
                        id="crosses-midnight" 
                        checked={newShiftCrossesMidnight}
                        onCheckedChange={(checked) => setNewShiftCrossesMidnight(checked as boolean)}
                      />
                      <Label htmlFor="crosses-midnight" className="text-sm font-normal">
                        Melewati hari (besok) - Centang jika jam akhir berada di hari berikutnya.
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox 
                        id="shift-is-active" 
                        checked={newShiftIsActive}
                        onCheckedChange={(checked) => setNewShiftIsActive(checked as boolean)}
                      />
                      <Label htmlFor="shift-is-active" className="text-sm font-normal">
                        Aktifkan Shift
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox 
                        id="shift-off-sunday" 
                        checked={newShiftIsOffSunday}
                        onCheckedChange={(checked) => setNewShiftIsOffSunday(checked as boolean)}
                      />
                      <Label htmlFor="shift-off-sunday" className="text-sm font-normal">
                        Libur pada hari Minggu (Tidak bisa absen masuk)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox 
                        id="shift-off-holiday" 
                        checked={newShiftIsOffHoliday}
                        onCheckedChange={(checked) => setNewShiftIsOffHoliday(checked as boolean)}
                      />
                      <Label htmlFor="shift-off-holiday" className="text-sm font-normal">
                        Libur pada Hari Libur Nasional (Tidak bisa absen masuk)
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddShiftOpen(false)}>Batal</Button>
                    <Button onClick={handleAddShift}>Simpan ke Database</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {shifts.length === 0 ? (
                <div className="text-center py-10 text-slate-500">Belum ada data shift kerja.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Shift</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Jam Kerja</TableHead>
                        <TableHead>Jumat/Sabtu</TableHead>
                        <TableHead>Toleransi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.map((shift, index) => (
                        <TableRow key={`${shift.id}-${index}`}>
                          <TableCell className="font-medium">{shift.name}</TableCell>
                          <TableCell>
                             {shift.unit ? (
                                <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-[10px] whitespace-nowrap">{shift.unit}</span>
                             ) : (
                                <span className="text-slate-400 text-[10px]">Semua Shift</span>
                             )}
                          </TableCell>
                          <TableCell>{shift.startTime} - {shift.endTime} {shift.crossesMidnight ? "(+1)" : ""}</TableCell>
                          <TableCell>
                            <div className="text-xs">
                              {shift.fridayEndTime && <p>Jum: {shift.fridayEndTime}</p>}
                              {shift.saturdayEndTime && <p>Sab: {shift.saturdayEndTime}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-[10px]">
                              In: -{shift.checkInBeforeMinutes}/+{shift.checkInAfterMinutes}m<br/>
                              Out: -{shift.checkOutBeforeMinutes}/+{shift.checkOutAfterMinutes}m
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${shift.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                              {shift.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                            {(shift.isOffSunday || shift.isOffHoliday) && (
                              <div className="mt-1 text-[10px] text-slate-500">
                                Libur: {[shift.isOffSunday ? "Minggu" : null, shift.isOffHoliday ? "Libnas" : null].filter(Boolean).join(", ")}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => handleToggleShiftStatus(shift.id)}
                            >
                              {shift.isActive ? 'Off' : 'On'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => handleEditShift(shift)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteShift(shift.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pengaturan Hak Akses</CardTitle>
              <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
                <DialogTrigger render={
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Tambah Admin
                  </Button>
                } />
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Tambah Administrator Baru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-name">Nama User</Label>
                        <Input 
                          id="admin-name" 
                          placeholder="Masukkan nama" 
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-nip">NIP/NIK</Label>
                        <Input 
                          id="admin-nip" 
                          placeholder="Masukkan NIP/NIK" 
                          value={newAdminNip}
                          onChange={(e) => setNewAdminNip(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-email">Email</Label>
                        <Input 
                          id="admin-email" 
                          type="email"
                          placeholder="email@puskesmas.com" 
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-phone">No Telepon</Label>
                        <Input 
                          id="admin-phone" 
                          placeholder="0812..." 
                          value={newAdminPhone}
                          onChange={(e) => setNewAdminPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-password">Password</Label>
                        <Input 
                          id="admin-password" 
                          type="password"
                          placeholder="••••••••" 
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-group">Group Akses</Label>
                        <Select value={newAdminGroup} onValueChange={setNewAdminGroup}>
                          <SelectTrigger id="admin-group">
                            <SelectValue placeholder="Pilih Group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Superadmin">Superadmin</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="text-base">Pengaturan Hak Akses Menu</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {["Dashboard", "Absensi", "Master Data", "Sistem", "Laporan"].map((menu) => (
                          <div key={menu} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`access-${menu}`} 
                              checked={newAdminAccess.includes(menu)}
                              onCheckedChange={() => handleAccessToggle(menu)}
                            />
                            <Label htmlFor={`access-${menu}`} className="font-normal cursor-pointer">
                              {menu}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-4 border-t">
                      <Checkbox 
                        id="admin-is-active" 
                        checked={newAdminIsActive}
                        onCheckedChange={(checked) => setNewAdminIsActive(checked as boolean)}
                      />
                      <Label htmlFor="admin-is-active" className="text-sm font-normal">
                        Aktifkan Admin
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddAdminOpen(false)}>Batal</Button>
                    <Button onClick={handleAddAdmin}>Simpan ke Database</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {admins.length === 0 ? (
                <div className="text-center py-10 text-slate-500">Belum ada data administrator.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>NIP/NIK</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map((admin, index) => (
                        <TableRow key={`${admin.id}-${index}`}>
                          <TableCell className="font-medium">{admin.name}</TableCell>
                          <TableCell>{admin.nip}</TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${admin.group === 'Superadmin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {admin.group}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${admin.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                              {admin.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleAdminStatus(admin.id)}
                            >
                              {admin.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteAdmin(admin.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
