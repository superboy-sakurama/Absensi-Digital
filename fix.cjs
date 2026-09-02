const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');
code = code.replace(/getOrCreateSheet\('Employees', \['id', 'name', 'nip', 'office', 'office2', 'email', 'gender', 'cluster', 'unit', 'password', 'photoUrl', 'photoUploadCount'\]\);/g, "getOrCreateSheet('Employees', ['id', 'name', 'nip', 'office', 'office2', 'office3', 'email', 'gender', 'cluster', 'unit', 'password', 'photoUrl', 'photoUploadCount']);");
fs.writeFileSync('server.ts', code);
