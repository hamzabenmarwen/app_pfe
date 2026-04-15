import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    watch,
    reset: resetPasswordForm,
  } = useForm<PasswordFormData>();

  const newPassword = watch('newPassword');

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsUpdating(true);
    try {
      const response = await authService.updateProfile(data);
      setUser(response.data);
      toast.success('Profil mis à jour avec succès');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour');
    } finally {
      setIsUpdating(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Mot de passe modifié avec succès');
      resetPasswordForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors du changement de mot de passe');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-medium text-gray-900/90"
      >
        Mon Profil
      </motion.h1>

      {/* Profile Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Informations personnelles</h2>
        </div>
        <div className="px-6 py-5">
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Prénom"
                error={profileErrors.firstName?.message}
                {...registerProfile('firstName', { required: 'Prénom requis' })}
              />
              <Input
                label="Nom"
                error={profileErrors.lastName?.message}
                {...registerProfile('lastName', { required: 'Nom requis' })}
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-transparent/60"
            />

            <Input
              label="Téléphone"
              type="tel"
              error={profileErrors.phone?.message}
              {...registerProfile('phone')}
            />

            <div className="flex justify-end">
              <Button type="submit" isLoading={isUpdating}>
                Enregistrer les modifications
              </Button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Change Password */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Changer le mot de passe</h2>
        </div>
        <div className="px-6 py-5">
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <Input
              label="Mot de passe actuel"
              type="password"
              error={passwordErrors.currentPassword?.message}
              {...registerPassword('currentPassword', { required: 'Mot de passe actuel requis' })}
            />

            <Input
              label="Nouveau mot de passe"
              type="password"
              error={passwordErrors.newPassword?.message}
              {...registerPassword('newPassword', {
                required: 'Nouveau mot de passe requis',
                minLength: { value: 8, message: 'Minimum 8 caractères' },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Doit contenir une majuscule, une minuscule et un chiffre',
                },
              })}
            />

            <Input
              label="Confirmer le nouveau mot de passe"
              type="password"
              error={passwordErrors.confirmPassword?.message}
              {...registerPassword('confirmPassword', {
                required: 'Confirmation requise',
                validate: (value) => value === newPassword || 'Les mots de passe ne correspondent pas',
              })}
            />

            <div className="flex justify-end">
              <Button type="submit" isLoading={isChangingPassword}>
                Changer le mot de passe
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
