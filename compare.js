const fs = require('fs');
const oldServerStr = fs.readFileSync('server.ts', 'utf-8');
const newServerStr = fs.readFileSync('tmp_repo/server.ts', 'utf-8');

if (oldServerStr === newServerStr) {
  console.log("server.ts is identical.");
} else {
  console.log("server.ts lengths: ", oldServerStr.length, newServerStr.length);
}
