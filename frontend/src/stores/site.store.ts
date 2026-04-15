/**
 * Site configuration store — single source of truth for all branding.
 *
 * Loaded once from GET /api/settings/public (no auth needed).
 * Admin can update via the settings page, which invalidates the cache.
 * Every component that needs siteName, email, phone, address reads from here.
 */
import { create } from 'zustand';
import axios from 'axios';

export interface SiteConfig {
  siteName: string;
  siteLogo?: string;
  siteDescription: string;
  siteEmail: string;
  sitePhone: string;
  siteAddress: string;
}

interface SiteStore {
  config: SiteConfig;
  loaded: boolean;
  loadConfig: () => Promise<void>;
}

const DEFAULTS: SiteConfig = {
  siteName: 'Assiette Gala',
  siteDescription: 'Plateforme Traiteur Intelligente',
  siteEmail: 'assiestte.sfaxienne@gmail.com',
  sitePhone: '+216 24 230 587',
  siteAddress: 'Route Mahdia KM 1, Sfax, Tunisie',
};

export const useSiteStore = create<SiteStore>((set, get) => ({
  config: DEFAULTS,
  loaded: false,

  loadConfig: async () => {
    if (get().loaded) return;
    try {
      const res = await axios.get('/api/settings/public');
      if (res.data?.data) {
        set({ config: { ...DEFAULTS, ...res.data.data }, loaded: true });
      }
    } catch {
      // Use defaults if API unavailable
      set({ loaded: true });
    }
  },
}));
