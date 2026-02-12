import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface BulkSourceUploadProps {
  projectId: string;
  onUploadComplete: (sources: any[]) => void;
  onCancel: () => void;
}

export default function BulkSourceUpload({ projectId, onUploadComplete, onCancel }: BulkSourceUploadProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/rtf',
      'text/plain',
    ];

    const validExtensions = ['.pdf', '.docx', '.doc', '.rtf', '.txt'];

    const newUploads: UploadProgress[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

      if (validTypes.includes(file.type) || validExtensions.includes(fileExtension)) {
        newUploads.push({
          fileName: file.name,
          progress: 0,
          status: 'pending',
        });
      }
    }

    setUploads(newUploads);
    uploadFiles(Array.from(files).filter(file => {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      return validTypes.includes(file.type) || validExtensions.includes(fileExtension);
    }));
  };

  const uploadFiles = async (files: File[]) => {
    setIsProcessing(true);
    const uploadedSources: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Update status to uploading
      setUploads(prev => prev.map((u, idx) =>
        idx === i ? { ...u, status: 'uploading' as const, progress: 0 } : u
      ));

      try {
        // Simulate progress for the upload (fetch API doesn't provide progress)
        const progressInterval = setInterval(() => {
          setUploads(prev => prev.map((u, idx) => {
            if (idx === i && u.progress < 90) {
              return { ...u, progress: u.progress + 10 };
            }
            return u;
          }));
        }, 100);

        const response = await apiService.uploadProjectSource(projectId, file);

        clearInterval(progressInterval);

        uploadedSources.push(response.source);

        // Update status to success
        setUploads(prev => prev.map((u, idx) =>
          idx === i ? { ...u, status: 'success' as const, progress: 100 } : u
        ));

        // Update overall progress
        setOverallProgress(((i + 1) / files.length) * 100);
      } catch (error: any) {
        // Update status to error
        setUploads(prev => prev.map((u, idx) =>
          idx === i ? { ...u, status: 'error' as const, error: error.message || 'Upload failed' } : u
        ));

        setOverallProgress(((i + 1) / files.length) * 100);
      }
    }

    setIsProcessing(false);

    // Call completion callback after a short delay to show final state
    setTimeout(() => {
      onUploadComplete(uploadedSources);
    }, 1500);
  };

  const getStatusIcon = (upload: UploadProgress) => {
    switch (upload.status) {
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Upload className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Upload Sources
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {uploads.length} {uploads.length === 1 ? 'file' : 'files'} selected
              </p>
            </div>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Overall Progress Bar */}
          {uploads.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-700 dark:text-gray-300">Overall Progress</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Upload Area or Progress List */}
        <div className="flex-1 overflow-y-auto p-6">
          {uploads.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                PDF, DOCX, DOC, RTF, TXT (max 25MB each)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.rtf,.txt"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Select Files
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {uploads.map((upload, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    upload.status === 'success'
                      ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                      : upload.status === 'error'
                      ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                      : 'border-gray-200 bg-gray-50 dark:bg-gray-700/50 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(upload)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {upload.fileName}
                      </p>
                      {upload.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {upload.error}
                        </p>
                      )}
                    </div>
                    {upload.status === 'uploading' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {upload.progress}%
                        </span>
                        <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full transition-all duration-200"
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {upload.status === 'success' && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        Complete
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {uploads.length > 0 && !isProcessing && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {uploads.filter(u => u.status === 'success').length} of {uploads.length} files uploaded successfully
              </p>
              <button
                onClick={() => {
                  setUploads([]);
                  setOverallProgress(0);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Upload More Files
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
