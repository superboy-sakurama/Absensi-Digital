// Google Apps Script Backend for Attendance App
// 1. Create a new Google Spreadsheet
// 2. Go to Extensions > Apps Script
// 3. Paste this code
// 4. Deploy > New Deployment > Web app (Execute as: Me, Who has access: Anyone)
// 5. Copy the Web app URL and paste it into the app's Webhook URL setting.

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const sheets = ['users', 'attendance', 'permissions', 'settings'];
  const headers = {
    'users': ['id', 'nip', 'email', 'password', 'name', 'role', 'village', 'deviceId', 'deviceInfo', 'status'],
    'attendance': ['id', 'user_id', 'type', 'status', 'timestamp', 'latitude', 'longitude', 'address', 'photo', 'name', 'nip'],
    'permissions': ['id', 'user_id', 'type', 'reason', 'start_date', 'end_date', 'status', 'timestamp', 'name', 'nip'],
    'settings': ['id', 'webhookUrl']
  };
  
  sheets.forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers[sheetName]);
    }
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    if (!action) {
      // Legacy webhook payload
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = payload.payload;
    
    let result = null;
    
    if (action === 'login') {
      result = loginUser(data.email, data.password);
    } else if (action === 'register') {
      result = registerUser(data.email, data.password);
    } else if (action === 'get_doc') {
      result = getDoc(data.path, data.id);
    } else if (action === 'get_docs') {
      result = getDocs(data.path, data.args);
    } else if (action === 'set_doc') {
      result = setDoc(data.path, data.id, data.data, data.merge);
    } else if (action === 'add_doc') {
      result = addDoc(data.path, data.data);
    } else if (action === 'update_doc') {
      result = updateDoc(data.path, data.id, data.data);
    } else if (action === 'delete_doc') {
      result = deleteDoc(data.path, data.id);
    } else if (action === 'batch') {
      result = executeBatch(data.ops);
    } else if (action === 'upload_file') {
      result = uploadFile(data.path, data.data);
    } else {
      throw new Error('Unknown action: ' + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ data: result }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    // Skip completely empty rows
    if (data[i].every(cell => cell === '')) continue;
    
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      let val = data[i][j];
      // Try to parse JSON strings back to objects
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch(e) {}
      }
      row[headers[j]] = val;
    }
    if (!row.id) row.id = `row_${i}`;
    rows.push(row);
  }
  return rows;
}

function writeRow(sheetName, rowData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const initialHeaders = Object.keys(rowData);
    if (!initialHeaders.includes('id')) initialHeaders.unshift('id');
    sheet.appendRow(initialHeaders);
  }
  
  let headers = sheet.getDataRange().getValues()[0];
  if (!headers) {
    headers = Object.keys(rowData);
    if (!headers.includes('id')) headers.unshift('id');
    sheet.appendRow(headers);
  }
  
  // Update headers if new keys are present
  let headersUpdated = false;
  Object.keys(rowData).forEach(key => {
    if (!headers.includes(key)) {
      headers.push(key);
      headersUpdated = true;
    }
  });
  
  if (headersUpdated) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const row = headers.map(h => {
    let val = rowData[h] !== undefined ? rowData[h] : '';
    if (typeof val === 'object') val = JSON.stringify(val);
    return val;
  });
  sheet.appendRow(row);
}

function updateRow(sheetName, id, rowData, merge = false) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  
  let headers = data[0];
  const idIndex = headers.indexOf('id');
  if (idIndex === -1) return false;
  
  // Update headers if new keys are present
  let headersUpdated = false;
  Object.keys(rowData).forEach(key => {
    if (!headers.includes(key)) {
      headers.push(key);
      headersUpdated = true;
    }
  });
  
  if (headersUpdated) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === id) {
      const row = [...data[i]];
      // Pad row if new headers were added
      while (row.length < headers.length) row.push('');
      
      for (let j = 0; j < headers.length; j++) {
        const h = headers[j];
        if (rowData[h] !== undefined) {
          let val = rowData[h];
          if (typeof val === 'object') val = JSON.stringify(val);
          row[j] = val;
        } else if (!merge) {
          if (h !== 'id') row[j] = '';
        }
      }
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
      return true;
    }
  }
  return false;
}

