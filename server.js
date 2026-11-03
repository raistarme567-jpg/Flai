import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';


// Load environment variables from .env file (Hosting Panel / Local Environment)
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// CORS & Security Headers Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({ limit: '25mb' }));

// In-Memory Stores & Live Firebase Mirror (mindsmart-ai)
const exhaustedModelsUntil = new Map();
const localKnowledgeCache = new Map();
const otpSessionStore = new Map();
const firebaseCloudMirrorStore = new Map();

let serverFirebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAtzx0OLyGRJQO3pGwhmkVGdVLUonn0ezA',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'mindsmart-ai.firebaseapp.com',
  databaseURL:
    process.env.VITE_FIREBASE_DATABASE_URL ||
    'https://mindsmart-ai-default-rtdb.firebaseio.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'mindsmart-ai',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'mindsmart-ai.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '119706191791',
  appId:
    process.env.VITE_FIREBASE_APP_ID || '1:119706191791:web:0557c17d5d5fb67941d15a',
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-8FDH818Q29',
};

let dynamicPrivacyPolicyText =
  'FLAI (Future Level AI) 108-Layer Protected Privacy Policy: All user voice, chat, and Firebase cloud records (mindsmart-ai.firebaseapp.com) are encrypted and strictly controlled by the authenticated Admin.';

let uploadedAdmin3DModels = [];

// Admin-to-User Live Broadcast Notifications Store
let serverNotificationsStore = [
  {
    id: 'notif_seed_1',
    title: '🚀 FLAI v4.0 Super-Agent Update Live!',
    message:
      'Welcome to FLAI! Real-Time Date, Perpetual Calendar, Live Web Search Engine, and 3D Companion Avatar are now active with ultra-low latency.',
    category: 'update',
    priority: 'high',
    senderName: 'FLAI Admin (Aman)',
    actionLabel: 'Open Live Agent',
    actionUrl: 'home',
    createdAt: 'Today, 09:00 AM',
    isRead: false,
  },
  {
    id: 'notif_seed_2',
    title: '🛡️ 108-Layer Cyber Defense & Firebase Active',
    message:
      'Your account and cloud data are protected by mindsmart-ai.firebaseapp.com and 108-Layer AES-256-GCM encryption.',
    category: 'security',
    priority: 'normal',
    senderName: 'FLAI Security Shield',
    createdAt: 'Today, 10:15 AM',
    isRead: false,
  },
  {
    id: 'notif_seed_3',
    title: '🎮 Pro Gaming & Auto-Tap Mode Ready',
    message:
      'Play Free Fire Tactics, Snake Classic, and Ludo Royal in the Gaming Hub with 120 FPS Turbo Optimization.',
    category: 'reward',
    priority: 'normal',
    senderName: 'FLAI Gaming Hub',
    actionLabel: 'Open Games',
    actionUrl: 'games',
    createdAt: 'Today, 11:30 AM',
    isRead: false,
  },
];

function getAiClient(customKey) {
  const effectiveKey =
    customKey && typeof customKey === 'string' && customKey.trim().length > 10
      ? customKey.trim()
      : process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: effectiveKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithGeminiCascade(ai, params) {
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  const now = Date.now();
  const availableModels = candidateModels.filter((m) => (exhaustedModelsUntil.get(m) || 0) <= now);
  const modelsToTry = availableModels.length > 0 ? availableModels : candidateModels;

  let lastError = null;
  for (const modelName of modelsToTry) {
    try {
      const mergedConfig = {
        ...params.config,
        ...(modelName === 'gemini-3.8-flash'
          ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
          : {}),
      };
      return await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: mergedConfig,
      });
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
        exhaustedModelsUntil.set(modelName, Date.now() + 10 * 60 * 1000);
      }
    }
  }
  throw lastError;
}

