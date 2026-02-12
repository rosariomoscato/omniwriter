import { useState, useEffect } from 'react';
import { Clock, FileText, RotateCcw, X, Check } from 'lucide-react';
import { apiService, ChapterVersion } from '../services/api';

interface VersionHistoryProps {
  chapterId: string;
  onClose: () => void;
  onRestore: (content: string) => void;
  onCompare: (version1: ChapterVersion, version2: ChapterVersion) => void;
}

export default function VersionHistory({ chapterId, onClose, onRestore, onCompare }: VersionHistoryProps) {
  const [versions, setVersions] = useState<ChapterVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [chapterId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getChapterVersions(chapterId);
      setVersions(response.versions);
    } catch (err: any) {
      setError(err.message || 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Are you sure you want to restore to version ${versionNumber}? A new version will be created from the current content first.`)) {
      return;
    }

    try {
      setRestoring(versionId);
      const response = await apiService.restoreChapterVersion(chapterId, versionId);
      onRestore(response.chapter.content);

      // Reload versions list
      await loadVersions();

      alert(`Successfully restored to version ${versionNumber}`);
    } catch (err: any) {
      alert(err.message || 'Failed to restore version');
    } finally {
      setRestoring(null);
    }
  };

  const toggleCompareSelection = (version: ChapterVersion) => {
    const newSelection = new Set(selectedForCompare);

    if (newSelection.has(version.id)) {
      newSelection.delete(version.id);
    } else if (newSelection.size < 2) {
      newSelection.add(version.id);
    } else {
      // Replace oldest selection
      const firstId = Array.from(newSelection)[0];
      newSelection.delete(firstId);
      newSelection.add(version.id);
    }

    setSelectedForCompare(newSelection);

    // If 2 versions selected, trigger comparison
    if (newSelection.size === 2) {
      const version1 = versions.find(v => v.id === Array.from(newSelection)[0]);
      const version2 = versions.find(v => v.id === Array.from(newSelection)[1]);
      if (version1 && version2) {
        onCompare(version1, version2);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading versions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
        >
          Close
        </button>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="p-6">
        <div className="text-gray-600 dark:text-gray-400 mb-4">
          No version history yet. Versions are automatically created when you edit the chapter content.
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Version History
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Select 2 versions to compare them side-by-side, or restore a previous version.
      </p>

      <div className="space-y-2">
        {versions.map((version) => (
          <div
            key={version.id}
            className={`p-3 rounded-lg border transition-all ${
              selectedForCompare.has(version.id)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Version {version.version_number}
                  </span>
                  {selectedForCompare.has(version.id) && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(version.created_at)}
                </div>
                {version.change_description && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {version.change_description}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => toggleCompareSelection(version)}
                  className={`p-2 rounded-lg transition-colors text-sm ${
                    selectedForCompare.has(version.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title="Select for comparison"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRestore(version.id, version.version_number)}
                  disabled={restoring === version.id}
                  className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors text-sm disabled:opacity-50"
                  title="Restore this version"
                >
                  {restoring === version.id ? (
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
