/**
 * Settings Routes — persists admin platform configuration to a local JSON file.
 *
 * POST /api/settings  → save (admin only)
 * GET  /api/settings  → load (admin only)
 */
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface AuthMeResponse {
  success?: boolean;
  data?: TokenPayload;
}

// ── Persistence path ─────────────────────────────────────────────
const SETTINGS_FILE = path.resolve(__dirname, '../../data/settings.json');

function ensureDir() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ── Defaults ─────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  siteName: 'Assiette Gala',
  siteLogo: '',
  siteDescription: 'Plateforme Traiteur Intelligente',
  siteEmail: 'assiestte.sfaxienne@gmail.com',
  sitePhone: '+216 24 230 587',
  siteAddress: 'Route Mahdia KM 1, Sfax, Tunisie',
  deliveryFee: '5.00',
  minOrderAmount: '30.00',
  taxRate: '19',
  enableNotifications: true,
  enableEmailAlerts: true,
  maintenanceMode: false,
};

// ── Helper: extract & verify JWT from Authorization header ───────
async function extractAdmin(req: Request): Promise<TokenPayload | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const response = await fetch(`${authServiceUrl}/api/me`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as AuthMeResponse;
    const user = payload?.data;
    if (!user) return null;

    return user.role === 'ADMIN' ? user : null;
  } catch {
    return null;
  }
}

// ── GET /api/settings/public — no auth, returns branding only ────
router.get('/public', (_req: Request, res: Response) => {
  ensureDir();
  let settings = DEFAULT_SETTINGS;
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) };
    }
  } catch { /* use defaults */ }

  // Only expose branding fields (no internal config)
  res.json({
    success: true,
    data: {
      siteName: settings.siteName,
      siteLogo: settings.siteLogo,
      siteDescription: settings.siteDescription,
      siteEmail: settings.siteEmail,
      sitePhone: settings.sitePhone,
      siteAddress: settings.siteAddress,
    },
  });
});

// ── GET /api/settings ────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const admin = await extractAdmin(req);
  if (!admin) {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }

  ensureDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      res.json({ success: true, data: JSON.parse(raw) });
    } else {
      res.json({ success: true, data: DEFAULT_SETTINGS });
    }
  } catch {
    res.json({ success: true, data: DEFAULT_SETTINGS });
  }
});

// ── POST /api/settings ───────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const admin = await extractAdmin(req);
  if (!admin) {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }

  ensureDir();
  const settings = { ...DEFAULT_SETTINGS, ...req.body };

  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
});

export default router;