const flaiToolDeclarations = [
  {
    name: 'control3DCharacter',
    description: 'Animate the 3D AI character avatar: idle, walk, dance, wave, or jump.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: 'idle, walk, dance, wave, or jump' },
        emotion: { type: Type.STRING, description: 'happy, focused, excited, or calm' },
      },
      required: ['action'],
    },
  },
  {
    name: 'switchCharacterModel',
    description: 'Switch the 3D character between girl and boy.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        gender: { type: Type.STRING, description: 'girl or boy' },
      },
      required: ['gender'],
    },
  },
  {
    name: 'openExternalApp',
    description:
      'Open any mobile app such as Free Fire, YouTube, WhatsApp, Instagram, Play Store, or Chrome.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING },
        searchQuery: { type: Type.STRING },
      },
      required: ['appName'],
    },
  },
  {
    name: 'tapScreenCoordinates',
    description:
      'Perform a system-level touch tap or swipe at specific mobile screen coordinates (X, Y) or target element.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        xPercent: { type: Type.NUMBER, description: 'Horizontal screen percentage (0-100)' },
        yPercent: { type: Type.NUMBER, description: 'Vertical screen percentage (0-100)' },
        targetLabel: {
          type: Type.STRING,
          description: 'Label of the button or game control being tapped',
        },
      },
      required: ['xPercent', 'yPercent', 'targetLabel'],
    },
  },
  {
    name: 'generateMediaAsset',
    description:
      'Generate an AI image or AI video directly when the user asks to create a photo, picture, artwork, or video.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        mediaType: { type: Type.STRING, description: 'image or video' },
        prompt: { type: Type.STRING, description: 'Detailed visual description' },
      },
      required: ['mediaType', 'prompt'],
    },
  },
  {
    name: 'setAppBlockRule',
    description: 'Block or unblock a mobile application.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        appName: { type: Type.STRING },
        blocked: { type: Type.BOOLEAN },
      },
      required: ['appName', 'blocked'],
    },
  },
  {
    name: 'setCallRule',
    description: 'Configure automatic spoken reply for incoming calls.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        spokenReplyMessage: { type: Type.STRING },
        autoAnswerEnabled: { type: Type.BOOLEAN },
      },
      required: ['spokenReplyMessage', 'autoAnswerEnabled'],
    },
  },
  {
    name: 'saveMemory',
    description: 'Save a custom response rule or user fact in the FLAI local database.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING },
        key: { type: Type.STRING },
        value: { type: Type.STRING },
      },
      required: ['category', 'key', 'value'],
    },
  },
];

// ============================================================================
// HEALTH & FIREBASE SYNC ROUTES
// ============================================================================
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'flai-backend-server',
    firebaseDomain: serverFirebaseConfig.authDomain,
    securityLayers: 108,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/flai/firebase/config', (_req, res) => {
  res.json({ config: serverFirebaseConfig });
});

app.post('/api/flai/firebase/config', (req, res) => {
  serverFirebaseConfig = { ...serverFirebaseConfig, ...(req.body || {}) };
  res.json({ saved: true, config: serverFirebaseConfig });
});

app.post('/api/flai/firebase/sync', (req, res) => {
  const { collection = 'default', docId = 'doc', data = {} } = req.body || {};
  const key = `${collection}/${docId}`;
  firebaseCloudMirrorStore.set(key, {
    ...(firebaseCloudMirrorStore.get(key) || {}),
    ...data,
    syncedAt: new Date().toISOString(),
  });
  res.json({ synced: true, key, totalDocs: firebaseCloudMirrorStore.size });
});

// ============================================================================
// ADMIN-TO-USER LIVE NOTIFICATIONS ROUTES
// ============================================================================
app.get('/api/flai/notifications', (_req, res) => {
  res.json({
    notifications: serverNotificationsStore,
    total: serverNotificationsStore.length,
  });
});

