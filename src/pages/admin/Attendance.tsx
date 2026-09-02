import { getServerTime } from '@/lib/time';
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, Plus, Upload, Trash2, Users, TrendingUp, Clock, CalendarDays, Award, AlertTriangle, Timer, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from 'exceljs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, LabelList } from 'recharts';
import { format } from 'date-fns';

export default function AdminAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "harian";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const [generalSettings, setGeneralSettings] = useState<any>({});
  const puskesmasName = generalSettings.companyName || "Puskesmas Sehat";
  const pimpinanName = generalSettings.headName || "Dr. Budi Santoso";

  const [absensiSettings, setAbsensiSettings] = useState<any>({});
  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees');
        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
        }
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [setRes, shiftRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/shifts')
        ]);
        if (setRes.ok) {
          const data = await setRes.json();
          if (data.generalSettings) setGeneralSettings(data.generalSettings);
          if (data.absensiSettings) setAbsensiSettings(data.absensiSettings);
        }
        if (shiftRes.ok) {
          const shiftData = await shiftRes.json();
          setShifts(shiftData);
        }
      } catch (error) {
        console.error('Failed to fetch:', error);
      }
    };
    fetchData();
  }, []);

  // State for Absensi Bulanan
  const today = getServerTime();
  const firstDayOfMonth = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
  const lastDayOfMonth = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd');
  
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(lastDayOfMonth);

  // Generate dates array for the table header
  const getDatesInRange = (start: string, end: string) => {
    const dateArray = [];
    let currentDate = new Date(start);
    const stopDate = new Date(end);
    while (currentDate <= stopDate) {
      dateArray.push(format(new Date(currentDate), 'yyyy-MM-dd'));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dateArray;
  };

  const dates = getDatesInRange(startDate, endDate);

  const [attendanceData, setAttendanceData] = useState<any[]>([]);

  const fetchAttendance = async () => {
    try {
      await fetch('/api/attendance/auto-checkout-check').catch(() => {});
      const response = await fetch('/api/attendance');
      if (response.ok) {
        const data = await response.json();
        setAttendanceData(data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    let clean = timeStr.replace(/\./g, ':').trim().toUpperCase();
    let isPM = clean.includes('PM');
    let isAM = clean.includes('AM');
    clean = clean.replace(/[A-Z]/g, '').trim();
    const parts = clean.split(':');
    let h = parseInt(parts[0] || '0', 10);
    let m = parseInt(parts[1] || '0', 10);
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + m;
  };

  const getShiftForTime = (timeMinutes: number, unit?: string) => {
    if (!shifts || shifts.length === 0) return { name: "Pagi", start: 8 * 60, end: 16 * 60, tolerance: parseInt(absensiSettings.tolerance || '15') };
    
    const activeShiftsRaw = shifts.filter(s => s.isActive);
    const specificShifts = activeShiftsRaw.filter(s => s.unit && s.unit === unit);
    const generalShifts = activeShiftsRaw.filter(s => !s.unit || s.unit === 'none' || s.unit === '');
    
    const activeShifts = specificShifts.length > 0 ? specificShifts : generalShifts;
    if (activeShifts.length === 0) return { name: "Pagi", start: 8 * 60, end: 16 * 60, tolerance: parseInt(absensiSettings.tolerance || '15') };

    let bestShift = activeShifts[0];
    let minDiff = Infinity;
    
    // Evaluate closest shift start time
    activeShifts.forEach(shift => {
      const startMinutes = parseTime(shift.startTime);
      let diff = Math.abs(timeMinutes - startMinutes);
      // handling wrapping across midnight
      if (diff > 720) diff = 1440 - diff;
      
      if (diff < minDiff) {
        minDiff = diff;
        bestShift = shift;
      }
    });

    const now = getServerTime();
    const day = now.getDay();
    let endTimeStr = bestShift.endTime;
    if (day === 5 && bestShift.fridayEndTime) {
      endTimeStr = bestShift.fridayEndTime;
    } else if (day === 6 && bestShift.saturdayEndTime) {
      endTimeStr = bestShift.saturdayEndTime;
    }

    return {
      name: bestShift.name,
      start: parseTime(bestShift.startTime),
      end: parseTime(endTimeStr),
      tolerance: parseInt(bestShift.checkInAfterMinutes || absensiSettings.tolerance || '15')
    };
  };

  // Process attendance data for Harian
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // Get all attendance data sorted by date and time to process chronologically
  const sortedRecords = [...attendanceData].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time === '-' ? '00:00' : a.time}:00`);
      const dateB = new Date(`${b.date}T${b.time === '-' ? '00:00' : b.time}:00`);
      return dateA.getTime() - dateB.getTime();
  });

  const processedHarianRaw: any[] = [];
  
  // Group by NIP first to process each person's timeline
  const nipGroups = sortedRecords.reduce((acc: any, curr: any) => {
      if (!acc[curr.nip]) acc[curr.nip] = [];
      acc[curr.nip].push(curr);
      return acc;
  }, {});

  Object.values(nipGroups).forEach((records: any) => {
      let currentSession: any = null;
      
      records.forEach((record: any) => {
          const isLeave = ['izin', 'sakit', 'Cuti', 'dinas_luar', 'pending'].includes(record.type) || ['izin', 'Sakit', 'Cuti', 'Dinas Luar', 'pending'].includes(record.status);
          
          if (isLeave) {
              const recDate = new Date(record.date);
              const targetDate = new Date(todayStr);
              recDate.setHours(0, 0, 0, 0);
              targetDate.setHours(0, 0, 0, 0);
              
              let endDate = new Date(recDate);
              if (typeof record.location === 'object' && record.location !== null && record.location.endDate) {
                endDate = new Date(record.location.endDate);
                endDate.setHours(0, 0, 0, 0);
              }
              
              if (targetDate >= recDate && targetDate <= endDate) {
                  processedHarianRaw.push({ inRecord: null, outRecord: null, leaveRecord: record });
              }
          } else if (record.type === 'in') {
              // If there was an unclosed session, ignore it and start a new one (or push as missing checkout)
              if (currentSession && currentSession.inRecord.date === todayStr) {
                  processedHarianRaw.push({ ...currentSession });
              }
              currentSession = { inRecord: record, outRecord: null, leaveRecord: null };
          } else if (record.type === 'out') {
              if (currentSession) {
                  currentSession.outRecord = record;
                  if (currentSession.inRecord.date === todayStr || record.date === todayStr) {
                      // If the session started today OR finished today, we need to decide if we show it.
                      // Usually, we only show it on the day it STARTED. (Night shift checkout today belongs to yesterday's Harian)
                      if (currentSession.inRecord.date === todayStr) {
                         processedHarianRaw.push({ ...currentSession });
                      }
                  }
                  currentSession = null;
              } else {
                  // Orphaned out record (e.g. checked out without checking in)
                  if (record.date === todayStr) {
                      processedHarianRaw.push({ inRecord: null, outRecord: record, leaveRecord: null });
                  }
              }
          }
      });
      // If there's an unclosed session remaining for today
      if (currentSession && currentSession.inRecord.date === todayStr) {
          processedHarianRaw.push({ ...currentSession });
      }
  });

  const processedHarian = processedHarianRaw.map((session: any) => {
    const { inRecord, outRecord, leaveRecord } = session;
    const baseRecord = inRecord || outRecord || leaveRecord;
    if (!baseRecord) return null;
    
    const isIzin = ['izin', 'Sakit', 'Cuti', 'Dinas Luar', 'pending'].includes(baseRecord.status);
    const locationVal = typeof baseRecord.location === 'object' && baseRecord.location !== null ? baseRecord.location.reason || baseRecord.location.address || JSON.stringify(baseRecord.location) : baseRecord.location;
    
    let shiftDisplay = baseRecord.shift || "-";
    if (inRecord && inRecord.time && inRecord.time !== "-") {
      const empUnit = employees.find(e => e.nip === baseRecord.nip)?.unit;
      const t = parseTime(inRecord.time);
      const shift = getShiftForTime(t, empUnit);
      if (shift && shift.name) {
        shiftDisplay = shift.name;
      }
    }

    let displayStatus = inRecord?.status || outRecord?.status || leaveRecord?.status || baseRecord.status;
    if (outRecord && outRecord.status === 'Hadir (Pulang Cepat)') {
        displayStatus = outRecord.status;
    } else if (outRecord && outRecord.status === 'Hadir (Ganti Jaga)') {
        displayStatus = outRecord.status;
    } else if (inRecord && inRecord.status === 'Hadir (Ganti Jaga)') {
        displayStatus = inRecord.status;
    }

    return {
      nama: baseRecord.name,
      nip: baseRecord.nip,
      kantor: isIzin ? "-" : locationVal,
      shift: shiftDisplay,
      status: displayStatus,
      jamMasuk: inRecord ? inRecord.time : "-",
      jamKeluar: outRecord ? outRecord.time : "-",
      keterangan: isIzin ? locationVal : "-"
    };
  }).filter(Boolean);

  // Fallback to mock if empty for demonstration
  const displayHarian = processedHarian.length > 0 ? processedHarian : [
    { nama: "Admin User", nip: "123456", kantor: "Kantor Induk", shift: "Pagi", status: "Hadir", jamMasuk: "07:45", jamKeluar: "-", keterangan: "-" }
  ];

  // Process attendance data for Bulanan

  const bulananData = employees.map(emp => {
    const empAttendance = attendanceData.filter(a => a.nip === emp.nip);
    const attendanceMap: any = {};
    let totalHoursCount = 0;

    dates.forEach(date => {
      const recordsForDate = empAttendance.filter(a => a.date === date);
      let statusInfo = { code: '-', hours: 0, onlyIn: false, bgColor: '' };
      
      const inRecord = recordsForDate.find(a => a.type === 'in');
      let outRecord = recordsForDate.find(a => a.type === 'out');
      const leaveRecord = empAttendance.find(a => {
        const isLeaveType = ['izin', 'sakit', 'Cuti', 'dinas_luar', 'pending'].includes(a.type) || ['izin', 'Sakit', 'Cuti', 'Dinas Luar', 'pending'].includes(a.status);
        if (!isLeaveType) return false;
        
        const recDate = new Date(a.date);
        const targetDate = new Date(date);
        recDate.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        
        let endDate = new Date(recDate);
        if (typeof a.location === 'object' && a.location !== null && a.location.endDate) {
          endDate = new Date(a.location.endDate);
          endDate.setHours(0, 0, 0, 0);
        }
        
        return targetDate >= recDate && targetDate <= endDate;
      });

      if (leaveRecord) {
        // Evaluate consecutive days for 'sakit' or 'dinas_luar'
        const isSakit = leaveRecord.status === 'Sakit' || leaveRecord.type === 'sakit';
        const isDinasLuar = leaveRecord.status === 'Dinas Luar' || leaveRecord.type === 'dinas_luar';
        
        let shouldGiveHours = false;
        if (isSakit || isDinasLuar) {
          let consecutiveCount = 0;
          let checkDate = new Date(date);
          checkDate.setHours(0, 0, 0, 0);
          
          while (true) {
            const hasSameLeave = empAttendance.some(a => {
               const matchesType = (isSakit && (a.status === 'Sakit' || a.type === 'sakit')) ||
                                   (isDinasLuar && (a.status === 'Dinas Luar' || a.type === 'dinas_luar'));
               if (!matchesType) return false;
               const rDate = new Date(a.date);
               rDate.setHours(0, 0, 0, 0);
               let eDate = new Date(rDate);
               if (typeof a.location === 'object' && a.location !== null && a.location.endDate) {
                 eDate = new Date(a.location.endDate);
                 eDate.setHours(0, 0, 0, 0);
               }
               return checkDate >= rDate && checkDate <= eDate;
            });
            if (hasSameLeave) {
               consecutiveCount++;
               checkDate.setDate(checkDate.getDate() - 1);
            } else {
               break;
            }
          }
          if (consecutiveCount <= 3) {
             shouldGiveHours = true;
          }
        }

        if (leaveRecord.status === 'pending') {
          statusInfo.code = 'P';
        } else if (isSakit) {
          statusInfo.code = 'S';
          if (shouldGiveHours) {
            statusInfo.hours = Number((6 + 25/60).toFixed(2));
          } else {
            statusInfo.hours = 0;
          }
        } else if (isDinasLuar) {
          statusInfo.code = 'D';
          if (shouldGiveHours) {
            statusInfo.hours = Number((6 + 25/60).toFixed(2));
          } else {
            statusInfo.hours = 0;
          }
        } else if (leaveRecord.status === 'Cuti' || leaveRecord.type === 'cuti' || leaveRecord.type === 'Cuti') {
          statusInfo.code = 'C';
        } else if (leaveRecord.status === 'izin' || leaveRecord.type === 'izin') {
          statusInfo.code = 'I';
        } else {
          statusInfo.code = leaveRecord.status?.[0]?.toUpperCase() || 'M';
        }
      } else if (inRecord) {
        statusInfo.code = 'M';
        
        // Handle cross-midnight out record from the next day if missing today
        if (!outRecord) {
          const dateParts = date.split('-');
          const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          const nextDay = new Date(dateObj.getTime() + 86400000);
          const nextDayStr = [
                 nextDay.getFullYear(),
                 String(nextDay.getMonth() + 1).padStart(2, '0'),
                 String(nextDay.getDate()).padStart(2, '0')
          ].join('-');
          const nextDayOut = empAttendance.find(a => a.date === nextDayStr && a.type === 'out');
          const nextDayIn = empAttendance.find(a => a.date === nextDayStr && a.type === 'in');
          if (nextDayOut && !nextDayIn) {
            outRecord = nextDayOut;
          }
        }

        if (outRecord) {
          // Calculate duration between inRecord.time and outRecord.time
          let inParts = inRecord.time.split(/[:.]/);
          let outParts = outRecord.time.split(/[:.]/);
          if (inParts.length >= 2 && outParts.length >= 2) {
             let inH = parseInt(inParts[0]), inM = parseInt(inParts[1]);
             let outH = parseInt(outParts[0]), outM = parseInt(outParts[1]);
             let durationH = outH - inH + (outM - inM) / 60;
             if (durationH < 0) durationH += 24; // Cross midnight
             statusInfo.hours = Number(durationH.toFixed(2));
          }
          statusInfo.onlyIn = false;
        } else {
          // Only 'in' record
          statusInfo.hours = 6;
          statusInfo.onlyIn = true;
          statusInfo.bgColor = 'bg-yellow-200 dark:bg-yellow-900/50';
        }
      } else if (outRecord) {
         // Check if this outRecord belongs to yesterday's inRecord.
         // If it does, we shouldn't mark it as 'M' today.
         const dateParts = date.split('-');
         const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
         const prevDay = new Date(dateObj.getTime() - 86400000);
         const prevDayStr = [
             prevDay.getFullYear(),
             String(prevDay.getMonth() + 1).padStart(2, '0'),
             String(prevDay.getDate()).padStart(2, '0')
         ].join('-');
         
         const prevDayIn = empAttendance.find(a => a.date === prevDayStr && a.type === 'in');
         if (prevDayIn) {
             statusInfo.code = '-'; // Belongs to yesterday's shift
         } else {
             statusInfo.code = 'M';
         }
      }
      
      attendanceMap[date] = statusInfo;
      totalHoursCount += statusInfo.hours;
    });
    
    return {
      nama: emp.name,
      nip: emp.nip,
      totalHours: Number(totalHoursCount.toFixed(2)) + " jam",
      attendance: attendanceMap
    };
  });

  const displayBulanan = bulananData.length > 0 ? bulananData : [
    { nama: "Admin User", nip: "123456", totalHours: "120 jam", attendance: { [firstDayOfMonth]: "M", [format(new Date(today.getFullYear(), today.getMonth(), 2), 'yyyy-MM-dd')]: "M", [format(new Date(today.getFullYear(), today.getMonth(), 3), 'yyyy-MM-dd')]: "S" } },
    { nama: "Regular User", nip: "654321", totalHours: "105 jam", attendance: { [firstDayOfMonth]: "M", [format(new Date(today.getFullYear(), today.getMonth(), 2), 'yyyy-MM-dd')]: "C", [format(new Date(today.getFullYear(), today.getMonth(), 3), 'yyyy-MM-dd')]: "M" } }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'M': return 'text-emerald-600 font-medium';
      case 'C': return 'text-amber-600 font-medium';
      case 'S': return 'text-blue-600 font-medium';
      case 'D': return 'text-purple-600 font-medium';
      case 'I': return 'text-indigo-600 font-medium';
      case 'P': return 'text-rose-500 font-medium animate-pulse';
      default: return 'text-slate-400';
    }
  };

  // State for Analisa Data Filter
  const [selectedMonth, setSelectedMonth] = useState(getServerTime().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(getServerTime().getFullYear().toString());
  
  const filteredAttendance = useMemo(() => {
    return attendanceData.filter(a => {
      const date = new Date(a.date);
      return date.getMonth().toString() === selectedMonth && date.getFullYear().toString() === selectedYear;
    });
  }, [attendanceData, selectedMonth, selectedYear]);

  const handleApplyFilter = () => {
    // Redundant now, handled by useMemo, but keeping it for button compatibility
  };


  const {
    trenData,
    performaUnitData,
    distribusiStatusData,
    analisaKeterlambatanData,
    earlyBirds,
    frequentLate,
    earlyRunners
  } = useMemo(() => {
    const trenData = dates.map(date => {
      const dayAtt = filteredAttendance.filter(a => a.date === date);
      let hadir = 0;
      let terlambat = 0;
      
      dayAtt.forEach(a => {
        if (a.type === 'in') {
          const t = parseTime(a.time);
          const empUnit = employees.find(e => e.nip === a.nip)?.unit;
          const shift = getShiftForTime(t, empUnit);
          if (t <= shift.start + shift.tolerance) {
            hadir++;
          } else {
            terlambat++;
          }
        }
      });
      
      return {
        date: new Date(date).getDate().toString(),
        hadir,
        terlambat
      };
    });

    // Performa Unit Kerja
    const unitMap: Record<string, { total: number, hadir: number }> = {};
    const expectedWorkDays = dates.filter(d => new Date(d).getDay() !== 0).length; // Exclude Sundays for a more accurate total
    
    employees.forEach(emp => {
      const unit = emp.unit || 'Lainnya';
      if (!unitMap[unit]) unitMap[unit] = { total: 0, hadir: 0 };
      
      const empAtt = filteredAttendance.filter(a => a.nip === emp.nip && a.type === 'in');
      unitMap[unit].total += expectedWorkDays;
      unitMap[unit].hadir += empAtt.length;
    });

    const performaUnitData = Object.keys(unitMap).map(unit => ({
      name: unit,
      rate: unitMap[unit].total > 0 ? Math.min(100, Math.round((unitMap[unit].hadir / unitMap[unit].total) * 100)) : 0
    })).sort((a, b) => b.rate - a.rate).slice(0, 7); // Top 7

    // Distribusi Status Kehadiran (Group by Week)
    const weeks = [
      { name: 'Minggu 1', dates: dates.slice(0, 7) },
      { name: 'Minggu 2', dates: dates.slice(7, 14) },
      { name: 'Minggu 3', dates: dates.slice(14, 21) },
      { name: 'Minggu 4', dates: dates.slice(21, 31) }
    ].filter(w => w.dates.length > 0);

    const distribusiStatusData = weeks.map(week => {
      const weekAtt = filteredAttendance.filter(a => week.dates.includes(a.date));
      const totalInWeek = employees.length * week.dates.length;
      const hadir = weekAtt.filter(a => a.type === 'in').length;
      const cuti = weekAtt.filter(a => a.type === 'Cuti' || a.type === 'cuti').length;
      const sakit = weekAtt.filter(a => a.type === 'sakit' || a.type === 'Sakit').length;
      const dinas = weekAtt.filter(a => a.type === 'izin' || a.type === 'Izin').length;
      
      return {
        week: week.name,
        hadir: totalInWeek > 0 ? Math.round((hadir / totalInWeek) * 100) : 0,
        cuti: totalInWeek > 0 ? Math.round((cuti / totalInWeek) * 100) : 0,
        sakit: totalInWeek > 0 ? Math.round((sakit / totalInWeek) * 100) : 0,
        dinas: totalInWeek > 0 ? Math.round((dinas / totalInWeek) * 100) : 0
      };
    });

    // Analisa Keterlambatan
    const analisaKeterlambatanData = weeks.map(week => {
      let m0_15 = 0, m16_30 = 0, m30_60 = 0, m60plus = 0;

      filteredAttendance.forEach(a => {
        if (week.dates.includes(a.date) && a.type === 'in') {
          const t = parseTime(a.time);
          const empUnit = employees.find(e => e.nip === a.nip)?.unit;
          const shift = getShiftForTime(t, empUnit);
          
          if (t > shift.start + shift.tolerance) {
            let lateMinutes = t - shift.start;
            if (lateMinutes < 0) lateMinutes += 1440; // handled midnight cross
            
            if (lateMinutes <= 15) m0_15++;
            else if (lateMinutes <= 30) m16_30++;
            else if (lateMinutes <= 60) m30_60++;
            else m60plus++;
          }
        }
      });

      return {
        week: week.name,
        '0-15m': m0_15,
        '16-30m': m16_30,
        '30-60m': m30_60,
        '>60m': m60plus
      };
    });

    // Early Birds, Frequent Late, Early Runners
    const empStats: Record<string, { name: string, dept: string, inTimes: number[], lateCount: number, earlyOutCount: number }> = {};
    
    employees.forEach(emp => {
      const dept = typeof emp.location === 'object' && emp.location !== null ? emp.location.address || JSON.stringify(emp.location) : emp.location || 'Lainnya';
      empStats[emp.nip] = { name: emp.name, dept, inTimes: [], lateCount: 0, earlyOutCount: 0 };
    });

    filteredAttendance.forEach(a => {
      if (!empStats[a.nip]) return;
      
      const t = parseTime(a.time);
      const empUnit = employees.find(e => e.nip === a.nip)?.unit;
      const shift = getShiftForTime(t, empUnit);

      if (a.type === 'in') {
        empStats[a.nip].inTimes.push(t - shift.start); // store difference for early birds
        if (t > shift.start + shift.tolerance) {
          empStats[a.nip].lateCount++;
        }
      } else if (a.type === 'out') {
        // Here we could be checking if t < shift.end
        // But let's handle wrap around logic simply:
        let endT = shift.end;
        if (endT < shift.start) endT += 1440;
        let myT = t;
        if (myT < shift.start) myT += 1440;
        
        if (myT < endT) { 
          empStats[a.nip].earlyOutCount++;
        }
      }
    });

    const earlyBirds = Object.values(empStats)
      .filter(e => e.inTimes.length > 0)
      .map(e => {
        // Average difference from shift start. Negative = early.
        const avgDifference = e.inTimes.reduce((sum, val) => sum + val, 0) / e.inTimes.length;
        // if avgDifference is negative, then say "H-10m" maybe? But let's just sort by most negative.
        return { ...e, avgDifference, time: avgDifference <= 0 ? `-${Math.abs(Math.floor(avgDifference))}m` : `+${Math.floor(avgDifference)}m` };
      })
      .sort((a, b) => a.avgDifference - b.avgDifference)
      .slice(0, 5);

    const frequentLate = Object.values(empStats)
      .filter(e => e.lateCount > 0)
      .sort((a, b) => b.lateCount - a.lateCount)
      .map(e => ({ ...e, count: `${e.lateCount}x` }))
      .slice(0, 5);

    const earlyRunners = Object.values(empStats)
      .filter(e => e.earlyOutCount > 0)
      .sort((a, b) => b.earlyOutCount - a.earlyOutCount)
      .map(e => ({ ...e, count: `${e.earlyOutCount}x` }))
      .slice(0, 5);

    return {
      trenData,
      performaUnitData: performaUnitData.length > 0 ? performaUnitData : [{ name: 'Belum ada data', rate: 0 }],
      distribusiStatusData: distribusiStatusData.length > 0 ? distribusiStatusData : [{ week: 'Minggu 1', hadir: 0, cuti: 0, sakit: 0, dinas: 0 }],
      analisaKeterlambatanData: analisaKeterlambatanData.length > 0 ? analisaKeterlambatanData : [{ week: 'Minggu 1', '0-15m': 0, '16-30m': 0, '30-60m': 0, '>60m': 0 }],
      earlyBirds: earlyBirds.length > 0 ? earlyBirds : [{ name: "Belum ada data", dept: "-", time: "-" }],
      frequentLate: frequentLate.length > 0 ? frequentLate : [{ name: "Belum ada data", dept: "-", count: "0x" }],
      earlyRunners: earlyRunners.length > 0 ? earlyRunners : [{ name: "Belum ada data", dept: "-", count: "0x" }]
    };
  }, [dates, filteredAttendance, employees]);

  // State for Hari Libur
  const [holidays, setHolidays] = useState<{id: string, date: string, name: string}[]>([]);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const response = await fetch('/api/holidays');
        if (response.ok) {
          const data = await response.json();
          setHolidays(data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        }
      } catch (error) {
        console.error('Failed to fetch holidays:', error);
      }
    };
    fetchHolidays();
  }, []);

  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");

  const handleAddHoliday = async () => {
    if (newHolidayDate && newHolidayName) {
      const newHoliday = { date: newHolidayDate, name: newHolidayName };
      try {
        const response = await fetch('/api/holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newHoliday)
        });
        if (response.ok) {
          const refreshRes = await fetch('/api/holidays');
          if (refreshRes.ok) {
              const data = await refreshRes.json();
              setHolidays(data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
          }
          setNewHolidayDate("");
          setNewHolidayName("");
          setIsAddHolidayOpen(false);
        }
      } catch (error) {
        console.error('Error saving holiday:', error);
      }
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      const response = await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setHolidays(holidays.filter(h => h.id !== id));
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
    }
  };

  const handleDownloadTemplate = () => {
    // Create a simple CSV content for the template
    const csvContent = "data:text/csv;charset=utf-8,Tanggal (YYYY-MM-DD),Keterangan\n2026-01-01,Tahun Baru Masehi\n2026-08-17,Hari Kemerdekaan RI";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_hari_libur.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // State for Pengumuman
  const [announcements, setAnnouncements] = useState<{id: string, title: string, content: string, date: string, expiryDate: string, isActive: boolean}[]>([]);
  const [isAddAnnouncementOpen, setIsAddAnnouncementOpen] = useState(false);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
  const [newAnnouncementContent, setNewAnnouncementContent] = useState("");
  const [newAnnouncementExpiry, setNewAnnouncementExpiry] = useState("");

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleAddAnnouncement = async () => {
    if (newAnnouncementTitle && newAnnouncementContent && newAnnouncementExpiry) {
      const newAnn = {
        id: Date.now().toString(),
        title: newAnnouncementTitle,
        content: newAnnouncementContent,
        date: getServerTime().toISOString().split('T')[0],
        expiryDate: newAnnouncementExpiry,
        isActive: true
      };
      setAnnouncements([newAnn, ...announcements]); // Optimistic update
      
      try {
        await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAnn)
        });
        fetchAnnouncements();
      } catch(e) {
        console.error(e);
      }

      setNewAnnouncementTitle("");
      setNewAnnouncementContent("");
      setNewAnnouncementExpiry("");
      setIsAddAnnouncementOpen(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setAnnouncements(announcements.filter(a => a.id !== id)); // optimistically delete
    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete announcement', e);
    }
  };

  const handleToggleAnnouncementStatus = async (id: string) => {
    const ann = announcements.find(a => a.id === id);
    if (!ann) return;
    const newStatus = !ann.isActive;
    
    setAnnouncements(announcements.map(a => a.id === id ? { ...a, isActive: newStatus } : a)); // optimistically toggle
    
    try {
      await fetch(`/api/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus })
      });
    } catch (e) {
      console.error('Failed to update announcement', e);
    }
  };

  const pendingRequests = useMemo(() => {
    return attendanceData.filter(a => a.status === 'pending');
  }, [attendanceData]);

  const handleApproveLeave = async (id: string, type: string) => {
    let finalStatus = 'Hadir'; // fallback
    if (type === 'izin') finalStatus = 'izin';
    else if (type === 'sakit') finalStatus = 'Sakit';
    else if (type === 'Cuti' || type === 'cuti') finalStatus = 'Cuti';
    else if (type === 'dinas_luar') finalStatus = 'Dinas Luar';
    
    try {
      const response = await fetch(`/api/attendance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: finalStatus })
      });
      if (response.ok) {
        toast.success('Permintaan disetujui');
        // Refresh attendance data
        const res = await fetch('/api/attendance');
        if (res.ok) setAttendanceData(await res.json());
      }
    } catch (error) {
      toast.error('Gagal menyetujui permintaan');
    }
  };

  const handleRejectLeave = async (id: string) => {
    try {
      const response = await fetch(`/api/attendance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Ditolak' })
      });
      if (response.ok) {
        toast.success('Permintaan ditolak');
        // Refresh attendance data
        const res = await fetch('/api/attendance');
        if (res.ok) setAttendanceData(await res.json());
      }
    } catch (error) {
      toast.error('Gagal menolak permintaan');
    }
  };

  const addSignature = (worksheet: ExcelJS.Worksheet, startRow: number, colIndex: number) => {
    worksheet.getCell(startRow + 2, colIndex).value = `Kepala ${puskesmasName}`;
    worksheet.getCell(startRow + 2, colIndex).alignment = { horizontal: 'center' };
    
    worksheet.getCell(startRow + 6, colIndex).value = `(${pimpinanName})`;
    worksheet.getCell(startRow + 6, colIndex).alignment = { horizontal: 'center' };
  };

  const handleDownloadHarian = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Absensi Harian');

    // Add Title
    worksheet.mergeCells('A1:G1');
    worksheet.getCell('A1').value = `Data Absensi Harian - ${puskesmasName}`;
    worksheet.getCell('A1').font = { size: 14, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add Headers
    worksheet.getRow(3).values = ['Nama Karyawan', 'NIP', 'Kantor', 'Shift', 'Status', 'Jam Masuk', 'Jam Keluar', 'Keterangan'];
    worksheet.getRow(3).font = { bold: true };

    // Add Data
    displayHarian.forEach((row, index) => {
      worksheet.addRow([row.nama, row.nip, row.kantor, row.shift, row.status, row.jamMasuk, row.jamKeluar, row.keterangan]);
    });

    // Add Signature
    const lastRow = worksheet.lastRow ? worksheet.lastRow.number : 3;
    addSignature(worksheet, lastRow, 6); // Signature on the 6th column (Jam Masuk)

    // Adjust column widths
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    worksheet.getColumn(1).width = 25; // Nama Karyawan

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Absensi_Harian_${format(getServerTime(), 'yyyy-MM-dd')}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadBulanan = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Absensi Bulanan');

    // Add Title
    worksheet.mergeCells(1, 1, 1, dates.length + 3);
    worksheet.getCell('A1').value = `Data Absensi Bulanan (${startDate} s/d ${endDate}) - ${puskesmasName}`;
    worksheet.getCell('A1').font = { size: 14, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add Headers
    const headerRow = ['Nama Karyawan', 'NIP', 'Total Jam Kerja'];
    dates.forEach(date => {
      headerRow.push(new Date(date).getDate().toString());
    });
    worksheet.getRow(3).values = headerRow;
    worksheet.getRow(3).font = { bold: true };
    worksheet.getRow(3).alignment = { horizontal: 'center' };

    // Add Data
    displayBulanan.forEach((emp) => {
      const rowData = [emp.nama, emp.nip, emp.totalHours];
      dates.forEach(date => {
        const attInfo = emp.attendance[date as keyof typeof emp.attendance];
        if (typeof attInfo === 'string') {
           rowData.push(attInfo || '-');
        } else if (attInfo) {
           rowData.push((attInfo as any).code || '-');
        } else {
           rowData.push('-');
        }
      });
      const row = worksheet.addRow(rowData);
      
      // Center align the attendance status
      for (let i = 4; i <= dates.length + 3; i++) {
        row.getCell(i).alignment = { horizontal: 'center' };
      }
    });

    // Add Legend
    const lastRow = worksheet.lastRow ? worksheet.lastRow.number : 3;
    worksheet.getCell(lastRow + 2, 1).value = 'Keterangan:';
    worksheet.getCell(lastRow + 3, 1).value = 'M = Masuk/Hadir';
    worksheet.getCell(lastRow + 4, 1).value = 'C = Cuti';
    worksheet.getCell(lastRow + 5, 1).value = 'S = Sakit';
    worksheet.getCell(lastRow + 6, 1).value = 'D = Dinas Luar';

    // Add Signature
    // Place signature on the right side of the table
    const signatureCol = Math.max(4, dates.length + 1);
    addSignature(worksheet, lastRow, signatureCol);

    // Adjust column widths
    worksheet.getColumn(1).width = 25; // Nama Karyawan
    worksheet.getColumn(2).width = 15; // NIP
    worksheet.getColumn(3).width = 15; // Total Jam Kerja
    for (let i = 4; i <= dates.length + 3; i++) {
      worksheet.getColumn(i).width = 5; // Date columns
    }

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Absensi_Bulanan_${startDate}_${endDate}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen Absensi</h1>
          <p className="text-sm text-slate-500">Kelola data absensi, persetujuan izin, dan hari libur.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
          onClick={fetchAttendance}
        >
          <RefreshCw className="h-4 w-4" />
          Perbarui Data
        </Button>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="hidden">
          <TabsTrigger value="harian">Harian</TabsTrigger>
          <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
          <TabsTrigger value="analisa">Analisa Data</TabsTrigger>
          <TabsTrigger value="persetujuan" className="relative">
            Persetujuan
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="holidays">Hari Libur</TabsTrigger>
          <TabsTrigger value="pengumuman">Pengumuman</TabsTrigger>
        </TabsList>
        <TabsContent value="harian" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Data Absensi Harian</CardTitle>
              <Button variant="outline" className="flex items-center gap-2" onClick={handleDownloadHarian}>
                <Download className="h-4 w-4" />
                Ekspor Excel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input type="date" className="w-auto" />
                <Input placeholder="Cari Nama Karyawan..." className="max-w-sm" />
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Karyawan</TableHead>
                      <TableHead>NIP</TableHead>
                      <TableHead>Kantor</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Jam Masuk</TableHead>
                      <TableHead>Jam Keluar</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayHarian.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.nama}</TableCell>
                        <TableCell>{row.nip}</TableCell>
                        <TableCell>{row.kantor}</TableCell>
                        <TableCell>{row.shift}</TableCell>
                        <TableCell><span className={getStatusColor(row.status === "Hadir" ? "M" : row.status)}>{row.status}</span></TableCell>
                        <TableCell>{row.jamMasuk}</TableCell>
                        <TableCell>{row.jamKeluar}</TableCell>
                        <TableCell>{row.keterangan}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulanan" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Data Absensi Bulanan</CardTitle>
              <Button variant="outline" className="flex items-center gap-2" onClick={handleDownloadBulanan}>
                <Download className="h-4 w-4" />
                Ekspor Excel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4 items-end">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Tanggal Awal</label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-auto" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Tanggal Akhir</label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-auto" 
                  />
                </div>
                <Button className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Tampilkan
                </Button>
              </div>
              
              <div className="rounded-md border overflow-x-auto relative">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-slate-50 z-20 border-r min-w-[150px]">Nama Karyawan</TableHead>
                      <TableHead className="sticky left-[150px] bg-slate-50 z-20 border-r min-w-[100px]">NIP</TableHead>
                      <TableHead className="sticky left-[250px] bg-slate-50 z-20 border-r min-w-[120px]">Total Jam Kerja</TableHead>
                      {dates.map(date => {
                        const d = new Date(date);
                        return (
                          <TableHead key={date} className="text-center px-2 min-w-[40px] border-r">
                            {d.getDate()}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayBulanan.map(emp => (
                      <TableRow key={emp.nip}>
                        <TableCell className="sticky left-0 bg-white z-10 border-r font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{emp.nama}</TableCell>
                        <TableCell className="sticky left-[150px] bg-white z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{emp.nip}</TableCell>
                        <TableCell className="sticky left-[250px] bg-white z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{emp.totalHours}</TableCell>
                        {dates.map(date => {
                          let attInfo = emp.attendance[date as keyof typeof emp.attendance];
                          if (typeof attInfo === 'string') {
                            attInfo = { code: attInfo, hours: 0, onlyIn: false, bgColor: '' };
                          } else if (!attInfo) {
                            attInfo = { code: '-', hours: 0, onlyIn: false, bgColor: '' };
                          }
                          const { code, bgColor, onlyIn } = attInfo;
                          
                          return (
                            <TableCell key={date} className={`text-center px-2 border-r ${bgColor || ''} ${onlyIn ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}>
                               <span className={getStatusColor(code)}>{code}</span>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1"><span className="font-bold text-emerald-600">M</span> = Masuk/Hadir</span>
                <span className="flex items-center gap-1"><span className="font-bold text-amber-600">C</span> = Cuti</span>
                <span className="flex items-center gap-1"><span className="font-bold text-blue-600">S</span> = Sakit</span>
                <span className="flex items-center gap-1"><span className="font-bold text-indigo-600">I</span> = Izin Pribadi</span>
                <span className="flex items-center gap-1"><span className="font-bold text-purple-600">D</span> = Dinas Luar</span>
                <span className="flex items-center gap-1"><span className="font-bold text-rose-500">P</span> = Menunggu Persetujuan</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analisa" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Sidebar: Filters */}
            <div className="w-full md:w-64 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Filter Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bulan</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Bulan" />
                      </SelectTrigger>
                      <SelectContent>
                        {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((month, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tahun</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Tahun" />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026].map((year) => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleApplyFilter}>Terapkan Filter</Button>
                </CardContent>
              </Card>
            </div>

            {/* Main Content: Dashboard */}
            <div className="flex-1 space-y-6">
              {/* Top Row: Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600 mb-1">Total Karyawan Aktif</p>
                        <h3 className="text-3xl font-bold text-slate-900">{employees.length}</h3>
                      </div>
                      <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-emerald-600 mb-1">Tingkat Kehadiran</p>
                        <h3 className="text-3xl font-bold text-slate-900">{employees.length > 0 ? ((filteredAttendance.filter(a => a.type === 'in').length / (employees.length * 20)) * 100).toFixed(1) : 0}%</h3>
                      </div>
                      <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-rose-600 mb-1">Tingkat Keterlambatan</p>
                        <h3 className="text-3xl font-bold text-slate-900">{filteredAttendance.filter(a => a.type === 'in').length > 0 ? ((filteredAttendance.filter(a => a.type === 'in' && a.time > '08:00').length / filteredAttendance.filter(a => a.type === 'in').length) * 100).toFixed(1) : 0}%</h3>
                      </div>
                      <div className="h-12 w-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                        <Clock className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-amber-600 mb-1">Rata-rata Hadir Harian</p>
                        <h3 className="text-3xl font-bold text-slate-900">{Math.round(filteredAttendance.filter(a => a.type === 'in').length / 30)} <span className="text-sm font-normal text-slate-500">Org/Hari</span></h3>
                      </div>
                      <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Middle Row 1: Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tren Absensi (Hadir & Terlambat)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trenData}>
                          <defs>
                            <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorTerlambat" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                          <Area type="monotone" dataKey="hadir" name="Hadir Tepat Waktu" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHadir)" />
                          <Area type="monotone" dataKey="terlambat" name="Terlambat" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorTerlambat)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Performa Unit Kerja (Kehadiran %)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performaUnitData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorRate" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={90} />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="rate" name="Tingkat Kehadiran (%)" fill="url(#colorRate)" radius={[0, 4, 4, 0]} barSize={24}>
                            <LabelList dataKey="rate" position="right" fontSize={11} fill="#64748b" formatter={(value: number) => `${value}%`} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Middle Row 2: Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distribusi Status Kehadiran</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={distribusiStatusData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="week" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                          <Line type="monotone" dataKey="hadir" name="Hadir (%)" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                          <Line type="monotone" dataKey="cuti" name="Cuti (%)" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
                          <Line type="monotone" dataKey="sakit" name="Sakit (%)" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} />
                          <Line type="monotone" dataKey="dinas" name="Dinas Luar (%)" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Analisa Keterlambatan (Durasi)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analisaKeterlambatanData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="week" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="0-15m" stackId="a" fill="#fbbf24" radius={[0, 0, 4, 4]} />
                          <Bar dataKey="16-30m" stackId="a" fill="#f59e0b" />
                          <Bar dataKey="30-60m" stackId="a" fill="#ea580c" />
                          <Bar dataKey=">60m" stackId="a" fill="#b91c1c" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row: Wall of Fame */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-emerald-200 shadow-sm">
                  <CardHeader className="bg-emerald-50 border-b border-emerald-100 pb-4">
                    <CardTitle className="text-base flex items-center text-emerald-800">
                      <Award className="h-5 w-5 mr-2 text-emerald-600" />
                      Early Birds (Top 5)
                    </CardTitle>
                    <p className="text-xs text-emerald-600/80">Kedatangan paling konsisten awal</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-emerald-100">
                      {earlyBirds.map((person, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-emerald-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{person.name}</p>
                              <p className="text-xs text-slate-500">{person.dept}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-emerald-600">{person.time}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-rose-200 shadow-sm">
                  <CardHeader className="bg-rose-50 border-b border-rose-100 pb-4">
                    <CardTitle className="text-base flex items-center text-rose-800">
                      <AlertTriangle className="h-5 w-5 mr-2 text-rose-600" />
                      Frequent Late
                    </CardTitle>
                    <p className="text-xs text-rose-600/80">Perlu peningkatan kedisiplinan</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-rose-100">
                      {frequentLate.map((person, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-rose-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{person.name}</p>
                              <p className="text-xs text-slate-500">{person.dept}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-rose-600">{person.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-amber-200 shadow-sm">
                  <CardHeader className="bg-amber-50 border-b border-amber-100 pb-4">
                    <CardTitle className="text-base flex items-center text-amber-800">
                      <Timer className="h-5 w-5 mr-2 text-amber-600" />
                      Early Runners
                    </CardTitle>
                    <p className="text-xs text-amber-600/80">Pulang lebih awal dari jadwal</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-amber-100">
                      {earlyRunners.map((person, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-amber-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{person.name}</p>
                              <p className="text-xs text-slate-500">{person.dept}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-amber-600">{person.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="persetujuan">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Permintaan Persetujuan</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-10 text-slate-500">Belum ada permintaan izin yang perlu disetujui.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Karyawan</TableHead>
                        <TableHead>NIP</TableHead>
                        <TableHead>Jenis Izin</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.name}</TableCell>
                          <TableCell>{req.nip}</TableCell>
                          <TableCell className="capitalize">{req.type.replace('_', ' ')}</TableCell>
                          <TableCell>
                            {req.date} {(typeof req.location === 'object' && req.location !== null && req.location.endDate && req.location.endDate !== req.date) ? `s/d ${req.location.endDate}` : ""}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            <div className="truncate" title={typeof req.location === 'object' && req.location !== null ? req.location.reason : req.location}>
                              {typeof req.location === 'object' && req.location !== null ? req.location.reason : req.location}
                            </div>
                            {req.photoUrl && req.photoUrl !== 'Image too large to save in spreadsheet' && (
                              <div className="mt-1">
                                <a href={req.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Lihat Lampiran</a>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                                onClick={() => handleApproveLeave(req.id, req.type)}
                              >
                                <Check className="h-4 w-4" />
                                Setujui
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-1"
                                onClick={() => handleRejectLeave(req.id)}
                              >
                                <X className="h-4 w-4" />
                                Tolak
                              </Button>
                            </div>
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

        <TabsContent value="holidays">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Daftar Hari Libur Nasional</CardTitle>
              <div className="flex gap-2">
                <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                  <DialogTrigger render={
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Import Excel
                    </Button>
                  } />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Data Hari Libur</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Format File</Label>
                        <p className="text-sm text-slate-500">
                          Pastikan file Excel/CSV Anda sesuai dengan format yang ditentukan. Anda dapat mengunduh contoh format di bawah ini.
                        </p>
                        <Button variant="secondary" onClick={handleDownloadTemplate} className="w-full flex items-center justify-center gap-2">
                          <Download className="h-4 w-4" />
                          Unduh Contoh Format
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="file-upload">Upload File</Label>
                        <Input id="file-upload" type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsImportOpen(false)}>Batal</Button>
                      <Button onClick={() => setIsImportOpen(false)}>Import Data</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAddHolidayOpen} onOpenChange={setIsAddHolidayOpen}>
                  <DialogTrigger render={
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Tambah Hari Libur
                    </Button>
                  } />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Hari Libur Nasional</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="holiday-date">Tanggal</Label>
                        <Input 
                          id="holiday-date" 
                          type="date" 
                          value={newHolidayDate}
                          onChange={(e) => setNewHolidayDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="holiday-name">Keterangan</Label>
                        <Input 
                          id="holiday-name" 
                          placeholder="Contoh: Idul Fitri" 
                          value={newHolidayName}
                          onChange={(e) => setNewHolidayName(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddHolidayOpen(false)}>Batal</Button>
                      <Button onClick={handleAddHoliday} disabled={!newHolidayDate || !newHolidayName}>Simpan</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {holidays.length === 0 ? (
                <div className="text-center py-10 text-slate-500">Belum ada data hari libur.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Tanggal</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead className="text-right w-[100px]">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays.map((holiday) => (
                        <TableRow key={holiday.id}>
                          <TableCell className="font-medium">
                            {new Date(holiday.date).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>{holiday.name}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteHoliday(holiday.id)}
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

        <TabsContent value="pengumuman">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pengumuman</CardTitle>
              <Dialog open={isAddAnnouncementOpen} onOpenChange={setIsAddAnnouncementOpen}>
                <DialogTrigger render={
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Buat Pengumuman
                  </Button>
                } />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buat Pengumuman Baru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="announcement-title">Judul Pengumuman</Label>
                      <Input 
                        id="announcement-title" 
                        placeholder="Contoh: Rapat Evaluasi Bulanan" 
                        value={newAnnouncementTitle}
                        onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="announcement-content">Isi Pengumuman</Label>
                      <Input 
                        id="announcement-content" 
                        placeholder="Detail pengumuman..." 
                        value={newAnnouncementContent}
                        onChange={(e) => setNewAnnouncementContent(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="announcement-expiry">Tanggal Kadaluarsa</Label>
                      <Input 
                        id="announcement-expiry" 
                        type="date" 
                        value={newAnnouncementExpiry}
                        onChange={(e) => setNewAnnouncementExpiry(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddAnnouncementOpen(false)}>Batal</Button>
                    <Button onClick={handleAddAnnouncement} disabled={!newAnnouncementTitle || !newAnnouncementContent || !newAnnouncementExpiry}>Simpan</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-10 text-slate-500">Belum ada pengumuman.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal Dibuat</TableHead>
                        <TableHead>Judul</TableHead>
                        <TableHead>Isi</TableHead>
                        <TableHead>Kadaluarsa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {announcements.map((announcement) => (
                        <TableRow key={announcement.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(announcement.date).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell className="font-medium">{announcement.title}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{announcement.content}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(announcement.expiryDate).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${announcement.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                              {announcement.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleToggleAnnouncementStatus(announcement.id)}
                              >
                                {announcement.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteAnnouncement(announcement.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
