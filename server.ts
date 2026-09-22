import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { startDailyBackupScheduler, runFirestoreBackup } from './src/services/backupServerService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set higher body limit to handle camera captures (optimized photos and video clips)
  app.use(express.json({ limit: '20mb' }));

  // Initialize the secure local uploads directory
  const UPLOADS_DIR = path.join(process.cwd(), 'public', 'assets', 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // API endpoint for uploading captured media securely via backend
  app.post('/api/media/upload', async (req, res) => {
    try {
      const { type, data, filename } = req.body || {};
      if (!data) {
        return res.status(400).json({ success: false, error: 'No media data provided.' });
      }

      // Regex validation of base64 format and content
      const matches = data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ success: false, error: 'Invalid data format. Must be a valid base64 data URL.' });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Strict security check: limit size to 15MB
      if (buffer.length > 15 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'File size exceeds 15MB limit.' });
      }

      // Strict extension mapping based on mimeType
      let ext = '';
      if (type === 'image') {
        if (mimeType.startsWith('image/')) {
          ext = mimeType.split('/')[1];
          if (ext === 'jpeg') ext = 'jpg';
        } else {
          return res.status(400).json({ success: false, error: 'Invalid mime type for image.' });
        }
      } else if (type === 'video') {
        if (mimeType.startsWith('video/')) {
          ext = mimeType.split('/')[1];
          if (ext && ext.includes(';')) {
            ext = ext.split(';')[0];
          }
          if (ext === 'quicktime') ext = 'mov';
        } else {
          return res.status(400).json({ success: false, error: 'Invalid mime type for video.' });
        }
      } else if (type === 'audio') {
        if (mimeType.startsWith('audio/')) {
          ext = mimeType.split('/')[1];
          if (ext && ext.includes(';')) {
            ext = ext.split(';')[0];
          }
          if (ext === 'mpeg') ext = 'mp3';
        } else {
          return res.status(400).json({ success: false, error: 'Invalid mime type for audio.' });
        }
      } else {
        return res.status(400).json({ success: false, error: 'Invalid media type.' });
      }

      if (!ext) ext = type === 'image' ? 'jpg' : type === 'audio' ? 'webm' : 'mp4';

      // Generate secure clean filename to prevent directory traversal
      const secureFilename = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, secureFilename);

      fs.writeFileSync(filePath, buffer);

      const relativeUrl = `/assets/uploads/${secureFilename}`;
      res.json({
        success: true,
        url: relativeUrl,
        filename: secureFilename,
        mimeType,
        size: buffer.length
      });
    } catch (err: any) {
      console.error('[SENDA API UPLOAD] Error:', err);
      res.status(500).json({ success: false, error: 'Internal server error during media upload.' });
    }
  });

  // API endpoint for AI Atmosphere (Stories, Biographies, Quotes)
  app.post('/api/gemini/atmosphere', async (req, res) => {
    try {
      const { type, language, period, promptCustom } = req.body || {};
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: false,
          fallback: true,
          message: 'GEMINI_API_KEY environment variable not configured.'
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let systemPrompt = '';
      if (type === 'story') {
        systemPrompt = `Você é um narrador e poeta no SENDA. Escreva uma micro-história poética ou fábula inspiradora de 2 a 3 frases em ${language || 'pt-BR'}, adequada ao período do dia (${period || 'dia'}). Mantenha um tom profundo, sereno e motivador. NUNCA use aspas na resposta nem títulos.`;
      } else if (type === 'biography') {
        systemPrompt = `Você é um historiador no SENDA. Apresente uma figura histórica notável (ex: Ada Lovelace, Marcus Aurelius, Marie Curie, Leonardo da Vinci, Nikola Tesla, Seneca) com seu nome em negrito, seguido por uma citação ou pensamento filosófico marcante e uma lição curta em ${language || 'pt-BR'}. Máximo 250 caracteres.`;
      } else {
        systemPrompt = `Escreva um pensamento sereno e inspirador em ${language || 'pt-BR'} para o período da ${period || 'dia'}. Máximo 180 caracteres.`;
      }

      let responseText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: promptCustom || 'Gere uma sugestão inspiradora.',
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.85,
          }
        });
        responseText = response.text || '';
      } catch (firstErr) {
        try {
          const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: promptCustom || 'Gere uma sugestão inspiradora.',
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.85,
            }
          });
          responseText = fallbackResponse.text || '';
        } catch (secondErr) {
          // Provide instant high quality fallback text directly
          if (type === 'story') {
            responseText = "O orvalho da manhã toca as folhas em silêncio. Cada novo dia no SENDA é uma página em branco pronta para conexões genuínas e profundas. No ritmo sereno da vida, os encontros mais significativos acontecem quando permitimos que o tempo flua sem pressa.";
          } else if (type === 'biography') {
            responseText = "**Ada Lovelace** - \"Aqueles que aprenderam a pensar por si mesmos encontrarão sempre a luz da verdade.\" Visionária que imaginou o potencial dos algoritmos e a união entre poesia e ciência.";
          } else {
            responseText = "Siga em frente com sereno otimismo e clareza de propósito.";
          }
        }
      }

      res.json({
        success: true,
        text: responseText,
      });
    } catch (err: any) {
      res.json({ 
        success: false, 
        fallback: true, 
        message: 'Modo de contingência ativado com sucesso.' 
      });
    }
  });

  // API endpoint to retrieve the last backup status
  app.get('/api/backup/status', async (req, res) => {
    try {
      const historyPath = path.join(process.cwd(), 'public', 'assets', 'backups', 'backup_history.json');
      if (fs.existsSync(historyPath)) {
        const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        return res.json({ success: true, stats: data });
      }
      res.json({ 
        success: true, 
        stats: {
          timestamp: 'Nunca executado',
          usersCount: 0,
          conversationsCount: 0,
          messagesCount: 0,
          momentsCount: 0,
          destination: 'Nenhum',
          fileName: 'Nenhum'
        } 
      });
    } catch (err: any) {
      res.json({ success: false, error: err?.message || String(err) });
    }
  });

  // API endpoint to trigger a backup instantly
  app.post('/api/backup/trigger', async (req, res) => {
    try {
      const stats = await runFirestoreBackup();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Start automatic daily backup routine
    startDailyBackupScheduler();
  });
}

startServer();
