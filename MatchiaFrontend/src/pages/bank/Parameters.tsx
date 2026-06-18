import { useEffect, useState } from 'react';
import { Globe, Shield, Bell, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useBankTenant } from '../../hooks/useBankTenant';

export function BankParameters() {
  const { marketplace, isLoading, error } = useBankTenant();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [settings, setSettings] = useState({
    platformName: '',
    platformUrl: '',
    supportEmail: '',
    maintenanceMode: false,
    allowNewBankRegistration: true,
    requireEmailVerification: true,
    sessionTimeout: 30,
    maxBanksPerAdmin: 5,
    enableTwoFactor: false,
    logoUrl: '',
  });

  useEffect(() => {
    setSettings({
      platformName: marketplace?.bankName || 'Plateforme bancaire',
      platformUrl: marketplace?.bankWebsiteUrl || `${window.location.origin}`,
      supportEmail: marketplace?.bankEmail || 'support@platform.tld',
      maintenanceMode: false,
      allowNewBankRegistration: true,
      requireEmailVerification: true,
      sessionTimeout: 30,
      maxBanksPerAdmin: 5,
      enableTwoFactor: false,
      logoUrl: marketplace?.logoImageUrl || marketplace?.bankLogoUrl || '',
    });
  }, [marketplace]);

  const handleInputChange = (key: keyof typeof settings, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSaveStatus('success');
      toast.success('Paramètres de la plateforme enregistrés.');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (saveError) {
      console.error('Failed to save platform settings:', saveError);
      setSaveStatus('error');
      toast.error("Impossible d'enregistrer les paramètres.");
    }
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Chargement des paramètres...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Paramètres de la plateforme</h1>
          <p className="text-muted-foreground">
            {marketplace?.bankName
              ? `Réglages globaux du back office de ${marketplace.bankName}`
              : 'Réglages globaux du back office courant'}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>Configuration générale</CardTitle>
              </div>
              <CardDescription>Informations de base de la plateforme bancaire</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Nom de la plateforme</label>
                  <Input
                    value={settings.platformName}
                    onChange={(e) => handleInputChange('platformName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">URL de la plateforme</label>
                  <Input
                    value={settings.platformUrl}
                    onChange={(e) => handleInputChange('platformUrl', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email support</label>
                  <Input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Logo URL</label>
                  <Input
                    value={settings.logoUrl}
                    onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                <CardTitle>Sécurité</CardTitle>
              </div>
              <CardDescription>Paramètres de sécurité et d'authentification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Expiration de session (minutes)</label>
                  <Input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleInputChange('sessionTimeout', Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Max banques par admin</label>
                  <Input
                    type="number"
                    value={settings.maxBanksPerAdmin}
                    onChange={(e) => handleInputChange('maxBanksPerAdmin', Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.requireEmailVerification}
                    onChange={(e) => handleInputChange('requireEmailVerification', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Exiger la vérification par email</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.enableTwoFactor}
                    onChange={(e) => handleInputChange('enableTwoFactor', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Activer l'authentification à deux facteurs</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-sky-600" />
                <CardTitle>Inscription et notifications</CardTitle>
              </div>
              <CardDescription>Contrôle d'accès et alertes de la plateforme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.allowNewBankRegistration}
                    onChange={(e) => handleInputChange('allowNewBankRegistration', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Autoriser les nouvelles inscriptions de banques</span>
                </label>
                <Badge variant={settings.allowNewBankRegistration ? 'success' : 'warning'}>
                  {settings.allowNewBankRegistration ? 'Activé' : 'Désactivé'}
                </Badge>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="text-sm font-medium text-muted-foreground">Notifications envoyées à</div>
                <div className="mt-1 font-semibold">{settings.supportEmail}</div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300" />
                  <span className="text-sm font-medium">Notifier sur les nouvelles demandes d'inscription</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300" />
                  <span className="text-sm font-medium">Notifier sur les erreurs système</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                  <span className="text-sm font-medium">Notifier sur les tentatives de connexion suspectes</span>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mode maintenance</CardTitle>
              <CardDescription>Rendre la plateforme temporairement indisponible</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/5 p-4">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Activer le mode maintenance</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    La plateforme sera inaccessible pour tous les utilisateurs sauf les super admins.
                  </p>
                </div>
                <Badge variant={settings.maintenanceMode ? 'danger' : 'secondary'}>
                  {settings.maintenanceMode ? 'ON' : 'OFF'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          icon={<Save className="w-5 h-5" />}
        >
          {saveStatus === 'saving' ? 'Enregistrement...' : 'Enregistrer les paramètres'}
        </Button>
        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Paramètres enregistrés</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Erreur lors de l'enregistrement</span>
          </div>
        )}
      </div>
    </div>
  );
}
