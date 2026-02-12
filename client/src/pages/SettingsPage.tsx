import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { useToastNotification } from '../components/Toast';
import { Lock, Key, User, Shield, LogOut, AlertTriangle, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToastNotification();

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }

    if (!isPasswordValid) {
      setPasswordError('Password does not meet requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      setIsChangingPassword(true);
      await apiService.changePassword({
        currentPassword,
        newPassword,
      });

      setPasswordSuccess('Password changed successfully!');
      toast.success('Password updated successfully!');

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (error: any) {
      console.error('Password change error:', error);
      setPasswordError(error.message || 'Failed to change password. Please try again.');
      toast.error(error.message || 'Failed to change password');
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
      setDeleteError('Password is required to delete your account');
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');

      await apiService.deleteAccount(deletePassword);

      // Logout and redirect to login after successful deletion
      toast.success('Account deleted successfully');
      await logout();
      navigate('/login', { replace: true });
    } catch (error: any) {
      console.error('Delete account error:', error);
      if (error.message && error.message.includes('Password is incorrect')) {
        setDeleteError('Incorrect password. Please try again.');
      } else {
        setDeleteError(error.message || 'Failed to delete account. Please try again.');
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account settings and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>

            <div className="space-y-2">
              <button
                onClick={navigateToProfile}
                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">Edit Profile</span>
              </button>

              <button
                onClick={() => navigate('/human-model')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">Human Model</span>
              </button>

              <hr className="my-4 border-gray-200 dark:border-gray-700" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>

              <button
                onClick={openDeleteDialog}
                className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete Account</span>
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
              <span className="capitalize">{user?.role || 'free'}</span> account
            </div>
          </div>
        </div>

        {/* Right Column - Password Change */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <Key className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Change Password</h2>
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
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter your current password"
                    required
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Required for security verification
                </p>
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter new password"
                  required
                />

                {/* Password Requirements */}
                {newPassword && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Password requirements:</p>
                    <div className="space-y-1.5">
                      <div className={`flex items-center gap-2 text-sm ${passwordValidations.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        At least 8 characters
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${passwordValidations.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        At least 1 uppercase letter
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${passwordValidations.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        At least 1 lowercase letter
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${passwordValidations.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        At least 1 number
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Confirm new password"
                  required
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword || !isPasswordValid || newPassword !== confirmPassword}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Delete Account?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you want to permanently delete your account? This will:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>Delete all your projects and content</li>
                <li>Delete all your sources and uploads</li>
                <li>Delete your Human Model profiles</li>
                <li>Remove all your data from our servers</li>
                <li className="text-red-600 dark:text-red-400 font-medium">This action is irreversible</li>
              </ul>
            </div>

            <div className="mb-6">
              <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter your password to confirm
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your password"
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
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || !deletePassword}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
