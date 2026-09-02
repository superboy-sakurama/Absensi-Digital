import fetch from 'node-fetch';

async function dump() {
  const host = 'http://localhost:3000';
  const res = await fetch(`${host}/api/attendance`);
  const data = await res.json() as any[];
  console.log(`Length: ${data.length}`);
  console.log(data);
}
dump();
