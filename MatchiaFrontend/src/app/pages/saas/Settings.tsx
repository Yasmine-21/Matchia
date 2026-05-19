import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Save, AlertCircle, CheckCircle2, Lock, Globe, Bell, Shield } from 'lucide-react';

export function SaaSSettings() {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [settings, setSettings] = useState({
    platformName: 'Matchia',
    platformUrl: 'https://matchia.com',
    supportEmail: 'support@matchia.com',
    maintenanceMode: false,
    allowNewBankRegistration: true,
    requireEmailVerification: true,
    sessionTimeout: 30,
    maxBanksPerAdmin: 5,
    enableTwoFactor: false,
    logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop',
  });

  const handleInputChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Paramètres de plateforme</h1>
        <p className="text-muted-foreground">Configurez les paramètres globaux de Matchia</p>
      </div>

      {/* General Settings */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <CardTitle>Configuration générale</CardTitle>
          </div>
          <CardDescription>Informations de base de la plateforme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nom de la plateforme</label>
              <Input
                value={settings.platformName}
                onChange={(e) => handleInputChange('platformName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">URL de la plateforme</label>
              <Input
                value={settings.platformUrl}
                onChange={(e) => handleInputChange('platformUrl', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email support</label>
              <Input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => handleInputChange('supportEmail', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">URL du logo</label>
              <Input
                value={settings.logoUrl}
                onChange={(e) => handleInputChange('logoUrl', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            <CardTitle>Sécurité</CardTitle>
          </div>
          <CardDescription>Paramètres de sécurité et d'authentification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Délai d'expiration de session (minutes)</label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max de banques par admin</label>
              <Input
                type="number"
                value={settings.maxBanksPerAdmin}
                onChange={(e) => handleInputChange('maxBanksPerAdmin', parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="emailVerification"
                checked={settings.requireEmailVerification}
                onChange={(e) => handleInputChange('requireEmailVerification', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="emailVerification" className="text-sm font-medium cursor-pointer">
                Exiger la vérification par email
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="twoFactor"
                checked={settings.enableTwoFactor}
                onChange={(e) => handleInputChange('enableTwoFactor', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="twoFactor" className="text-sm font-medium cursor-pointer">
                Activer l'authentification deux facteurs
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Settings */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-600" />
            <CardTitle>Inscription</CardTitle>
          </div>
          <CardDescription>Contrôler l'inscription des nouvelles banques</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="newBankReg"
              checked={settings.allowNewBankRegistration}
              onChange={(e) => handleInputChange('allowNewBankRegistration', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="newBankReg" className="text-sm font-medium cursor-pointer flex-1">
              Autoriser les nouvelles inscriptions de banques
            </label>
            <Badge variant={settings.allowNewBankRegistration ? 'default' : 'secondary'}>
              {settings.allowNewBankRegistration ? 'Activé' : 'Désactivé'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Si désactivé, seul le super administrateur peut ajouter de nouvelles banques.
          </p>
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-secondary" />
            <CardTitle>Mode maintenance</CardTitle>
          </div>
          <CardDescription>Mettre la plateforme en maintenance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-secondary/5 rounded-lg border border-secondary/20">
            <input
              type="checkbox"
              id="maintenance"
              checked={settings.maintenanceMode}
              onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <div className="flex-1">
              <label htmlFor="maintenance" className="text-sm font-medium cursor-pointer block">
                Activer le mode maintenance
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Attention: La plateforme sera inaccessible à tous les utilisateurs sauf aux super admins.
              </p>
            </div>
            <Badge variant="outline" className={settings.maintenanceMode ? 'bg-red-100 text-red-800' : ''}>
              {settings.maintenanceMode ? 'ON' : 'OFF'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-sky-600" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Paramètres de notification de plateforme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Les notifications seront envoyées à: {settings.supportEmail}
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300" />
              <label className="text-sm font-medium cursor-pointer">
                Notifier sur les nouvelles demandes d'inscription
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300" />
              <label className="text-sm font-medium cursor-pointer">
                Notifier sur les erreurs système
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
              <label className="text-sm font-medium cursor-pointer">
                Notifier sur les tentatives de connexion suspectes
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
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
