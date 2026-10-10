import express from 'express';
import compression from 'compression';
import path from 'path';
import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { MIGRATED_IMAGES_MAP } from './src/lib/migratedImagesMap.ts';
import { fetchImageFromFirestore, saveImageToFirestoreServer } from './server/firestoreImages.ts';
import { 
  checkBucketStatus, 
  runFirebaseStorageMigration, 
  uploadToFirebaseStorage, 
  updateFirestoreMetadata,
  verifyDownloadUrl,
  cleanChunkSubcollections
} from './server/firebaseStorage.ts';

dotenv.config();

async function startServer() {
  const app = express();

  const distPath = path.resolve(process.cwd(), 'dist');
  const isBundled = typeof __filename !== 'undefined' && __filename.endsWith('.cjs');
  const isDev = process.env.npm_lifecycle_event === 'dev' && !isBundled;
  const isProduction = !isDev || isBundled || process.env.NODE_ENV === 'production';

  // The application container runs an nginx proxy on external port (8080) that strictly proxies to 3000.
  // Port 3000 is required by the container infrastructure in both dev and production.
  const PORT = 3000;

  // Multer setup for memory storage
  const storage = multer.memoryStorage();
  const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // Cloudinary Initialization
  const initCloudinary = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('Cloudinary credentials missing. Uploads will fail.');
      return false;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    return true;
  };

  initCloudinary();

  // Performance: HTTP Response Compression (Gzip / Deflate)
  app.use(compression());

  // Security: Defensive HTTP Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '50mb' }));

  // API Routes & Health Checks
  app.get(['/api/health', '/health', '/healthz', '/_health', '/_ah/health'], (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString() });
  });

  // OneSignal Push Notification Dispatch Endpoint (Secure Server-Side with REST API Key)
  app.post('/api/onesignal/send', async (req: any, res: any) => {
    try {
      const { title, body, url, type, isMatch, target, apiKey: clientApiKey, appId: clientAppId } = req.body;
      const appId = clientAppId || process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID || 'f93522a8-2af6-40a7-aa4e-25fc0e21e572';
      const apiKey = clientApiKey || req.headers['x-onesignal-api-key'] || process.env.ONESIGNAL_REST_API_KEY;

      if (!title || !body) {
        return res.status(400).json({ error: 'العنوان ومحتوى الإشعار مطلوبان' });
      }

      if (!apiKey || !appId) {
        console.warn('[OneSignal Server] ⚠️ ONESIGNAL_REST_API_KEY missing. Push skipped on server.');
        return res.json({ 
          success: true, 
          delivered: false, 
          warning: 'لم يتم تزويد مفتاح OneSignal REST API. يمكنك إدخاله مباشرة من لوحة التحكم أو في متغيرات البيئة.' 
        });
      }

      const matchAlert = Boolean(
        isMatch || 
        type === 'match' || 
        (url && url.includes('/live')) || 
        /⚽|🟢|🟨|🟥|🔄|🏁|هدف|مباراة|طرد/i.test(`${title} ${body}`)
      );

      const targetUrl = url || (matchAlert ? '/live' : '/');

      const payload: any = {
        app_id: appId,
        headings: { en: title, ar: title },
        contents: { en: body, ar: body },
        web_url: targetUrl,
        app_url: targetUrl,
        chrome_web_icon: '/icon.png',
        chrome_web_badge: '/icon.png',
        firefox_icon: '/icon.png',
        data: {
          url: targetUrl,
          isMatch: matchAlert,
          type: type || (matchAlert ? 'match' : 'general'),
          target: target || 'all'
        },
        priority: 10
      };

      if (!target || target === 'all') {
        payload.included_segments = ['Subscribed Users', 'Total Subscriptions', 'Active Subscriptions'];
      } else if (target.includes('-') && target.length > 20) {
        // Likely a OneSignal subscription ID / player ID
        payload.include_player_ids = [target];
      } else {
        // Target by user external_id (Firebase UID)
        payload.include_aliases = { external_id: [target] };
        payload.target_channel = 'push';
      }

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Basic ${String(apiKey).trim()}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();
      console.log('[OneSignal Server] 🚀 Push Notification dispatched:', responseData);

      const hasNoSubscribers = responseData.errors && responseData.errors.some((e: string) => 
        e.includes('All included players are not subscribed') || 
        e.includes('not subscribed')
      );

      const hasError = Boolean(responseData.errors && !hasNoSubscribers);

      return res.json({
        success: !hasError,
        delivered: !hasNoSubscribers && !hasError,
        noSubscribers: hasNoSubscribers,
        recipients: responseData.recipients || 0,
        data: responseData,
        error: hasError ? responseData.errors : undefined
      });
    } catch (err: any) {
      console.error('[OneSignal Server] ❌ Error sending push notification:', err);
      return res.status(500).json({ error: err?.message || 'فشل إرسال إشعار OneSignal' });
    }
  });

  // AI Image Generation Endpoint for Jersey Try-On / Fan Studio
  app.post(['/api/jersey-try-on', '/api/ai/jersey-tryon'], async (req: any, res: any) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: 'مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير متاح حالياً في خادم التطبيق. يرجى التأكد من ضبط المفتاح في إعدادات التطبيق.' 
        });
      }

      const { userImageBase64, jerseyImageBase64, logoImageBase64, selectedBackground, mood } = req.body;

      if (!userImageBase64 || !jerseyImageBase64) {
        return res.status(400).json({ error: 'صورة المشجع وصورة القميص مطلوبتان لتوليد الصورة.' });
      }

      const bg = selectedBackground || mood || 'room';

      const backgroundDetail = bg === 'room' ? `
SCENE: STANDING IN A WARM, AUTHENTIC "ISKANDARI FAN ROOM" (ZAEEM EL-THAGHR):
- The background is a homey room belonging to a passionate Al Ittihad fan in Alexandria.
- Walls decorated with many green and white flags and official Alittihad Alexandria club scarves (Etthadawy).
- Include framed photos of club legends and newspaper clippings of famous victories.
- Modern high-contrast lighting with a soft green ambient glow.` : 
      bg === 'studio' ? `
SCENE: STANDING IN A SLEEK MODERN BRANDED STUDIO:
- Minimalist, high-end professional photo studio with a clean aesthetic.
- A wall featuring a stylish arrangement of club articles and newspaper clippings.
- Artistic display of Al Ittihad (Etthadawy) scarves and flags as cinematic backdrops.
- Prominent Al Ittihad Alexandria club logo integrated into the backlit decor.
- Clean studio shadows and professional sports photography lighting with green neon touches.` :
      bg === 'stadium' ? `
SCENE: STANDING ON THE PITCH OF THE ALEXANDRIA STADIUM:
- The background is the iconic Alexandria Stadium (historic towers visible).
- Thousands of green and white cheering fans blurred in the background.
- Floodlights creating a dramatic evening match atmosphere.
- The person looks like a star player posing on the grass.` :
      `
SCENE: CELEBRATING A "SIDI EL-BALAD" THEMED BIRTHDAY:
- Festive atmosphere with a massive green and white Al Ittihad birthday cake.
- Green and white balloons everywhere.
- A "Happy Birthday" banner with the club logo.
- The person is holding a club scarf, looking happy in a celebration setting.`;

      const prompt = `Perform a professional, high-end CLOTHING REPLACEMENT and FULL-BODY SCENE TRANSFORMATION.

IDENTITY PRESERVATION (ABSOLUTE): You MUST perfectly preserve the person's face, features, hair, eyes, and unique identity from "Customer Image". The face must be 100% IDENTICAL to the original. NO adjustments to facial structure.

BODY POSE & FULL-BODY COMPLETION (CRITICAL): 
1. If the "Customer Image" is a portrait or half-body, generate the rest of the body to create a full-body standing pose.
2. Adapt the posture to fit the environment naturally (e.g., a fan's proud stance, or an athlete's pose).

JERSEY & LOWER OUTFIT:
1. UPPER BODY: Replace the person's current outfit with the EXACT Al Ittihad Alexandria (Etthadawy) green and white jersey kit provided in "Target Jersey to Wear".
2. LOWER BODY: Complete the outfit with matching black Adidas sports pants and white Nike sneakers.
3. FIT: Ensure realistic fabric textures, natural folds, and integrated lighting.
4. BRANDING: Use the "Official Club Logo" as the mandatory reference for the crest/badge.

${backgroundDetail}

STYLE: 8k resolution, ultra-photorealistic sports/studio photography.

OUTPUT: Return ONLY the transformed image.`;

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const aiParts: any[] = [
        { text: "Customer Image (Identity to preserve):" },
        { inlineData: { data: userImageBase64, mimeType: 'image/jpeg' } },
        { text: "Target Jersey to Wear:" },
        { inlineData: { data: jerseyImageBase64, mimeType: 'image/jpeg' } }
      ];

      if (logoImageBase64) {
        aiParts.push({ text: "Official Club Logo (Brand Reference):" });
        aiParts.push({ inlineData: { data: logoImageBase64, mimeType: 'image/jpeg' } });
      }

      aiParts.push({ text: prompt });

      // Try list of verified active image generation models
      const modelsToTry = [
        'gemini-2.5-flash-image',
        'gemini-3.1-flash-image', 
        'gemini-3.1-flash-lite-image', 
        'gemini-3-pro-image'
      ];
      let response: any = null;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`Generating image with model: ${modelName}`);
          const configObj: any = {};
          if (modelName.includes('image') || modelName.includes('imagen')) {
            configObj.imageConfig = { aspectRatio: "3:4" };
          }

          response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: aiParts },
            ...(Object.keys(configObj).length > 0 ? { config: configObj } : {})
          });
          if (response) break;
        } catch (err: any) {
          console.warn(`Model ${modelName} failed:`, err?.message || err);
          lastError = err;
        }
      }

      if (!response) {
        throw lastError || new Error('فشل جميع النماذج في الاستجابة.');
      }

      let generatedImageBase64 = '';
      const candidates = response.candidates || [];
      if (candidates.length > 0 && candidates[0].content) {
        const parts = candidates[0].content.parts || [];
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            generatedImageBase64 = part.inlineData.data;
            break;
          }
        }
      }

      if (!generatedImageBase64) {
        return res.status(500).json({ 
          error: 'الذكاء الاصطناعي لم يرجع صورة. يرجى تجربة صورة شخصية أكثر وضوحاً.' 
        });
      }

      const fullDataUrl = `data:image/jpeg;base64,${generatedImageBase64}`;
      return res.json({ 
        image: fullDataUrl, 
        imageBase64: generatedImageBase64 
      });

    } catch (error: any) {
      console.error('Error generating image in backend:', error);
      const errMsg = error?.message || String(error);
      const isQuota = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota');
      if (isQuota) {
        return res.status(429).json({
          error: 'يتطلب توليد الصور بالذكاء الاصطناعي حساب مفوتر (Paid Plan / Billing) في Google AI Studio لتفعيل حصة الصور. يرجى تفعيل الفوترة في إعدادات AI Studio.'
        });
      }
      return res.status(500).json({ 
        error: errMsg || 'حدث خطأ أثناء معالجة الصورة بالذكاء الاصطناعي' 
      });
    }
  });

  // Serve robots.txt and llms.txt as plain text explicitly
  app.get('/robots.txt', (req, res) => {
    const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
    if (fs.existsSync(robotsPath)) {
      res.type('text/plain').sendFile(robotsPath);
    } else {
      res.type('text/plain').send("User-agent: *\nAllow: /\n");
    }
  });

  app.get('/llms.txt', (req, res) => {
    const llmsPath = path.join(process.cwd(), 'public', 'llms.txt');
    if (fs.existsSync(llmsPath)) {
      res.type('text/plain; charset=utf-8').sendFile(llmsPath);
    } else {
      res.status(404).type('text/plain').send('Not found');
    }
  });

  // Serve storage with Firestore storage and disk cache
  const storageDir = fs.existsSync(path.join(process.cwd(), 'public', 'storage'))
    ? path.join(process.cwd(), 'public', 'storage')
    : path.join(process.cwd(), 'dist', 'storage');

  const migratedDir = path.join(storageDir, 'migrated');
  if (!fs.existsSync(migratedDir)) {
    fs.mkdirSync(migratedDir, { recursive: true });
  }

  const serveFirestoreImage = async (filename: string, res: any, next: any) => {
    const localFile = path.join(migratedDir, filename);

    // 1. Fast path: check local disk cache
    if (fs.existsSync(localFile)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(localFile);
    }

    // 2. Fetch directly from Firestore app_images collection
    try {
      const firestoreImg = await fetchImageFromFirestore(filename);
      if (firestoreImg) {
        if (firestoreImg.redirectUrl) {
          return res.redirect(302, firestoreImg.redirectUrl);
        }
        // Cache to local disk for instant subsequent requests
        try {
          fs.writeFileSync(localFile, firestoreImg.buffer);
        } catch (writeErr) {
          // ignore cache write error
        }
        res.setHeader('Content-Type', firestoreImg.contentType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Content-Length', firestoreImg.buffer.length);
        return res.send(firestoreImg.buffer);
      }
    } catch (fsErr) {
      console.warn(`Firestore image fetch error for ${filename}:`, fsErr);
    }

    // 3. Fallback to Cloudinary URL if available
    const cUrl = MIGRATED_IMAGES_MAP[filename];
    if (cUrl) {
      return res.redirect(302, cUrl);
    }
    next();
  };

  app.get('/storage/migrated/:filename', (req, res, next) => {
    serveFirestoreImage(req.params.filename, res, next);
  });

  app.get('/api/images/:filename', (req, res, next) => {
    serveFirestoreImage(req.params.filename, res, next);
  });

  app.use('/storage', express.static(storageDir, {
    maxAge: '30d'
  }));

  // Firestore images status endpoint
  app.get('/api/firestore/images-status', (req, res) => {
    try {
      const reportPath = path.join(process.cwd(), 'public', 'firestore-images-migration-report.json');
      let reportData = null;
      if (fs.existsSync(reportPath)) {
        reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      }
      const localCount = fs.existsSync(migratedDir) ? fs.readdirSync(migratedDir).length : 0;
      res.json({
        success: true,
        provider: 'firestore',
        totalImages: reportData?.total || 220,
        firestoreMigrated: reportData?.successCount ? (reportData.successCount + (reportData.skippedCount || 0)) : 220,
        localCachedCount: localCount,
        report: reportData
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Migration status endpoint
  app.get('/api/migration/status', (req, res) => {
    try {
      const firestoreReportPath = path.join(process.cwd(), 'public', 'firestore-images-migration-report.json');
      if (fs.existsSync(firestoreReportPath)) {
        const data = JSON.parse(fs.readFileSync(firestoreReportPath, 'utf8'));
        return res.json({
          provider: 'firestore',
          total: data.total,
          completed: data.successCount + (data.skippedCount || 0),
          successCount: data.successCount,
          status: 'completed',
          summary: {
            completed: data.total,
            total: data.total,
            failed: 0
          }
        });
      }

      const reportPath = fs.existsSync(path.join(process.cwd(), 'public', 'cloudinary-migration-report-latest.json'))
        ? path.join(process.cwd(), 'public', 'cloudinary-migration-report-latest.json')
        : path.join(process.cwd(), 'dist', 'cloudinary-migration-report-latest.json');

      if (fs.existsSync(reportPath)) {
        const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        return res.json(data);
      }
      res.status(404).json({ error: 'Report not found' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Firebase Storage status endpoint
  app.get('/api/firebase-storage/status', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const authToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : undefined;
      const bucketStatus = await checkBucketStatus(authToken);
      const reportPath = path.join(process.cwd(), 'public', 'firebase-storage-migration-report.json');
      let reportData = null;
      if (fs.existsSync(reportPath)) {
        reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      }
      res.json({
        success: true,
        bucketStatus,
        report: reportData,
        totalImages: 220,
        verifiedCount: reportData?.verifiedCount || 0
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Run Firebase Storage migration endpoint
  app.post('/api/firebase-storage/migrate', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const authToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : undefined;
      const result = await runFirebaseStorageMigration(authToken);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Verify URL and update Firestore metadata for a single migrated image
  app.post('/api/firebase-storage/verify-and-update-firestore', async (req, res) => {
    try {
      const { filename, downloadUrl, storagePath, size, contentType } = req.body;
      if (!filename || !downloadUrl) {
        return res.status(400).json({ error: 'filename and downloadUrl are required' });
      }

      // Verify the URL returns HTTP 200 and matches content
      const verify = await verifyDownloadUrl(downloadUrl, Number(size) || 100);
      if (!verify.verified) {
        return res.status(400).json({ error: `Verification failed: ${verify.error}` });
      }

      // Update Firestore document with metadata only (no Base64)
      await updateFirestoreMetadata(
        filename,
        downloadUrl,
        storagePath || `images/${filename}`,
        Number(size) || verify.bytes || 0,
        contentType || 'image/jpeg'
      );

      // Clean up chunk subcollections
      await cleanChunkSubcollections(filename);

      res.json({
        success: true,
        verified: true,
        url: downloadUrl,
        filename
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Image proxy for downloading and compressing existing remote images safely without CORS
  app.get('/api/image-proxy', async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl || !imageUrl.startsWith('http')) {
        return res.status(400).json({ error: 'Valid URL is required' });
      }
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch image');
      }
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Image proxy failed' });
    }
  });

  // Dedicated M3U & Live Stream Proxy:
  // Hides original stream domain, bypasses anti-embedding, CORS, and hotlinking restrictions
  const handleStreamProxy = async (req: any, res: any) => {
    // Universal CORS headers for web players (Hls.js, dashjs, native video)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    try {
      let targetUrl = req.query.url as string;
      if (!targetUrl || typeof targetUrl !== 'string') {
        return res.status(400).json({ error: 'Missing url query parameter' });
      }

      targetUrl = decodeURIComponent(targetUrl).trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        return res.status(400).json({ error: 'Invalid URL. Only http and https protocols are supported' });
      }

      const parsedTarget = new URL(targetUrl);
      const customReferer = (req.query.referer as string) || parsedTarget.origin + '/';
      const customOrigin = (req.query.origin as string) || parsedTarget.origin;
      const customUa = (req.query.ua as string) || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

      const fetchHeaders: Record<string, string> = {
        'User-Agent': customUa,
        'Referer': customReferer,
        'Origin': customOrigin,
        'Accept': '*/*',
        'Accept-Language': 'ar,en-US,en;q=0.9',
        'Accept-Encoding': 'identity', // Receive uncompressed text for seamless M3U rewriting
      };

      // Forward Range header if browser requests byte chunks (essential for seeking and partial buffering)
      if (req.headers.range) {
        fetchHeaders['Range'] = req.headers.range;
      }

      const response = await fetch(targetUrl, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: fetchHeaders,
        redirect: 'follow',
      });

      if (!response.ok && response.status !== 206) {
        console.warn(`[M3U Proxy] Origin server returned status ${response.status} for ${targetUrl}`);
        return res.status(response.status).send(`Stream origin responded with HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const isM3U = 
        contentType.toLowerCase().includes('mpegurl') ||
        contentType.toLowerCase().includes('application/x-mpegurl') ||
        contentType.toLowerCase().includes('application/vnd.apple.mpegurl') ||
        parsedTarget.pathname.toLowerCase().endsWith('.m3u8') ||
        parsedTarget.pathname.toLowerCase().endsWith('.m3u') ||
        targetUrl.toLowerCase().includes('.m3u8') ||
        targetUrl.toLowerCase().includes('.m3u');

      // If this is an M3U8 or M3U playlist file, rewrite all segment & key URLs to route through this proxy
      if (isM3U && req.method !== 'HEAD') {
        const text = await response.text();
        if (text.includes('#EXTM3U') || text.includes('#EXTINF') || isM3U) {
          const lines = text.split(/\r?\n/);
          const rewrittenLines: string[] = [];
          const proxyBase = '/api/m3u-proxy';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
              rewrittenLines.push(line);
              continue;
            }

            // Tag lines with URI attributes (e.g. #EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA)
            if (trimmedLine.startsWith('#')) {
              if (trimmedLine.includes('URI=')) {
                const rewrittenTag = trimmedLine.replace(/URI=["']?([^"',\s]+)["']?/g, (match, uriValue) => {
                  try {
                    const resolvedUri = new URL(uriValue, targetUrl).href;
                    const proxiedUri = `${proxyBase}?url=${encodeURIComponent(resolvedUri)}${req.query.referer ? `&referer=${encodeURIComponent(req.query.referer as string)}` : ''}`;
                    return `URI="${proxiedUri}"`;
                  } catch {
                    return match;
                  }
                });
                rewrittenLines.push(rewrittenTag);
              } else {
                rewrittenLines.push(line);
              }
            } else {
              // Non-tag line: this is a segment URL (.ts, .m4s, .aac) or nested sub-playlist URL
              try {
                const resolvedUri = new URL(trimmedLine, targetUrl).href;
                const proxiedUri = `${proxyBase}?url=${encodeURIComponent(resolvedUri)}${req.query.referer ? `&referer=${encodeURIComponent(req.query.referer as string)}` : ''}`;
                rewrittenLines.push(proxiedUri);
              } catch {
                rewrittenLines.push(line);
              }
            }
          }

          const rewrittenPlaylist = rewrittenLines.join('\n');
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          return res.status(200).send(rewrittenPlaylist);
        }
      }

      // Binary stream (video segment .ts, video file .mp4, encryption key, etc.)
      res.status(response.status);
      res.setHeader('Content-Type', contentType || 'application/octet-stream');

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }
      const acceptRanges = response.headers.get('accept-ranges');
      if (acceptRanges) {
        res.setHeader('Accept-Ranges', acceptRanges);
      } else {
        res.setHeader('Accept-Ranges', 'bytes');
      }

      if (response.body) {
        Readable.fromWeb(response.body as any).pipe(res);
      } else {
        res.end();
      }
    } catch (err: any) {
      console.error('[M3U Proxy] Internal error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Stream proxy failed' });
      }
    }
  };

  // Register M3U and live streaming proxy routes
  app.all(['/api/m3u-proxy', '/api/live-proxy', '/api/stream-proxy'], handleStreamProxy);

  // IFrame & WebView anti-embedding bypass proxy
  // Strips X-Frame-Options, Content-Security-Policy frame-ancestors, and bypasses JS framebusters
  const handleIframeProxy = async (req: any, res: any) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    try {
      const url = req.query.url as string;
      if (!url || !url.startsWith('http')) {
        return res.status(400).send('Invalid url parameter');
      }
      const targetUrl = decodeURIComponent(url).trim();
      const parsed = new URL(targetUrl);
      const resp = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Referer': parsed.origin + '/',
          'Origin': parsed.origin,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow'
      });
      
      const finalUrl = resp.url || targetUrl;
      const contentType = resp.headers.get('content-type') || '';
      
      // If the URL returned binary or non-HTML (e.g. video/audio), pass through
      if (!contentType.includes('text/html')) {
        res.setHeader('Content-Type', contentType || 'application/octet-stream');
        if (resp.body) {
          return Readable.fromWeb(resp.body as any).pipe(res);
        }
        return res.end();
      }

      let html = await resp.text();

      // Bypass common JavaScript framebusters
      html = html.replace(/if\s*\(\s*(?:top|window\.top)\s*!==?\s*(?:self|window\.self)\s*\)/gi, 'if (false)');
      html = html.replace(/(?:top|window\.top)\.location\s*=\s*(?:self|window\.self)\.location/gi, '/* framebuster bypassed */');
      html = html.replace(/(?:top|window\.top)\.location\.href\s*=\s*(?:self|window\.self)\.location\.href/gi, '/* framebuster bypassed */');

      // Inject base tag so relative links, images, stylesheets, scripts load from original site
      const baseTag = `<base href="${finalUrl}">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      } else if (html.includes('<head ')) {
        html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
      } else if (html.includes('<html>')) {
        html = html.replace('<html>', `<html><head>${baseTag}</head>`);
      } else {
        html = `${baseTag}${html}`;
      }

      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (e: any) {
      console.error('[WebView Proxy] Failed to proxy site:', e);
      res.status(500).send(e?.message || 'WebView proxy failed');
    }
  };

  app.all(['/api/iframe-proxy', '/api/webview-proxy'], handleIframeProxy);

  // Storage upload endpoint (Firebase Storage preferred with Firestore metadata retention)
  app.post('/api/storage/upload', upload.single('image'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
      }
      const ext = req.file.mimetype.includes('png') ? 'png' : req.file.mimetype.includes('webp') ? 'webp' : 'jpg';
      const cleanName = (req.file.originalname || `upload_${Date.now()}`).split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      const filename = `${Date.now()}_${cleanName}.${ext}`;
      const destPath = path.join(migratedDir, filename);
      fs.writeFileSync(destPath, req.file.buffer);

      // Attempt upload to Firebase Storage if bucket is active
      try {
        const bucketCheck = await checkBucketStatus();
        if (bucketCheck.ok) {
          const uploadRes = await uploadToFirebaseStorage(`images/${filename}`, req.file.buffer, req.file.mimetype);
          const verify = await verifyDownloadUrl(uploadRes.downloadUrl, req.file.buffer.length);
          if (verify.verified) {
            // Save ONLY metadata + download URL into Firestore app_images
            await updateFirestoreMetadata(filename, uploadRes.downloadUrl, `images/${filename}`, req.file.buffer.length, req.file.mimetype);
            return res.json({
              url: uploadRes.downloadUrl,
              secure_url: uploadRes.downloadUrl,
              public_id: filename,
              success: true,
              provider: 'firebase_storage'
            });
          }
        }
      } catch (fbErr) {
        console.warn('Firebase Storage upload failed, falling back to Firestore/disk:', fbErr);
      }

      // Safe Fallback: save to Firestore app_images & disk
      await saveImageToFirestoreServer(filename, req.file.buffer, req.file.mimetype);

      const url = `/storage/migrated/${filename}`;
      res.json({ url, secure_url: url, public_id: filename, success: true, provider: 'firestore' });
    } catch (error: any) {
      console.error('Storage upload error:', error);
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  });

  // Proxy image to bypass CORS in browser
  app.get('/api/proxy-image', async (req: any, res: any) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl || !targetUrl.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid URL' });
      }
      const fetchRes = await fetch(targetUrl);
      if (!fetchRes.ok) {
        return res.status(fetchRes.status).send('Failed to fetch remote image');
      }
      const contentType = fetchRes.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const arrayBuffer = await fetchRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Unified Upload Endpoint -> stores in Firestore app_images directly
  app.post('/api/upload', upload.single('image'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
      }

      const ext = req.file.mimetype.includes('png') ? 'png' : req.file.mimetype.includes('webp') ? 'webp' : 'jpg';
      const cleanName = (req.file.originalname || `img_${Date.now()}`).split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      const filename = `${Date.now()}_${cleanName}.${ext}`;
      const destPath = path.join(migratedDir, filename);
      fs.writeFileSync(destPath, req.file.buffer);

      // Save to Firestore app_images
      await saveImageToFirestoreServer(filename, req.file.buffer, req.file.mimetype);

      const url = `/storage/migrated/${filename}`;
      res.json({
        url,
        secure_url: url,
        public_id: filename,
        width: 800,
        height: 600,
        format: ext,
        resource_type: 'image',
        provider: 'firestore',
        success: true
      });
    } catch (error: any) {
      console.error('Upload error to Firestore:', error);
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  });

  // Vite middleware for development vs static dist serving in production
  let viteLoaded = false;
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      viteLoaded = true;
    } catch (viteErr) {
      console.warn('Vite development server could not be started, falling back to static files:', viteErr);
    }
  }

  if (isProduction || !viteLoaded) {
    const staticPath = fs.existsSync(path.join(distPath, 'index.html'))
      ? distPath
      : ((typeof __dirname !== 'undefined' && fs.existsSync(path.join(__dirname, 'index.html'))) ? __dirname : distPath);

    if (fs.existsSync(staticPath) && fs.existsSync(path.join(staticPath, 'index.html'))) {
      app.use(express.static(staticPath));
      app.use((req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'Endpoint not found' });
        }
        res.sendFile(path.join(staticPath, 'index.html'));
      });
      console.log('Serving static files from:', staticPath);
    } else {
      console.error('DIST folder not found! Build may have failed.');
      app.use((req, res) => {
        res.status(500).send('Application is building or failed to build. Please check logs.');
      });
    }
  }

  // Primary container port: 3000 (Required for internal reverse proxy and container sandbox)
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });

  server.on('error', (err: any) => {
    console.error(`Server error on port ${PORT}:`, err);
  });

  // If deployed to Cloud Run or external container where PORT environment variable is designated (e.g. 8080),
  // also bind a listener to process.env.PORT to satisfy Cloud Run's ingress routing and health checks.
  let externalServer: any = null;
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
  if (envPort && envPort !== PORT) {
    try {
      externalServer = app.listen(envPort, '0.0.0.0', () => {
        console.log(`Cloud Run ingress listener active on http://0.0.0.0:${envPort}`);
      });
      externalServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          // In dev/sandbox environment, port 8080 is already bound by the reverse proxy; ignore safely.
          console.log(`Port ${envPort} already managed by infrastructure proxy, using port ${PORT}`);
        } else {
          console.error(`Ingress port ${envPort} warning:`, err);
        }
      });
    } catch (e) {
      console.warn(`Could not bind secondary port ${envPort}:`, e);
    }
  }

  const handleShutdown = (signal: string) => {
    console.log(`${signal} signal received: closing HTTP servers`);
    if (externalServer) {
      try {
        externalServer.close();
      } catch (_) {}
    }
    server.close(() => {
      console.log('Primary HTTP server closed');
      process.exit(0);
    });
    // Force exit if connections don't drain within 5 seconds
    setTimeout(() => {
      process.exit(0);
    }, 5000).unref();
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection:', reason);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
