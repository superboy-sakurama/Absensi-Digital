import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

async function testDrive() {
  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.substring(1, privateKey.length - 1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  
  if (!SPREADSHEET_ID) {
    console.log("No spreadsheet id");
    return;
  }

  const serviceAccountAuth = new JWT({
    email: email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
  
  try {
    await doc.loadInfo();
    console.log('Connected to', doc.title);
    
    // Duplicate exactly the logic
    let sheet = doc.sheetsByTitle['Users'];
    if (!sheet && doc) {
      sheet = await doc.addSheet({ title: 'Users', headerValues: ['id', 'nip', 'name', 'email', 'role', 'password', 'gender', 'cluster', 'unit', 'office', 'office2', 'office3'] });
    } else if (sheet) {
      try {
        await sheet.loadHeaderRow();
        const currentHeaders = sheet.headerValues;
        let headersChanged = false;
        const newHeaders = [...currentHeaders];
        for (const header of ['id', 'nip', 'name', 'email', 'role', 'password', 'gender', 'cluster', 'unit', 'office', 'office2', 'office3']) {
          if (!newHeaders.includes(header)) {
            newHeaders.push(header);
            headersChanged = true;
          }
        }
        if (headersChanged) {
          await sheet.setHeaderRow(newHeaders);
        }
      } catch (e) {
        console.log("Error loading headers", e);
        await sheet.setHeaderRow(['id', 'nip', 'name', 'email', 'role', 'password', 'gender', 'cluster', 'unit', 'office', 'office2', 'office3']);
      }
    }
    
    console.log("Creating/Getting Users finished");
    
    // Add row to test Error
    const newUser = {
      id: Date.now().toString(),
      nip: '123123',
      name: 'name',
      email: 'em',
      role: 'user',
      password: 'pwd',
      gender: 'gender',
      cluster: 'cluster',
      unit: 'unit',
      office: 'desa',
      office2: 'office2',
      office3: 'office3'
    };
    
    await sheet.addRow(newUser);
    console.log("Row added successfully");
    
  } catch (err) {
    console.error('Final Error:', err);
  }
}

testDrive();
