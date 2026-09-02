import { getServerTime } from '@/lib/time';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Camera, CheckCircle2 } from 'lucide-react';
import { checkAndFireAlarm } from '@/utils/alarm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import { format } from 'date-fns';

const resolveActiveShifts = (shifts: any[], user?: any, employees: any[] = []) => {
  const fullUser = user?.nip ? employees.find(e => e.nip === user.nip) || user : user;
  const activeShiftsRaw = shifts.filter(s => s.isActive);
  const specificShifts = activeShiftsRaw.filter(s => s.unit && fullUser && s.unit === fullUser.unit);
  const generalShifts = activeShiftsRaw.filter(s => !s.unit || s.unit === 'none' || s.unit === '');
  
  if (specificShifts.length > 0) {
    return specificShifts;
  }
  return generalShifts;
};

export default function UserHome() {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locations, setLocations] = useState<{ id: string; desa: string; kecamatan: string; kabupaten: string; coordinates: string; radius: number }[]>([]);
  const [isLocating, setIsLocating] = useState(true);
  const [canRefresh, setCanRefresh] = useState(false);
  const [isAbsenting, setIsAbsenting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWithinRange, setIsWithinRange] = useState(false);
  const [address, setAddress] = useState<string>('');

  const [user, setUser] = useState<{name: string, nip: string, office: string, office2?: string, office3?: string, unit?: string} | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [shiftEndTime, setShiftEndTime] = useState<string | null>(null);
  const [canCheckOut, setCanCheckOut] = useState(false);
  const [shifts, setShifts] = useState<any[]>([]);
  const [leaveType, setLeaveType] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [nextShift, setNextShift] = useState<any>(null);
  const [checkInCountdown, setCheckInCountdown] = useState<string>('');
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [isTambahJaga, setIsTambahJaga] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isHolidayRestricted, setIsHolidayRestricted] = useState(false);
  const [selectedFriendNip, setSelectedFriendNip] = useState<string>('');
  const [replacingFriendNip, setReplacingFriendNip] = useState<string | null>(localStorage.getItem('replacingFriendNip'));

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetch('/api/attendance/auto-checkout-check').catch(() => {});
        
        const [locRes, setRes, attRes, shiftRes, annRes, empRes, holRes] = await Promise.all([
          fetch('/api/locations'),
          fetch('/api/settings'),
          fetch('/api/attendance'),
          fetch('/api/shifts'),
          fetch('/api/announcements'),
          fetch('/api/employees'),
          fetch('/api/holidays')
        ]);
        
        if (locRes.ok) {
          const data = await locRes.json();
          setLocations(data);
        }
        if (empRes && empRes.ok) {
          const data = await empRes.json();
          setEmployees(data);
        }
        if (setRes.ok) {
          const data = await setRes.json();
          setSettings(data);
        }
        if (shiftRes.ok) {
          const data = await shiftRes.json();
          setShifts(data);
        }
        if (holRes && holRes.ok) {
          const data = await holRes.json();
          setHolidays(data);
        }
        if (annRes.ok) {
          const data = await annRes.json();
          setAnnouncements(data.filter((a: any) => a.isActive));
        }
        if (attRes.ok) {
          const data = await attRes.json();
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          const today = format(getServerTime(), 'yyyy-MM-dd');
          
          let nipToCheck = userData.nip;
          const currentReplacingNip = localStorage.getItem('replacingFriendNip');

          if (currentReplacingNip) {
            const friendAtt = data.filter((a: any) => a.nip === currentReplacingNip && a.date === today);
            const friendOut = friendAtt.find((a: any) => a.type === 'out');
            if (friendOut) {
              localStorage.removeItem('replacingFriendNip');
              setReplacingFriendNip(null);
            } else {
              nipToCheck = currentReplacingNip;
            }
          }

          const userAttToday = data.filter((a: any) => {
            if (a.nip !== nipToCheck) return false;
            if (a.date === today) return true;
            if (['izin', 'sakit', 'Cuti', 'dinas_luar', 'pending'].includes(a.type) || ['izin', 'Sakit', 'Cuti', 'Dinas Luar', 'pending'].includes(a.status)) {
              if (typeof a.location === 'object' && a.location !== null && a.location.endDate) {
                 const recDate = new Date(a.date);
                 const targetDate = new Date(today);
                 const endDate = new Date(a.location.endDate);
                 recDate.setHours(0, 0, 0, 0);
                 targetDate.setHours(0, 0, 0, 0);
                 endDate.setHours(0, 0, 0, 0);
                 return targetDate >= recDate && targetDate <= endDate;
              }
            }
            return false;
          });
          const yesterday = format(new Date(getServerTime().getTime() - 86400000), 'yyyy-MM-dd');
          const userAttYesterday = data.filter((a: any) => a.nip === nipToCheck && a.date === yesterday);
          
          let inRecord = userAttToday.find((a: any) => a.type === 'in');
          let outRecord = userAttToday.find((a: any) => a.type === 'out');
          const leaveRecord = userAttToday.find((a: any) => ['izin', 'sakit', 'Cuti', 'dinas_luar'].includes(a.type));
          
          let checkInDateStr = today;

          // If no 'in' record today, check if yesterday has an 'in' record but NO 'out' record
          if (!inRecord) {
            const yesterdayIn = userAttYesterday.find((a: any) => a.type === 'in');
            const yesterdayOut = userAttYesterday.find((a: any) => a.type === 'out');
            if (yesterdayIn && !yesterdayOut) {
               // Possibly user is on a night shift
               inRecord = yesterdayIn;
               checkInDateStr = yesterday;
            }
          }
          
          // Store the checkin date so we know if it was yesterday
          localStorage.setItem('lastCheckInDate', checkInDateStr);
          
          if (leaveRecord) {
            setLeaveType(leaveRecord.type);
          }
          if (inRecord) {
            setHasCheckedIn(true);
            setCheckInTime(inRecord.time);
          } else {
            setHasCheckedIn(false);
            setCheckInTime(null);
          }
          if (outRecord) {
            setHasCheckedOut(true);
          } else {
            setHasCheckedOut(false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (shifts.length > 0) {
      const targetUser = (isTambahJaga && selectedFriendNip) ? employees.find(e => e.nip === selectedFriendNip) : replacingFriendNip ? employees.find(e => e.nip === replacingFriendNip) : user;
      const activeShifts = resolveActiveShifts(shifts, targetUser, employees);
      let restricted = false;

      const now = getServerTime();
      const todayStr = format(now, 'yyyy-MM-dd');
      const isSunday = now.getDay() === 0;
      const isPublicHoliday = holidays.some(h => h.date === todayStr);

      if (isSunday || isPublicHoliday) {
        const canCheckInAny = activeShifts.some(s => s.allowHolidayCheckIn);
        if (!canCheckInAny) {
          restricted = true;
        }
      }

      setIsHolidayRestricted(restricted);
    }
  }, [shifts, holidays, user, employees, isTambahJaga, selectedFriendNip, replacingFriendNip]);

  useEffect(() => {
    if (hasCheckedIn && !hasCheckedOut) {
      if (shifts.length > 0) {
        const targetUser = replacingFriendNip ? employees.find(e => e.nip === replacingFriendNip) : user;
        const activeShifts = resolveActiveShifts(shifts, targetUser, employees);
        let targetShift = activeShifts[0] || shifts[0];
        
        if (activeShifts.length > 1 && checkInTime) {
          let inHour = 0;
          let inMin = 0;
          const timeMatch = checkInTime.match(/(\d+)[.:](\d+)/);
          
          if (timeMatch) {
            inHour = parseInt(timeMatch[1], 10);
            inMin = parseInt(timeMatch[2], 10);
            
            const lowerTime = checkInTime.toLowerCase();
            if (lowerTime.includes('pm') && inHour < 12) {
              inHour += 12;
            } else if (lowerTime.includes('am') && inHour === 12) {
              inHour = 0;
            }
          }
          
          if (!isNaN(inHour) && !isNaN(inMin)) {
            const checkInMinutes = inHour * 60 + inMin;
            let minDiff = Infinity;

            activeShifts.forEach(shift => {
              const [startHour, startMin] = shift.startTime.split(':').map(Number);
              const startMinutes = startHour * 60 + startMin;
              let diff = Math.abs(checkInMinutes - startMinutes);
              if (diff > 720) diff = 1440 - diff;
              if (diff < minDiff) {
                minDiff = diff;
                targetShift = shift;
              }
            });
          }
        }

        if (targetShift) {
          const now = getServerTime();
          let adjustedEndTime = targetShift.endTime;
          
          // Use dynamic Friday/Saturday end times if configured
          if (now.getDay() === 5 && targetShift.fridayEndTime) {
            adjustedEndTime = targetShift.fridayEndTime;
          } else if (now.getDay() === 6 && targetShift.saturdayEndTime) {
            adjustedEndTime = targetShift.saturdayEndTime;
          }

          setShiftEndTime(adjustedEndTime);
          
          const [endHour, endMinute] = adjustedEndTime.split(':').map(Number);
          const [startHour] = targetShift.startTime.split(':').map(Number);
          
          let shiftEnd = getServerTime();
          shiftEnd.setHours(endHour, endMinute, 0, 0);
          
          // Handle cross-midnight shifts properly
          if (startHour > endHour) {
            // Jika jam sekarang >= jam masuk (contoh 22:00 > 20:00), maka shift berakhirmya BESOK
            // Jika jam sekarang <= jam masuk, itu berarti kita sudah berada di hari berikutnya sebelum shift selesai
            if (now.getHours() >= startHour - 2) { 
              shiftEnd.setDate(shiftEnd.getDate() + 1);
            }
          }
          
          let beforeMinutes = parseInt(targetShift.checkOutBeforeMinutes || '10');
          // If Friday/Saturday and special end time is set, use 0 minutes grace before (appear exactly at that time)
          if ((now.getDay() === 5 && targetShift.fridayEndTime) || (now.getDay() === 6 && targetShift.saturdayEndTime)) {
            beforeMinutes = 0;
          }
          
          const afterMinutes = parseInt(targetShift.checkOutAfterMinutes || '120');
          
          let minCheckOut = new Date(shiftEnd.getTime() - beforeMinutes * 60000); 
          const maxCheckOut = new Date(shiftEnd.getTime() + afterMinutes * 60000); 
          
          if (now >= minCheckOut && now <= maxCheckOut) {
            setCanCheckOut(true);
          } else {
            setCanCheckOut(false);
          }
        }
      } else {
        // Fallback if no shifts are defined
        setShiftEndTime("16:00");
        setCanCheckOut(true);
      }
    }
  }, [hasCheckedIn, hasCheckedOut, shifts, checkInTime, user, employees, replacingFriendNip]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Timer untuk Absen Masuk (jika belum absen masuk)
    if (!hasCheckedIn && shifts.length > 0) {
      const isCountdownEnabled = settings?.absensiSettings?.enableCountdown !== false;
      const targetUser = (isTambahJaga && selectedFriendNip) ? employees.find(e => e.nip === selectedFriendNip) : user;
      const activeShifts = resolveActiveShifts(shifts, targetUser, employees);
      const calculateCheckInCountdown = () => {
        if (!isCountdownEnabled) {
          setCanCheckIn(true);
          setCheckInCountdown('');
          return;
        }

        const now = getServerTime();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let upcomingShift = null;
        let minTimeDiff = Infinity;
        let upcomingShiftStart = getServerTime();

        activeShifts.forEach(shift => {
          const [startHour, startMin] = shift.startTime.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          
          let shiftStart = getServerTime();
          shiftStart.setHours(startHour, startMin, 0, 0);

          // Jika jam shift lebih kecil dari jam sekarang, asumsikan itu untuk shift yang akan datang (mungkin besok)
          // Kecuali jika selisihnya dekat (pagi ke pagi)
          let diff = startMinutes - currentMinutes;
          
          // Memperhitungkan pergantian hari / shift selanjutnya
          if (diff < -120) { 
             // asumsikan sudah lewat 2 jam, maka shift ini untuk besok
             diff += 1440;
             shiftStart.setDate(shiftStart.getDate() + 1);
          }

          if (diff >= -120 && diff < minTimeDiff) {
             minTimeDiff = diff;
             upcomingShift = shift;
             upcomingShiftStart = shiftStart;
          }
        });

        if (upcomingShift) {
          setNextShift(upcomingShift);
          
          // Alarm logic
          const diffMsStart = upcomingShiftStart.getTime() - now.getTime();
          
          const alarmBeforeStr = localStorage.getItem('alarmBeforeMins');
          const alarmBefore = alarmBeforeStr ? parseInt(alarmBeforeStr, 10) : 10;
          if (alarmBefore >= 0 && diffMsStart <= alarmBefore * 60000 && diffMsStart > -3600000) {
            checkAndFireAlarm(
              'Pengingat Absensi Masuk', 
              `Shift Anda akan mulai dalam ${alarmBefore} menit. Jangan lupa absen masuk!`, 
              `masuk_${alarmBefore}`
            );
          }

          const alarmAfterStr = localStorage.getItem('alarmAfterMins');
          const alarmAfter = alarmAfterStr ? parseInt(alarmAfterStr, 10) : 15;
          if (alarmAfter >= 0 && diffMsStart <= -alarmAfter * 60000 && diffMsStart > -14400000 && !hasCheckedIn) {
            checkAndFireAlarm(
              'Peringatan Keterlambatan', 
              `Anda belum absen masuk dan shift sudah berjalan ${alarmAfter} menit!`, 
              `telat_${alarmAfter}`
            );
          }

          // Izinkan absen masuk mulai X menit sebelum shift dimulai
          const beforeMinutes = parseInt(upcomingShift.checkInBeforeMinutes || '60');
          const minCheckIn = new Date(upcomingShiftStart.getTime() - beforeMinutes * 60000); 
          const diffMs = minCheckIn.getTime() - now.getTime();

          if (diffMs > 0) {
            setCanCheckIn(false);
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            setCheckInCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
          } else {
            setCanCheckIn(true);
            setCheckInCountdown('');
          }
        }
      };

      calculateCheckInCountdown();
      interval = setInterval(calculateCheckInCountdown, 1000);
    }
    
    // Timer untuk Absen Pulang (jika sudah absen masuk)
    if (hasCheckedIn && !hasCheckedOut && shiftEndTime) {
      const calculateCountdown = () => {
        const targetUser = replacingFriendNip ? employees.find(e => e.nip === replacingFriendNip) : user;
        const activeShifts = resolveActiveShifts(shifts, targetUser, employees);
        let targetShift = activeShifts[0] || shifts[0];
        
        if (activeShifts.length > 1 && checkInTime) {
          let inHour = 0;
          let inMin = 0;
          const timeMatch = checkInTime.match(/(\d+)[.:](\d+)/);
          
          if (timeMatch) {
            inHour = parseInt(timeMatch[1], 10);
            inMin = parseInt(timeMatch[2], 10);
            
            const lowerTime = checkInTime.toLowerCase();
            if (lowerTime.includes('pm') && inHour < 12) {
              inHour += 12;
            } else if (lowerTime.includes('am') && inHour === 12) {
              inHour = 0;
            }
          }
          
          if (!isNaN(inHour) && !isNaN(inMin)) {
            const checkInMinutes = inHour * 60 + inMin;
            let minDiff = Infinity;

            activeShifts.forEach(shift => {
              const [startHour, startMin] = shift.startTime.split(':').map(Number);
              const startMinutes = startHour * 60 + startMin;
              let diff = Math.abs(checkInMinutes - startMinutes);
              if (diff > 720) diff = 1440 - diff;
              if (diff < minDiff) {
                minDiff = diff;
                targetShift = shift;
              }
            });
          }
        }
        
        if (!targetShift) return;

        const now = getServerTime();
        let adjustedEndTime = targetShift.endTime;
        
        if (now.getDay() === 5 && targetShift.fridayEndTime) {
          adjustedEndTime = targetShift.fridayEndTime;
        } else if (now.getDay() === 6 && targetShift.saturdayEndTime) {
          adjustedEndTime = targetShift.saturdayEndTime;
        }

        const [endHour, endMinute] = adjustedEndTime.split(':').map(Number);
        const [startHour] = targetShift.startTime.split(':').map(Number);
        
        let shiftEnd = getServerTime();
        shiftEnd.setHours(endHour, endMinute, 0, 0);
        
        if (startHour > endHour) {
          if (now.getHours() >= startHour - 2) {
            shiftEnd.setDate(shiftEnd.getDate() + 1);
          }
        }
        
        const diff = shiftEnd.getTime() - now.getTime();
        
        // Checkout alarm logic
        const alarmCheckoutStr = localStorage.getItem('alarmCheckoutMins');
        const alarmCheckout = alarmCheckoutStr ? parseInt(alarmCheckoutStr, 10) : 0;
        if (alarmCheckout >= 0 && diff <= -alarmCheckout * 60000 && diff > -43200000 && !hasCheckedOut && hasCheckedIn) {
          const bodyTxt = alarmCheckout === 0 
            ? `Waktu shift Anda telah selesai. Jangan lupa absen pulang!` 
            : `Waktu pulang sudah lewat ${alarmCheckout} menit. Jangan lupa absen pulang!`;
          checkAndFireAlarm(
            'Pengingat Absensi Pulang',
            bodyTxt,
            `pulang_${alarmCheckout}`
          );
        }
        
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setCountdown('00:00:00');
        }
      };
      
      calculateCountdown();
      interval = setInterval(calculateCountdown, 1000);
    }
    
    return () => clearInterval(interval);
  }, [hasCheckedIn, hasCheckedOut, shiftEndTime, shifts, checkInTime, settings, user, employees, isTambahJaga, selectedFriendNip, replacingFriendNip]);

  const fetchLocation = () => {
    setIsLocating(true);
    setCanRefresh(false);
    setError(null);
    setAddress('');
    setLocation(null);
    
    // Enable refresh button after 5 seconds if still locating
    const uiTimer = setTimeout(() => {
      setCanRefresh(true);
    }, 5000);

    if (!navigator.geolocation) {
      clearTimeout(uiTimer);
      setError('Geolocation tidak didukung oleh browser ini.');
      setIsLocating(false);
      setCanRefresh(true);
      return;
    }

    let watchId: number | null = null;
    let fallbackTimeout: NodeJS.Timeout;
    let bestPos: GeolocationPosition | null = null;
    let hasProcessed = false;

    const processPosition = async (position: GeolocationPosition) => {
      if (hasProcessed) return;
      hasProcessed = true;
      
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(fallbackTimeout);
      clearTimeout(uiTimer);

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      
      console.log(`Detected Location: Lat ${userLat}, Lng ${userLng}, Accuracy ${accuracy}m`);
      
      setLocation({ lat: userLat, lng: userLng, accuracy });
      
      let detectedAddress = `${userLat.toFixed(5)}, ${userLng.toFixed(5)}`;
      let fullAddressLower = '';

      try {
        const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        let googleMapsSuccess = false;

        if (googleMapsApiKey) {
          try {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLat},${userLng}&key=${googleMapsApiKey}`);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              const result = data.results[0];
              fullAddressLower = result.formatted_address.toLowerCase();
              
              if (data.plus_code && data.plus_code.compound_code) {
                detectedAddress = data.plus_code.compound_code;
              } else {
                const components = result.address_components;
                const getComponent = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name;
                
                const village = getComponent('administrative_area_level_4') || getComponent('locality') || getComponent('sublocality');
                const district = getComponent('administrative_area_level_3');
                const regency = getComponent('administrative_area_level_2');
                const state = getComponent('administrative_area_level_1');
                const postal = getComponent('postal_code');
                const country = getComponent('country');

                const parts = [];
                if (village) parts.push(village);
                if (district) parts.push(district.toLowerCase().startsWith('kec') ? district : `Kec. ${district}`);
                if (regency) parts.push(regency);
                if (state) parts.push(state);
                if (postal) parts.push(postal);
                if (country) parts.push(country);
                
                detectedAddress = parts.length > 0 ? parts.join(', ') : result.formatted_address;
              }
              googleMapsSuccess = true;
            } else {
              console.warn("Google Maps Geocoding failed, falling back to Nominatim", data);
            }
          } catch (gmapErr) {
            console.warn("Google Maps Geocoding error, falling back to Nominatim", gmapErr);
          }
        }
        
        if (!googleMapsSuccess) {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}&zoom=14&addressdetails=1`);
          if (!response.ok) throw new Error("Nominatim request failed");
          const data = await response.json();
          
          if (data && data.address) {
            const parts = [];
            
            // At zoom=14, we usually get village, county, state, country.
            // Dibe / Dibee handling - occasionally OSM has spelling differences.
            const village = data.address.village || data.address.town || data.address.city || data.address.municipality || data.address.hamlet || data.address.suburb;
            const district = data.address.district || data.address.city_district; // might not be present at zoom 14, but just in case
            const regency = data.address.county || data.address.region;
            const state = data.address.state;
            const postcode = data.address.postcode;
            const country = data.address.country;

            if (village) parts.push(village);
            if (district) parts.push(district.toLowerCase().startsWith('kec') ? district : `Kec. ${district}`);
            if (regency) parts.push(regency);
            if (state) parts.push(state);
            if (postcode) parts.push(postcode);
            if (country) parts.push(country);
            
            if (parts.length > 0) {
              detectedAddress = parts.join(', ');
            } else {
              detectedAddress = data.display_name || detectedAddress;
            }
            detectedAddress = detectedAddress.replace(/\bDibe\b/g, 'Dibee');
            fullAddressLower = detectedAddress.toLowerCase();
          } else if (data && data.display_name) {
            detectedAddress = data.display_name;
            fullAddressLower = data.display_name.toLowerCase();
          }
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
      
      setAddress(detectedAddress);
      
      const officeAddress = user?.office?.toLowerCase() || '';
      const officeAddress2 = user?.office2?.toLowerCase() || '';
      const officeAddress3 = user?.office3?.toLowerCase() || '';
      const locationNameLower = detectedAddress.toLowerCase();
      
      let withinRange = false;
      let closestDistance = Infinity;
      let activeRadius = 100;

      // 1. Cek berdasarkan kecocokan nama alamat (Name-based Approval)
      // Jika lokasi terdeteksi (alamat dari geocoding) mengandung nama kantor, izinkan terlepas dari jarak
      const isNameMatch = (office: string, locName: string) => {
        if (!office) return false;
        
        // Handle common variations
        const normalize = (str: string) => str.replace(/dibee/g, 'dibe');
        const normOffice = normalize(office);
        const normLocName = normalize(locName);

        if (normLocName.includes(normOffice) || normOffice.includes(normLocName)) return true;
        
        // Check by significant words to handle cases like "Desa Dibee" vs "Dibe, Kabupaten Lamongan"
        const ignoreWords = ['desa', 'kecamatan', 'kabupaten', 'provinsi', 'jawa', 'timur', 'barat', 'tengah', 'kota', 'jalan', 'jl', 'raya'];
        const words = normOffice.split(/[\s,.-]+/).filter(w => w.length > 3 && !ignoreWords.includes(w));
        for (const word of words) {
          if (normLocName.includes(word)) return true;
        }
        return false;
      };

      if (isNameMatch(officeAddress, locationNameLower) || isNameMatch(officeAddress2, locationNameLower) || isNameMatch(officeAddress3, locationNameLower)) {
        withinRange = true;
      }

      // 2. Cek berdasarkan jarak koordinat ke lokasi (Coordinate-based Approval)
      // Hanya jika pendekatan nama (Name-based) gagal
      if (!withinRange) {
        withinRange = locations.some(loc => {
          if (!loc.coordinates) return false;
          
          // Hanya cek lokasi yang namanya sesuai dengan office atau office2 atau office3 user
          const locNameLower = (loc.desa || loc.name || '').toLowerCase();
          const isUserLocation = isNameMatch(officeAddress, locNameLower) || isNameMatch(officeAddress2, locNameLower) || isNameMatch(officeAddress3, locNameLower);
          
          if (!isUserLocation) return false;

          const [lat, lng] = loc.coordinates.split(',').map(Number);
          if (isNaN(lat) || isNaN(lng)) return false;
          const distance = getDistance(userLat, userLng, lat, lng);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            activeRadius = loc.radius || 100;
          }
          
          return distance <= (loc.radius || 100);
        });
      }

      // Check if within range of main office (Kantor Induk)
      if (!withinRange && settings?.generalSettings?.mainLocation) {
        const [mainLat, mainLng] = settings.generalSettings.mainLocation.split(',').map(Number);
        if (!isNaN(mainLat) && !isNaN(mainLng)) {
          const distanceToMain = getDistance(userLat, userLng, mainLat, mainLng);
          if (distanceToMain < closestDistance) {
            closestDistance = distanceToMain;
            activeRadius = 100;
          }
          if (distanceToMain <= 100) {
            withinRange = true;
          }
        }
      }

      setIsWithinRange(withinRange);
      if (!withinRange) {
          if (closestDistance !== Infinity) {
            setError(`Berada di luar jangkauan radius (Jarak: ${Math.round(closestDistance)}m, Radius diizinkan: ${activeRadius}m). Akurasi GPS Anda: ${Math.round(accuracy)}m.`);
          } else {
            setError('Lokasi kerja tidak ditemukan di sistem atau pengaturan koordinat tidak valid.');
          }
      }
      setIsLocating(false);
      setCanRefresh(true);
    };

    const options = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!bestPos || position.coords.accuracy < bestPos.coords.accuracy) {
          bestPos = position;
        }
        // If accuracy is good enough (< 100 meters), process immediately
        if (position.coords.accuracy <= 100) {
          processPosition(position);
        }
      },
      (err) => {
        if (!hasProcessed) {
          // If we have a fallback position even with an error, use it instead of failing
          if (bestPos) {
            processPosition(bestPos);
          } else {
             hasProcessed = true;
             if (watchId !== null) navigator.geolocation.clearWatch(watchId);
             clearTimeout(fallbackTimeout);
             clearTimeout(uiTimer);
             setError(`Gagal mendapatkan lokasi (${err.message}). Pastikan GPS aktif dan izin diberikan.`);
             setIsLocating(false);
             setCanRefresh(true);
          }
        }
      },
      options
    );

    // Fallback: after 10 seconds, if no high-accuracy location is found, use the best available
    fallbackTimeout = setTimeout(() => {
      if (!hasProcessed) {
        if (bestPos) {
          processPosition(bestPos);
        } else {
          hasProcessed = true;
          if (watchId !== null) navigator.geolocation.clearWatch(watchId);
          clearTimeout(uiTimer);
          setError('Waktu pencarian lokasi terlalu lama. Akurasi belum memadai atau GPS terganggu. Silahkan refresh dan pastikan GPS Anda kuat.');
          setIsLocating(false);
          setCanRefresh(true);
        }
      }
    }, 12000);
  };

  useEffect(() => {
    fetchLocation();
  }, [locations, user, settings]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Distance in meters
  };

  const handleAbsen = async (isEarlyCheckout = false) => {
    if (!webcamRef.current || !location) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    // Compress image to ensure it fits in Google Sheets (limit 50k chars)
    const compressImage = (base64Str: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.5)); // 50% quality
        };
      });
    };

    const compressedImageSrc = await compressImage(imageSrc);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    let submitNip = user.nip || 'N/A';
    let submitName = user.name || 'N/A';
    let submitType = hasCheckedIn ? 'out' : 'in';

    if (isTambahJaga && selectedFriendNip) {
      const friend = employees.find(e => e.nip === selectedFriendNip);
      if (friend) {
        submitNip = friend.nip;
        submitName = friend.name;
        // User checking in for friend
        submitType = 'in';
      }
    } else if (replacingFriendNip) {
      const friend = employees.find(e => e.nip === replacingFriendNip);
      if (friend) {
        submitNip = friend.nip;
        submitName = friend.name;
        submitType = 'out';
      }
    }

    setIsAbsenting(true);
    try {
      // Validate attendance for duplicate or conflicting leave
      const checkRes = await fetch('/api/attendance');
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const todayStr = format(getServerTime(), 'yyyy-MM-dd');
        
        if (submitType === 'in') {
          const personAtt = checkData.filter((a: any) => a.nip === submitNip && a.date === todayStr);
          const hasGotLeave = personAtt.find((a: any) => ['izin', 'sakit', 'Cuti', 'dinas_luar'].includes(a.type));
          const hasAlreadyIn = personAtt.find((a: any) => a.type === 'in');
          
          if (hasGotLeave && !isTambahJaga) {
            alert('Anda sudah memiliki status Izin/Sakit/Cuti/Dinas Luar. Tidak dapat melakukan absen masuk.');
            setIsAbsenting(false);
            return;
          } else if (hasGotLeave && isTambahJaga) {
            alert('Pengguna yang dipilih sudah memiliki status Izin/Sakit/Cuti/Dinas Luar. Tidak dapat melakukan absen masuk untuknya.');
            setIsAbsenting(false);
            return;
          }
          
          if (hasAlreadyIn && isTambahJaga) {
            alert('Pengguna yang dipilih sudah memiliki data Absen Masuk untuk hari ini.');
            setIsAbsenting(false);
            return;
          }
        }
      }

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nip: submitNip,
          name: submitName,
          date: submitType === 'out' ? (localStorage.getItem('lastCheckInDate') || format(getServerTime(), 'yyyy-MM-dd')) : format(getServerTime(), 'yyyy-MM-dd'),
          time: getServerTime().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          type: submitType,
          location: { lat: location.lat, lng: location.lng, address: address },
          status: (isTambahJaga || replacingFriendNip) ? 'Hadir (Ganti Jaga)' : (isEarlyCheckout ? 'Hadir (Pulang Cepat)' : 'Hadir'),
          photoUrl: compressedImageSrc,
          shift: nextShift?.name || 'Reguler'
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Gagal melakukan absen');
      }
      alert('Absensi berhasil dan terkirim ke Database Kepegawaian');
      
      let nextReplacingNip = replacingFriendNip;
      if (isTambahJaga && selectedFriendNip) {
        setIsTambahJaga(false);
        localStorage.setItem('replacingFriendNip', selectedFriendNip);
        setReplacingFriendNip(selectedFriendNip);
        nextReplacingNip = selectedFriendNip;
        setSelectedFriendNip('');
      } else if (replacingFriendNip && submitType === 'out') {
        localStorage.removeItem('replacingFriendNip');
        setReplacingFriendNip(null);
        nextReplacingNip = null;
      }

      // Re-fetch attendance data to update UI instead of redirecting
      const attRes = await fetch('/api/attendance');
      if (attRes.ok) {
        const data = await attRes.json();
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const today = format(getServerTime(), 'yyyy-MM-dd');
        
        let nipToCheck = userData.nip;
        if (nextReplacingNip) {
          nipToCheck = nextReplacingNip;
        }
        
        const userAtt = data.filter((a: any) => a.nip === nipToCheck && a.date === today);
        const inRecord = userAtt.find((a: any) => a.type === 'in');
        const outRecord = userAtt.find((a: any) => a.type === 'out');
        
        if (inRecord) {
          setHasCheckedIn(true);
          setCheckInTime(inRecord.time);
        } else {
          setHasCheckedIn(false);
          setCheckInTime(null);
        }
        
        if (outRecord) {
          setHasCheckedOut(true);
        } else {
          setHasCheckedOut(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat absen.');
    } finally {
      setIsAbsenting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center transition-colors">
      <div className="w-full max-w-md space-y-4">
        {announcements.length > 0 && (
          <div className="space-y-2">
            {announcements.map((ann) => (
              <Alert key={ann.id} className="bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200">
                <AlertDescription>
                  <strong className="block mb-1 text-blue-900 dark:text-blue-100">{ann.title}</strong>
                  {ann.content}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
        <Card className="w-full max-w-md bg-white dark:bg-slate-900 border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.15)]">
          <CardHeader>
            <CardTitle className="text-teal-600 dark:text-teal-400 text-2xl font-bold flex items-center gap-2">
              <Camera className="w-6 h-6" />
              {isTambahJaga ? 'Tambah Jaga Teman' : replacingFriendNip ? (hasCheckedIn ? (canCheckOut ? 'Absen Pulang (Ganti Jaga)' : 'Status Absensi (Ganti Jaga)') : 'Absen Masuk (Ganti Jaga)') : hasCheckedIn ? (canCheckOut ? 'Absen Pulang' : 'Status Absensi') : 'Absen Masuk'}
            </CardTitle>
            {user && (
              <div className="text-slate-600 dark:text-slate-300 text-sm mt-2 space-y-1">
                <p><strong>Nama:</strong> {replacingFriendNip ? (employees.find(e => e.nip === replacingFriendNip)?.name || user.name) + ' (Digantikan)' : user.name}</p>
                <p><strong>NIP:</strong> {replacingFriendNip || user.nip}</p>
                <p><strong>Kantor 1:</strong> {user.office}</p>
                {user.office2 && <p><strong>Kantor 2:</strong> {user.office2}</p>}
                {user.office3 && <p><strong>Kantor 3:</strong> {user.office3}</p>}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {leaveType ? (
              <Alert className="bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-900 text-teal-700 dark:text-teal-400">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-500" />
                <AlertDescription className="text-lg font-medium text-center py-4">
                  {leaveType === 'sakit' && "Semoga lekas sembuh dan diberikan kesehatan seperti sediakala. Aamiin"}
                  {leaveType === 'izin' && "Semoga segala urusannya dimudahkan"}
                  {leaveType === 'Cuti' && "Semoga hari - hari cuti anda bermanfaat"}
                  {leaveType === 'dinas_luar' && "Selamat menjalankan dinas luar, tetap semangat dan jaga kesehatan!"}
                </AlertDescription>
              </Alert>
            ) : isHolidayRestricted && !hasCheckedIn && !isTambahJaga ? (
              <>
                <Alert className="bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400">
                  <AlertDescription className="text-md font-medium text-center py-4">
                    Hari ini hari libur. Silahkan manfaatkan hari libur anda dengan istirahat atau berlibur.
                  </AlertDescription>
                </Alert>
                {!replacingFriendNip && (
                  <Button onClick={() => setIsTambahJaga(true)} className="w-full mt-4 border-teal-500 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30" variant="outline">
                    Tambah Jaga (Gantikan Teman)
                  </Button>
                )}
              </>
            ) : hasCheckedOut && !isTambahJaga ? (
              <>
                <Alert className="bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-900 text-teal-700 dark:text-teal-400">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-500" />
                  <AlertDescription>
                    Anda telah menyelesaikan absensi untuk hari ini.
                  </AlertDescription>
                </Alert>
                {!replacingFriendNip && (
                  <Button onClick={() => setIsTambahJaga(true)} className="w-full mt-4 border-teal-500 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30" variant="outline">Tambah Jaga (Gantikan Teman)</Button>
                )}
              </>
            ) : (
              <>
                {hasCheckedIn && !canCheckOut && !hasCheckedOut && !isTambahJaga && (
                  <Alert className="bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-900 text-teal-700 dark:text-teal-400 flex flex-col items-center justify-center py-4">
                    <CheckCircle2 className="w-6 h-6 text-teal-600 dark:text-teal-500 mb-1" />
                    <AlertDescription className="text-center space-y-2">
                      <p className="text-sm">Anda telah melakukan absen MASUK pada <strong>{checkInTime}</strong></p>
                      <div className="mt-2">
                        <p className="text-xs text-teal-600/80 dark:text-teal-500/80 mb-1">Waktu Menuju Absen Pulang:</p>
                        <p className="text-4xl font-mono font-bold text-slate-800 dark:text-white tracking-wider">{countdown}</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {isTambahJaga && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                       <Label className="text-slate-700 dark:text-slate-300">Pilih Teman</Label>
                       <Button variant="ghost" size="sm" onClick={() => setIsTambahJaga(false)} className="h-6 text-red-500 hover:text-red-600 px-2 py-0">Batal</Button>
                    </div>
                    <Select onValueChange={setSelectedFriendNip} value={selectedFriendNip}>
                      <SelectTrigger className="w-full bg-white dark:bg-slate-900 border-teal-500 text-slate-800 dark:text-slate-200">
                         <SelectValue placeholder="Pilih teman yang akan dijagakan" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.filter(e => e.nip !== user?.nip).map(emp => (
                          <SelectItem key={emp.nip} value={emp.nip}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="relative overflow-hidden rounded-xl border-2 border-teal-500/20">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full aspect-video object-cover"
                    disablePictureInPicture={false}
                    forceScreenshotSourceSize={false}
                    imageSmoothing={true}
                    mirrored={false}
                    onUserMedia={() => {}}
                    onUserMediaError={() => {}}
                    screenshotQuality={0.5}
                  />
                  <div className="absolute inset-0 border-2 border-teal-500/50 pointer-events-none" />
                </div>

                {error && (
                  <Alert variant="destructive" className="bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {!hasCheckedIn && checkInCountdown && !canCheckIn && (
                  <Alert className="bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-900 text-teal-700 dark:text-teal-400">
                    <AlertDescription className="text-center">
                      <p className="mb-2">Shift berikutnya: <strong>{nextShift?.name} ({nextShift?.startTime})</strong></p>
                      <p className="text-xs mb-1">Waktu menuju pembukaan absen masuk:</p>
                      <p className="text-3xl font-mono font-bold tracking-wider text-slate-800 dark:text-teal-100">{checkInCountdown}</p>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-2 text-slate-500 dark:text-slate-400 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-500 shrink-0" />
                    <span className="flex-1 text-slate-700 dark:text-slate-300">{isLocating ? 'Mencari lokasi...' : address ? `Lokasi: ${address}` : 'Lokasi tidak ditemukan'}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchLocation} 
                      disabled={isLocating && !canRefresh}
                      className="h-8 border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 shrink-0"
                    >
                      {isLocating && !canRefresh ? 'Mencari...' : 'Refresh'}
                    </Button>
                  </div>
                  {location && (
                    <div className="pl-6 text-xs">
                      Akurasi: {location.accuracy.toFixed(1)} meter | Status: Aktif
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => (!isWithinRange && !hasCheckedIn) ? navigate('/user/leave') : handleAbsen(false)}
                  disabled={!location || isAbsenting || (!canCheckIn && !hasCheckedIn && isWithinRange) || (isTambahJaga && !selectedFriendNip) || (hasCheckedIn && !canCheckOut) || (hasCheckedIn && !isWithinRange)}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-lg shadow-[0_0_10px_rgba(20,184,166,0.5)] transition-all disabled:opacity-50"
                >
                  {isAbsenting ? 'Memproses...' : (!isWithinRange && !hasCheckedIn) ? 'Ajukan Izin' : (!isWithinRange && hasCheckedIn) ? 'Di Luar Jangkauan Radius' : (isTambahJaga ? 'Absen Masuk (Ganti Teman)' : replacingFriendNip ? 'Absen Pulang (Ganti Jaga)' : hasCheckedIn ? 'Absen Pulang' : (canCheckIn ? 'Absen Masuk' : 'Belum Waktunya'))}
                </Button>

                {hasCheckedIn && !canCheckOut && !hasCheckedOut && !isTambahJaga && !replacingFriendNip && settings?.absensiSettings?.enableEarlyCheckout !== false && (
                  <Button
                    onClick={() => {
                      if (window.confirm("Peringatan: Pulang Cepat akan mengurangi jam kerja efektif dalam satu bulan ini. Apakah Anda yakin ingin pulang cepat?")) {
                        handleAbsen(true);
                      }
                    }}
                    disabled={isAbsenting || !isWithinRange}
                    variant="outline"
                    className="w-full mt-3 border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-500/10 font-bold py-3 rounded-lg shadow-[0_0_10px_rgba(249,115,22,0.1)] transition-all"
                  >
                    {isAbsenting ? 'Memproses...' : !isWithinRange ? 'Pulang Cepat (Di Luar Radius)' : 'Pulang Cepat'}
                  </Button>
                )}
                
                {!isTambahJaga && !hasCheckedIn && !replacingFriendNip && (
                  <Button onClick={() => setIsTambahJaga(true)} className="w-full mt-4 border-teal-500 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30" variant="outline">
                    Tambah Jaga (Gantikan Teman)
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
