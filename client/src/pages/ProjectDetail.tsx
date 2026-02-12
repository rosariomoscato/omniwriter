// @ts-nocheck
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Plus, BookOpen, Trash2, ChevronRight, FileText, Upload, Download } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import { apiService, Chapter, Project, Source, Character } from '../services/api';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'txt' | 'docx'>('txt');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [characterForm, setCharacterForm] = useState({
    name: '',
    description: '',
    traits: '',
    backstory: '',
    role_in_story: ''
  });

  useEffect(() => {
    if (id) {
      loadProject();
      loadChapters();
      loadSources();
      loadCharacters();
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

  const loadCharacters = async () => {
    try {
      const response = await apiService.getProjectCharacters(id!);
      setCharacters(response.characters);
    } catch (err) {
      console.error('Failed to load characters:', err);
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

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!characterForm.name.trim()) {
      setError('Character name is required');
      return;
    }

    try {
      setCreating(true);
      setError('');
      const response = await apiService.createCharacter(id!, characterForm);
      setCharacters([...characters, response.character]);
      setCharacterForm({ name: '', description: '', traits: '', backstory: '', role_in_story: '' });
      setShowAddCharacter(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create character');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!confirm('Are you sure you want to delete this character?')) {
      return;
    }

    try {
      await apiService.deleteCharacter(characterId);
      setCharacters(characters.filter(ch => ch.id !== characterId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete character');
    }
  };

  const openChapter = (chapterId: string) => {
    navigate(`/projects/${id}/chapters/${chapterId}`);
  };

  const handleExport = async (format: 'txt' | 'docx') => {
    try {
      setExporting(true);
      setError('');

      const blob = await apiService.exportProject(id!, format);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowExportDialog(false);
    } catch (err: any) {
      setError(err.message || 'Failed to export project');
    } finally {
      setExporting(false);
    }
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
            <button
              onClick={() => setShowExportDialog(true)}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Export Project
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose a format to export your project. All chapters will be included.
              </p>
              <div className="space-y-2">
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  exportFormat === 'txt'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="txt"
                    checked={exportFormat === 'txt'}
                    onChange={(e) => setExportFormat(e.target.value as 'txt' | 'docx')}
                    className="sr-only"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Plain Text (.txt)</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Simple text format compatible with all devices</div>
                  </div>
                </label>
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  exportFormat === 'docx'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="docx"
                    checked={exportFormat === 'docx'}
                    onChange={(e) => setExportFormat(e.target.value as 'txt' | 'docx')}
                    className="sr-only"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Word Document (.docx)</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Formatted document for Microsoft Word</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowExportDialog(false);
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                disabled={exporting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleExport(exportFormat)}
                disabled={exporting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export
                  </>
                )}
              </button>
            </div>
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

      {/* Characters Section - Only for Romanziere projects */}
      {project?.area === 'romanziere' && (
        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700 mt-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Characters
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({characters.length})
              </span>
            </div>
            <button
              onClick={() => setShowAddCharacter(!showAddCharacter)}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Character
            </button>
          </div>

          {/* Add Character Form */}
          {showAddCharacter && (
            <form onSubmit={handleCreateCharacter} className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="space-y-3">
                <input
                  type="text"
                  value={characterForm.name}
                  onChange={(e) => setCharacterForm({ ...characterForm, name: e.target.value })}
                  placeholder="Character name..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  disabled={creating}
                />
                <textarea
                  value={characterForm.description}
                  onChange={(e) => setCharacterForm({ ...characterForm, description: e.target.value })}
                  placeholder="Physical description and appearance..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  disabled={creating}
                />
                <textarea
                  value={characterForm.traits}
                  onChange={(e) => setCharacterForm({ ...characterForm, traits: e.target.value })}
                  placeholder="Personality traits (e.g., brave, cunning, kind)..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  disabled={creating}
                />
                <textarea
                  value={characterForm.backstory}
                  onChange={(e) => setCharacterForm({ ...characterForm, backstory: e.target.value })}
                  placeholder="Background and history..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  disabled={creating}
                />
                <input
                  type="text"
                  value={characterForm.role_in_story}
                  onChange={(e) => setCharacterForm({ ...characterForm, role_in_story: e.target.value })}
                  placeholder="Role in story (e.g., protagonist, mentor, villain)..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  disabled={creating}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !characterForm.name.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCharacter(false);
                      setCharacterForm({ name: '', description: '', traits: '', backstory: '', role_in_story: '' });
                      setError('');
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Characters List */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {characters.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <User className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
                <p className="text-lg font-medium mb-1">No characters yet</p>
                <p className="text-sm">Create characters for your Romanziere project</p>
              </div>
            ) : (
              characters.map((character) => (
                <div
                  key={character.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                        {character.name}
                      </h3>
                      {character.role_in_story && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          {character.role_in_story}
                        </span>
                      )}
                      {character.description && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Description:</span> {character.description}
                        </p>
                      )}
                      {character.traits && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Traits:</span> {character.traits}
                        </p>
                      )}
                      {character.backstory && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Backstory:</span> {character.backstory.substring(0, 150)}
                          {character.backstory.length > 150 ? '...' : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCharacter(character.id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete character"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
