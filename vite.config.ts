import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function photoPersistencePlugin(): Plugin {
  const dataDir = path.resolve(__dirname, 'data');
  const photosFile = path.join(dataDir, 'photos.json');
  const profileFile = path.join(dataDir, 'profile.json');
  const portfolioContentFile = path.resolve(__dirname, 'src/data/portfolioContent.json');
  const publicDir = path.resolve(__dirname, 'public');
  const publicPhotosDir = path.join(publicDir, 'photos');

  function saveBase64Image(dataUrl: string, destPath: string): boolean {
    try {
      const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+-]+);base64,(.+)$/);
      if (!match) return false;
      const buffer = Buffer.from(match[2], 'base64');
      fs.writeFileSync(destPath, buffer);
      return true;
    } catch (e) {
      console.error('Failed to save base64 image:', e);
      return false;
    }
  }

  return {
    name: 'photo-persistence-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();

        // ── Comprehensive Sync-All Endpoint ──
        if (req.url === '/api/sync-all' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              let current: any = {};
              if (fs.existsSync(portfolioContentFile)) {
                try {
                  current = JSON.parse(fs.readFileSync(portfolioContentFile, 'utf-8'));
                } catch {}
              }

              // Ensure public directories exist
              if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
              if (!fs.existsSync(publicPhotosDir)) fs.mkdirSync(publicPhotosDir, { recursive: true });

              // 1. Handle Portrait
              if (payload.portrait) {
                if (payload.portrait.startsWith('data:image/')) {
                  const portraitDest = path.join(publicDir, 'sriram-portrait.jpg');
                  if (saveBase64Image(payload.portrait, portraitDest)) {
                    current.portrait = '/sriram-portrait.jpg';
                  } else {
                    current.portrait = payload.portrait;
                  }
                } else {
                  current.portrait = payload.portrait;
                }
              }

              // 2. Handle Hero
              if (payload.hero) {
                if (payload.hero.startsWith('data:image/')) {
                  const heroDest = path.join(publicDir, 'sriram-hero.jpg');
                  if (saveBase64Image(payload.hero, heroDest)) {
                    current.hero = '/sriram-hero.jpg';
                  } else {
                    current.hero = payload.hero;
                  }
                } else {
                  current.hero = payload.hero;
                }
              }

              // 3. Handle Hero Focus
              if (payload.heroFocus) {
                current.heroFocus = payload.heroFocus;
              }

              // 4. Handle About
              if (payload.about) {
                current.about = { ...current.about, ...payload.about };
              }

              // 5. Handle Photos: strictly keep ONLY user-uploaded photos, filtering out template/demo entries
              if (Array.isArray(payload.photos) && payload.photos.length > 0) {
                const processedPhotos = payload.photos
                  .filter((p: any) => 
                    p && 
                    typeof p.imageUrl === 'string' &&
                    p.imageUrl.trim().length > 0 &&
                    !p.imageUrl.includes('unsplash.com') &&
                    !p.id?.startsWith('catalog-') &&
                    !p.id?.startsWith('sample-') &&
                    !p.id?.startsWith('demo-')
                  )
                  .map((p: any, idx: number) => {
                    if (p.imageUrl && p.imageUrl.startsWith('data:image/')) {
                      const safeId = p.id || `still-${Date.now()}-${idx}`;
                      const photoDest = path.join(publicPhotosDir, `${safeId}.jpg`);
                      if (saveBase64Image(p.imageUrl, photoDest)) {
                        return { ...p, imageUrl: `/photos/${safeId}.jpg` };
                      }
                    }
                    return p;
                  });
                if (processedPhotos.length > 0) {
                  current.photos = processedPhotos;
                }
              }

              // Save to src/data/portfolioContent.json
              const srcDataDir = path.dirname(portfolioContentFile);
              if (!fs.existsSync(srcDataDir)) fs.mkdirSync(srcDataDir, { recursive: true });
              fs.writeFileSync(portfolioContentFile, JSON.stringify(current, null, 2), 'utf-8');

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                message: 'All content permanently synced to codebase!',
                photosCount: current.photos?.length || 0,
                hasPortrait: Boolean(current.portrait),
                hasHero: Boolean(current.hero)
              }));
            } catch (err: any) {
              console.error('Error in /api/sync-all:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Sync failed' }));
            }
          });
          return;
        }

        // ── Get All Portfolio Content Endpoint ──
        if (req.url === '/api/portfolio-content' && req.method === 'GET') {
          if (fs.existsSync(portfolioContentFile)) {
            try {
              const data = fs.readFileSync(portfolioContentFile, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
              return;
            } catch (err) {
              console.error('Error reading portfolioContent.json', err);
            }
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({}));
          return;
        }

        // ── Creator Authentication & Status ──
        if (req.url === '/api/creator-verify' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              const key = String(parsed.passkey || '').toLowerCase().trim();
              const valid = ['srk', 'srk31', 'thesrkphotography31@gmail.com', 'sriram', 'sriramkarthik', 'admin', 'creator'].includes(key);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ authenticated: valid }));
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid request', authenticated: false }));
            }
          });
          return;
        }

        // ── Photos Endpoints ──
        if (req.url === '/api/photos' && req.method === 'GET') {
          if (fs.existsSync(photosFile)) {
            try {
              const data = fs.readFileSync(photosFile, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
              return;
            } catch (err) {
              console.error('Error reading photos.json', err);
            }
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify([]));
          return;
        }

        if (req.url === '/api/photos' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
              }
              fs.writeFileSync(photosFile, JSON.stringify(parsed, null, 2), 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, count: Array.isArray(parsed) ? parsed.length : 0 }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to save photos' }));
            }
          });
          return;
        }

        if (req.url === '/api/photos/reset' && req.method === 'POST') {
          try {
            if (fs.existsSync(photosFile)) {
              fs.unlinkSync(photosFile);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Failed to reset photos' }));
          }
          return;
        }

        // ── Profile Photo Endpoints ──
        if (req.url === '/api/profile' && req.method === 'GET') {
          if (fs.existsSync(profileFile)) {
            try {
              const data = fs.readFileSync(profileFile, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
              return;
            } catch (err) {
              console.error('Error reading profile.json', err);
            }
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ photoUrl: null }));
          return;
        }

        if (req.url === '/api/profile' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
              }
              fs.writeFileSync(profileFile, JSON.stringify(parsed, null, 2), 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to save profile' }));
            }
          });
          return;
        }

        if (req.url === '/api/profile/reset' && req.method === 'POST') {
          try {
            if (fs.existsSync(profileFile)) {
              fs.unlinkSync(profileFile);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Failed to reset profile' }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), photoPersistencePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