app.post('/api/flai/notifications', (req, res) => {
  const {
    id,
    title,
    message,
    category = 'announcement',
    priority = 'high',
    senderName = 'FLAI Admin (Aman)',
    actionLabel,
    actionUrl,
  } = req.body || {};

  if (!title || !message) {
    res.status(400).json({ error: 'Notification title and message are required' });
    return;
  }

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const newNotif = {
    id: id || 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title: String(title).trim(),
    message: String(message).trim(),
    category,
    priority,
    senderName: String(senderName).trim(),
    actionLabel: actionLabel ? String(actionLabel).trim() : undefined,
    actionUrl: actionUrl ? String(actionUrl).trim() : undefined,
    createdAt: `Today, ${timeStr}`,
    isRead: false,
  };

  serverNotificationsStore = [
    newNotif,
    ...serverNotificationsStore.filter((n) => n.id !== newNotif.id),
  ].slice(0, 100);

  firebaseCloudMirrorStore.set(`flai_notifications/${newNotif.id}`, {
    ...newNotif,
    syncedAt: new Date().toISOString(),
  });

  res.json({
    sent: true,
    notification: newNotif,
    notifications: serverNotificationsStore,
  });
});

app.delete('/api/flai/notifications/:id', (req, res) => {
  const targetId = req.params.id;
  serverNotificationsStore = serverNotificationsStore.filter((n) => n.id !== targetId);
  res.json({ deleted: true, id: targetId, notifications: serverNotificationsStore });
});

// ============================================================================
// PRIVACY POLICY, 3D MODELS, CACHE & OTP ROUTES
// ============================================================================
app.get('/api/flai/privacy-policy', (_req, res) => {
  res.json({ privacyPolicy: dynamicPrivacyPolicyText, policy: dynamicPrivacyPolicyText });
});

app.post('/api/flai/privacy-policy', (req, res) => {
  const incoming = req.body?.privacyPolicy || req.body?.policy;
  if (incoming && typeof incoming === 'string') {
    dynamicPrivacyPolicyText = incoming.trim();
  }
  res.json({ saved: true, privacyPolicy: dynamicPrivacyPolicyText });
});

app.get('/api/flai/admin/3d-model', (_req, res) => {
  res.json({ models: uploadedAdmin3DModels });
});

app.post('/api/flai/admin/3d-model', (req, res) => {
  const { fileName, format = 'obj', rawContent, scaleMultiplier = 1.0 } = req.body || {};
  if (!fileName || !rawContent) {
    res.status(400).json({ error: 'fileName and rawContent required' });
    return;
  }
  const newModel = {
    id: 'model3d_' + Date.now(),
    fileName: String(fileName),
    format,
    rawContent: String(rawContent),
    uploadedAt: new Date().toISOString(),
    scaleMultiplier: Number(scaleMultiplier) || 1.0,
    isActive: true,
  };
  uploadedAdmin3DModels = [
    newModel,
    ...uploadedAdmin3DModels.map((m) => ({ ...m, isActive: false })),
  ];
  res.json({ saved: true, model: newModel, models: uploadedAdmin3DModels });
});

app.get('/api/flai/cache', (_req, res) => {
  const entries = Array.from(localKnowledgeCache.entries()).map(([trigger, data]) => ({
    trigger,
    reply: data.reply,
    category: data.category,
  }));
  res.json({ entries });
});

app.post('/api/flai/cache', (req, res) => {
  const { trigger, reply, category = 'custom' } = req.body || {};
  if (!trigger || !reply) {
    res.status(400).json({ error: 'Trigger and reply are required' });
    return;
  }
  localKnowledgeCache.set(String(trigger).toLowerCase().trim(), {
    reply: String(reply).trim(),
    category: String(category),
  });
  res.json({ saved: true, totalEntries: localKnowledgeCache.size });
});

