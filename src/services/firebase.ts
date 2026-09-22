import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connectivity validation
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    const msg = error?.message || String(error);
    const code = error?.code;
    if (code === 'unavailable' || msg.includes('client is offline') || msg.includes('unavailable') || msg.includes('Could not reach')) {
      console.warn('[SENDA Firestore] Cliente em modo offline ou aguardando conexão com o servidor.');
      return false;
    }
    // Document 'test/connection' might not exist, but connection to server succeeded
    return true;
  }
}
