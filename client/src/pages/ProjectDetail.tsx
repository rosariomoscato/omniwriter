// @ts-nocheck
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Plus, BookOpen, Trash2, ChevronRight, FileText, Upload, Download, User, MapPin, Calendar, Edit3, Image as ImageIcon, Crown, Copy, Settings, Archive, ArchiveRestore, ChevronDown, GripVertical, X, Tag, Search, Globe } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import RedattoreConfig from '../components/RedattoreConfig';
import SaggistaConfig from '../components/SaggistaConfig';
import { ChapterListSkeleton } from '../components/Skeleton';
import BulkSourceUpload from '../components/BulkSourceUpload';
import { apiService, Chapter, Project, Source, Character, Location, PlotEvent } from '../services/api';
import { useToastNotification } from '../components/Toast';

export default function ProjectDetail() {
  const toast = useToastNotification();
  const { id } = useParams();
  const navigate = useNavigate();

  // Refs to track ongoing delete operations
  const deletingChapterIdRef = useRef<string | null>(null);
  const deletingSourceIdRef = useRef<string | null>(null);
  const deletingCharacterIdRef = useRef<string | null>(null);
  const deletingLocationIdRef = useRef<string | null>(null);
  const deletingPlotEventIdRef = useRef<string | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [plotEvents, setPlotEvents] = useState<PlotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showWebSearch, setShowWebSearch] = useState(false);
  const [showSourcePreview, setShowSourcePreview] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAddPlotEvent, setShowAddPlotEvent] = useState(false);
  const [editingPlotEvent, setEditingPlotEvent] = useState<PlotEvent | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'txt' | 'docx' | 'epub'>('txt');
  const [showEpubMetadata, setShowEpubMetadata] = useState(false);
  const [epubMetadata, setEpubMetadata] = useState({
    author: '',
    publisher: '',
    isbn: '',
    language: 'en'
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImageId, setCoverImageId] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [userRole, setUserRole] = useState<string>('free');
  const [showBatchExport, setShowBatchExport] = useState(false);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [batchExportFormat, setBatchExportFormat] = useState<'txt' | 'docx' | 'epub'>('txt');
  const [exportingBatch, setExportingBatch] = useState(false);
  const [selectAllChapters, setSelectAllChapters] = useState(false);
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
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    description: '',
    significance: ''
  });
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [plotEventForm, setPlotEventForm] = useState({
    title: '',
    description: '',
    chapter_id: '',
    event_type: ''
  });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    genre: '',
    tone: '',
    target_audience: '',
    pov: '',
    word_count_target: '',
    status: 'draft' as 'draft' | 'in_progress' | 'completed' | 'archived',
    area: 'romanziere' as 'romanziere' | 'saggista' | 'redattore'
  });
  const [draggedChapterIndex, setDraggedChapterIndex] = useState<number | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [editingSourceTags, setEditingSourceTags] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [webSearchResults, setWebSearchResults] = useState<any[]>([]);
  const [webSearchSearching, setWebSearchSearching] = useState(false);
  const [webSearchUrl, setWebSearchUrl] = useState('');
  const [webSearchTitle, setWebSearchTitle] = useState('');
  const [webSearchContent, setWebSearchContent] = useState('');

  useEffect(() => {
    if (id) {
      loadProject();
      loadChapters();
      loadSources();
      loadCharacters();
      loadLocations();
      loadPlotEvents();
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

  // Drag and drop handlers for chapter reordering
  const handleDragStart = (index: number) => {
    setDraggedChapterIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = draggedChapterIndex;

    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedChapterIndex(null);
      return;
    }

    try {
      // Create a copy of chapters array
      const newChapters = [...chapters];
      const [draggedChapter] = newChapters.splice(dragIndex, 1);
      newChapters.splice(dropIndex, 0, draggedChapter);

      // Update local state immediately for responsiveness
      setChapters(newChapters);
      setDraggedChapterIndex(null);

      // Call API to update order in database
      await apiService.reorderChapter(draggedChapter.id, dropIndex);

      // Reload chapters to ensure correct order
      await loadChapters();

      toast.success('Chapter order updated');
    } catch (err: any) {
      console.error('Failed to reorder chapter:', err);
      setError(err.message || 'Failed to reorder chapter');
      // Revert to original order on error
      await loadChapters();
    }
  };

  const loadSources = async () => {
    try {
      const response = await apiService.getProjectSources(id!);
      // Parse tags_json to tags array for each source
      const sourcesWithTags = response.sources.map(source => ({
        ...source,
        tags: JSON.parse(source.tags_json || '[]')
      }));
      setSources(sourcesWithTags);
      await loadAllTags();
    } catch (err) {
      console.error('Failed to load sources:', err);
    }
  };

  const loadAllTags = async () => {
    try {
      const response = await apiService.getSourceTags();
      setAllTags(response.tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
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

  const loadLocations = async () => {
    try {
      const response = await apiService.getProjectLocations(id!);
      setLocations(response.locations);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  const loadPlotEvents = async () => {
    try {
      const response = await apiService.getProjectPlotEvents(id!);
      setPlotEvents(response.plotEvents);
    } catch (err) {
      console.error('Failed to load plot events:', err);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!locationForm.name.trim()) {
      setError('Location name is required');
      return;
    }

    try {
      setCreating(true);
      setError('');
      const response = await apiService.createLocation(id!, locationForm);
      setLocations([...locations, response.location]);
      setLocationForm({ name: '', description: '', significance: '' });
      setShowAddLocation(false);
      toast.success('Location created successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to create location');
      toast.error(err.message || 'Failed to create location');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingLocation) return;

    try {
      setCreating(true);
      setError('');
      const response = await apiService.updateLocation(editingLocation.id, locationForm);
      setLocations(locations.map(l => l.id === editingLocation.id ? response.location : l));
      setEditingLocation(null);
      setLocationForm({ name: '', description: '', significance: '' });
      toast.success('Location updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update location');
      toast.error(err.message || 'Failed to update location');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    // Prevent rapid double-clicks
    if (deletingLocationIdRef.current === locationId) {
      return;
    }

    if (!confirm('Are you sure you want to delete this location?')) {
      return;
    }

    // Mark as deleting immediately
    deletingLocationIdRef.current = locationId;

    try {
      await apiService.deleteLocation(locationId);
      setLocations(locations.filter(l => l.id !== locationId));
      toast.success('Location deleted successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to delete location');
      toast.error(err.message || 'Failed to delete location');
    } finally {
      deletingLocationIdRef.current = null;
    }
  };

  const startEditLocation = (location: Location) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name,
      description: location.description,
      significance: location.significance
    });
    setShowAddLocation(true);
  };

  const handleCreatePlotEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!plotEventForm.title.trim()) {
      setError('Plot event title is required');
      return;
    }

    try {
      setCreating(true);
      setError('');

      const data = {
        title: plotEventForm.title.trim(),
        description: plotEventForm.description || undefined,
        event_type: plotEventForm.event_type || undefined
      };

      // Only include chapter_id if it's not empty
      if (plotEventForm.chapter_id) {
        (data as any).chapter_id = plotEventForm.chapter_id;
      }

      if (editingPlotEvent) {
        const response = await apiService.updatePlotEvent(editingPlotEvent.id, data);
        setPlotEvents(plotEvents.map(pe => pe.id === editingPlotEvent.id ? response.plotEvent : pe));
      } else {
        const response = await apiService.createPlotEvent(id!, data);
        setPlotEvents([...plotEvents, response.plotEvent]);
      }

      setPlotEventForm({ title: '', description: '', chapter_id: '', event_type: '' });
      setEditingPlotEvent(null);
      setShowAddPlotEvent(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save plot event');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlotEvent = async (plotEventId: string) => {
    // Prevent rapid double-clicks
    if (deletingPlotEventIdRef.current === plotEventId) {
      return;
    }

    if (!confirm('Are you sure you want to delete this plot event?')) {
      return;
    }

    // Mark as deleting immediately
    deletingPlotEventIdRef.current = plotEventId;

    try {
      await apiService.deletePlotEvent(plotEventId);
      setPlotEvents(plotEvents.filter(pe => pe.id !== plotEventId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete plot event');
    } finally {
      deletingPlotEventIdRef.current = null;
    }
  };

  const startEditPlotEvent = (plotEvent: PlotEvent) => {
    setEditingPlotEvent(plotEvent);
    setPlotEventForm({
      title: plotEvent.title,
      description: plotEvent.description,
      chapter_id: plotEvent.chapter_id || '',
      event_type: plotEvent.event_type || ''
    });
    setShowAddPlotEvent(true);
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
    // Prevent rapid double-clicks
    if (deletingChapterIdRef.current === chapterId) {
      return;
    }

    if (!confirm('Are you sure you want to delete this chapter?')) {
      return;
    }

    // Mark as deleting immediately
    deletingChapterIdRef.current = chapterId;

    try {
      await apiService.deleteChapter(chapterId);
      setChapters(chapters.filter(ch => ch.id !== chapterId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete chapter');
    } finally {
      deletingChapterIdRef.current = null;
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
    // Prevent rapid double-clicks
    if (deletingSourceIdRef.current === sourceId) {
      return;
    }

    if (!confirm('Are you sure you want to delete this source?')) {
      return;
    }

    // Mark as deleting immediately
    deletingSourceIdRef.current = sourceId;

    try {
      await apiService.deleteSource(sourceId);
      setSources(sources.filter(s => s.id !== sourceId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete source');
    } finally {
      deletingSourceIdRef.current = null;
    }
  };

  const handleBulkUploadComplete = (newSources: any[]) => {
    setSources([...sources, ...newSources]);
    setShowBulkUpload(false);
    if (newSources.length > 0) {
      const successCount = newSources.length;
      toast.success(`${successCount} ${successCount === 1 ? 'source' : 'sources'} uploaded successfully`);
    }
  };

  const handleAddTag = async (sourceId: string, tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    // Check if tag already exists
    if (source.tags.includes(trimmedTag)) {
      setNewTagInput('');
      return;
    }

    try {
      const updatedTags = [...source.tags, trimmedTag];
      const response = await apiService.updateSourceTags(sourceId, updatedTags);
      const updatedSource = { ...response.source, tags: JSON.parse(response.source.tags_json || '[]') };
      setSources(sources.map(s => s.id === sourceId ? updatedSource : s));
      await loadAllTags();
      setNewTagInput('');
      toast.success('Tag added');
    } catch (err: any) {
      setError(err.message || 'Failed to add tag');
    }
  };

  const handleRemoveTag = async (sourceId: string, tagToRemove: string) => {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    try {
      const updatedTags = source.tags.filter(tag => tag !== tagToRemove);
      const response = await apiService.updateSourceTags(sourceId, updatedTags);
      const updatedSource = { ...response.source, tags: JSON.parse(response.source.tags_json || '[]') };
      setSources(sources.map(s => s.id === sourceId ? updatedSource : s));
      await loadAllTags();
      toast.success('Tag removed');
    } catch (err: any) {
      setError(err.message || 'Failed to remove tag');
    }
  };

  const handleWebSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!webSearchQuery.trim()) {
      setError('Search query is required');
      return;
    }

    try {
      setWebSearchSearching(true);
      setError('');

      // For development, create mock search results
      // In production, this would call a real web search API
      const mockResults = [
        {
          id: '1',
          title: `${webSearchQuery} - Wikipedia`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(webSearchQuery.replace(/\s+/g, '_'))}`,
          snippet: `Information about ${webSearchQuery} from Wikipedia...`,
          source: 'Wikipedia'
        },
        {
          id: '2',
          title: `${webSearchQuery} - News`,
          url: `https://news.google.com/search?q=${encodeURIComponent(webSearchQuery)}`,
          snippet: `Latest news about ${webSearchQuery}...`,
          source: 'Google News'
        },
        {
          id: '3',
          title: `${webSearchQuery} - Scholar`,
          url: `https://scholar.google.com/scholar?q=${encodeURIComponent(webSearchQuery)}`,
          snippet: `Academic articles about ${webSearchQuery}...`,
          source: 'Google Scholar'
        }
      ];

      setWebSearchResults(mockResults);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setWebSearchSearching(false);
    }
  };

  const handleSaveWebSearchResult = async () => {
    if (!webSearchUrl || !webSearchTitle) {
      setError('URL and title are required');
      return;
    }

    try {
      const response = await apiService.saveWebSearchResult({
        projectId: id!,
        url: webSearchUrl,
        title: webSearchTitle,
        content: webSearchContent,
      });

      const newSource = { ...response.source, tags: JSON.parse(response.source.tags_json || '[]') };
      setSources([newSource, ...sources]);
      await loadAllTags();

      // Reset form
      setWebSearchUrl('');
      setWebSearchTitle('');
      setWebSearchContent('');
      setWebSearchQuery('');
      setWebSearchResults([]);
      setShowWebSearch(false);

      toast.success('Web search result saved as source');
    } catch (err: any) {
      setError(err.message || 'Failed to save web search result');
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
      toast.success('Character created successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to create character');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCharacter) return;

    try {
      setCreating(true);
      setError('');
      const response = await apiService.updateCharacter(editingCharacter.id, characterForm);
      setCharacters(characters.map(ch => ch.id === editingCharacter.id ? response.character : ch));
      setEditingCharacter(null);
      setCharacterForm({ name: '', description: '', traits: '', backstory: '', role_in_story: '' });
      setShowAddCharacter(false);
      toast.success('Character updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update character');
    } finally {
      setCreating(false);
    }
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setCharacterForm({
      name: character.name,
      description: character.description || '',
      traits: character.traits || '',
      backstory: character.backstory || '',
      role_in_story: character.role_in_story || ''
    });
    setShowAddCharacter(true);
  };

  const handleDeleteCharacter = async (characterId: string) => {
    // Prevent rapid double-clicks
    if (deletingCharacterIdRef.current === characterId) {
      return;
    }

    if (!confirm('Are you sure you want to delete this character?')) {
      return;
    }

    // Mark as deleting immediately
    deletingCharacterIdRef.current = characterId;

    try {
      await apiService.deleteCharacter(characterId);
      setCharacters(characters.filter(ch => ch.id !== characterId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete character');
    } finally {
      deletingCharacterIdRef.current = null;
    }
  };

  const openChapter = (chapterId: string) => {
    navigate(`/projects/${id}/chapters/${chapterId}`);
  };

  const handleExport = async (format: 'txt' | 'docx' | 'epub') => {
    try {
      setExporting(true);
      setError('');

      // If EPUB format and no metadata entered yet, show metadata form
      if (format === 'epub' && !showEpubMetadata) {
        setShowEpubMetadata(true);
        setExporting(false);
        return;
      }

      // Prepare export options
      const exportOptions: any = { format };

      // Add metadata for EPUB exports
      if (format === 'epub') {
        exportOptions.metadata = epubMetadata;
        exportOptions.coverImageId = coverImageId;
      }

      const blob = await apiService.exportProject(id!, exportOptions);

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
      setShowEpubMetadata(false);
    } catch (err: any) {
      if (err.code === 'PREMIUM_REQUIRED') {
        setError('EPUB export requires a Premium subscription. Upgrade to access this feature.');
      } else {
        setError(err.message || 'Failed to export project');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Cover image must be smaller than 5MB');
      return;
    }

    try {
      setUploadingCover(true);
      setError('');

      const formData = new FormData();
      formData.append('cover', file);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/projects/${id}/export/cover`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === 'PREMIUM_REQUIRED') {
          throw new Error('EPUB export features require a Premium subscription');
        }
        throw new Error(error.message || 'Failed to upload cover');
      }

      const data = await response.json();
      setCoverImageId(data.id);
      setCoverImageFile(file);
    } catch (err: any) {
      setError(err.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleBatchExport = async () => {
    try {
      setExportingBatch(true);
      setError('');

      const exportOptions: any = {
        chapterIds: selectedChapterIds,
        format: batchExportFormat
      };

      // Add metadata for EPUB batch exports
      if (batchExportFormat === 'epub') {
        exportOptions.metadata = epubMetadata;
        exportOptions.coverImageId = coverImageId;
      }

      const blob = await apiService.batchExportChapters(id!, exportOptions);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.title.replace(/[^a-z0-9]/gi, '_')}_batch_${Date.now()}.${batchExportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowBatchExport(false);
      setSelectedChapterIds([]);
      setSelectAllChapters(false);
      toast.success(`Exported ${selectedChapterIds.length} chapter(s) successfully`);
    } catch (err: any) {
      if (err.code === 'PREMIUM_REQUIRED') {
        setError('EPUB batch export requires a Premium subscription. Upgrade to access this feature.');
      } else {
        setError(err.message || 'Failed to export chapters');
      }
    } finally {
      setExportingBatch(false);
    }
  };

  const handleDeleteProject = async () => {
    // Prevent double-click - check both state and ref
    if (deleting) {
      return;
    }

    try {
      setDeleting(true);
      setError('');

      await apiService.deleteProject(id!);

      // Navigate to dashboard after successful deletion
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleEditClick = () => {
    if (project) {
      setEditForm({
        title: project.title,
        description: project.description || '',
        genre: project.genre || '',
        tone: project.tone || '',
        target_audience: project.target_audience || '',
        pov: project.pov || '',
        word_count_target: project.word_count_target?.toString() || '',
        status: project.status,
        area: project.area
      });
      setShowEditDialog(true);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    try {
      setCreating(true);
      setError('');

      const updateData: any = {
        title: editForm.title,
        description: editForm.description || undefined,
        genre: editForm.genre || undefined,
        tone: editForm.tone || undefined,
        target_audience: editForm.target_audience || undefined,
        pov: editForm.pov || undefined,
        word_count_target: editForm.word_count_target ? parseInt(editForm.word_count_target) : undefined,
        status: editForm.status,
        area: editForm.area
      };

      const response = await apiService.updateProject(id!, updateData);
      setProject(response.project);
      setShowEditDialog(false);
      toast.success('Project updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
      toast.error(err.message || 'Failed to update project');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicateProject = async () => {
    if (!project) return;

    if (!confirm(`Create a copy of "${project.title}"? All chapters, characters, locations, and sources will be duplicated.`)) {
      return;
    }

    try {
      setDuplicating(true);
      setError('');

      const response = await apiService.duplicateProject(id!);
      toast.success(`Project duplicated as "${response.project.title}"`);

      // Navigate to the duplicated project
      setTimeout(() => {
        navigate(`/projects/${response.project.id}`);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate project');
      toast.error(err.message || 'Failed to duplicate project');
    } finally {
      setDuplicating(false);
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'in_progress' | 'completed' | 'archived') => {
    if (!project) return;

    try {
      setUpdatingStatus(true);
      const response = await apiService.updateProject(id!, { status: newStatus });
      setProject(response.project);
      setShowStatusMenu(false);
      toast.success(`Project status changed to ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleArchive = async () => {
    if (!project) return;

    if (project.status === 'archived') {
      // Unarchive
      try {
        setUpdatingStatus(true);
        const response = await apiService.unarchiveProject(id!);
        setProject(response.project);
        toast.success('Project unarchived');
      } catch (err: any) {
        toast.error(err.message || 'Failed to unarchive project');
      } finally {
        setUpdatingStatus(false);
      }
    } else {
      // Archive
      if (!confirm(`Archive "${project.title}"? It will be hidden from the main project list.`)) {
        return;
      }
      try {
        setUpdatingStatus(true);
        const response = await apiService.archiveProject(id!);
        setProject(response.project);
        toast.success('Project archived');
      } catch (err: any) {
        toast.error(err.message || 'Failed to archive project');
      } finally {
        setUpdatingStatus(false);
      }
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
              {project.status === 'draft' ? 'Draft' : project.status === 'in_progress' ? 'In Progress' : project.status === 'completed' ? 'Completed' : 'Archived'}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {/* Status Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  disabled={updatingStatus}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {updatingStatus ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4" />
                      Status
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>

                {showStatusMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => handleStatusChange('draft')}
                        disabled={updatingStatus}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <span className={`w-3 h-3 rounded-full ${project?.status === 'draft' ? 'bg-gray-600' : 'bg-gray-300'}`}></span>
                        Draft
                        {project?.status === 'draft' && <span className="ml-auto text-xs">✓</span>}
                      </button>
                      <button
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={updatingStatus}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <span className={`w-3 h-3 rounded-full ${project?.status === 'in_progress' ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
                        In Progress
                        {project?.status === 'in_progress' && <span className="ml-auto text-xs">✓</span>}
                      </button>
                      <button
                        onClick={() => handleStatusChange('completed')}
                        disabled={updatingStatus}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <span className={`w-3 h-3 rounded-full ${project?.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                        Completed
                        {project?.status === 'completed' && <span className="ml-auto text-xs">✓</span>}
                      </button>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                      <button
                        onClick={handleArchive}
                        disabled={updatingStatus}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2 text-yellow-600 dark:text-yellow-400"
                      >
                        {project?.status === 'archived' ? (
                          <>
                            <ArchiveRestore className="w-4 h-4" />
                            Unarchive
                          </>
                        ) : (
                          <>
                            <Archive className="w-4 h-4" />
                            Archive
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleEditClick}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Settings className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDuplicateProject}
                disabled={duplicating}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {duplicating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Duplicating...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </>
                )}
              </button>
              <button
                onClick={() => setShowExportDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {showExportDialog && !showEpubMetadata && (
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
                    onChange={(e) => setExportFormat(e.target.value as 'txt' | 'docx' | 'epub')}
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
                    onChange={(e) => setExportFormat(e.target.value as 'txt' | 'docx' | 'epub')}
                    className="sr-only"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Word Document (.docx)</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Formatted document for Microsoft Word</div>
                  </div>
                </label>
                <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  exportFormat === 'epub'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="epub"
                    checked={exportFormat === 'epub'}
                    onChange={(e) => setExportFormat(e.target.value as 'txt' | 'docx' | 'epub')}
                    className="sr-only"
                  />
                  <div className="ml-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900 dark:text-gray-100">eBook (.epub)</div>
                      <Crown className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">ePub format for e-readers with cover & metadata (Premium)</div>
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

      {/* EPUB Metadata Dialog */}
      {showEpubMetadata && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                EPUB Metadata
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Add metadata and cover image for your eBook. This information will be embedded in the EPUB file.
              </p>

              <div className="space-y-4">
                {/* Cover Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cover Image
                  </label>
                  <div className="flex items-center gap-4">
                    {coverImageFile ? (
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-500">
                        <ImageIcon className="w-8 h-8 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {coverImageFile.name}
                        </span>
                        <button
                          onClick={() => {
                            setCoverImageFile(null);
                            setCoverImageId(null);
                          }}
                          className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex-1">
                        <div className="flex items-center justify-center px-6 py-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleCoverImageUpload}
                            disabled={uploadingCover}
                            className="hidden"
                          />
                          <div className="text-center">
                            {uploadingCover ? (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Uploading...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <ImageIcon className="w-10 h-10 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Click to upload cover image
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    JPEG, PNG, or WebP (max 5MB)
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Metadata Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Author
                    </label>
                    <input
                      type="text"
                      value={epubMetadata.author}
                      onChange={(e) => setEpubMetadata({ ...epubMetadata, author: e.target.value })}
                      placeholder="Author name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Publisher
                    </label>
                    <input
                      type="text"
                      value={epubMetadata.publisher}
                      onChange={(e) => setEpubMetadata({ ...epubMetadata, publisher: e.target.value })}
                      placeholder="Publisher name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ISBN
                    </label>
                    <input
                      type="text"
                      value={epubMetadata.isbn}
                      onChange={(e) => setEpubMetadata({ ...epubMetadata, isbn: e.target.value })}
                      placeholder="978-0-00-000000-0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Language
                    </label>
                    <select
                      value={epubMetadata.language}
                      onChange={(e) => setEpubMetadata({ ...epubMetadata, language: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="en">English</option>
                      <option value="it">Italiano</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="pt">Português</option>
                      <option value="zh">中文</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  All fields are optional. You can leave them blank if you don't have this information.
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowEpubMetadata(false);
                    setShowExportDialog(false);
                    setError('');
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  disabled={exporting}
                >
                  Back
                </button>
                <button
                  onClick={() => handleExport('epub')}
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
                      Export EPUB
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Edit Project
              </h3>
              <form onSubmit={handleUpdateProject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title <span className="text-red-700 dark:text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={creating}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Area <span className="text-red-700 dark:text-red-400">*</span>
                    </label>
                    <select
                      value={editForm.area}
                      onChange={(e) => setEditForm({ ...editForm, area: e.target.value as 'romanziere' | 'saggista' | 'redattore' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={creating}
                      required
                    >
                      <option value="romanziere">Romanziere</option>
                      <option value="saggista">Saggista</option>
                      <option value="redattore">Redattore</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={creating}
                    >
                      <option value="draft">Draft</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    disabled={creating}
                    placeholder="Brief description of your project..."
                  />
                </div>

                {project?.area === 'romanziere' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Genre
                        </label>
                        <input
                          type="text"
                          value={editForm.genre}
                          onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={creating}
                          placeholder="e.g., Fantasy, Mystery, Sci-Fi"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          POV
                        </label>
                        <select
                          value={editForm.pov}
                          onChange={(e) => setEditForm({ ...editForm, pov: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={creating}
                        >
                          <option value="">Select POV</option>
                          <option value="first_person">First Person</option>
                          <option value="third_person_limited">Third Person Limited</option>
                          <option value="third_person_omniscient">Third Person Omniscient</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Word Count Target
                        </label>
                        <input
                          type="number"
                          value={editForm.word_count_target}
                          onChange={(e) => setEditForm({ ...editForm, word_count_target: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={creating}
                          placeholder="e.g., 80000"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Tone
                        </label>
                        <input
                          type="text"
                          value={editForm.tone}
                          onChange={(e) => setEditForm({ ...editForm, tone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={creating}
                          placeholder="e.g., Dark, Humorous, Dramatic"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Target Audience
                        </label>
                        <input
                          type="text"
                          value={editForm.target_audience}
                          onChange={(e) => setEditForm({ ...editForm, target_audience: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={creating}
                          placeholder="e.g., Young Adults, Adults"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditDialog(false);
                      setError('');
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !editForm.title.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {creating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Delete Project
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">"{project?.title}"</span>?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                This action cannot be undone. All chapters, sources, and characters will be permanently deleted.
              </p>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <strong className="text-gray-700 dark:text-gray-300">Warning:</strong> This will delete:
                </p>
                <ul className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                  <li>• All chapters ({chapters.length})</li>
                  <li>• All sources ({sources.length})</li>
                  <li>• All characters ({characters.length})</li>
                  <li>• All generation logs and history</li>
                </ul>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Project
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
          <div className="flex items-center gap-2">
            {chapters.length > 0 && (
              <button
                onClick={() => setShowBatchExport(!showBatchExport)}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Batch Export
              </button>
            )}
            <button
              onClick={() => setShowAddChapter(!showAddChapter)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Chapter
            </button>
          </div>
        </div>

        {/* Batch Export Bar */}
        {showBatchExport && (
          <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="selectAllChapters"
                  checked={selectAllChapters}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSelectAllChapters(checked);
                    setSelectedChapterIds(checked ? chapters.map(ch => ch.id) : []);
                  }}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <label htmlFor="selectAllChapters" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Select All ({selectedChapterIds.length}/{chapters.length})
                </label>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={batchExportFormat}
                  onChange={(e) => setBatchExportFormat(e.target.value as 'txt' | 'docx' | 'epub')}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="txt">Plain Text (.txt)</option>
                  <option value="docx">Word (.docx)</option>
                  <option value="epub">eBook (.epub)</option>
                </select>
                <button
                  onClick={handleBatchExport}
                  disabled={selectedChapterIds.length === 0 || exportingBatch}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {exportingBatch ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export Selected ({selectedChapterIds.length})
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowBatchExport(false);
                    setSelectedChapterIds([]);
                    setSelectAllChapters(false);
                  }}
                  className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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
            <ChapterListSkeleton count={5} />
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
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group cursor-move ${
                  showBatchExport ? 'pl-12' : ''
                } ${draggedChapterIndex === index ? 'opacity-50' : ''}`}
              >
                {showBatchExport && (
                  <input
                    type="checkbox"
                    checked={selectedChapterIds.includes(chapter.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        setSelectedChapterIds([...selectedChapterIds, chapter.id]);
                      } else {
                        setSelectedChapterIds(selectedChapterIds.filter(id => id !== chapter.id));
                      }
                      setSelectAllChapters(selectedChapterIds.length + 1 === chapters.length);
                    }}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 mr-3"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <GripVertical className="w-5 h-5 text-gray-400 dark:text-gray-600 cursor-grab mr-2" />
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
            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div className="ml-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedTagFilter}
                  onChange={(e) => setSelectedTagFilter(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWebSearch(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Globe className="w-4 h-4" />
              Web Search
            </button>
            <button
              onClick={() => setShowBulkUpload(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Sources
            </button>
          </div>
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
            sources
              .filter(source => selectedTagFilter === 'all' || (source.tags && source.tags.includes(selectedTagFilter)))
              .map((source) => (
              <div
                key={source.id}
                onClick={() => {
                  setSelectedSource(source);
                  setShowSourcePreview(true);
                }}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <h3 className="text-gray-900 dark:text-gray-100 font-medium">
                      {source.file_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                                onClick={() => handleRemoveTag(source.id, tag)}
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
                          placeholder="Add tag and press Enter..."
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
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {
                      setEditingSourceTags(editingSourceTags === source.id ? null : source.id);
                      setNewTagInput('');
                    }}
                    className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Add tag"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSource(source.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete source"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Saggista Configuration - Only for Saggista projects */}
      {project?.area === 'saggista' && (
        <div className="mt-6">
          <SaggistaConfig project={project} onUpdate={loadProject} />
        </div>
      )}

      {/* Redattore Configuration - Only for Redattore projects */}
      {project?.area === 'redattore' && (
        <div className="mt-6">
          <RedattoreConfig project={project} onUpdate={loadProject} />
        </div>
      )}

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
              onClick={() => {
                setShowAddCharacter(!showAddCharacter);
                setEditingCharacter(null);
                setCharacterForm({ name: '', description: '', traits: '', backstory: '', role_in_story: '' });
                setError('');
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Character
            </button>
          </div>

          {/* Add/Edit Character Form */}
          {showAddCharacter && (
            <form onSubmit={editingCharacter ? handleUpdateCharacter : handleCreateCharacter} className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {editingCharacter ? 'Edit Character' : 'Add New Character'}
              </h3>
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
                    {creating ? (editingCharacter ? 'Updating...' : 'Creating...') : (editingCharacter ? 'Update' : 'Create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCharacter(false);
                      setEditingCharacter(null);
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
                    <div className="ml-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditCharacter(character)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        title="Edit character"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCharacter(character.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete character"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Locations Section - Only for Romanziere projects */}
      {project?.area === 'romanziere' && (
        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700 mt-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Locations
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({locations.length})
              </span>
            </div>
            <button
              onClick={() => {
                setShowAddLocation(!showAddLocation);
                setEditingLocation(null);
                setLocationForm({ name: '', description: '', significance: '' });
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Location
            </button>
          </div>

          {/* Add/Edit Location Form */}
          {showAddLocation && (
            <form onSubmit={editingLocation ? handleUpdateLocation : handleCreateLocation} className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="space-y-3">
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  placeholder="Location name..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={creating}
                />
                <textarea
                  value={locationForm.description}
                  onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                  placeholder="Physical description and environment..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  disabled={creating}
                />
                <textarea
                  value={locationForm.significance}
                  onChange={(e) => setLocationForm({ ...locationForm, significance: e.target.value })}
                  placeholder="Significance in the story (plot importance, atmosphere, symbolic meaning)..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  disabled={creating}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !locationForm.name.trim()}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {creating ? (editingLocation ? 'Updating...' : 'Creating...') : (editingLocation ? 'Update' : 'Create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddLocation(false);
                      setEditingLocation(null);
                      setLocationForm({ name: '', description: '', significance: '' });
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

          {/* Locations List */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {locations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
                <p className="text-lg font-medium mb-1">No locations yet</p>
                <p className="text-sm">Create locations for your Romanziere project</p>
              </div>
            ) : (
              locations.map((location) => (
                <div
                  key={location.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                        {location.name}
                      </h3>
                      {location.description && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Description:</span> {location.description}
                        </p>
                      )}
                      {location.significance && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Significance:</span> {location.significance.substring(0, 150)}
                          {location.significance.length > 150 ? '...' : ''}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <button
                        onClick={() => startEditLocation(location)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit location"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(location.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete location"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Plot Events Section - Only for Romanziere projects */}
      {project?.area === 'romanziere' && (
        <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-gray-700 mt-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Plot Events
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({plotEvents.length})
              </span>
            </div>
            <button
              onClick={() => {
                setShowAddPlotEvent(!showAddPlotEvent);
                setEditingPlotEvent(null);
                setPlotEventForm({ title: '', description: '', chapter_id: '', event_type: '' });
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Plot Event
            </button>
          </div>

          {/* Add/Edit Plot Event Form */}
          {showAddPlotEvent && (
            <form onSubmit={handleCreatePlotEvent} className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="space-y-3">
                <input
                  type="text"
                  value={plotEventForm.title}
                  onChange={(e) => setPlotEventForm({ ...plotEventForm, title: e.target.value })}
                  placeholder="Plot event title..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={creating}
                />
                <textarea
                  value={plotEventForm.description}
                  onChange={(e) => setPlotEventForm({ ...plotEventForm, description: e.target.value })}
                  placeholder="What happens in this plot event..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  disabled={creating}
                />
                <select
                  value={plotEventForm.chapter_id}
                  onChange={(e) => setPlotEventForm({ ...plotEventForm, chapter_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={creating}
                >
                  <option value="">Link to chapter (optional)</option>
                  {chapters.map(chapter => (
                    <option key={chapter.id} value={chapter.id}>{chapter.title}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={plotEventForm.event_type}
                  onChange={(e) => setPlotEventForm({ ...plotEventForm, event_type: e.target.value })}
                  placeholder="Event type (e.g., climax, twist, introduction)..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={creating}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !plotEventForm.title.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {creating ? (editingPlotEvent ? 'Updating...' : 'Creating...') : (editingPlotEvent ? 'Update' : 'Create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPlotEvent(false);
                      setEditingPlotEvent(null);
                      setPlotEventForm({ title: '', description: '', chapter_id: '', event_type: '' });
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

          {/* Plot Events List */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {plotEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
                <p className="text-lg font-medium mb-1">No plot events yet</p>
                <p className="text-sm">Create plot events to track your story timeline</p>
              </div>
            ) : (
              plotEvents.map((plotEvent) => (
                <div
                  key={plotEvent.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                          {plotEvent.title}
                        </h3>
                        {plotEvent.event_type && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                            {plotEvent.event_type}
                          </span>
                        )}
                        {plotEvent.chapter_id && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {chapters.find(ch => ch.id === plotEvent.chapter_id)?.title || 'Linked Chapter'}
                          </span>
                        )}
                      </div>
                      {plotEvent.description && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          {plotEvent.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <button
                        onClick={() => startEditPlotEvent(plotEvent)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit plot event"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlotEvent(plotEvent.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete plot event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bulk Source Upload Dialog */}
      {showBulkUpload && (
        <BulkSourceUpload
          projectId={id!}
          onUploadComplete={handleBulkUploadComplete}
          onCancel={() => setShowBulkUpload(false)}
        />
      )}

      {/* Web Search Dialog */}
      {showWebSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Web Search
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowWebSearch(false);
                  setWebSearchQuery('');
                  setWebSearchResults([]);
                  setWebSearchUrl('');
                  setWebSearchTitle('');
                  setWebSearchContent('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Search Form */}
              <form onSubmit={handleWebSearch} className="mb-6">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={webSearchQuery}
                    onChange={(e) => setWebSearchQuery(e.target.value)}
                    placeholder="Enter search query..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={webSearchSearching}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    {webSearchSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>

              {/* Search Results */}
              {webSearchResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Search Results</h4>
                  {webSearchResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => {
                        setWebSearchUrl(result.url);
                        setWebSearchTitle(result.title);
                        setWebSearchContent(result.snippet || '');
                      }}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        webSearchUrl === result.url
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1 truncate">
                            {result.title}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {result.snippet}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                              {result.source}
                            </span>
                            <span className="truncate">{result.url}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual Entry Form (when result is selected) */}
              {webSearchUrl && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Save Search Result</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={webSearchTitle}
                        onChange={(e) => setWebSearchTitle(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={webSearchUrl}
                        onChange={(e) => setWebSearchUrl(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Content/Notes
                      </label>
                      <textarea
                        value={webSearchContent}
                        onChange={(e) => setWebSearchContent(e.target.value)}
                        rows={4}
                        placeholder="Add notes or excerpt from the page..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowWebSearch(false);
                  setWebSearchQuery('');
                  setWebSearchResults([]);
                  setWebSearchUrl('');
                  setWebSearchTitle('');
                  setWebSearchContent('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWebSearchResult}
                disabled={!webSearchUrl || !webSearchTitle}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save as Source
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Source Preview Dialog */}
      {showSourcePreview && selectedSource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedSource.file_name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedSource.file_type} • {(selectedSource.file_size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSourcePreview(false);
                  setSelectedSource(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {selectedSource.content_text && selectedSource.content_text.length > 0 ? (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                  <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-900 dark:text-gray-100">
                    {selectedSource.content_text}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Content extraction not available for this file type
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {selectedSource.file_type === 'application/pdf' && 'PDF files require additional processing'}
                    {(selectedSource.file_type.includes('word') || selectedSource.file_type.includes('document')) && 'DOCX files require additional processing'}
                    {selectedSource.file_type === 'application/rtf' && 'RTF files require additional processing'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {selectedSource.source_type === 'upload' ? 'Uploaded' : 'Web Search'} •{' '}
                {new Date(selectedSource.created_at).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                {selectedSource.source_type === 'web_search' && selectedSource.url && (
                  <a
                    href={selectedSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Original
                  </a>
                )}
                <button
                  onClick={() => {
                    setShowSourcePreview(false);
                    setSelectedSource(null);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
