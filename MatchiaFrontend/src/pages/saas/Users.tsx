import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Plus, Edit, Trash2, Mail, Shield, CheckCircle, XCircle } from 'lucide-react';
import { users, banks } from '../../data/mockData';
import type { User } from '../../types';

export function SaaSUsers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | 'all'>('all');

  // Get bank name by ID
  const getBankName = (bankId?: string) => {
    if (!bankId) return 'Platform (N/A)';
    return banks.find(b => b.id === bankId)?.name || 'Unknown Bank';
  };

  // Filter users - exclude SUPER_ADMIN from regular list but show ADMIN and MANAGER
  const platformAdmins = users.filter(u =>
    u.role === 'ADMIN' || u.role === 'MANAGER'
  );

  const filtered = platformAdmins.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getBankName(user.bank_id).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const stats = [
    {
      label: 'Total Admins',
      value: platformAdmins.length,
      color: 'text-primary'
    },
    {
      label: 'ADMIN Role',
      value: platformAdmins.filter(u => u.role === 'ADMIN').length,
      color: 'text-purple-600'
    },
    {
      label: 'MANAGER Role',
      value: platformAdmins.filter(u => u.role === 'MANAGER').length,
      color: 'text-secondary'
    },
    {
      label: 'Actifs',
      value: platformAdmins.filter(u => u.status === 'active').length,
      color: 'text-green-600'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion des administrateurs</h1>
          <p className="text-muted-foreground">Gérez les administrateurs et managers de plateforme par banque</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={() => setIsModalOpen(true)}>
          Ajouter un administrateur
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <div className={`text-3xl font-bold mt-2 ${stat.color}`}>
                {stat.value}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rechercher par nom, email ou banque</label>
              <Input
                placeholder="Tapez pour rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Rôle</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tous les rôles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="MANAGER">MANAGER</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des administrateurs</CardTitle>
          <CardDescription>
            Affichage des {filtered.length} administrateur{filtered.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold">Nom</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Banque</th>
                  <th className="text-center py-3 px-4 font-semibold">Rôle</th>
                  <th className="text-center py-3 px-4 font-semibold">Statut</th>
                  <th className="text-center py-3 px-4 font-semibold">Depuis</th>
                  <th className="text-right py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="font-medium text-foreground">{user.name}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {getBankName(user.bank_id)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                          className="flex items-center justify-center gap-1 mx-auto w-fit"
                        >
                          <Shield className="w-3 h-3" />
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {user.status === 'active' ? (
                          <div className="flex items-center justify-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-xs font-medium">Actif</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span className="text-xs font-medium">Inactif</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground text-xs">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Edit">
                            <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </button>
                          <button className="p-2 hover:bg-destructive/10 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-muted-foreground">
                      Aucun administrateur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter un administrateur"
        description="Créez un nouvel administrateur ou manager de plateforme"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nom complet</label>
            <Input placeholder="Nom de l'administrateur" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input type="email" placeholder="email@banque.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Banque</label>
            <select className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Sélectionner une banque</option>
              {banks.map(bank => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Rôle</label>
            <select className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>
              Créer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
