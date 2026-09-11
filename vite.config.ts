import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const translateHandler = async (req: any, res: any) => {
  try {
    const url = new URL(req.url || '', 'http://localhost:5173');
    let text = url.searchParams.get('text');

    if (!text && req.method === 'POST') {
      const chunks: Uint8Array[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      try {
        const body = JSON.parse(new TextDecoder().decode(merged));
        text = body.text;
      } catch (e) {}
    }

    if (!text || !text.trim()) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing text' }));
      return;
    }

    let translated = '';

    // Primary: Google Chrome extension translation endpoint (No 429 rate limit!)
    try {
      const c5Url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=th&q=${encodeURIComponent(text.trim())}`;
      const c5Res = await fetch(c5Url);
      if (c5Res.ok) {
        const c5Data: any = await c5Res.json();
        if (Array.isArray(c5Data) && c5Data[0]) {
          translated = typeof c5Data[0] === 'string' ? c5Data[0] : (Array.isArray(c5Data[0]) ? c5Data[0].join('') : '');
        }
      }
    } catch (e1) {
      console.warn('clients5 translate error, trying fallback:', e1);
    }

    // Fallback: Google GTX endpoint
    if (!translated) {
      try {
        const targetUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=th&dt=t&q=${encodeURIComponent(text.trim())}`;
        const gRes = await fetch(targetUrl);
        if (gRes.ok) {
          const data: any = await gRes.json();
          if (Array.isArray(data) && Array.isArray(data[0])) {
            translated = data[0].map((item: any) => item[0]).filter(Boolean).join('');
          }
        }
      } catch (e2) {
        console.warn('gtx fallback error:', e2);
      }
    }

    if (!translated) {
      throw new Error('All translation providers failed');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ translatedText: translated }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ error: err.message }));
  }
};

function translateApiPlugin(): Plugin {
  return {
    name: 'translate-api',
    configureServer(server) {
      server.middlewares.use('/api/translate', translateHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/translate', translateHandler);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), translateApiPlugin()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 5173,
    host: true,
  },
});
