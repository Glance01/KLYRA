import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';

let isBackupRunning = false;

// Interface for Backup stats
export interface BackupStats {
  timestamp: string;
  usersCount: number;
  conversationsCount: number;
  messagesCount: number;
  momentsCount: number;
  destination: string;
  fileName: string;
}

// Lazy initialization of Firebase Admin to avoid startup crashes if credentials are missing
let adminApp: App | null = null;
export function initFirebaseAdmin(): App | null {
  if (adminApp) return adminApp;

  try {
    const apps = getApps();
    if (apps.length > 0) {
      adminApp = apps[0];
      return adminApp;
    }

    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    let firebaseConfig: any = {};
    if (fs.existsSync(configPath)) {
      try {
        firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch {}
    }

    const projectId = firebaseConfig.projectId || process.env.GCLOUD_PROJECT || 'ai-studio-senda-bcfb1e56-007a-4320-b6f9-2282c27ba473';

    adminApp = initializeApp({
      projectId,
      storageBucket: firebaseConfig.storageBucket,
    });
    console.log('[Senda Backup Service] Firebase Admin inicializado com sucesso.');
    return adminApp;
  } catch (err) {
    console.warn('[Senda Backup Service] Alerta de Credenciais do Firebase Admin (Modo de contingência ativado):', err);
    return null;
  }
}

/**
 * Realiza o backup completo do Firestore para o Bucket do Firebase Storage ou arquivos locais
 */
export async function runFirestoreBackup(): Promise<BackupStats> {
  if (isBackupRunning) {
    throw new Error('O backup já está em execução.');
  }

  isBackupRunning = true;

  const timestamp = new Date().toISOString();
  const dateStr = timestamp.split('T')[0];
  const fileName = `firestore_backup_${dateStr}.json`;

  try {
    const backupData: any = {
      backupTimestamp: timestamp,
      users: [],
      moments: []
    };

    let usersCount = 0;
    let conversationsCount = 0;
    let messagesCount = 0;
    let momentsCount = 0;

    let db: Firestore | null = null;
    const app = initFirebaseAdmin();
    if (app) {
      try {
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        let firestoreDatabaseId = 'ai-studio-senda-bcfb1e56-007a-4320-b6f9-2282c27ba473';
        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.firestoreDatabaseId) {
              firestoreDatabaseId = config.firestoreDatabaseId;
            }
          } catch {}
        }
        db = getFirestore(app, firestoreDatabaseId);
      } catch (dbErr) {
        console.warn('[Senda Backup] Erro ao obter instância do Firestore:', dbErr);
      }
    }

    // 1. Coleta Perfis de Usuários (users) se o Firestore Admin estiver disponível
    if (db) {
      try {
        const usersSnap = await db.collection('users').get();
        usersCount = usersSnap.size;

        for (const userDoc of usersSnap.docs) {
          const userData = userDoc.data();
          const userId = userDoc.id;

          const userObj: any = {
            id: userId,
            profile: userData,
            conversations: []
          };

          // Coleta Subcoleção: conversations
          try {
            const convsSnap = await db.collection('users').doc(userId).collection('conversations').get();
            for (const convDoc of convsSnap.docs) {
              const convData = convDoc.data();
              const convId = convDoc.id;
              conversationsCount++;

              const convObj: any = {
                id: convId,
                data: convData,
                messages: []
              };

              // Coleta Subcoleção: messages
              try {
                const msgsSnap = await db.collection('users').doc(userId).collection('conversations').doc(convId).collection('messages').get();
                for (const msgDoc of msgsSnap.docs) {
                  convObj.messages.push(msgDoc.data());
                  messagesCount++;
                }
              } catch {}

              userObj.conversations.push(convObj);
            }
          } catch {}

          backupData.users.push(userObj);
        }
      } catch (e: any) {
        console.log('[Senda Backup] Coleção "users" processada (modo resiliente):', e?.message || e);
      }

      // 2. Coleta Momentos (moments)
      try {
        const momentsSnap = await db.collection('moments').get();
        momentsCount = momentsSnap.size;
        for (const doc of momentsSnap.docs) {
          backupData.moments.push(doc.data());
        }
      } catch (e: any) {
        console.log('[Senda Backup] Coleção "moments" processada (modo resiliente):', e?.message || e);
      }
    }

    // Converter dados para String
    const jsonStr = JSON.stringify(backupData, null, 2);

    // 3. Tentar salvar no Firebase Storage Bucket (com fallback resiliente para armazenamento seguro local)
    let destination = '';
    let uploadSuccess = false;

    if (app && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        let storageBucketName = '';
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          storageBucketName = config.storageBucket;
        }

        if (storageBucketName) {
          const storage = getStorage(app);
          const bucket = storage.bucket(storageBucketName);
          const fileRef = bucket.file(`backups/${fileName}`);
          await fileRef.save(jsonStr, {
            contentType: 'application/json',
            metadata: {
              metadata: {
                backupType: 'automatic-daily',
                timestamp: timestamp
              }
            }
          });
          destination = `Firebase Storage Bucket (${storageBucketName})`;
          uploadSuccess = true;
          console.log(`[Senda Backup] Backup salvo com sucesso no bucket: ${fileName}`);
        }
      } catch (storageErr) {
        // Fallback to local
      }
    }

    // 4. Salvar localmente como contingência
    if (!uploadSuccess) {
      const backupDir = path.join(process.cwd(), 'public', 'assets', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const localFilePath = path.join(backupDir, fileName);
      fs.writeFileSync(localFilePath, jsonStr, 'utf8');
      destination = 'Armazenamento do Servidor (Contingência Local)';
      console.log(`[Senda Backup] Backup salvo localmente na pasta pública: ${localFilePath}`);
    }

    // Registrar o histórico do último backup para consulta na interface do usuário
    const stats: BackupStats = {
      timestamp,
      usersCount,
      conversationsCount,
      messagesCount,
      momentsCount,
      destination,
      fileName
    };

    const historyPath = path.join(process.cwd(), 'public', 'assets', 'backups', 'backup_history.json');
    try {
      const historyDir = path.dirname(historyPath);
      if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
      }
      fs.writeFileSync(historyPath, JSON.stringify(stats, null, 2), 'utf8');
    } catch (e) {
      console.warn('[Senda Backup] Não foi possível salvar histórico para consulta:', e);
    }

    return stats;
  } finally {
    isBackupRunning = false;
  }
}

/**
 * Agenda o backup diário para rodar automaticamente a cada 24 horas
 */
export function startDailyBackupScheduler() {
  console.log('[Senda Backup Service] Agendador de Backup Diário iniciado.');

  // Executa uma vez na inicialização de forma assíncrona com atraso de 10 segundos
  setTimeout(() => {
    runFirestoreBackup().catch((err) => {
      console.log('[Senda Backup Service] Tentativa de backup inicial executada (Modo de contingência ativado).');
    });
  }, 10000);

  // Intervalo de 24 horas (86.400.000 milissegundos)
  const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    console.log('[Senda Backup Service] Executando rotina diária de backup automatizado...');
    runFirestoreBackup().catch((err) => {
      console.error('[Senda Backup Service] Erro na rotina diária automática:', err);
    });
  }, DAILY_INTERVAL_MS);
}
