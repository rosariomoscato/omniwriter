import { useState, useEffect } from 'react';
import { Search, Shield, Mail, Calendar, Crown, User, Trash2, AlertTriangle } from 'lucide-react';
import { useToastNotification } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  preferred_language: 'it' | 'en';
  created_at: string;
  last_login_at?: string;
  storage_used_bytes: number;
  storage_limit_bytes: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UsersResponse {
  users: User[];
  pagination: Pagination;
}

const AdminUsersPage = () => {
  const toast = useToastNotification();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'storage_used'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const fetchUsers = async (page: number, searchQuery: string, role: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = new URL('/api/admin/users', window.location.origin);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '20');
      if (searchQuery) {
        url.searchParams.append('search', searchQuery);
      }
      if (role) {
        url.searchParams.append('role', role);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 403) {
        setError('Access denied. Admin privileges required.');
        setUsers([]);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data: UsersResponse = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(pagination.page, search, roleFilter);
  }, [pagination.page, search, roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRoleFilterChange = (newRole: string) => {
    setRoleFilter(newRole);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSortByStorage = () => {
    if (sortBy === 'storage_used') {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy('storage_used');
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setRoleFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatStorage = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(1)} MB`;
    }
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  const getStoragePercentage = (used: number, limit: number): number => {
    return Math.min((used / limit) * 100, 100);
  };

  const getStorageColor = (percentage: number): string => {
    if (percentage >= 95) {
      return 'bg-red-500';
    }
    if (percentage >= 80) {
      return 'bg-orange-500';
    }
    return 'bg-green-500';
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.message?.includes('Cannot delete your own account')) {
          toast.error('Non puoi eliminare il tuo account');
          return;
        }
        throw new Error('Failed to delete user');
      }

      // Remove user from local state
      setUsers(users.filter(u => u.id !== userId));
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      setDeleteConfirm(null);
      toast.success('Utente eliminato con successo');
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Errore durante l\'eliminazione dell\'utente');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      toast.success('User role updated successfully');
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error('Failed to update user role');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'user': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? Crown : User;
  };

  // Sort users based on current sort settings
  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === 'storage_used') {
      const aUsage = a.storage_used_bytes / a.storage_limit_bytes;
      const bUsage = b.storage_used_bytes / b.storage_limit_bytes;
      return sortOrder === 'asc' ? aUsage - bUsage : bUsage - aUsage;
    }
    // created_at
    const aDate = new Date(a.created_at).getTime();
    const bDate = new Date(b.created_at).getTime();
    return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Gestione Utenti
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gestisci gli utenti della piattaforma
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cerca per email o nome..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Cerca
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Ruolo:
          </label>
          <select
            value={roleFilter}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tutti</option>
            <option value="user">Utente</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {(search || roleFilter) && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancella filtri
          </button>
        )}
      </div>

      {/* Results Info */}
      {pagination.total > 0 && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {users.length} of {pagination.total} users
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Utente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
                    onClick={handleSortByStorage}>
                  Spazio
                  {sortBy === 'storage_used' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Creato il
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ultimo Accesso
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Nessun utente trovato
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  const storagePercentage = getStoragePercentage(user.storage_used_bytes, user.storage_limit_bytes);
                  const storageColor = getStorageColor(storagePercentage);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                            <RoleIcon className="w-3 h-3" />
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full max-w-xs">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-900 dark:text-white">
                              {formatStorage(user.storage_used_bytes)} / {formatStorage(user.storage_limit_bytes)}
                            </span>
                            <span className={`font-medium ${
                              storagePercentage >= 95 ? 'text-red-600 dark:text-red-400' :
                              storagePercentage >= 80 ? 'text-orange-600 dark:text-orange-400' :
                              'text-gray-600 dark:text-gray-400'
                            }`}>
                              {storagePercentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${storageColor} rounded-full transition-all`}
                              style={{ width: `${storagePercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(user.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.last_login_at ? formatDate(user.last_login_at) : 'Mai'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {/* Role Change Dropdown */}
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="user">Utente</option>
                            <option value="admin">Admin</option>
                          </select>

                          {/* Delete Button */}
                          {String(user.id) !== String(currentUser?.id) && (
                            <button
                              onClick={() => setDeleteConfirm({ id: user.id, name: user.name })}
                              className="p-1.5 rounded bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-200 transition-colors"
                              title="Elimina utente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Pagina {pagination.page} di {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Precedente
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Successiva
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Conferma Eliminazione
              </h3>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Sei sicuro di voler eliminare l'utente <strong>{deleteConfirm.name}</strong>?
              <br />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Questa azione eliminerà anche tutti i progetti, capitoli e dati associati all'utente. Questa azione non può essere annullata.
              </span>
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                Elimina Utente
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminUsersPage;
