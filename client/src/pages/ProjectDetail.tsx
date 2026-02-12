import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Plus, BookOpen, Trash2, Edit, ChevronRight, FileText, Upload } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import { apiService, Chapter, Project, Source } from '../services/api';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadProject();
      loadChapters();
      loadSources();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      const response = await apiService.getProject(id!);
      setProject(response.project);
    } catch (err) {
      console.error('Failed to load project:', err);
    }
  };

  const loadChapters = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProjectChapters(id!);
      setChapters(response.chapters);
    } catch (err) {
      console.error('Failed to load chapters:', err);
      setError('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const loadSources = async () => {
    try {
      const response = await apiService.getProjectSources(id!);
      setSources(response.sources);
    } catch (err) {
      console.error('Failed to load sources:', err);
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newChapterTitle.trim()) {
      setError('Chapter title is required');
      return;
    }

    try {
      setCreating(true);
      setError('');
      const response = await apiService.createChapter(id!, { title: newChapterTitle.trim() });
      setChapters([...chapters, response.chapter]);
      setNewChapterTitle('');
      setShowAddChapter(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create chapter');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) {
      return;
    }

    try {
      await apiService.deleteChapter(chapterId);
      setChapters(chapters.filter(ch => ch.id !== chapterId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete chapter');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/msword', 'application/rtf', 'text/plain'];
    const validExtensions = ['.pdf', '.docx', '.doc', '.rtf', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError('Invalid file type. Please upload PDF, DOCX, DOC, RTF, or TXT files.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      const response = await apiService.uploadProjectSource(id!, file);
      setSources([...sources, response.source]);
      setShowAddSource(false);
      // Reset file input
      e.target.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this source?')) {
      return;
    }

    try {
      await apiService.deleteSource(sourceId);
      setSources(sources.filter(s => s.id !== sourceId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete source');
    }
  };

  const openChapter = (chapterId: string) => {
    navigate(`/projects/${id}/chapters/${chapterId}`);
  };

  return (
    <div className="p-6">
      <Breadcrumbs />

      {project && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {project.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {project.description || 'No description'}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              project.area === 'romanziere' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
              project.area === 'saggista' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' :
              'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
            }`}>
              {project.area.charAt(0).toUpperCase() + project.area.slice(1)}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              project.status === 'draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
              project.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {project.status === 'draft' ? 'Draft' : project.status === 'in_progress' ? 'In Progress' : 'Completed'}
            </span>
          </div>
        </div>
      )}

      {/* Chapters Section */}
      <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Chapters
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({chapters.length})
            </span>
          </div>
          <button
            onClick={() => setShowAddChapter(!showAddChapter)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Chapter
          </button>
        </div>

        {/* Add Chapter Form */}
        {showAddChapter && (
          <form onSubmit={handleCreateChapter} className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="Chapter title..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={creating}
              />
              <button
                type="submit"
                disabled={creating || !newChapterTitle.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddChapter(false);
                  setNewChapterTitle('');
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Chapters List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading chapters...
            </div>
          ) : chapters.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
              <p className="text-lg font-medium mb-1">No chapters yet</p>
              <p className="text-sm">Create your first chapter to get started</p>
            </div>
          ) : (
            chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => openChapter(chapter.id)}>
                  <span className="text-sm font-mono text-gray-400 dark:text-gray-500 w-8">
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    <h3 className="text-gray-900 dark:text-gray-100 font-medium">
                      {chapter.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        chapter.status === 'draft' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                        chapter.status === 'generated' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                        chapter.status === 'revised' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                        'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      }`}>
                        {chapter.status}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {chapter.word_count} words
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChapter(chapter.id);
                  }}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete chapter"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sources Section */}
      <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700 mt-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Sources
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({sources.length})
            </span>
          </div>
          <button
            onClick={() => setShowAddSource(!showAddSource)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Source
          </button>
        </div>

        {/* Upload Source Form */}
        {showAddSource && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-4">
              <label className="flex-1">
                <div className="flex items-center justify-center w-full h-32 px-4 transition bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg appearance-none cursor-pointer hover:border-blue-500 focus:outline-none">
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      PDF, DOCX, DOC, RTF, TXT (Max 25MB)
                    </span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc,.rtf,.txt"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </div>
              </label>
              <button
                onClick={() => {
                  setShowAddSource(false);
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Sources List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sources.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
              <p className="text-lg font-medium mb-1">No sources yet</p>
              <p className="text-sm">Upload reference materials to use in your project</p>
            </div>
          ) : (
            sources.map((source) => (
              <div
                key={source.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <h3 className="text-gray-900 dark:text-gray-100 font-medium">
                      {source.file_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                        {source.file_type.split('/')[1] || 'file'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(source.file_size / 1024).toFixed(1)} KB
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        source.source_type === 'upload'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      }`}>
                        {source.source_type === 'upload' ? 'Upload' : 'Web Search'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete source"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
