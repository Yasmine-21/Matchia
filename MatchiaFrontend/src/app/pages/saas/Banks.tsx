import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Search, Plus, Edit, Eye, Ban, CheckCircle, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { bankService } from '../../services/bankService';
import { Bank } from '../../types';

export function SaaSBanks() {
  const [banksList, setBanksList] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // États pour les Modales
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBank, setNewBank] = useState<Partial<Bank>>({
    name: '',
    country: '',
    slug: '',
    logoUrl: '/logos/default.png', // Valeur par défaut
    description: '',
    establishedYear: new Date().getFullYear(),
    status: 'active',
    totalUsers: 0
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const createdBank = await bankService.createBank(newBank);
      setBanksList([...banksList, createdBank]); // Ajout à la liste locale
      setIsAddModalOpen(false); // Fermeture
      setNewBank({ name: '', country: '', slug: '', logoUrl: '/logos/default.png', description: '', establishedYear: 2024 }); // Reset
      alert("Banque ajoutée avec succès !");
    } catch (error) {
      console.error("Erreur création:", error);
      alert("Erreur lors de l'ajout");
    }
  };
  // Fonction pour ouvrir la modale d'édition
  const handleEditClick = (bank: Bank) => {
    setEditingBank({ ...bank }); // On crée une copie pour ne pas modifier l'original directement
    setIsEditModalOpen(true);
  };
  // Fonction pour soumettre la modification au Backend
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBank) return;

    try {
      const updated = await bankService.updateBank(editingBank.id, editingBank);
      // Mise à jour de la liste locale
      setBanksList(banksList.map(b => b.id === updated.id ? updated : b));
      setIsEditModalOpen(false);
      alert("Banque mise à jour avec succès !");
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
      alert("Échec de la mise à jour");
    }
  };

  // 1. Chargement des données
  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      setIsLoading(true);
      const data = await bankService.getAllBanks();
      setBanksList(data);
    } catch (error) {
      console.error("Erreur lors de la récupération :", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Action Supprimer
  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la banque ${name} ?`)) {
      try {
        await bankService.deleteBank(id);
        // Mise à jour de la liste locale après suppression
        setBanksList(banksList.filter(b => b.id !== id));
      } catch (error) {
        alert("Erreur lors de la suppression");
      }
    }
  };

  // 3. Filtrage
  const filteredBanks = banksList.filter(b =>
    (b.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (b.country?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-9">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion des banques</h1>
          <p className="text-muted-foreground">Gérez toutes les banques sur la plateforme</p>
        </div>
        <Button
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Ajouter une banque
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <Input
            placeholder="Rechercher une banque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des banques ({filteredBanks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-4">Bank</th>
                  <th className="text-left py-3 px-4">Country</th>
                  <th className="text-left py-3 px-4">Assigned Stores</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Created</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBanks.map((bank) => (
                  <tr key={bank.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={bank.logoUrl}
                          alt=""
                          className="w-10 h-10 rounded-lg object-contain bg-white border"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/40x40?text=Bank' }}
                        />
                        <div>
                          <div className="font-medium">{bank.name}</div>
                          <div className="text-sm text-muted-foreground">{bank.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{bank.country}</td>
                    <td className="py-3 px-4">
                      {/* On garde ton calcul spécifique basé sur l'ID */}
                      <div className="font-medium">
                        {bank.id === 1 ? '3' : bank.id === 2 ? '2' : '0'} stores
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={bank.status === 'active' ? 'success' : 'warning'}>
                        {bank.status === 'active' ? 'Actif' : 'En attente'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {bank.createdAt ? new Date(bank.createdAt).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1. Lien Externe */}
                        <a
                          href={`http://${bank.slug}.lvh.me:5173/bank/dashboard`}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                          title="Back-office"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {/* 2. Détails (Eye) */}
                        <button
                          onClick={() => { setSelectedBank(bank); setIsViewModalOpen(true); }}
                          className="p-2 hover:bg-muted rounded-lg"
                          title="Détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* 3. Modifier (Edit) */}
                        <button
                          className="p-2 hover:bg-muted rounded-lg"
                          onClick={() => handleEditClick(bank)} // On appelle la fonction qui ouvre la modale
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* 4. Supprimer (Trash) */}
                        <button
                          onClick={() => handleDelete(bank.id, bank.name)}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal des Détails */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Informations Bancaires"
        size="lg"
      >
        {selectedBank && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
              <img src={selectedBank.logoUrl} alt="" className="w-20 h-20 rounded-xl object-contain border bg-white" />
              <div>
                <h3 className="text-2xl font-bold">{selectedBank.name}</h3>
                <Badge variant="outline">{selectedBank.country}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">{selectedBank.description || 'Aucune description'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Année d'établissement</p>
                <p className="font-medium">{selectedBank.establishedYear}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Utilisateurs</p>
                <p className="font-medium text-primary text-xl">
                  {/* Utilisation sécurisée de toLocaleString */}
                  {selectedBank.totalUsers?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Slug (Sous-domaine)</p>
                <code className="bg-muted px-2 py-1 rounded text-sm">{selectedBank.slug}.lvh.me</code>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <a
                href={`http://${selectedBank.slug}.lvh.me:5173`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button className="w-full" icon={<ExternalLink className="w-4 h-4" />}>
                  Voir la marketplace
                </Button>
              </a>

              <Button variant="outline" onClick={() => setIsViewModalOpen(false)} className="flex-1">Fermer </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Modal de Modification */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier la banque"
        size="lg"
      >
        {editingBank && (
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom de la banque</label>
                <Input
                  value={editingBank.name}
                  onChange={(e) => setEditingBank({ ...editingBank, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pays</label>
                <Input
                  value={editingBank.country}
                  onChange={(e) => setEditingBank({ ...editingBank, country: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Slug (URL)</label>
                <Input
                  value={editingBank.slug}
                  onChange={(e) => setEditingBank({ ...editingBank, slug: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Année d'établissement</label>
                <Input
                  type="number"
                  value={editingBank.establishedYear}
                  onChange={(e) => setEditingBank({ ...editingBank, establishedYear: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">URL du Logo</label>
              <Input
                value={editingBank.logoUrl}
                onChange={(e) => setEditingBank({ ...editingBank, logoUrl: e.target.value })}
                placeholder="/logos/nom-image.png"
              />
              <p className="text-xs text-muted-foreground italic">Chemin : /logos/votre-image.png (doit être dans le dossier public/logos)</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background"
                value={editingBank.description}
                onChange={(e) => setEditingBank({ ...editingBank, description: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" className="flex-1">Sauvegarder les modifications</Button>
              <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1">
                Annuler
              </Button>
            </div>
          </form>
        )}
      </Modal>
      {/* Modal d'Ajout d'une Banque */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Enregistrer une nouvelle banque"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom de la banque *</label>
              <Input
                placeholder="Ex: Wifak Bank"
                value={newBank.name}
                onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pays *</label>
              <Input
                placeholder="Ex: Tunisie"
                value={newBank.country}
                onChange={(e) => setNewBank({ ...newBank, country: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug (Sous-domaine) *</label>
              <Input
                placeholder="Ex: wifak (sera wifak.lvh.me)"
                value={newBank.slug}
                onChange={(e) => setNewBank({ ...newBank, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Année d'établissement</label>
              <Input
                type="number"
                value={newBank.establishedYear}
                onChange={(e) => setNewBank({ ...newBank, establishedYear: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lien du Logo</label>
            <Input
              placeholder="/logos/votre-image.png"
              value={newBank.logoUrl}
              onChange={(e) => setNewBank({ ...newBank, logoUrl: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground italic">
              Astuce : Déposez l'image dans <strong>public/logos/</strong> puis écrivez son nom ici.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              placeholder="Décrivez brièvement la banque..."
              className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm"
              value={newBank.description}
              onChange={(e) => setNewBank({ ...newBank, description: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" className="flex-1">Créer la banque</Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}