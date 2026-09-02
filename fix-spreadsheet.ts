import fetch from 'node-fetch';

async function fixSpreadsheet() {
  const host = 'http://localhost:3000';
  
  // 1. Fetch all attendance
  const res = await fetch(`${host}/api/attendance`);
  const data = await res.json() as any[];
  
  // 2. Find those where type == 'sakit' and status == 'izin' (and status == 'Izin')
  const toFix = data.filter((a: any) => a.type === 'dinas_luar' && (a.status === 'izin' || a.status === 'Izin'));
  
  console.log(`Found ${toFix.length} rows to fix.`);
  
  for (const item of toFix) {
    console.log(`Fixing item id: ${item.id} from status: ${item.status} to Dinas Luar`);
    const updateRes = await fetch(`${host}/api/attendance/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Dinas Luar' })
    });
    const updateData = await updateRes.json();
    console.log(`Result for ${item.id}:`, updateData);
  }
}

fixSpreadsheet().catch(console.error);
