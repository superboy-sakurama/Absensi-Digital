import { callApi } from './api';

// Mock Firebase Auth
export const auth = {
  currentUser: null as any
};

let authStateListeners: any[] = [];

export const onAuthStateChanged = (authInstance: any, callback: any) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      auth.currentUser = user;
      callback(user);
    } catch (e) {
      callback(null);
    }
  } else {
    callback(null);
  }
  
  authStateListeners.push(callback);
  return () => {
    authStateListeners = authStateListeners.filter(l => l !== callback);
  };
};

const notifyAuthListeners = (user: any) => {
  if (user) {
    user.uid = user.id || user.uid;
    user.displayName = user.name || user.displayName;
  }
  auth.currentUser = user;
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
  authStateListeners.forEach(l => l(user));
};

export const signInWithEmailAndPassword = async (authInstance: any, email: string, password: string) => {
  const res = await callApi('login', { email, password });
  const user = res.user;
  user.uid = user.id || user.uid;
  user.displayName = user.name || user.displayName;
  notifyAuthListeners(user);
  return { user };
};

export const createUserWithEmailAndPassword = async (authInstance: any, email: string, password: string) => {
  const res = await callApi('register', { email, password });
  const user = res.user;
  user.uid = user.id || user.uid;
  user.displayName = user.name || user.displayName;
  notifyAuthListeners(user);
  return { user };
};

export const signOut = async (authInstance: any) => {
  notifyAuthListeners(null);
};

export const sendPasswordResetEmail = async (authInstance: any, email: string, actionCodeSettings?: any) => {
  await callApi('reset_password', { email });
};

export const updatePassword = async (user: any, newPassword: string) => {
  await callApi('update_password', { uid: user.uid, newPassword });
};

export const reauthenticateWithCredential = async (user: any, credential: any) => {
  // Mock success
};

export class EmailAuthProvider {
  static credential(email: string, password: string) {
    return { email, password };
  }
}

// Mock Firestore
export const db = {};

export const collection = (dbInstance: any, path: string) => ({ type: 'collection', path });
export const doc = (dbOrCol: any, pathOrId?: string, id?: string) => {
  if (dbOrCol?.type === 'collection') {
    return { type: 'doc', path: dbOrCol.path, id: pathOrId || 'new_id_' + Date.now() };
  }
  if (!id && pathOrId && pathOrId.includes('/')) {
    const parts = pathOrId.split('/');
    return { type: 'doc', path: parts.slice(0, -1).join('/'), id: parts[parts.length - 1] };
  }
  return { type: 'doc', path: pathOrId, id: id || 'new_id_' + Date.now() };
};

export const query = (col: any, ...args: any[]) => ({ type: 'query', col, args });
export const where = (field: string, op: string, val: any) => ({ type: 'where', field, op, val });
export const orderBy = (field: string, dir: string) => ({ type: 'orderBy', field, dir });
export const limit = (num: number) => ({ type: 'limit', num });

const convertTimestamps = (obj: any): any => {
  if (!obj) return obj;
  if (typeof obj === 'object') {
    if (obj._seconds !== undefined) {
      return { toDate: () => new Date(obj._seconds * 1000) };
    }
    for (const key in obj) {
      obj[key] = convertTimestamps(obj[key]);
    }
  }
  return obj;
};

export const getDoc = async (docRef: any) => {
  if (docRef.path === 'settings' && docRef.id === 'general') {
    let webhookUrl = localStorage.getItem('webhookUrl');
    if (webhookUrl && webhookUrl.includes('AKfycbw.../exechttps://')) {
      webhookUrl = webhookUrl.replace('https://script.google.com/macros/s/AKfycbw.../exec', '');
      localStorage.setItem('webhookUrl', webhookUrl);
    }
    if (webhookUrl === 'https://script.google.com/macros/s/AKfycbw.../exec') {
      webhookUrl = null;
      localStorage.removeItem('webhookUrl');
    }
    if (webhookUrl) {
      return {
        exists: () => true,
        data: () => ({ webhookUrl }),
        id: docRef.id
      };
    }
  }
  try {
    const res = await callApi('get_doc', { path: docRef.path, id: docRef.id });
    const data = convertTimestamps(res);
    return {
      exists: () => !!res,
      data: () => data || {},
      id: docRef.id
    };
  } catch (e) {
    return { exists: () => false, data: () => ({}), id: docRef.id };
  }
};

