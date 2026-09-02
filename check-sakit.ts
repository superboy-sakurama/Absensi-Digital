import fetch from 'node-fetch';

async function checkSpreadsheet() {
  const host = 'http://localhost:3000';
  const res = await fetch(`${host}/api/attendance`);
  const data = await res.json() as any[];
  
  const sakitData = data.filter((a: any) => a.type === 'sakit' || a.status === 'Sakit' || a.status === 'sakit' || a.status === 'izin');
  console.log(`Found ${sakitData.length} records related to sakit or izin.`);
  for (const item of sakitData) {
    if (item.type === 'sakit' || item.type === 'izin' || item.status === 'Sakit' || item.type === 'pending' || item.type === 'Cuti') {
      console.log(`ID: ${item.id}, NIP: ${item.nip}, Date: ${item.date}, Type: ${item.type}, Status: ${item.status}`);
    }
  }
}

checkSpreadsheet().catch(console.error);
