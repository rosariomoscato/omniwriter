import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiService, LLMProvider, CreateLLMProviderData } from '../services/api';
import { useToastNotification } from '../components/Toast';
import { Lock, Key, User, Shield, LogOut, AlertTriangle, Trash2, Cpu, Loader2, Plus, Eye, EyeOff, CheckCircle, XCircle, HelpCircle, Server, RefreshCw } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToastNotification();
  const { t } = useTranslation();

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // AI Model selection state (Feature #214 - Dynamic Model Selection)
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [dynamicModels, setDynamicModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [modelError, setModelError] = useState('');
  const [modelSuccess, setModelSuccess] = useState('');
  const [modelsLoadError, setModelsLoadError] = useState<string | null>(null);

  // LLM Provider state (Feature #213)
  const [llmProviders, setLlmProviders] = useState<LLMProvider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [showProviderDeleteDialog, setShowProviderDeleteDialog] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<LLMProvider | null>(null);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [providerForm, setProviderForm] = useState({
    provider_type: 'openai' as CreateLLMProviderData['provider_type'],
    display_name: '',
    api_key: '',
    api_base_url: '',
    additional_config: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [isDeletingProvider, setIsDeletingProvider] = useState(false);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);

  // Password validation
  const [passwordValidations, setPasswordValidations] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
  });

  useEffect(() => {
    if (!newPassword) {
      setPasswordValidations({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
      });
      return;
    }

    setPasswordValidations({
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
    });
  }, [newPassword]);

  const isPasswordValid = Object.values(passwordValidations).every(Boolean);

  // Load LLM preferences on mount
  useEffect(() => {
    const loadLLMPreferences = async () => {
      try {
        // Load user's current LLM preferences
        const prefsResponse = await apiService.getLLMPreferences();
        if (prefsResponse.selected_provider_id) {
          setSelectedProviderId(prefsResponse.selected_provider_id);
        }
        if (prefsResponse.selected_model_id) {
          setSelectedModel(prefsResponse.selected_model_id);
        }
      } catch (error: any) {
        console.error('Failed to load LLM preferences:', error);
      }
    };

    loadLLMPreferences();
  }, []);

  // Load models when provider changes
  useEffect(() => {
    const loadModelsForProvider = async () => {
      if (!selectedProviderId) {
        setDynamicModels([]);
        setSelectedModel('');
        return;
      }

      try {
        setIsLoadingModels(true);
        setModelsLoadError(null);
        const response = await apiService.getLLMProviderModels(selectedProviderId);
        setDynamicModels(response.models || []);

        // If current model is not in the new list, clear it
        if (selectedModel && !response.models?.includes(selectedModel)) {
          setSelectedModel('');
        }
      } catch (error: any) {
        console.error('Failed to load models:', error);
        setModelsLoadError(t('settings.modelSelection.modelsLoadError'));
        setDynamicModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModelsForProvider();
  }, [selectedProviderId]);

  // Load LLM providers on mount
  useEffect(() => {
    const loadProviders = async () => {
      try {
        setIsLoadingProviders(true);
        const response = await apiService.getLLMProviders();
        setLlmProviders(response.providers || []);
      } catch (error: any) {
        console.error('Failed to load LLM providers:', error);
        toast.error(t('settings.llmProviders.errors.loadFailed'));
      } finally {
        setIsLoadingProviders(false);
      }
    };

    loadProviders();
  }, []);

  const handleProviderChange = async (providerId: string) => {
    setSelectedProviderId(providerId);
    setSelectedModel('');
    setModelError('');
    setModelSuccess('');
    setModelsLoadError(null);
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    setModelError('');
    setModelSuccess('');
  };

  const handleSaveModel = async () => {
    try {
      setIsSavingModel(true);
      setModelError('');

      await apiService.updateLLMPreferences({
        selected_provider_id: selectedProviderId || null,
        selected_model_id: selectedModel
      });

      setModelSuccess(t('settings.modelSelection.successMessage'));
      toast.success(t('settings.modelSelection.successToast'));

      // Clear success message after 3 seconds
      setTimeout(() => setModelSuccess(''), 3000);
    } catch (error: any) {
      console.error('Failed to save model preference:', error);
      setModelError(error.message || t('settings.modelSelection.errorSave'));
      toast.error(error.message || t('settings.modelSelection.errorSaveToast'));
    } finally {
      setIsSavingModel(false);
    }
  };

  const handleRefreshModels = async () => {
    if (!selectedProviderId) return;

    try {
      setIsLoadingModels(true);
      setModelsLoadError(null);
      const response = await apiService.getLLMProviderModels(selectedProviderId);
      setDynamicModels(response.models || []);
    } catch (error: any) {
      console.error('Failed to refresh models:', error);
      setModelsLoadError(t('settings.modelSelection.modelsLoadError'));
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!currentPassword) {
      setPasswordError(t('settings.passwordValidation.currentRequired'));
      return;
    }

    if (!newPassword) {
      setPasswordError(t('settings.passwordValidation.newRequired'));
      return;
    }

    if (!isPasswordValid) {
      setPasswordError(t('settings.passwordValidation.notMeetRequirements'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.passwordValidation.mismatch'));
      return;
    }

    try {
      setIsChangingPassword(true);
      await apiService.changePassword({
        currentPassword,
        newPassword,
      });

      setPasswordSuccess(t('settings.passwordMessages.success'));
      toast.success(t('settings.passwordMessages.successToast'));

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (error: any) {
      console.error('Password change error:', error);
      setPasswordError(error.message || t('settings.passwordMessages.error'));
      toast.error(error.message || t('settings.passwordMessages.errorToast'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError(t('settings.deleteAccountDialog.passwordRequired'));
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');

      await apiService.deleteAccount(deletePassword);

      // Logout and redirect to login after successful deletion
      toast.success(t('settings.deleteAccountDialog.successToast'));
      await logout();
      navigate('/login', { replace: true });
    } catch (error: any) {
      console.error('Delete account error:', error);
      if (error.message && error.message.includes('Password is incorrect')) {
        setDeleteError(t('settings.deleteAccountDialog.incorrectPassword'));
      } else {
        setDeleteError(error.message || t('settings.deleteAccountDialog.error'));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = () => {
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteDialog(true);
  };

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeletePassword('');
    setDeleteError('');
  };

  const navigateToProfile = () => {
    navigate('/profile');
  };

  // LLM Provider handlers
  const openAddProviderDialog = () => {
    setEditingProvider(null);
    setProviderForm({
      provider_type: 'openai',
      display_name: '',
      api_key: '',
      api_base_url: '',
      additional_config: ''
    });
    setShowApiKey(false);
    setShowProviderDialog(true);
  };

  const openEditProviderDialog = (provider: LLMProvider) => {
    setEditingProvider(provider);
    setProviderForm({
      provider_type: provider.provider_type,
      display_name: provider.display_name,
      api_key: '', // Don't show existing key
      api_base_url: provider.api_base_url || '',
      additional_config: provider.additional_config ? JSON.stringify(provider.additional_config, null, 2) : ''
    });
    setShowApiKey(false);
    setShowProviderDialog(true);
  };

  const closeProviderDialog = () => {
    setShowProviderDialog(false);
    setEditingProvider(null);
    setProviderForm({
      provider_type: 'openai',
      display_name: '',
      api_key: '',
      api_base_url: '',
      additional_config: ''
    });
  };

  const handleTestProvider = async (providerId: string) => {
    setTestingProviderId(providerId);
    try {
      const result = await apiService.testLLMProvider(providerId);
      if (result.success) {
        toast.success(t('settings.llmProviders.testSuccess'));
        // Update the provider status in local state
        setLlmProviders(providers =>
          providers.map(p => p.id === providerId
            ? { ...p, connection_status: 'connected' as const, last_test_at: new Date().toISOString() }
            : p
          )
        );
      } else {
        toast.error(result.message || t('settings.llmProviders.testFailed'));
        setLlmProviders(providers =>
          providers.map(p => p.id === providerId
            ? { ...p, connection_status: 'failed' as const, last_test_at: new Date().toISOString() }
            : p
          )
        );
      }
    } catch (error: any) {
      toast.error(error.message || t('settings.llmProviders.testFailed'));
      setLlmProviders(providers =>
        providers.map(p => p.id === providerId
          ? { ...p, connection_status: 'failed' as const }
          : p
        )
      );
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleSaveProvider = async () => {
    // Validation
    if (!providerForm.display_name.trim()) {
      toast.error(t('settings.llmProviders.dialog.displayNameRequired'));
      return;
    }
    if (!editingProvider && !providerForm.api_key.trim()) {
      toast.error(t('settings.llmProviders.dialog.apiKeyRequired'));
      return;
    }
    if (providerForm.provider_type === 'custom' && !providerForm.api_base_url.trim()) {
      toast.error(t('settings.llmProviders.dialog.baseUrlRequired'));
      return;
    }

    // Validate JSON if provided
    let additionalConfig = {};
    if (providerForm.additional_config.trim()) {
      try {
        additionalConfig = JSON.parse(providerForm.additional_config);
      } catch {
        toast.error(t('settings.llmProviders.dialog.additionalConfigError'));
        return;
      }
    }

    try {
      setIsSavingProvider(true);

      const data: CreateLLMProviderData = {
        provider_type: providerForm.provider_type,
        display_name: providerForm.display_name.trim(),
        api_key: providerForm.api_key,
        api_base_url: providerForm.api_base_url || undefined,
        additional_config: additionalConfig
      };

      if (editingProvider) {
        // Update existing provider
        const updateData: Partial<CreateLLMProviderData & { is_active?: boolean }> = {
          display_name: data.display_name,
          api_base_url: data.api_base_url
        };
        if (data.api_key) {
          updateData.api_key = data.api_key;
        }
        if (Object.keys(additionalConfig).length > 0) {
          updateData.additional_config = additionalConfig;
        }
        await apiService.updateLLMProvider(editingProvider.id, updateData);
        toast.success(t('settings.llmProviders.dialog.updateSuccess'));
        // Refresh providers
        const response = await apiService.getLLMProviders();
        setLlmProviders(response.providers || []);
      } else {
        // Create new provider
        await apiService.createLLMProvider(data);
        toast.success(t('settings.llmProviders.dialog.createSuccess'));
        // Refresh providers
        const response = await apiService.getLLMProviders();
        setLlmProviders(response.providers || []);
      }

      closeProviderDialog();
    } catch (error: any) {
      console.error('Failed to save provider:', error);
      toast.error(error.message || (editingProvider
        ? t('settings.llmProviders.dialog.updateError')
        : t('settings.llmProviders.dialog.createError')));
    } finally {
      setIsSavingProvider(false);
    }
  };

  const openDeleteProviderDialog = (provider: LLMProvider) => {
    setProviderToDelete(provider);
    setShowProviderDeleteDialog(true);
  };

  const closeDeleteProviderDialog = () => {
    setShowProviderDeleteDialog(false);
    setProviderToDelete(null);
  };

  const handleDeleteProvider = async () => {
    if (!providerToDelete) return;

    try {
      setIsDeletingProvider(true);
      await apiService.deleteLLMProvider(providerToDelete.id);
      toast.success(t('settings.llmProviders.deleteDialog.success'));
      setLlmProviders(providers => providers.filter(p => p.id !== providerToDelete.id));
      closeDeleteProviderDialog();
    } catch (error: any) {
      console.error('Failed to delete provider:', error);
      if (error.message?.includes('active provider')) {
        toast.error(t('settings.llmProviders.errors.deleteActive'));
      } else {
        toast.error(error.message || t('settings.llmProviders.deleteDialog.error'));
      }
    } finally {
      setIsDeletingProvider(false);
    }
  };

  const handleSetActiveProvider = async (provider: LLMProvider) => {
    try {
      await apiService.updateLLMPreferences({
        selected_provider_id: provider.id,
        selected_model_id: ''
      });
      toast.success(t('settings.llmProviders.setAsActive'));
      // Update local state to reflect active provider
      setLlmProviders(providers =>
        providers.map(p => ({
          ...p,
          is_active: p.id === provider.id ? 1 : 0
        }))
      );
    } catch (error: any) {
      console.error('Failed to set active provider:', error);
      toast.error(error.message || t('common.error'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            {t('settings.llmProviders.status.connected')}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            {t('settings.llmProviders.status.failed')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            <HelpCircle className="w-3 h-3" />
            {t('settings.llmProviders.status.not_tested')}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('settings.llmProviders.never');
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <Breadcrumbs />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.quickActions.title')}</h3>

            <div className="space-y-2">
              <button
                onClick={navigateToProfile}
                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">{t('settings.quickActions.editProfile')}</span>
              </button>

              <button
                onClick={() => navigate('/human-model')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">{t('settings.quickActions.humanModel')}</span>
              </button>

              <hr className="my-4 border-gray-200 dark:border-gray-700" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>{t('settings.quickActions.logout')}</span>
              </button>

              <button
                onClick={openDeleteDialog}
                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                <span>{t('settings.quickActions.deleteAccount')}</span>
              </button>
            </div>
          </div>

          {/* Account Info Card */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-md p-6 mt-6 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                {user?.name ? (
                  <span className="text-xl font-semibold">{user.name.charAt(0).toUpperCase()}</span>
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <div>
                <h4 className="font-semibold">{user?.name || 'User'}</h4>
                <p className="text-sm text-blue-100">{user?.email}</p>
              </div>
            </div>
            <div className="text-sm bg-white/10 rounded px-3 py-2">
              <span className="capitalize">{user?.role || 'free'}</span> {t('settings.accountInfo.account')}
            </div>
          </div>
        </div>

        {/* Right Column - Password Change */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <Key className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('settings.changePassword.title')}</h2>
            </div>

            {/* Success Message */}
            {passwordSuccess && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg">
                {passwordSuccess}
              </div>
            )}

            {/* Error Message */}
            {passwordError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-6">
              {/* Current Password */}
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.changePassword.currentPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder={t('settings.changePassword.currentPasswordPlaceholder')}
                    required
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.changePassword.securityNote')}
                </p>
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.changePassword.newPassword')}
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('settings.changePassword.newPasswordPlaceholder')}
                  required
                />

                {/* Password Requirements */}
                {newPassword && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.changePassword.passwordRequirements')}</p>
                    <div className="space-y-1.5">
                      <div className={`flex items-center gap-2 text-sm ${passwordValidations.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {t('settings.changePassword.minLength')}
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${passwordValidations.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {t('settings.changePassword.hasUppercase')}
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${passwordValidations.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {t('settings.changePassword.hasLowercase')}
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${passwordValidations.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {t('settings.changePassword.hasNumber')}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.changePassword.confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('settings.changePassword.confirmPasswordPlaceholder')}
                  required
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{t('settings.changePassword.passwordsMismatch')}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword || !isPasswordValid || newPassword !== confirmPassword}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isChangingPassword ? t('settings.changePassword.changingPassword') : t('settings.changePassword.changePasswordButton')}
                </button>
              </div>
            </form>
          </div>

          {/* Model Selection (Feature #214 - Dynamic) */}
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {t('settings.modelSelection.title')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {t('settings.modelSelection.description')}
                </p>
              </div>
            </div>

            {/* Success Message */}
            {modelSuccess && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg">
                {modelSuccess}
              </div>
            )}

            {/* Error Message */}
            {modelError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
                {modelError}
              </div>
            )}

            {/* No providers warning */}
            {llmProviders.length === 0 ? (
              <div className="text-center py-6">
                <Server className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">{t('settings.modelSelection.noProviders')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 mb-4">
                  {t('settings.modelSelection.noProvidersDesc')}
                </p>
                <button
                  onClick={() => {
                    const section = document.getElementById('llm-providers-section');
                    if (section) section.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  {t('settings.modelSelection.goToProviders')}
                </button>
              </div>
            ) : (
              <>
                {/* Provider Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.modelSelection.selectProvider')}
                  </label>
                  <select
                    value={selectedProviderId}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">{t('settings.modelSelection.selectProviderPlaceholder')}</option>
                    {llmProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.display_name} ({t(`settings.llmProviders.providerTypes.${provider.provider_type}`)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model Selection */}
                {selectedProviderId && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('settings.modelSelection.selectModel')}
                      </label>
                      <button
                        onClick={handleRefreshModels}
                        disabled={isLoadingModels}
                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoadingModels ? 'animate-spin' : ''}`} />
                        {t('settings.modelSelection.refreshModels')}
                      </button>
                    </div>

                    {isLoadingModels ? (
                      <div className="flex items-center justify-center py-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{t('settings.modelSelection.loadingModels')}</span>
                      </div>
                    ) : modelsLoadError ? (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-red-700 dark:text-red-300 text-sm">{modelsLoadError}</p>
                        <button
                          onClick={handleRefreshModels}
                          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                          {t('settings.modelSelection.retryLoad')}
                        </button>
                      </div>
                    ) : dynamicModels.length === 0 ? (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <p className="text-gray-600 dark:text-gray-400 text-sm">{t('settings.modelSelection.noModels')}</p>
                      </div>
                    ) : (
                      <select
                        value={selectedModel}
                        onChange={(e) => handleModelChange(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">{t('settings.modelSelection.selectModelPlaceholder')}</option>
                        {dynamicModels.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveModel}
                    disabled={isSavingModel || !selectedProviderId || !selectedModel}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSavingModel ? t('settings.modelSelection.saving') : t('settings.modelSelection.savePreference')}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* LLM Providers Section (Feature #213) */}
          <div id="llm-providers-section" className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Server className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {t('settings.llmProviders.title')}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {t('settings.llmProviders.description')}
                  </p>
                </div>
              </div>
              <button
                onClick={openAddProviderDialog}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('settings.llmProviders.addProvider')}
              </button>
            </div>

            {isLoadingProviders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">{t('common.loading')}</span>
              </div>
            ) : llmProviders.length === 0 ? (
              <div className="text-center py-8">
                <Server className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">{t('settings.llmProviders.noProviders')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{t('settings.llmProviders.noProvidersDesc')}</p>
                <button
                  onClick={openAddProviderDialog}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  {t('settings.llmProviders.addProvider')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {llmProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      provider.is_active
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                              {provider.display_name}
                            </h4>
                            {getStatusBadge(provider.connection_status)}
                            {provider.is_active === 1 && (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                {t('settings.llmProviders.activeProvider')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t(`settings.llmProviders.providerTypes.${provider.provider_type}`)}
                            {provider.api_base_url && (
                              <span className="ml-2 text-gray-500 dark:text-gray-500">
                                ({provider.api_base_url})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {t('settings.llmProviders.lastTested')}: {formatDate(provider.last_test_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTestProvider(provider.id)}
                          disabled={testingProviderId === provider.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                          title={t('settings.llmProviders.testConnection')}
                        >
                          {testingProviderId === provider.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{t('settings.llmProviders.status.testing')}</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              <span className="hidden sm:inline">{t('settings.llmProviders.testConnection')}</span>
                            </>
                          )}
                        </button>
                        {provider.is_active !== 1 && (
                          <button
                            onClick={() => handleSetActiveProvider(provider)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('settings.llmProviders.setAsActive')}</span>
                          </button>
                        )}
                        <button
                          onClick={() => openEditProviderDialog(provider)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          {t('settings.llmProviders.edit')}
                        </button>
                        <button
                          onClick={() => openDeleteProviderDialog(provider)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          {t('settings.llmProviders.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Provider Dialog */}
      {showProviderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingProvider
                ? t('settings.llmProviders.dialog.editTitle')
                : t('settings.llmProviders.dialog.addTitle')}
            </h3>

            <div className="space-y-4">
              {/* Provider Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.llmProviders.dialog.providerType')}
                </label>
                <select
                  value={providerForm.provider_type}
                  onChange={(e) => setProviderForm({ ...providerForm, provider_type: e.target.value as CreateLLMProviderData['provider_type'] })}
                  disabled={!!editingProvider}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                >
                  <option value="">{t('settings.llmProviders.dialog.selectProviderType')}</option>
                  <option value="openai">{t('settings.llmProviders.providerTypes.openai')}</option>
                  <option value="anthropic">{t('settings.llmProviders.providerTypes.anthropic')}</option>
                  <option value="google_gemini">{t('settings.llmProviders.providerTypes.google_gemini')}</option>
                  <option value="open_router">{t('settings.llmProviders.providerTypes.open_router')}</option>
                  <option value="requesty">{t('settings.llmProviders.providerTypes.requesty')}</option>
                  <option value="custom">{t('settings.llmProviders.providerTypes.custom')}</option>
                </select>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.llmProviders.dialog.displayName')} *
                </label>
                <input
                  type="text"
                  value={providerForm.display_name}
                  onChange={(e) => setProviderForm({ ...providerForm, display_name: e.target.value })}
                  placeholder={t('settings.llmProviders.dialog.displayNamePlaceholder')}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.llmProviders.dialog.apiKey')} {!editingProvider && '*'}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={providerForm.api_key}
                    onChange={(e) => setProviderForm({ ...providerForm, api_key: e.target.value })}
                    placeholder={t('settings.llmProviders.dialog.apiKeyPlaceholder')}
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {editingProvider && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('settings.llmProviders.dialog.apiKeyRequired')}
                  </p>
                )}
              </div>

              {/* Base URL - for custom providers */}
              {providerForm.provider_type === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.llmProviders.dialog.baseUrl')} *
                  </label>
                  <input
                    type="url"
                    value={providerForm.api_base_url}
                    onChange={(e) => setProviderForm({ ...providerForm, api_base_url: e.target.value })}
                    placeholder={t('settings.llmProviders.dialog.baseUrlPlaceholder')}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('settings.llmProviders.dialog.baseUrlHint')}
                  </p>
                </div>
              )}

              {/* Additional Config */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.llmProviders.dialog.additionalConfig')}
                </label>
                <textarea
                  value={providerForm.additional_config}
                  onChange={(e) => setProviderForm({ ...providerForm, additional_config: e.target.value })}
                  placeholder={t('settings.llmProviders.dialog.additionalConfigPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeProviderDialog}
                disabled={isSavingProvider}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {t('settings.llmProviders.dialog.cancel')}
              </button>
              <button
                onClick={handleSaveProvider}
                disabled={isSavingProvider}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingProvider ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('settings.llmProviders.dialog.saving')}
                  </>
                ) : (
                  t('settings.llmProviders.dialog.save')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Provider Dialog */}
      {showProviderDeleteDialog && providerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {t('settings.llmProviders.deleteDialog.title')}
                </h3>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.llmProviders.deleteDialog.warning')}
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {providerToDelete.display_name}
              </p>
              {providerToDelete.is_active === 1 && (
                <p className="text-amber-600 dark:text-amber-400 text-sm mt-2">
                  {t('settings.llmProviders.deleteDialog.activeWarning')}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeDeleteProviderDialog}
                disabled={isDeletingProvider}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {t('settings.llmProviders.deleteDialog.cancel')}
              </button>
              <button
                onClick={handleDeleteProvider}
                disabled={isDeletingProvider}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingProvider ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('settings.llmProviders.deleteDialog.deleting')}
                  </>
                ) : (
                  t('settings.llmProviders.deleteDialog.delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('settings.deleteAccountDialog.title')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.deleteAccountDialog.subtitle')}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {t('settings.deleteAccountDialog.warning')}
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>{t('settings.deleteAccountDialog.deleteProjects')}</li>
                <li>{t('settings.deleteAccountDialog.deleteSources')}</li>
                <li>{t('settings.deleteAccountDialog.deleteHumanModel')}</li>
                <li>{t('settings.deleteAccountDialog.deleteData')}</li>
                <li className="text-red-600 dark:text-red-400 font-medium">{t('settings.deleteAccountDialog.irreversible')}</li>
              </ul>
            </div>

            <div className="mb-6">
              <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.deleteAccountDialog.passwordLabel')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('settings.deleteAccountDialog.passwordPlaceholder')}
                  autoFocus
                />
              </div>
              {deleteError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeDeleteDialog}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('settings.deleteAccountDialog.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || !deletePassword}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? t('settings.deleteAccountDialog.deleting') : t('settings.deleteAccountDialog.deleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
