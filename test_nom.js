import fetch from 'node-fetch';
async function test() {
  const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=-7.000263&longitude=112.391503&localityLanguage=id', { headers: { 'User-Agent': 'ais-test/1.0' } });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
