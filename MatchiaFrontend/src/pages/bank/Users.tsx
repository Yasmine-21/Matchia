import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Plus, Edit, Trash2, Mail, Phone } from 'lucide-react';

export function BankUsers() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const users = [
    { id: '1', name: 'Mohamed Ali', email: 'mohamed@zitouna.com', role: 'Admin', status: 'active', phone: '+216 20 123 456' },
    { id: '2', name: 'Sarah Ben Salem', email: 'sarah@zitouna.com', role: 'Manager', status: 'active', phone: '+216 20 789 012' },
    { id: '3', name: 'Karim Mansour', email: 'karim@zitouna.com', role: 'User', status: 'active', phone: '+216 20 345 678' },
    { id: '4', name: 'Amira Gharbi', email: 'amira@zitouna.com', role: 'User', status: 'inactive', phone: '+216 20 901 234' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les utilisateurs de votre banque</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={() => setIsModalOpen(true)}>
          Inviter un utilisateur
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardDescription>Total utilisateurs</CardDescription>
            <div className="text-3xl font-bold mt-2">{users.length}</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Actifs</CardDescription>
            <div className="text-3xl font-bold mt-2 text-success">
              {users.filter(u => u.status === 'active').length}
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Inactifs</CardDescription>
            <div className="text-3xl font-bold mt-2 text-muted-foreground">
              {users.filter(u => u.status === 'inactive').length}
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Admins</CardDescription>
            <div className="text-3xl font-bold mt-2 text-primary">
              {users.filter(u => u.role === 'Admin').length}
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
          <CardDescription>Tous les utilisateurs de votre banque</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Nom</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Téléphone</th>
                  <th className="text-left py-3 px-4">Rôle</th>
                  <th className="text-left py-3 px-4">Statut</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                          {user.name.charAt(0)}
                        </div>
                        <div className="font-medium">{user.name}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4 text-muted-foreground">{user.phone}</td>
                    <td className="py-3 px-4">
                      <Badge variant={user.role === 'Admin' ? 'primary' : 'default'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={user.status === 'active' ? 'success' : 'default'}>
                        {user.status === 'active' ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Modifier">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors" title="Supprimer">
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Inviter un utilisateur"
        size="md"
      >
        <div className="space-y-4">
          <Input label="Nom complet" placeholder="Jean Dupont" />
          <Input label="Email" type="email" placeholder="jean.dupont@example.com" icon={<Mail className="w-5 h-5" />} />
          <Input label="Téléphone" type="tel" placeholder="+216 20 123 456" icon={<Phone className="w-5 h-5" />} />
          <div>
            <label className="block mb-2 text-sm">Rôle</label>
            <select className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
              <option>User</option>
              <option>Manager</option>
              <option>Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button className="flex-1">Envoyer l'invitation</Button>
            <Button variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
