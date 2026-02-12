import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { ChapterVersion } from '../services/api';

interface VersionComparisonProps {
  version1: ChapterVersion;
  version2: ChapterVersion;
  onClose: () => void;
}

// Simple diff algorithm - splits by lines and highlights changes
function computeDiff(oldText: string, newText: string) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const result: Array<{ type: 'same' | 'added' | 'removed' | 'modified'; oldLine?: string; newLine?: string }> = [];

  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    const oldLine = oldLines[i];
    const newLine = newLines[j];

    if (i < oldLines.length && j < newLines.length && oldLine === newLine) {
      result.push({ type: 'same', oldLine, newLine });
      i++;
      j++;
    } else if (i < oldLines.length && j < newLines.length) {
      result.push({ type: 'modified', oldLine, newLine });
      i++;
      j++;
    } else if (i < oldLines.length) {
      result.push({ type: 'removed', oldLine });
      i++;
    } else if (j < newLines.length) {
      result.push({ type: 'added', newLine });
      j++;
    }
  }

  return result;
}

export default function VersionComparison({ version1, version2, onClose }: VersionComparisonProps) {
  const diff = computeDiff(version1.content, version2.content);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getVersionLabel = (version: ChapterVersion, label: string) => {
    return `${label} (v${version.version_number})`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Compare Versions
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Version Info Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 text-center">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {getVersionLabel(version1, 'Older')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(version1.created_at)}
            </div>
          </div>

          <div className="px-4">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>

          <div className="flex-1 text-center">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {getVersionLabel(version2, 'Newer')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(version2.created_at)}
            </div>
          </div>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Version 1 (Older) */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Version {version1.version_number}
                </span>
              </div>
              <div className="p-4 h-[500px] overflow-y-auto font-mono text-sm whitespace-pre-wrap bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100">
                {version1.content || <em className="text-gray-400">Empty content</em>}
              </div>
            </div>

            {/* Version 2 (Newer) */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Version {version2.version_number}
                </span>
              </div>
              <div className="p-4 h-[500px] overflow-y-auto font-mono text-sm whitespace-pre-wrap bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100">
                {version2.content || <em className="text-gray-400">Empty content</em>}
              </div>
            </div>
          </div>

          {/* Diff Legend */}
          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Added</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Removed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Modified</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
