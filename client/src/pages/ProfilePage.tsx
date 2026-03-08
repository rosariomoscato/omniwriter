import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { useToastNotification } from '../components/Toast';
import Breadcrumbs from '../components/Breadcrumbs';
import StorageBar from '../components/StorageBar';

interface UserProfile {
  id: string | number;
  email: string;
  name: string;
  bio: string;
  avatar_url: string;
  role: string;
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
      user: {
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700',
        label: t('profile.roles.user'),
        icon: '○'
      },
      admin: {
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-300 dark:border-red-700',
        label: t('profile.roles.admin'),
        icon: '⚙'
      },
    };
    return badges[role as keyof typeof badges] || badges.user;
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
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
                <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${roleBadge.color} flex items-center gap-1.5`}>
                  <span>{roleBadge.icon}</span>
                  <span>{roleBadge.label}</span>
                </span>
              </div>
              <p className="text-blue-100 mt-1">{profile.email}</p>
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

      {/* Storage Bar - Feature #407 */}
      <StorageBar className="mt-6" />

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

      {/* Donation Section - Feature #436 */}
      <div className="mt-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-card dark:to-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 flex flex-col md:flex-row items-center gap-6">
          {/* QR Code */}
          <div className="flex-shrink-0">
            <img
              src="/qrcode.png"
              alt="PayPal QR Code"
              className="w-40 h-40 rounded-lg shadow-md bg-white p-2"
            />
          </div>

          {/* Text Content */}
          <div className="flex-grow text-center md:text-left">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {t('profile.donation.title')}
            </h3>
            <p className="text-primary-600 dark:text-primary-400 font-medium mb-3">
              {t('profile.donation.subtitle')}
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              {t('profile.donation.description')}
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-xs mb-2">
              {t('profile.donation.scanQR')}
            </p>
            <a
              href="https://www.paypal.com/paypalme/rosmoscato"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {t('profile.donation.orVisit')}
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-100/50 dark:bg-gray-800/50 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('profile.donation.thankYou')}
          </p>
        </div>
      </div>
    </div>
  );
}