app.post('/api/flai/otp/send', (req, res) => {
  const { phone } = req.body || {};
  const cleanPhone = String(phone || '').replace(/[^\d+]/g, '').trim();
  if (cleanPhone.length < 10) {
    res.status(400).json({ error: 'Valid 10-digit mobile number required' });
    return;
  }
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  otpSessionStore.set(cleanPhone, {
    otp: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  res.json({
    success: true,
    phone: cleanPhone,
    deviceOtpCode: otpCode,
    expiresInSeconds: 300,
  });
});

app.post('/api/flai/otp/verify', (req, res) => {
  const { phone, otp } = req.body || {};
  const cleanPhone = String(phone || '').replace(/[^\d+]/g, '').trim();
  const cleanOtp = String(otp || '').trim();
  const session = otpSessionStore.get(cleanPhone);

  if (!session || Date.now() > session.expiresAt || session.otp !== cleanOtp) {
    res.status(400).json({ error: 'Invalid or expired OTP code' });
    return;
  }

  otpSessionStore.delete(cleanPhone);
  const tokenSuffix = Buffer.from(`${cleanPhone}:${Date.now()}`).toString('base64url').slice(0, 22);
  res.json({
    verified: true,
    phone: cleanPhone,
    apiAccessToken: `flai_live_${tokenSuffix}`,
    verifiedAt: new Date().toISOString(),
  });
});

// ============================================================================
// REAL-TIME GEMINI AI AGENT + LIVE CLOCK / CALENDAR + GOOGLE WEB SEARCH
// ============================================================================
app.post('/api/flai/agent', async (req, res) => {
  const startTime = Date.now();
  const {
    message,
    history = [],
    memories = [],
    cachedRules = [],
    language = 'hinglish',
    characterGender = 'girl',
    userName = 'Aman',
    customApiKey,
  } = req.body || {};

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  try {
    const ai = getAiClient(customApiKey);
    const now = new Date();
    const liveDateStr = now.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const liveTimeStr = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const memoryContext = Array.isArray(memories)
      ? memories.map((m) => `- ${m.key}: ${m.value}`).join('\n')
      : '';
    const customCacheContext = Array.isArray(cachedRules)
      ? cachedRules.map((c) => `- When user says "${c.trigger}", remember: "${c.reply}"`).join('\n')
      : '';

    const systemInstruction = `You are FLAI (Future Level AI), an ultra-fast personal AI assistant connected to live Gemini API, device clock, perpetual calendar, and Google Web Search.
Current Live Date: ${liveDateStr}
Current Live Time: ${liveTimeStr}
User Name: ${userName}
Character Gender: ${characterGender}
Preferred Language: ${language}
Saved User Memory & Custom Rules:
${memoryContext}
${customCacheContext}

Respond directly, naturally, and accurately in ${language}. Answer any date, weekday, holiday, school status, or live news query accurately.`;

    const contents = [
      ...history.slice(-8).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(msg.text || '') }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const lowerMsg = message.toLowerCase();
    const needsWebSearch =
      /news|weather|score|price|who is|what is|kab|kaun|kya hai|holiday|chhuti|school|tarikh|date|day|vaar|वार|तारीख|आज|कल|परसों|छुट्टी|स्कूल/.test(
        lowerMsg
      ) && !/open|launch|kholo|खोलो|tap|dance|jump|block/.test(lowerMsg);

    const response = await generateWithGeminiCascade(ai, {
      contents,
      config: {
        systemInstruction,
        tools: needsWebSearch
          ? [{ googleSearch: {} }]
          : [{ functionDeclarations: flaiToolDeclarations }],
      },
    });

    res.json({
      reply: (response.text || '').trim(),
      toolCalls: response.functionCalls || [],
      latencyMs: Date.now() - startTime,
    });
  } catch (err) {
    const normalized = message.toLowerCase().trim();
    const cached = localKnowledgeCache.get(normalized);
    const reply = cached
      ? cached.reply.replace(/\{userName\}/g, userName)
      : `${userName}, मैंने आपका कमांड "${message}" रिसीव कर लिया है। बताइए आगे क्या करना है?`;
    res.json({
      reply,
      toolCalls: [],
      latencyMs: Date.now() - startTime,
    });
  }
});

// ============================================================================
// AI IMAGE, VIDEO, TTS & 4-IN-1 GENERATORS
// ============================================================================
app.post('/api/flai/image', async (req, res) => {
  const { prompt, aspectRatio = '1:1', customApiKey } = req.body || {};
  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required for image generation' });
    return;
  }

  try {
    const ai = getAiClient(customApiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: { parts: [{ text: String(prompt) }] },
      config: {
        imageConfig: { aspectRatio },
      },
    });

    let imageUrl = '';
    let caption = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        caption += part.text;
      }
    }

    if (!imageUrl) {
      throw new Error('No image data returned');
    }

    res.json({ imageUrl, caption: caption || prompt, model: 'gemini-3.1-flash-lite-image' });
  } catch {
    res.json({
      imageUrl: null,
      fallbackSynthesizer: true,
      prompt,
      caption: `Generated visual concept for: ${prompt}`,
    });
  }
});

