import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CogIcon, BellIcon, ShieldCheckIcon, ClockIcon, TruckIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Button, Input, Card } from '@/components/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useSiteStore } from '@/stores/site.store';
import { catalogService } from '@/services/catalog.service';

interface SiteSettings {
  siteName: string;
  siteLogo?: string;
  siteDescription: string;
  siteEmail: string;
  sitePhone: string;
  siteAddress: string;
  deliveryFee: string;
  minOrderAmount: string;
  taxRate: string;
  openingHours: string;
  closingHours: string;
  closedDays: string;
  deliveryZones: string;
  enableNotifications: boolean;
  enableEmailAlerts: boolean;
  maintenanceMode: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'Assiette Gala',
  siteDescription: 'Plateforme Traiteur Intelligente',
  siteEmail: 'assiestte.sfaxienne@gmail.com',
  sitePhone: '+216 24 230 587',
  siteAddress: 'Route Mahdia KM 1, Sfax, Tunisie',
  deliveryFee: '5.00',
  minOrderAmount: '30.00',
  taxRate: '19',
  openingHours: '08:00',
  closingHours: '22:00',
  closedDays: 'Dimanche',
  deliveryZones: 'Sfax, Sakiet Ezzit, Sakiet Eddaier, Thyna, El Ain',
  enableNotifications: true,
  enableEmailAlerts: true,
  maintenanceMode: false,
};

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  const { data: savedSettings } = useQuery<SiteSettings>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data?.data ?? DEFAULT_SETTINGS;
    },
    retry: false,
    refetchOnWindowFocus: false,
    throwOnError: false,
  });

  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const response = await catalogService.uploadImage(file);
      if (response.success && response.url) {
        setSettings({ ...settings, siteLogo: response.url });
        toast.success("Logo téléchargé avec succès");
      }
    } catch (error) {
      toast.error("Erreur lors du téléchargement du logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Sync local state when server data arrives
  useEffect(() => {
    if (savedSettings) setSettings(savedSettings);
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data: SiteSettings) => {
      const res = await api.post('/settings', data);
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      // Reload site config so all components pick up updated branding
      useSiteStore.setState({ loaded: false });
      useSiteStore.getState().loadConfig();
      toast.success('Paramètres enregistrés avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde des paramètres');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-medium text-gray-900/90">Paramètres</h1>
        <p className="text-gray-400 mt-1">Configurez les paramètres de votre plateforme</p>
      </motion.div>

      {/* General Settings */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <CogIcon className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Paramètres généraux</h3>
              <p className="text-sm text-gray-400">Informations de base de votre site</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo du site</label>
              <div className="mt-1 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-6">
                <div className="text-center">
                  {settings.siteLogo ? (
                    <div className="relative group mx-auto w-32 h-32">
                      <img src={settings.siteLogo} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                      <button 
                        type="button" 
                        onClick={() => setSettings({ ...settings, siteLogo: '' })} 
                        className="absolute inset-0 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                      >
                        Retirer
                      </button>
                    </div>
                  ) : (
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                  )}
                  <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                    <label
                      htmlFor="logo-upload"
                      className="relative cursor-pointer rounded-md bg-white font-semibold text-primary-600 focus-within:outline-none hover:text-primary-500"
                    >
                      <span>{isUploadingLogo ? 'Téléchargement...' : 'Changer le logo'}</span>
                      <input 
                        id="logo-upload" 
                        name="logo-upload" 
                        type="file" 
                        className="sr-only" 
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <Input
              label="Nom du site"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            />
            <Input
              label="Description"
              value={settings.siteDescription}
              onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
            />
            <Input
              label="Email de contact"
              type="email"
              value={settings.siteEmail}
              onChange={(e) => setSettings({ ...settings, siteEmail: e.target.value })}
            />
            <Input
              label="T\u00e9l\u00e9phone"
              value={settings.sitePhone}
              onChange={(e) => setSettings({ ...settings, sitePhone: e.target.value })}
            />
            <Input
              label="Adresse"
              value={settings.siteAddress}
              onChange={(e) => setSettings({ ...settings, siteAddress: e.target.value })}
              className="md:col-span-2"
            />
          </div>
        </Card.Body>
      </Card>

      {/* Opening Hours */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <ClockIcon className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Horaires d'ouverture</h3>
              <p className="text-sm text-gray-400">Définissez vos horaires de service</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Ouverture"
              type="time"
              value={settings.openingHours}
              onChange={(e) => setSettings({ ...settings, openingHours: e.target.value })}
            />
            <Input
              label="Fermeture"
              type="time"
              value={settings.closingHours}
              onChange={(e) => setSettings({ ...settings, closingHours: e.target.value })}
            />
            <Input
              label="Jours de fermeture"
              value={settings.closedDays}
              onChange={(e) => setSettings({ ...settings, closedDays: e.target.value })}
            />
          </div>
        </Card.Body>
      </Card>

      {/* Delivery Zones */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <TruckIcon className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Zones de livraison</h3>
              <p className="text-sm text-gray-400">Définissez les zones couvertes par la livraison</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <Input
            label="Zones (séparées par des virgules)"
            value={settings.deliveryZones}
            onChange={(e) => setSettings({ ...settings, deliveryZones: e.target.value })}
          />
        </Card.Body>
      </Card>

      {/* Pricing Settings */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <span className="text-emerald-400 text-lg">DT</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Tarification</h3>
              <p className="text-sm text-gray-400">Frais et taxes</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Frais de livraison (DT)"
              type="number"
              value={settings.deliveryFee}
              onChange={(e) => setSettings({ ...settings, deliveryFee: e.target.value })}
            />
            <Input
              label="Commande minimum (DT)"
              type="number"
              value={settings.minOrderAmount}
              onChange={(e) => setSettings({ ...settings, minOrderAmount: e.target.value })}
            />
            <Input
              label="Taux de TVA (%)"
              type="number"
              value={settings.taxRate}
              onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
            />
          </div>
        </Card.Body>
      </Card>

      {/* Notification Settings */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BellIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Notifications</h3>
              <p className="text-sm text-gray-400">Gérez les alertes et notifications</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-900">Notifications push</p>
              <p className="text-sm text-gray-400">Recevoir des notifications en temps réel</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-100 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:border-gray-200 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">Alertes email</p>
              <p className="text-sm text-gray-400">Recevoir des emails pour les nouvelles commandes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableEmailAlerts}
                onChange={(e) => setSettings({ ...settings, enableEmailAlerts: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-100 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:border-gray-200 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        </Card.Body>
      </Card>

      {/* Maintenance Mode */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <ShieldCheckIcon className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Mode maintenance</h3>
              <p className="text-sm text-gray-400">Désactiver temporairement le site</p>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Activer le mode maintenance</p>
              <p className="text-sm text-gray-400">Le site sera inaccessible aux visiteurs</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-100 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:border-gray-200 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>
        </Card.Body>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </div>
    </div>
  );
}


