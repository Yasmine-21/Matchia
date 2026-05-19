import '../../../styles/BankBranding.css';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Upload, Save, Eye, RotateCcw } from 'lucide-react';
import { bankBrandings } from '../../data/mockData';

export function BankBranding() {
  const [branding, setBranding] = useState(bankBrandings[0]);
  const [previewMode, setPreviewMode] = useState(false);

  return (
    <div className="branding-container">
      <div className="branding-header">
        <div>
          <h1 className="branding-title">Personnalisation du branding</h1>
          <p className="branding-subtitle">Configurez l'apparence de votre marketplace</p>
        </div>
        <div className="branding-actions">
          <Button variant="outline" icon={<Eye className="w-5 h-5" />} onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? 'Éditer' : 'Aperçu'}
          </Button>
          <Button icon={<Save className="w-5 h-5" />}>Enregistrer</Button>
        </div>
      </div>

      <div className="branding-main-grid">
        <div className="branding-content-col">
          <Card>
            <CardHeader>
              <CardTitle>Couleurs</CardTitle>
              <CardDescription>Définissez votre palette de couleurs</CardDescription>
            </CardHeader>
            <CardContent className="branding-form-spacing">
              <div className="branding-color-grid">
                <div>
                  <label className="branding-label">Couleur principale</label>
                  <div className="branding-actions">
                    <input
                      type="color"
                      value={branding.primary_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="branding-color-picker"
                    />
                    <Input
                      value={branding.primary_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="branding-color-text"
                    />
                  </div>
                </div>
                <div>
                  <label className="branding-label">Couleur secondaire</label>
                  <div className="branding-actions">
                    <input
                      type="color"
                      value={branding.secondary_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="branding-color-picker"
                    />
                    <Input
                      value={branding.secondary_color}
                      onChange={(e) => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="branding-color-text"
                    />
                  </div>
                </div>
              </div>
              <div className="branding-presets-grid">
                <button
                  onClick={() => setBranding(prev => ({ ...prev, primary_color: '#0066a1', secondary_color: '#00a651' }))}
                  className="branding-preset-btn"
                  style={{ background: 'linear-gradient(to right, #0066a1 50%, #00a651 50%)' }}
                />
                <button
                  onClick={() => setBranding(prev => ({ ...prev, primary_color: '#c41e3a', secondary_color: '#1a1a1a' }))}
                  className="branding-preset-btn"
                  style={{ background: 'linear-gradient(to right, #c41e3a 50%, #1a1a1a 50%)' }}
                />
                <button
                  onClick={() => setBranding(prev => ({ ...prev, primary_color: '#2563eb', secondary_color: '#f97316' }))}
                  className="branding-preset-btn"
                  style={{ background: 'linear-gradient(to right, #2563eb 50%, #f97316 50%)' }}
                />
                <button
                  onClick={() => setBranding(prev => ({ ...prev, primary_color: '#8b5cf6', secondary_color: '#ec4899' }))}
                  className="branding-preset-btn"
                  style={{ background: 'linear-gradient(to right, #8b5cf6 50%, #ec4899 50%)' }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>Téléchargez vos images de marque</CardDescription>
            </CardHeader>
            <CardContent className="branding-form-spacing">
              <div>
                <label className="branding-label">Logo</label>
                <div className="branding-upload-area">
                  {branding.logo_image_url ? (
                    <img src={branding.logo_image_url} alt="Logo" className="branding-upload-preview" />
                  ) : (
                    <Upload className="branding-upload-icon" />
                  )}
                  <p className="branding-upload-title">Cliquez pour télécharger</p>
                  <p className="branding-upload-hint">PNG, JPG ou SVG (max. 2MB)</p>
                </div>
              </div>
              <div>
                <label className="branding-label">Image de bannière</label>
                <div className="branding-upload-area">
                  {branding.banner_image_url ? (
                    <img src={branding.banner_image_url} alt="Bannière" className="branding-upload-banner-preview" />
                  ) : (
                    <Upload className="branding-upload-icon" />
                  )}
                  <p className="branding-upload-title">Cliquez pour télécharger</p>
                  <p className="branding-upload-hint">JPG ou PNG (recommandé: 1200x400px)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contenu</CardTitle>
              <CardDescription>Personnalisez le texte de votre marketplace</CardDescription>
            </CardHeader>
            <CardContent className="branding-form-spacing">
              <Input
                label="Titre de la page d'accueil"
                value={branding.homepage_title}
                onChange={(e) => setBranding(prev => ({ ...prev, homepage_title: e.target.value }))}
              />
              <div>
                <label className="branding-label">Message de bienvenue</label>
                <textarea
                  className="branding-textarea"
                  rows={3}
                  value={branding.welcome_text}
                  onChange={(e) => setBranding(prev => ({ ...prev, welcome_text: e.target.value }))}
                />
              </div>
              <div>
                <label className="branding-label">Texte du pied de page</label>
                <Input
                  value={branding.footer_text}
                  onChange={(e) => setBranding(prev => ({ ...prev, footer_text: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="branding-sidebar-col">
          <Card>
            <CardHeader>
              <CardTitle>Aperçu en temps réel</CardTitle>
              <CardDescription>Votre marketplace avec ces paramètres</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="branding-preview-card">
                <div className="branding-preview-banner" style={{ backgroundImage: `url(${branding.banner_image_url})` }} />
                <div className="branding-preview-content">
                  <div className="branding-preview-header">
                    <img src={branding.logo_image_url} alt="Logo" className="branding-preview-logo" />
                    <div style={{ color: branding.primary_color }} className="branding-preview-bank-name">
                      Banque Zitouna
                    </div>
                  </div>
                  <h3 className="branding-preview-title" style={{ color: branding.primary_color }}>
                    {branding.homepage_title}
                  </h3>
                  <p className="branding-preview-desc">
                    {branding.welcome_text}
                  </p>
                  <button
                    className="branding-preview-btn"
                    style={{ backgroundColor: branding.primary_color }}
                  >
                    Découvrir
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="branding-sidebar-actions">
              <Button className="branding-full-width" icon={<Save className="w-4 h-4" />}>
                Enregistrer les modifications
              </Button>
              <Button variant="outline" className="branding-full-width" icon={<Eye className="w-4 h-4" />}>
                Voir la marketplace
              </Button>
              <Button variant="ghost" className="branding-full-width" icon={<RotateCcw className="w-4 h-4" />}>
                Réinitialiser
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
