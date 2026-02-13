import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { useToastNotification } from '../components/Toast';
import Breadcrumbs from '../components/Breadcrumbs';

interface UserProfile {
  id: string | number;
  email: string;
  name: string;
  bio: string;
  avatar_url: string;
  role: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  preferred_language: string;
  theme_preference: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToastNotification();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Log auth user for debugging (helps with TypeScript check)
  useEffect(() => {
    if (authUser) {
      console.log('[ProfilePage] Authenticated user:', authUser.id);
    }
  }, [authUser]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getUserProfile();
      setProfile(response.user);
      setName(response.user.name);
      setBio(response.user.bio);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setErrorMessage(t('profile.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response = await apiService.updateUserProfile({
        name: name.trim(),
        bio: bio.trim(),
      });

      setProfile(response.user);
      toast.success(t('profile.updateSuccess'));
      setIsEditing(false);

      // Update auth context user
      if (updateUser) {
        updateUser(response.user);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setErrorMessage(error.message || t('profile.updateError'));
      toast.error(error.message || t('profile.updateErrorToast'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setName(profile.name);
      setBio(profile.bio);
    }
    setIsEditing(false);
    setErrorMessage('');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('profile.never');
    const locale = i18n.language === 'it' ? 'it-IT' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      free: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', label: t('profile.roles.free') },
      premium: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', label: t('profile.roles.premium') },
      lifetime: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: t('profile.roles.lifetime') },
      admin: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: t('profile.roles.admin') },
    };
    return badges[role as keyof typeof badges] || badges.free;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">{t('profile.failedToLoadShort')}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t('profile.backToDashboard')}
        </button>
      </div>
    );
  }

  const roleBadge = getRoleBadge(profile.role);

  return (
    <div className="p-6">
      <Breadcrumbs />
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
          <div className="flex items-center space-x-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-3xl font-semibold">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name and Email */}
            <div className="flex-grow">
              <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
              <p className="text-blue-100">{profile.email}</p>
              <div className="mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleBadge.color}`}>
                  {roleBadge.label}
                </span>
              </div>
            </div>

            {/* Edit Button */}
            <div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  {t('profile.editProfile')}
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                  >
                    {t('profile.cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? t('profile.saving') : t('profile.save')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alert Messages */}
        {successMessage && (
          <div className="mx-6 mt-6 p-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 rounded-lg">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mt-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Profile Details */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.displayName')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder={t('profile.displayNamePlaceholder')}
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100">{profile.name || t('profile.notSet')}</p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('profile.bio')}
                </label>
                {isEditing ? (
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder={t('profile.bioPlaceholder')}
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {profile.bio || t('profile.noBioSet')}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Account Info */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">
                {t('profile.accountInformation')}
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.email')}
                </label>
                <p className="text-gray-900 dark:text-gray-100">{profile.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.subscriptionStatus')}
                </label>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                  {profile.subscription_expires_at && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t('profile.expires', { date: formatDate(profile.subscription_expires_at) })}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.languagePreference')}
                </label>
                <p className="text-gray-900 dark:text-gray-100 capitalize">{profile.preferred_language}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.themePreference')}
                </label>
                <p className="text-gray-900 dark:text-gray-100 capitalize">{profile.theme_preference}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.memberSince')}
                </label>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(profile.created_at)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.lastLogin')}
                </label>
                <p className="text-gray-900 dark:text-gray-100">{formatDate(profile.last_login_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="p-4 bg-white dark:bg-dark-card rounded-lg shadow hover:shadow-md transition-shadow text-left"
        >
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">{t('profile.quickLinks.settings')}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('profile.quickLinks.settingsDesc')}
          </p>
        </button>

        <button
          onClick={() => navigate('/human-model')}
          className="p-4 bg-white dark:bg-dark-card rounded-lg shadow hover:shadow-md transition-shadow text-left"
        >
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">{t('profile.quickLinks.humanModel')}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('profile.quickLinks.humanModelDesc')}
          </p>
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          className="p-4 bg-white dark:bg-dark-card rounded-lg shadow hover:shadow-md transition-shadow text-left"
        >
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">{t('profile.quickLinks.dashboard')}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('profile.quickLinks.dashboardDesc')}
          </p>
        </button>
      </div>
    </div>
  );
}