function deleteRow(sheetName, id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;
  
  const idIndex = data[0].indexOf('id');
  if (idIndex === -1) return false;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function loginUser(email, password) {
  const users = getSheetData('users');
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) throw new Error('Email atau password salah');
  const { password: _, ...safeUser } = user;
  safeUser.uid = safeUser.id;
  return { user: safeUser };
}

function registerUser(email, password) {
  const users = getSheetData('users');
  if (users.find(u => u.email === email)) throw new Error('Email sudah terdaftar');
  
  const id = 'user_' + new Date().getTime();
  const newUser = { id, email, password, role: 'user', name: email.split('@')[0] };
  writeRow('users', newUser);
  
  const { password: _, ...safeUser } = newUser;
  safeUser.uid = safeUser.id;
  return { user: safeUser };
}

function getDoc(path, id) {
  const data = getSheetData(path);
  const doc = data.find(d => d.id === id);
  if (doc) {
    if (doc.timestamp) doc.timestamp = { _seconds: new Date(doc.timestamp).getTime() / 1000 };
  }
  return doc;
}

function getDocs(path, args) {
  let data = getSheetData(path);
  
  // Apply filters (args is an array of query constraints)
  if (args && args.length > 0) {
    args.forEach(arg => {
      if (arg.type === 'where') {
        data = data.filter(d => {
          if (arg.op === '==') return d[arg.field] === arg.val;
          if (arg.op === '>') return d[arg.field] > arg.val;
          if (arg.op === '<') return d[arg.field] < arg.val;
          return true;
        });
      } else if (arg.type === 'orderBy') {
        data.sort((a, b) => {
          const valA = a[arg.field];
          const valB = b[arg.field];
          if (arg.dir === 'desc') return valA < valB ? 1 : -1;
          return valA > valB ? 1 : -1;
        });
      } else if (arg.type === 'limit') {
        data = data.slice(0, arg.num);
      }
    });
  }
  
  return data.map(d => {
    if (d.timestamp) d.timestamp = { _seconds: new Date(d.timestamp).getTime() / 1000 };
    return d;
  });
}

function setDoc(path, id, data, merge) {
  const existing = getDoc(path, id);
  const rowData = { ...data, id };
  if (rowData.timestamp && rowData.timestamp.toDate) {
    rowData.timestamp = new Date().toISOString();
  }
  
  if (existing) {
    updateRow(path, id, rowData, merge);
  } else {
    writeRow(path, rowData);
  }
  return true;
}

function addDoc(path, data) {
  const id = 'doc_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
  const rowData = { ...data, id };
  if (rowData.timestamp && rowData.timestamp.toDate) {
    rowData.timestamp = new Date().toISOString();
  }
  writeRow(path, rowData);
  return { id };
}

function updateDoc(path, id, data) {
  const rowData = { ...data };
  if (rowData.timestamp && rowData.timestamp.toDate) {
    rowData.timestamp = new Date().toISOString();
  }
  updateRow(path, id, rowData, true);
  return true;
}

function deleteDoc(path, id) {
  deleteRow(path, id);
  return true;
}

function executeBatch(ops) {
  ops.forEach(op => {
    if (op.type === 'set') setDoc(op.path, op.id, op.data, false);
    else if (op.type === 'update') updateDoc(op.path, op.id, op.data);
    else if (op.type === 'delete') deleteDoc(op.path, op.id);
  });
  return true;
}

function uploadFile(path, dataString) {
  // dataString is a base64 data URL: data:image/png;base64,iVBORw0KGgo...
  const parts = dataString.split(',');
  const mimeType = parts[0].match(/:(.*?);/)[1];
  const base64 = parts[1];
  
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, path.split('/').pop() || 'upload.png');
  
  // Save to Google Drive
  const folderName = "Attendance_Photos";
  const folders = DriveApp.getFoldersByName(folderName);
  let folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  
  const file = folder.createFile(blob);
  return { url: file.getDownloadUrl() };
}
