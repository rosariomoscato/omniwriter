import { useState, useEffect } from 'react';
import { apiService, Source } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useToastNotification } from '../components/Toast';
import {
  FileText,
  Upload,
  Trash2,
  Tag,
  X,
  Search,
  Filter,
  FolderOpen,
} from 'lucide-react';

export default function SourcesPage() {
  const { t } = useTranslation();
  const toast = useToastNotification();

  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');
  const [allTags, setAllTags] = useState<string[]>([]);

  // Tag editing states
  const [editingSourceTags, setEditingSourceTags] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Preview states
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [showSourcePreview, setShowSourcePreview] = useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAllSources();

      const sourcesWithTags = response.sources.map(source => ({
        ...source,
        tags: source.tags || [],
      }));

      setSources(sourcesWithTags);

      // Extract all unique tags
      const tagSet = new Set<string>();
      sourcesWithTags.forEach(source => {
        if (source.tags && Array.isArray(source.tags)) {
          source.tags.forEach(tag => tagSet.add(tag));
        }
      });
      setAllTags(Array.from(tagSet).sort());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
      toast.error(err instanceof Error ? err.message : 'Failed to load sources');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    try {
      setUploading(true);
      setError(null);
      const response = await apiService.uploadStandaloneSource(file);

      const newSource = {
        ...response.source,
        tags: response.source.tags || [],
      };

      setSources([newSource, ...sources]);
      toast.success(`Source "${file.name}" uploaded successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      toast.error(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm(t('sources.confirmDelete'))) {
      return;
    }

    try {
      setError(null);
      await apiService.deleteSource(sourceId);
      setSources(sources.filter(s => s.id !== sourceId));
      toast.success(t('sources.deleteSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete source');
      toast.error(err instanceof Error ? err.message : 'Failed to delete source');
    }
  };

  const handleAddTag = async (sourceId: string, tag: string) => {
    if (!tag.trim()) return;

    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    const updatedTags = [...(source.tags || []), tag.trim()];

    try {
      setError(null);
      const response = await apiService.updateSourceTags(sourceId, updatedTags);
      setSources(sources.map(s => s.id === sourceId ? { ...s, tags: response.source.tags || [] } : s));
      setNewTagInput('');
      setEditingSourceTags(null);

      // Update all tags list
      if (!allTags.includes(tag.trim())) {
        setAllTags([...allTags, tag.trim()].sort());
      }

      toast.success(t('sources.tagAdded'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tag');
      toast.error(err instanceof Error ? err.message : 'Failed to add tag');
    }
  };

  const handleRemoveTag = async (sourceId: string, tag: string) => {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    const updatedTags = (source.tags || []).filter(t => t !== tag);

    try {
      setError(null);
      const response = await apiService.updateSourceTags(sourceId, updatedTags);
      setSources(sources.map(s => s.id === sourceId ? { ...s, tags: response.source.tags || [] } : s));
      toast.success(t('sources.tagRemoved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tag');
      toast.error(err instanceof Error ? err.message : 'Failed to remove tag');
    }
  };

  // Filter sources based on search and tag filter
  const filteredSources = sources.filter(source => {
    const matchesSearch = searchQuery === '' ||
      source.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (source.tags && source.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesTag = selectedTagFilter === 'all' ||
      (source.tags && source.tags.includes(selectedTagFilter));

    return matchesSearch && matchesTag;
  });

  // Get file type icon/color based on source type
  const getFileTypeColor = (source: Source) => {
    if (source.source_type === 'web_search') {
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    }
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
  };

  const getFileTypeLabel = (source: Source) => {
    if (source.source_type === 'web_search') {
      return t('sources.typeWebSearch');
    }
    return t('sources.typeUpload');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('sources.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('sources.description')}
        </p>
      </div>

      {/* Stats and Upload */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('sources.totalSources')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{sources.length}</p>
            </div>
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('sources.totalTags')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{allTags.length}</p>
            </div>
            <Tag className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:col-span-2">
          <div className="flex items-center justify-between h-full">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('sources.uploadNew')}
              </label>
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors w-fit">
                <Upload className="w-4 h-4" />
                <span>{uploading ? t('sources.uploading') : t('sources.uploadButton')}</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.rtf,.txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
              PDF, DOCX, DOC, RTF, TXT
              <br />
              Max 25MB
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('sources.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedTagFilter}
                onChange={(e) => setSelectedTagFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('sources.allTags')}</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Sources List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {searchQuery || selectedTagFilter !== 'all' ? t('sources.noFilteredSources') : t('sources.noSources')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || selectedTagFilter !== 'all' ? t('sources.tryDifferentFilters') : t('sources.uploadFirstSource')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {filteredSources.map((source) => (
            <div
              key={source.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-gray-900 dark:text-gray-100 font-medium truncate">
                      {source.file_name}
                    </h3>
                    {source.project_title && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                        <FolderOpen className="w-3 h-3" />
                        {source.project_title}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                      {source.file_type.split('/')[1] || 'file'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {((source.file_size || 0) / 1024).toFixed(1)} KB
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded ${getFileTypeColor(source)}`}>
                      {getFileTypeLabel(source)}
                    </span>

                    {/* Tags display */}
                    {source.tags && source.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {source.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-full"
                          >
                            {tag}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTag(source.id, tag);
                              }}
                              className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Tag Input */}
                  {editingSourceTags === source.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTagInput.trim()) {
                            handleAddTag(source.id, newTagInput);
                          } else if (e.key === 'Escape') {
                            setEditingSourceTags(null);
                            setNewTagInput('');
                          }
                        }}
                        placeholder={t('sources.addTagPlaceholder')}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setEditingSourceTags(null);
                          setNewTagInput('');
                        }}
                        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditingSourceTags(editingSourceTags === source.id ? null : source.id);
                    setNewTagInput('');
                  }}
                  className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title={t('sources.addTag')}
                >
                  <Tag className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title={t('sources.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