export const getDocs = async (queryRef: any) => {
  const res = await callApi('get_docs', { 
    path: queryRef.col ? queryRef.col.path : queryRef.path,
    args: [] // Do not send args to backend because backend filtering is broken for timestamps and types
  });
  
  let filteredRes = res || [];
  
  // Apply filters locally to handle cases where the Apps Script backend might miss them
  // (e.g. >=, <=, or type mismatches like string vs number)
  const args = queryRef.args || [];
  args.forEach((arg: any) => {
    if (arg.type === 'where') {
      filteredRes = filteredRes.filter((d: any) => {
        let fieldVal = d[arg.field];
        let argVal = arg.val;
        
        // Handle timestamps
        if (fieldVal && fieldVal._seconds !== undefined) {
          fieldVal = fieldVal._seconds;
        } else if (typeof fieldVal === 'string' && !isNaN(Date.parse(fieldVal))) {
          fieldVal = new Date(fieldVal).getTime() / 1000;
        }
        
        if (argVal && typeof argVal.toDate === 'function') {
          argVal = argVal.toDate().getTime() / 1000;
        } else if (argVal instanceof Date) {
          argVal = argVal.getTime() / 1000;
        }
        
        // Handle string vs number mismatch (e.g. NIP)
        if (arg.op === '==') return String(fieldVal) === String(argVal);
        if (arg.op === '>') return fieldVal > argVal;
        if (arg.op === '<') return fieldVal < argVal;
        if (arg.op === '>=') return fieldVal >= argVal;
        if (arg.op === '<=') return fieldVal <= argVal;
        return true;
      });
    } else if (arg.type === 'orderBy') {
      filteredRes.sort((a: any, b: any) => {
        let valA = a[arg.field];
        let valB = b[arg.field];
        
        if (valA && valA._seconds !== undefined) valA = valA._seconds;
        if (valB && valB._seconds !== undefined) valB = valB._seconds;
        
        if (arg.dir === 'desc') return valA < valB ? 1 : -1;
        return valA > valB ? 1 : -1;
      });
    } else if (arg.type === 'limit') {
      filteredRes = filteredRes.slice(0, arg.num);
    }
  });

  const docs = filteredRes.map((d: any, index: number) => ({
    id: d.id || `doc_${Date.now()}_${index}`,
    data: () => convertTimestamps(d),
    exists: () => true
  }));
  return {
    docs,
    empty: docs.length === 0,
    forEach: (callback: (doc: any) => void) => docs.forEach(callback)
  };
};

const prepareData = (obj: any): any => {
  if (!obj) return obj;
  if (typeof obj === 'object') {
    if (typeof obj.toDate === 'function') {
      return { _seconds: Math.floor(obj.toDate().getTime() / 1000) };
    }
    if (Array.isArray(obj)) {
      return obj.map(prepareData);
    }
    const result: any = {};
    for (const key in obj) {
      result[key] = prepareData(obj[key]);
    }
    return result;
  }
  return obj;
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
  if (docRef.path === 'settings' && docRef.id === 'general' && data.webhookUrl) {
    let webhookUrl = data.webhookUrl;
    if (webhookUrl.includes('AKfycbw.../exechttps://')) {
      webhookUrl = webhookUrl.replace('https://script.google.com/macros/s/AKfycbw.../exec', '');
    }
    localStorage.setItem('webhookUrl', webhookUrl);
    data.webhookUrl = webhookUrl;
  }
  await callApi('set_doc', { path: docRef.path, id: docRef.id, data: prepareData(data), merge: options?.merge });
};

export const addDoc = async (colRef: any, data: any) => {
  const res = await callApi('add_doc', { path: colRef.path, data: prepareData(data) });
  return { id: res.id };
};

export const updateDoc = async (docRef: any, data: any) => {
  await callApi('update_doc', { path: docRef.path, id: docRef.id, data: prepareData(data) });
};

export const deleteDoc = async (docRef: any) => {
  await callApi('delete_doc', { path: docRef.path, id: docRef.id });
};

export const writeBatch = (dbInstance: any) => {
  const ops: any[] = [];
  const batch = {
    set: (docRef: any, data: any) => { ops.push({ type: 'set', path: docRef.path, id: docRef.id, data: prepareData(data) }); return batch; },
    update: (docRef: any, data: any) => { ops.push({ type: 'update', path: docRef.path, id: docRef.id, data: prepareData(data) }); return batch; },
    delete: (docRef: any) => { ops.push({ type: 'delete', path: docRef.path, id: docRef.id }); return batch; },
    commit: async () => {
      await callApi('batch', { ops });
    }
  };
  return batch;
};

export const Timestamp = {
  now: () => ({ toDate: () => new Date() }),
  fromDate: (date: Date) => ({ toDate: () => date }),
};

export const serverTimestamp = () => ({ toDate: () => new Date() });

// Mock Storage
export const storage = {};
export const ref = (storageInstance: any, path: string) => ({ path });
export const uploadString = async (storageRef: any, dataString: string, format: string) => {
  const res = await callApi('upload_file', { path: storageRef.path, data: dataString });
  storageRef.url = res.url;
  return { ref: storageRef };
};
export const getDownloadURL = async (storageRef: any) => {
  return storageRef.url || '';
};