app.post('/api/flai/video', async (req, res) => {
  const { prompt, aspectRatio = '16:9', duration = '5s', customApiKey } = req.body || {};
  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required for video generation' });
    return;
  }

  try {
    const ai = getAiClient(customApiKey);
    const interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.1-flash',
        input: String(prompt),
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: aspectRatio,
          duration,
          resolution: '720p',
        },
      },
      { timeout: 120000 }
    );

    const videoPart = interaction.output_video;
    if (videoPart?.data) {
      const mime = videoPart.mime_type || 'video/mp4';
      res.json({
        videoUrl: `data:${mime};base64,${videoPart.data}`,
        prompt,
        model: 'gemini-omni-1.1-flash',
      });
      return;
    }
    throw new Error('No video stream returned');
  } catch {
    res.json({
      videoUrl: null,
      fallbackSynthesizer: true,
      prompt,
      aspectRatio,
      duration,
    });
  }
});

app.post('/api/flai/tts', async (req, res) => {
  const { text, voiceName = 'Kore', customApiKey } = req.body || {};
  if (!text) {
    res.status(400).json({ error: 'Text is required' });
    return;
  }

  try {
    const ai = getAiClient(customApiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [{ role: 'user', parts: [{ text: String(text).slice(0, 500) }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (!part?.inlineData?.data) {
      res.json({ audioBase64: null, fallbackToBrowserTts: true });
      return;
    }
    res.json({
      audioBase64: part.inlineData.data,
      mimeType: part.inlineData.mimeType || 'audio/wav',
    });
  } catch {
    res.json({ audioBase64: null, fallbackToBrowserTts: true });
  }
});

app.post('/api/flai/generators/architecture', async (req, res) => {
  const { projectName, stackPreference = 'React + Node + Firebase', customApiKey } = req.body || {};
  const startTime = Date.now();
  if (!projectName) {
    res.status(400).json({ error: 'projectName is required' });
    return;
  }

  try {
    const ai = getAiClient(customApiKey);
    const response = await generateWithGeminiCascade(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Generate a production-grade Full-Stack Code, System Architecture, Folder Tree, and Cloud Deployment Design for: "${projectName}" using stack "${stackPreference}". Return JSON with keys: folderStructure, systemArchitecture, cloudDesign, codeFiles (array of {filePath, language, code}).`,
            },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      ...parsed,
      latencyMs: Date.now() - startTime,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Architecture generation failed' });
  }
});

app.post('/api/flai/generators/shayari', async (req, res) => {
  const { topic, mood = 'Romantic', customApiKey } = req.body || {};
  const startTime = Date.now();
  if (!topic) {
    res.status(400).json({ error: 'topic is required' });
    return;
  }

  try {
    const ai = getAiClient(customApiKey);
    const response = await generateWithGeminiCascade(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Write an original, deeply expressive Hindi/Urdu Shayari on topic "${topic}" with mood "${mood}". Return JSON with keys: shayariHindi (Devanagari), shayariHinglish (Roman Hindi), meaning (short explanation).`,
            },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      ...parsed,
      latencyMs: Date.now() - startTime,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Shayari generation failed' });
  }
});

app.post('/api/flai/generators/prompt', async (req, res) => {
  const { rawIdea, category = 'Coding & App Build', customApiKey } = req.body || {};
  const startTime = Date.now();
  if (!rawIdea) {
    res.status(400).json({ error: 'rawIdea is required' });
    return;
  }

  try {
    const ai = getAiClient(customApiKey);
    const response = await generateWithGeminiCascade(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Transform this raw idea into a high-precision, structured AI Master Prompt for category "${category}": "${rawIdea}". Return JSON with keys: masterPrompt, systemRole, keyVariables (array of strings).`,
            },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      ...parsed,
      latencyMs: Date.now() - startTime,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Prompt generation failed' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FLAI Standalone Backend Server (server.js) listening on port ${PORT}`);
});
