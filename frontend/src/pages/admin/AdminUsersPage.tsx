import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner, Badge, Button } from '@/components/ui';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingAction, setProcessingAction] = useState<{ userId: string; action: 'anonymize' | 'delete' } | null>(null);
  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      toast.success('Rôle mis à jour');
      loadUsers();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du rôle');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await api.patch(`/users/${userId}/toggle-status`);
      toast.success(isActive ? 'Utilisateur désactivé' : 'Utilisateur activé');
      loadUsers();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleAnonymizeUser = async (user: User) => {
    if (currentUser?.id === user.id) {
      toast.error('Vous ne pouvez pas modifier votre propre compte admin ici');
      return;
    }

    const confirmed = window.confirm(`Anonymiser le compte ${user.firstName} ${user.lastName} ? Cette action est recommandée pour la conformité RGPD.`);
    if (!confirmed) {
      return;
    }

    setProcessingAction({ userId: user.id, action: 'anonymize' });
    try {
      await api.delete(`/users/${user.id}?mode=anonymize`);
      toast.success('Compte anonymisé avec succès');
      await loadUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erreur lors de l\'anonymisation du compte');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleHardDeleteUser = async (user: User) => {
    if (currentUser?.id === user.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte admin');
      return;
    }

    const confirmed = window.confirm(`Supprimer définitivement ${user.firstName} ${user.lastName} ? Cette action est irréversible.`);
    if (!confirmed) {
      return;
    }

    setProcessingAction({ userId: user.id, action: 'delete' });
    try {
      await api.delete(`/users/${user.id}?mode=delete`);
      toast.success('Compte supprimé définitivement');
      setUsers((previous) => previous.filter((entry) => entry.id !== user.id));
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erreur lors de la suppression du compte');
    } finally {
      setProcessingAction(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
      CLIENT: 'default',
      ADMIN: 'error',
      STAFF: 'info',
    };
    return <Badge variant={variants[role] || 'default'}>{role}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-medium text-gray-900/90">Utilisateurs</h1>
          <p className="text-gray-400 mt-1">Gérez les utilisateurs de la plateforme</p>
        </motion.div>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <UserIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-400">Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100/60">
              <thead className="bg-transparent/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Inscrit le
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-primary-500/10">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-500/10 flex items-center justify-center">
                          <span className="text-primary-400 font-medium">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          {user.phone && (
                            <p className="text-sm text-gray-400">{user.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={user.isActive ? 'success' : 'error'}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center gap-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white/50 hover:bg-white outline-none cursor-pointer min-w-[100px]"
                        >
                          <option value="CLIENT">Client</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <Button
                          variant={user.isActive ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                        >
                          {user.isActive ? 'Désactiver' : 'Activer'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          isLoading={processingAction?.userId === user.id && processingAction.action === 'delete'}
                          disabled={currentUser?.id === user.id}
                          onClick={() => handleHardDeleteUser(user)}
                          title={currentUser?.id === user.id ? 'Suppression de votre propre compte bloquée' : 'Supprimer le compte'}
                        >
                          Supprimer
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={processingAction?.userId === user.id && processingAction.action === 'anonymize'}
                          disabled={currentUser?.id === user.id}
                          onClick={() => handleAnonymizeUser(user)}
                          title={currentUser?.id === user.id ? 'Action non autorisée sur votre compte' : 'Anonymiser le compte'}
                        >
                          Anonymiser
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
