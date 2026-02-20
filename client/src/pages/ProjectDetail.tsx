// @ts-nocheck
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, BookOpen, Trash2, ChevronRight, FileText, Upload, Download, User, MapPin, Calendar, Edit3, Image as ImageIcon, Crown, Copy, Settings, Archive, ArchiveRestore, ChevronDown, GripVertical, X, Tag, Search, RefreshCw, Network, CheckCircle, Unlink, Loader2, Layers, Share2, FolderOpen, Lightbulb, Eye } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import RedattoreConfig from '../components/RedattoreConfig';
import SaggistaConfig from '../components/SaggistaConfig';
import { ChapterListSkeleton } from '../components/Skeleton';
import RelationshipMap from '../components/RelationshipMap';
import TableOfContents from '../components/TableOfContents';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import CreateSequelWithOutlineModal from '../components/CreateSequelWithOutlineModal';
import AssignToSagaModal from '../components/AssignToSagaModal';
import { apiService, Chapter, Project, Source, Character, Location, PlotEvent } from '../services/api';
import { useToastNotification } from '../components/Toast';

export default function ProjectDetail() {
  const { t, i18n } = useTranslation();
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
  const [projectNotFound, setProjectNotFound] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [plotEvents, setPlotEvents] = useState<PlotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [showLinkSources, setShowLinkSources] = useState(false);
  const [showSourcePreview, setShowSourcePreview] = useState(false);
  const [selectedSourcesToLink, setSelectedSourcesToLink] = useState<Set<string>>(new Set());
  const [standaloneSources, setStandaloneSources] = useState<Source[]>([]);
  const [loadingStandaloneSources, setLoadingStandaloneSources] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [showRelationshipMap, setShowRelationshipMap] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAddPlotEvent, setShowAddPlotEvent] = useState(false);
  const [editingPlotEvent, setEditingPlotEvent] = useState<PlotEvent | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUnlinkSourceDialog, setShowUnlinkSourceDialog] = useState(false);
  const [sourceToUnlink, setSourceToUnlink] = useState<Source | null>(null);
  // Delete confirmation dialog state
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<{
    type: 'character' | 'location' | 'plotEvent';
    id: string;
    name: string;
  } | null>(null);
  // Feature #230: Chapter action confirmation dialogs
  const [showDeleteChapterDialog, setShowDeleteChapterDialog] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<{ id: string; title: string } | null>(null);
  const [showRegenerateChapterDialog, setShowRegenerateChapterDialog] = useState(false);
  const [chapterToRegenerate, setChapterToRegenerate] = useState<{ id: string; title: string } | null>(null);
  // Feature #240: Additional confirmation dialogs
  const [showOutlineConfirmDialog, setShowOutlineConfirmDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  // Feature #255: Create Sequel
  const [showSequelModal, setShowSequelModal] = useState(false);
  // Feature #254: Assign to Saga
  const [showAssignSagaModal, setShowAssignSagaModal] = useState(false);
  const [projectSagaId, setProjectSagaId] = useState<string | null>(null);
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
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [userRole, setUserRole] = useState<string>('free');
  const [showBatchExport, setShowBatchExport] = useState(false);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [batchExportFormat, setBatchExportFormat] = useState<'txt' | 'docx' | 'epub'>('txt');
  const [exportingBatch, setExportingBatch] = useState(false);
  const [selectAllChapters, setSelectAllChapters] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [shareWithSaga, setShareWithSaga] = useState(false);
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
    area: 'romanziere' as 'romanziere' | 'saggista' | 'redattore',
    human_model_id: '' as string | null
  });
  const [draggedChapterIndex, setDraggedChapterIndex] = useState<number | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [outlineGenerated, setOutlineGenerated] = useState(false);
  const [detectingPlotHoles, setDetectingPlotHoles] = useState(false);
  const [plotHolesResults, setPlotHolesResults] = useState<any>(null);
  const [showPlotHolesResults, setShowPlotHolesResults] = useState(false);
  // Feature #283: Saved plot hole analysis state
  const [savedPlotHoleAnalysis, setSavedPlotHoleAnalysis] = useState<{
    has_analysis: boolean;
    analysis_date?: string;
    summary?: string;
    total_issues?: number;
    created_at?: string;
  } | null>(null);
  const [loadingSavedAnalysis, setLoadingSavedAnalysis] = useState(false);
  const [viewingSavedAnalysis, setViewingSavedAnalysis] = useState(false);
  const [checkingConsistency, setCheckingConsistency] = useState(false);
  const [consistencyResults, setConsistencyResults] = useState<any>(null);
  const [showConsistencyResults, setShowConsistencyResults] = useState(false);
  // Feature #291: Saved consistency check state
  const [savedConsistencyCheck, setSavedConsistencyCheck] = useState<{
    has_analysis: boolean;
    analysis_date?: string;
    summary?: string;
    total_issues?: number;
    created_at?: string;
  } | null>(null);
  const [loadingSavedConsistency, setLoadingSavedConsistency] = useState(false);
  const [viewingSavedConsistency, setViewingSavedConsistency] = useState(false);
  const [humanModels, setHumanModels] = useState<any[]>([]);
  const [loadingHumanModels, setLoadingHumanModels] = useState(false);
  // Synopsis modal state
  const [showSynopsisModal, setShowSynopsisModal] = useState(false);
  const [synopsisContent, setSynopsisContent] = useState('');
  const [loadingSynopsis, setLoadingSynopsis] = useState(false);
  const [synopsisError, setSynopsisError] = useState('');

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

  // Sync projectSagaId when project loads
  useEffect(() => {
    if (project) {
      setProjectSagaId(project.saga_id);
    }
  }, [project]);

  // Feature #283: Load saved plot hole analysis for Romanziere projects
  // Feature #291: Also load saved consistency check for Romanziere projects
  useEffect(() => {
    if (project && project.area === 'romanziere') {
      loadSavedPlotHoleAnalysis();
      loadSavedConsistencyCheck();
    }
  }, [project?.id]);

  const loadSavedPlotHoleAnalysis = async () => {
    if (!id) return;
    try {
      setLoadingSavedAnalysis(true);
      const response = await apiService.getPlotHoleAnalysis(id);
      setSavedPlotHoleAnalysis(response.has_analysis ? response : null);
    } catch (error) {
      console.error('[Plot Holes] Failed to load saved analysis:', error);
      setSavedPlotHoleAnalysis(null);
    } finally {
      setLoadingSavedAnalysis(false);
    }
  };

  // Feature #291: Load saved consistency check
  const loadSavedConsistencyCheck = async () => {
    if (!id) return;
    try {
      setLoadingSavedConsistency(true);
      const response = await apiService.getConsistencyCheck(id);
      setSavedConsistencyCheck(response.has_analysis ? response : null);
    } catch (error) {
      console.error('[Consistency] Failed to load saved check:', error);
      setSavedConsistencyCheck(null);
    } finally {
      setLoadingSavedConsistency(false);
    }
  };

  useEffect(() => {
    if (showLinkSources) {
      loadStandaloneSources();
    }
  }, [showLinkSources]);

  const loadProject = async () => {
    try {
      const response = await apiService.getProject(id!);
      setProject(response.project);
      setProjectNotFound(false);
    } catch (err: any) {
      console.error('Failed to load project:', err);
      console.error('Error message:', err.message);
      console.error('Error status:', err.status);
      console.error('Error includes not found:', err.message?.includes('not found'));
      // If 404 error, show not found state
      if (err.message?.includes('not found') || err.status === 404 || !err.message) {
        console.log('Setting projectNotFound to true');
        setProjectNotFound(true);
        setProject(null);
        setLoading(false);
      }
    }
  };

  const loadHumanModels = async () => {
    try {
      setLoadingHumanModels(true);
      const response = await apiService.getHumanModels();
      // Filter only ready models that match the project's area
      const readyModels = response.models.filter((m: any) => m.training_status === 'ready');
      setHumanModels(readyModels);
    } catch (err) {
      console.error('Failed to load human models:', err);
    } finally {
      setLoadingHumanModels(false);
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

  const loadStandaloneSources = async () => {
    try {
      setLoadingStandaloneSources(true);
      const response = await apiService.getAllSources();
      // Filter only standalone sources (project_id is null)
      const standalone = response.sources
        .filter(s => !s.project_id)
        .map(source => ({
          ...source,
          tags: source.tags || [],
        }));
      setStandaloneSources(standalone);
    } catch (err: any) {
      console.error('Failed to load standalone sources:', err);
      toast.error(err.message || 'Failed to load standalone sources');
    } finally {
      setLoadingStandaloneSources(false);
    }
  };

  // Load linkable sources: standalone + sources from the same saga (if project is in a saga)
  const loadLinkableSources = async () => {
    try {
      setLoadingStandaloneSources(true);
      const response = await apiService.getAllSources();

      // Get IDs of sources already linked to this project
      const linkedSourceIds = new Set(sources.map(s => s.id));

      // Filter standalone sources (project_id is null) - not already linked
      const standalone = response.sources
        .filter(s => !s.project_id && !linkedSourceIds.has(s.id))
        .map(source => ({
          ...source,
          tags: source.tags || [],
          _sourceType: 'standalone' as const,
        }));

      // If project is in a saga, also get sources from other projects in the same saga
      let sagaSources: (Source & { _sourceType: 'saga' })[] = [];
      if (project?.saga_id) {
        try {
          const sagaResponse = await apiService.getSagaSources(project.saga_id);
          sagaSources = sagaResponse.sources
            .filter(s => s.project_id !== project.id && !linkedSourceIds.has(s.id))
            .map(source => ({
              ...source,
              tags: source.tags || [],
              _sourceType: 'saga' as const,
            }));
        } catch (err) {
          console.error('Failed to load saga sources:', err);
        }
      }

      // Combine and deduplicate
      const allLinkable = [...standalone, ...sagaSources];
      const uniqueSources = allLinkable.filter((source, index, self) =>
        index === self.findIndex(s => s.id === source.id)
      );

      setStandaloneSources(uniqueSources);
    } catch (err: any) {
      console.error('Failed to load linkable sources:', err);
      toast.error(err.message || 'Failed to load linkable sources');
    } finally {
      setLoadingStandaloneSources(false);
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

    // Show confirmation dialog instead of native confirm()
    const location = locations.find(l => l.id === locationId);
    setDeleteConfirmConfig({
      type: 'location',
      id: locationId,
      name: location?.name || ''
    });
    setShowDeleteConfirmDialog(true);
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

    // Show confirmation dialog instead of native confirm()
    const plotEvent = plotEvents.find(pe => pe.id === plotEventId);
    setDeleteConfirmConfig({
      type: 'plotEvent',
      id: plotEventId,
      name: plotEvent?.title || ''
    });
    setShowDeleteConfirmDialog(true);
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

    // Show styled confirmation dialog instead of native confirm()
    const chapter = chapters.find(ch => ch.id === chapterId);
    if (!chapter) return;

    setChapterToDelete({ id: chapterId, title: chapter.title });
    setShowDeleteChapterDialog(true);
  };

  // Feature #230: Handler for confirmed chapter deletion
  const handleDeleteChapterConfirm = async () => {
    if (!chapterToDelete) return;

    const chapterId = chapterToDelete.id;

    // Close dialog first
    setShowDeleteChapterDialog(false);
    setChapterToDelete(null);

    // Mark as deleting immediately
    deletingChapterIdRef.current = chapterId;

    try {
      await apiService.deleteChapter(chapterId);
      setChapters(chapters.filter(ch => ch.id !== chapterId));
      toast.success(t('projectPage.chapters.deleteSuccess', 'Chapter deleted successfully'));
    } catch (err: any) {
      setError(err.message || 'Failed to delete chapter');
      toast.error(err.message || 'Failed to delete chapter');
    } finally {
      deletingChapterIdRef.current = null;
    }
  };

  const handleDeleteChapterCancel = () => {
    setShowDeleteChapterDialog(false);
    setChapterToDelete(null);
  };

  // Feature #178: Regenerate a single chapter
  const [regeneratingChapterId, setRegeneratingChapterId] = useState<string | null>(null);
  const regeneratingChapterIdRef = useRef<string | null>(null);

  const handleRegenerateChapter = async (chapterId: string) => {
    // Prevent rapid double-clicks
    if (regeneratingChapterIdRef.current === chapterId) {
      return;
    }

    const chapter = chapters.find(ch => ch.id === chapterId);
    if (!chapter) return;

    // Show styled confirmation dialog instead of native confirm()
    setChapterToRegenerate({ id: chapterId, title: chapter.title });
    setShowRegenerateChapterDialog(true);
  };

  // Feature #230: Handler for confirmed chapter regeneration
  const handleRegenerateChapterConfirm = async () => {
    if (!chapterToRegenerate) return;

    const chapterId = chapterToRegenerate.id;
    const chapterTitle = chapterToRegenerate.title;

    // Close dialog first
    setShowRegenerateChapterDialog(false);
    setChapterToRegenerate(null);

    // Mark as regenerating immediately
    regeneratingChapterIdRef.current = chapterId;
    setRegeneratingChapterId(chapterId);

    try {
      toast.info(`Regenerating chapter "${chapterTitle}"...`);

      // Feature #271: Use streaming regeneration for real AI generation
      let streamingContent = '';
      const { abort, promise } = apiService.regenerateChapterStream(
        chapterId,
        {
          human_model_id: project?.human_model_id || undefined,
          prompt_context: undefined
        },
        {
          onPhase: (phase, message) => {
            console.log(`[Regenerate] Phase: ${phase} - ${message}`);
          },
          onDelta: (content) => {
            streamingContent += content;
            // Could update a live preview here if desired
          },
          onDone: (data) => {
            // Update the chapter in the list with the new content
            setChapters(chapters.map(ch =>
              ch.id === chapterId
                ? { ...ch, content: streamingContent, word_count: data.word_count, status: 'generated' }
                : ch
            ));

            const successMessage = data.warning
              ? `${data.message} (${data.warning})`
              : data.message;
            toast.success(successMessage || `Chapter "${chapterTitle}" regenerated successfully`);

            // Log which chapters were unchanged for verification
            if (data.other_chapters_unchanged && data.other_chapters_unchanged.length > 0) {
              console.log('[Regenerate] Other chapters unchanged:', data.other_chapters_unchanged);
            }
          },
          onError: (error) => {
            toast.error(error || 'Failed to regenerate chapter');
          }
        }
      );

      // Wait for the streaming to complete
      await promise;

    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate chapter');
    } finally {
      regeneratingChapterIdRef.current = null;
      setRegeneratingChapterId(null);
    }
  };

  const handleRegenerateChapterCancel = () => {
    setShowRegenerateChapterDialog(false);
    setChapterToRegenerate(null);
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
      const response = await apiService.uploadProjectSource(id!, file, shareWithSaga);
      setSources([...sources, { ...response.source, tags: JSON.parse(response.source.tags_json || '[]') }]);
      setShowAddSource(false);
      setShareWithSaga(false); // Reset toggle
      // Reset file input
      e.target.value = '';
      toast.success(shareWithSaga && project?.saga_id
        ? t('projectPage.sources.uploadSharedSuccess', 'Source uploaded and shared with saga')
        : t('projectPage.sources.uploadSuccess', 'Source uploaded successfully'));
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSource = (sourceId: string) => {
    // Find the source to unlink
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    // Show confirmation dialog
    setSourceToUnlink(source);
    setShowUnlinkSourceDialog(true);
  };

  const confirmUnlinkSource = async () => {
    if (!sourceToUnlink) return;

    // Prevent rapid double-clicks
    if (deletingSourceIdRef.current === sourceToUnlink.id) {
      return;
    }

    // Mark as deleting immediately
    deletingSourceIdRef.current = sourceToUnlink.id;

    try {
      // Unlink source from project (don't delete it completely)
      await apiService.unlinkSourceFromProject(sourceToUnlink.id);
      setSources(sources.filter(s => s.id !== sourceToUnlink.id));
      toast.success(t('projectPage.sources.unlinkSuccess'));
      setShowUnlinkSourceDialog(false);
      setSourceToUnlink(null);
    } catch (err: any) {
      setError(err.message || 'Failed to remove source from project');
      toast.error(err.message || 'Failed to remove source from project');
    } finally {
      deletingSourceIdRef.current = null;
    }
  };

  const handleLinkSources = async () => {
    if (selectedSourcesToLink.size === 0) {
      return;
    }

    try {
      setError('');
      const linkedSources: Source[] = [];

      for (const sourceId of Array.from(selectedSourcesToLink)) {
        const response = await apiService.linkSourceToProject(sourceId, id!);
        linkedSources.push({ ...response.source, tags: JSON.parse(response.source.tags_json || '[]') });
      }

      // Add linked sources to the project's sources list
      setSources([...sources, ...linkedSources]);
      setShowLinkSources(false);
      setSelectedSourcesToLink(new Set());

      // Show success message
      if (linkedSources.length === 1) {
        toast.success(t('projectPage.sources.linkSuccess'));
      } else {
        toast.success(t('projectPage.sources.linkMultipleSuccess', { count: linkedSources.length }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to link sources');
      toast.error(err.message || 'Failed to link sources');
    }
  };

  const handleViewSynopsis = async () => {
    if (!id) return;

    // Open modal immediately to provide feedback to user
    setShowSynopsisModal(true);
    setLoadingSynopsis(true);
    setSynopsisError('');
    setSynopsisContent(''); // Clear previous content

    try {
      const response = await apiService.getSynopsis(id);
      setSynopsisContent(response.synopsis);
    } catch (err: any) {
      console.error('Failed to load synopsis:', err);
      setSynopsisError(t('projectPage.synopsis.errorLoading'));
    } finally {
      setLoadingSynopsis(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!project) return;

    // Check if any chapters already exist - show confirmation dialog
    if (chapters.length > 0) {
      setShowOutlineConfirmDialog(true);
      return;
    }

    // No chapters exist, proceed directly
    await executeGenerateOutline();
  };

  const executeGenerateOutline = async () => {
    if (!project) return;

    try {
      setGeneratingOutline(true);
      setError('');
      toast.info(`Generating outline for ${project.title}...`);

      const response = await apiService.generateOutline(id!);

      toast.success(`Outline generated: ${response.created} chapters created`);

      // Reload chapters to show the newly created outline chapters
      await loadChapters();

      setOutlineGenerated(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate outline');
      toast.error(err.message || 'Failed to generate outline');
    } finally {
      setGeneratingOutline(false);
    }
  };

  const handleDetectPlotHoles = async () => {
    if (!project) return;

    if (chapters.length === 0) {
      toast.error(t('projectPage.plotHoles.noChaptersError', 'Please generate some chapters first before detecting plot holes'));
      return;
    }

    // Feature #282: Use AbortController for timeout handling
    const controller = new AbortController();
    const TIMEOUT_MS = 120000; // 2 minutes timeout for AI analysis
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    try {
      setDetectingPlotHoles(true);
      setError('');
      setShowPlotHolesResults(false);
      toast.info(t('projectPage.plotHoles.analyzing', 'Analyzing plot for potential inconsistencies...'));

      const response = await apiService.detectPlotHoles(id!, i18n.language, controller.signal);

      clearTimeout(timeoutId);

      // Feature #282: Defensive validation of response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response from server');
      }

      if (!Array.isArray(response.plot_holes)) {
        console.warn('[Plot Holes] Response does not contain plot_holes array:', response);
        response.plot_holes = [];
      }

      const issueCount = response.total_issues ?? response.plot_holes?.length ?? 0;
      toast.success(t('projectPage.plotHoles.completed', { count: issueCount, defaultValue: `Plot hole detection completed: ${issueCount} issues found` }));

      setPlotHolesResults(response.plot_holes);
      setShowPlotHolesResults(true);
      setViewingSavedAnalysis(false); // This is a fresh analysis, not a saved one

      // Feature #283: Refresh the saved analysis status
      loadSavedPlotHoleAnalysis();
    } catch (err: any) {
      clearTimeout(timeoutId);

      // Feature #282: Handle timeout gracefully
      if (err.name === 'AbortError') {
        const timeoutMsg = t('projectPage.plotHoles.timeoutError', 'The analysis took too long. Please try again or try with fewer chapters.');
        setError(timeoutMsg);
        toast.error(timeoutMsg);
      } else if ((err as any).isNetworkError || err.message?.includes('Network')) {
        const networkMsg = t('projectPage.plotHoles.networkError', 'Network connection failed. Please check your internet and try again.');
        setError(networkMsg);
        toast.error(networkMsg);
      } else if ((err as any).isAuthError) {
        // Auth error will be handled by App.tsx redirect
        console.error('[Plot Holes] Auth error:', err.message);
      } else {
        const errorMsg = err.message || 'Failed to detect plot holes';
        setError(errorMsg);
        toast.error(errorMsg);
        console.error('[Plot Holes] Error:', err);
      }
    } finally {
      setDetectingPlotHoles(false);
    }
  };

  // Feature #283: Handle viewing saved analysis
  const handleViewSavedAnalysis = async () => {
    if (!id || !savedPlotHoleAnalysis) return;

    try {
      setLoadingSavedAnalysis(true);
      const response = await apiService.getPlotHoleAnalysis(id);
      if (response.has_analysis && response.plot_holes) {
        setPlotHolesResults(response.plot_holes);
        setShowPlotHolesResults(true);
        setViewingSavedAnalysis(true);
      }
    } catch (error) {
      console.error('[Plot Holes] Failed to load saved analysis:', error);
      toast.error(t('projectPage.plotHoles.loadError', 'Failed to load saved analysis'));
    } finally {
      setLoadingSavedAnalysis(false);
    }
  };

  const handleCheckConsistency = async () => {
    if (!project) return;

    if (chapters.length === 0) {
      toast.error('Please generate some chapters first before checking consistency');
      return;
    }

    try {
      setCheckingConsistency(true);
      setError('');
      setShowConsistencyResults(false);
      toast.info('Checking consistency across chapters...');

      const response = await apiService.checkConsistency(id!, i18n.language);

      toast.success(`Consistency check completed: ${response.total_inconsistencies} issues found`);

      setConsistencyResults(response.inconsistencies);
      setShowConsistencyResults(true);
      setViewingSavedConsistency(false); // This is a fresh analysis, not a saved one

      // Feature #291 & #293: Refresh the saved consistency check status (await to ensure date is available)
      await loadSavedConsistencyCheck();
    } catch (err: any) {
      setError(err.message || 'Failed to check consistency');
      toast.error(err.message || 'Failed to check consistency');
    } finally {
      setCheckingConsistency(false);
    }
  };

  // Feature #291: Handle viewing saved consistency check
  const handleViewSavedConsistency = async () => {
    if (!id || !savedConsistencyCheck) return;

    try {
      setLoadingSavedConsistency(true);
      const response = await apiService.getConsistencyCheck(id);
      if (response.has_analysis && response.inconsistencies) {
        setConsistencyResults(response.inconsistencies);
        setShowConsistencyResults(true);
        setViewingSavedConsistency(true);
      }
    } catch (error) {
      console.error('[Consistency] Failed to load saved check:', error);
      toast.error(t('projectPage.consistency.loadError', 'Failed to load saved consistency check'));
    } finally {
      setLoadingSavedConsistency(false);
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

    // Show confirmation dialog instead of native confirm()
    const character = characters.find(ch => ch.id === characterId);
    setDeleteConfirmConfig({
      type: 'character',
      id: characterId,
      name: character?.name || ''
    });
    setShowDeleteConfirmDialog(true);
  };

  // Feature #181: Add relationship between characters
  const handleAddRelationship = async (fromCharacterId: string, toCharacterId: string, relationshipType: string) => {
    try {
      // Get the from character and their current relationships
      const fromCharacter = characters.find(ch => ch.id === fromCharacterId);
      if (!fromCharacter) return;

      // Parse existing relationships
      let relationships = [];
      if (fromCharacter.relationships_json) {
        try {
          relationships = JSON.parse(fromCharacter.relationships_json);
        } catch {
          relationships = [];
        }
      }

      // Add new relationship
      const newRelationship = {
        characterId: fromCharacterId,
        relatedCharacterId: toCharacterId,
        relationshipType
      };
      relationships.push(newRelationship);

      // Update character with new relationships
      const response = await apiService.updateCharacter(fromCharacterId, {
        name: fromCharacter.name,
        description: fromCharacter.description,
        traits: fromCharacter.traits,
        backstory: fromCharacter.backstory,
        role_in_story: fromCharacter.role_in_story,
        relationships_json: JSON.stringify(relationships)
      });

      // Update local state
      setCharacters(characters.map(ch => ch.id === fromCharacterId ? response.character : ch));
      toast.success(`Relationship added: "${relationshipType}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add relationship');
    }
  };

  const openChapter = (chapterId: string) => {
    navigate(`/projects/${id}/chapters/${chapterId}`);
  };

  // Handle delete confirmation dialog actions
  const handleDeleteConfirmCancel = () => {
    setShowDeleteConfirmDialog(false);
    setDeleteConfirmConfig(null);
  };

  const handleDeleteConfirmAction = async () => {
    if (!deleteConfirmConfig) return;

    const { type, id } = deleteConfirmConfig;

    setShowDeleteConfirmDialog(false);
    setDeleteConfirmConfig(null);

    if (type === 'character') {
      deletingCharacterIdRef.current = id;
      try {
        await apiService.deleteCharacter(id);
        setCharacters(characters.filter(ch => ch.id !== id));
      } catch (err: any) {
        setError(err.message || 'Failed to delete character');
      } finally {
        deletingCharacterIdRef.current = null;
      }
    } else if (type === 'location') {
      deletingLocationIdRef.current = id;
      try {
        await apiService.deleteLocation(id);
        setLocations(locations.filter(l => l.id !== id));
        toast.success('Location deleted successfully');
      } catch (err: any) {
        setError(err.message || 'Failed to delete location');
        toast.error(err.message || 'Failed to delete location');
      } finally {
        deletingLocationIdRef.current = null;
      }
    } else if (type === 'plotEvent') {
      deletingPlotEventIdRef.current = id;
      try {
        await apiService.deletePlotEvent(id);
        setPlotEvents(plotEvents.filter(pe => pe.id !== id));
      } catch (err: any) {
        setError(err.message || 'Failed to delete plot event');
      } finally {
        deletingPlotEventIdRef.current = null;
      }
    }
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

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setCoverImagePreview(previewUrl);

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
      toast.success('Cover image uploaded successfully');
    } catch (err: any) {
      // Clear preview on error
      setCoverImagePreview(null);
      setError(err.message || 'Failed to upload cover image');
      toast.error(err.message || 'Failed to upload cover image');
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

  const handleEditClick = async () => {
    if (project) {
      // Load human models when opening edit dialog
      await loadHumanModels();
      setEditForm({
        title: project.title,
        description: project.description || '',
        genre: project.genre || '',
        tone: project.tone || '',
        target_audience: project.target_audience || '',
        pov: project.pov || '',
        word_count_target: project.word_count_target?.toString() || '',
        status: project.status,
        area: project.area,
        human_model_id: project.human_model_id || null
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
        area: editForm.area,
        human_model_id: editForm.human_model_id || undefined
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

  const handleDuplicateProject = () => {
    if (!project) return;
    setShowDuplicateDialog(true);
  };

  const executeDuplicateProject = async () => {
    if (!project) return;

    try {
      setDuplicating(true);
      setError('');
      setShowDuplicateDialog(false);

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

  const handleArchive = () => {
    if (!project) return;

    if (project.status === 'archived') {
      // Unarchive - no confirmation needed
      executeUnarchive();
    } else {
      // Archive - show confirmation dialog
      setShowArchiveDialog(true);
    }
  };

  const executeArchive = async () => {
    if (!project) return;

    try {
      setUpdatingStatus(true);
      setShowArchiveDialog(false);
      const response = await apiService.archiveProject(id!);
      setProject(response.project);
      toast.success(t('projectPage.archiveSuccess'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive project');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const executeUnarchive = async () => {
    if (!project) return;

    try {
      setUpdatingStatus(true);
      const response = await apiService.unarchiveProject(id!);
      setProject(response.project);
      toast.success(t('projectPage.unarchiveSuccess'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to unarchive project');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="p-6">
      <Breadcrumbs labelOverrides={id && project ? { [id]: project.title } : undefined} />

      {project && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 break-words flex items-center gap-3 flex-wrap" title={project.title}>
            <span>{project.title}</span>
            {projectSagaId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 rounded-full">
                <Layers className="w-3 h-3" />
                {t('sagas.sagaBadge', 'Saga')}
              </span>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 break-words">
            {project.description || t('projectPage.noDescription')}
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
              {project.status === 'draft' ? t('projectPage.statusLabels.draft') : project.status === 'in_progress' ? t('projectPage.statusLabels.inProgress') : project.status === 'completed' ? t('projectPage.statusLabels.completed') : t('projectPage.statusLabels.archived')}
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
                      {t('projectPage.updating')}
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4" />
                      {t('projectPage.status')}
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
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <span className={`w-3 h-3 rounded-full ${project?.status === 'draft' ? 'bg-gray-600' : 'bg-gray-300'}`}></span>
                        {t('projectPage.statusLabels.draft')}
                        {project?.status === 'draft' && <span className="ml-auto text-xs">✓</span>}
                      </button>
                      <button
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={updatingStatus}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <span className={`w-3 h-3 rounded-full ${project?.status === 'in_progress' ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
                        {t('projectPage.statusLabels.inProgress')}
                        {project?.status === 'in_progress' && <span className="ml-auto text-xs">✓</span>}
                      </button>
                      <button
                        onClick={() => handleStatusChange('completed')}
                        disabled={updatingStatus}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <span className={`w-3 h-3 rounded-full ${project?.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                        {t('projectPage.statusLabels.completed')}
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
                            {t('projectPage.unarchive')}
                          </>
                        ) : (
                          <>
                            <Archive className="w-4 h-4" />
                            {t('projectPage.archive')}
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
                {t('projectPage.edit')}
              </button>
              <button
                onClick={handleDuplicateProject}
                disabled={duplicating}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {duplicating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('projectPage.duplicating')}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t('projectPage.duplicate')}
                  </>
                )}
              </button>
              {/* Feature #255, #267: Create Sequel - Only for romanziere projects */}
              {project?.area === 'romanziere' && (
                <button
                  onClick={() => setShowSequelModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Layers className="w-4 h-4" />
                  {t('projectPage.sequel.button', 'Create Sequel')}
                </button>
              )}
              {/* Feature #254: Assign to Saga */}
              <button
                onClick={() => setShowAssignSagaModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                {projectSagaId ? t('sagas.sagaBadge', 'Saga') : t('sagas.assignToSaga', 'Assign to Saga')}
              </button>
              <button
                onClick={() => setShowExportDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('projectPage.export')}
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('projectPage.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature #267: Create Sequel with Outline Preview Modal */}
      {project && (
        <CreateSequelWithOutlineModal
          isOpen={showSequelModal}
          onClose={() => setShowSequelModal(false)}
          project={{ id: project.id, title: project.title, area: project.area }}
          language={i18n.language === 'en' ? 'en' : 'it'}
          onSuccess={(newProjectId) => {
            toast.success(t('projectPage.sequel.success', 'Sequel created successfully!'));
            navigate(`/projects/${newProjectId}`);
          }}
          onError={(error) => {
            toast.error(error);
          }}
        />
      )}

      {/* Feature #254: Assign to Saga Modal */}
      {project && (
        <AssignToSagaModal
          isOpen={showAssignSagaModal}
          onClose={() => setShowAssignSagaModal(false)}
          projectId={project.id}
          projectArea={project.area}
          currentSagaId={projectSagaId}
          onAssigned={(sagaId) => {
            setProjectSagaId(sagaId);
            loadProject();
            if (sagaId) {
              toast.success(t('sagas.assignSuccess', 'Project assigned to saga successfully'));
            } else {
              toast.success(t('sagas.removeSuccess', 'Project removed from saga successfully'));
            }
          }}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && !showEpubMetadata && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('projectPage.exportDialog.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('projectPage.exportDialog.description')}
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
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('projectPage.exportDialog.plainText')}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('projectPage.exportDialog.plainTextDesc')}</div>
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
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('projectPage.exportDialog.wordDoc')}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('projectPage.exportDialog.wordDocDesc')}</div>
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
                      <div className="font-medium text-gray-900 dark:text-gray-100">{t('projectPage.exportDialog.ebook')}</div>
                      <Crown className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('projectPage.exportDialog.ebookDesc')}</div>
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
                {t('projectPage.exportDialog.cancel')}
              </button>
              <button
                onClick={() => handleExport(exportFormat)}
                disabled={exporting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('projectPage.exporting')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {t('projectPage.exportDialog.export')}
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
                {t('projectPage.epub.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('projectPage.epub.description')}
              </p>

              <div className="space-y-4">
                {/* Cover Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('projectPage.epub.coverImage')}
                  </label>
                  <div className="space-y-3">
                    {coverImagePreview ? (
                      // Show image preview
                      <div className="space-y-3">
                        <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-700/30">
                          <img
                            src={coverImagePreview}
                            alt="Cover preview"
                            className="max-w-full max-h-64 object-contain rounded shadow-md"
                          />
                        </div>
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-500">
                          <ImageIcon className="w-8 h-8 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {coverImageFile?.name || t('projectPage.epub.coverImage')}
                          </span>
                          <button
                            onClick={() => {
                              setCoverImageFile(null);
                              setCoverImageId(null);
                              setCoverImagePreview(null);
                            }}
                            className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Show upload area
                      <label className="block">
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
                                <span className="text-sm text-gray-600 dark:text-gray-400">{t('projectPage.epub.uploading')}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <ImageIcon className="w-10 h-10 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('projectPage.epub.coverImageDesc')}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('projectPage.epub.coverImageHint')}
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
                      {t('projectPage.epub.author')}
                    </label>
                    <input
                      type="text"
                      value={epubMetadata.author}
                      onChange={(e) => setEpubMetadata({ ...epubMetadata, author: e.target.value })}
                      placeholder={t('projectPage.epub.authorPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('projectPage.epub.publisher')}
                    </label>
                    <input
                      type="text"
                      value={epubMetadata.publisher}
                      onChange={(e) => setEpubMetadata({ ...epubMetadata, publisher: e.target.value })}
                      placeholder={t('projectPage.epub.publisherPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('projectPage.epub.isbn')}
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
                      {t('projectPage.epub.language')}
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
                  {t('projectPage.epub.optionalFields')}
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowEpubMetadata(false);
                    setShowExportDialog(false);
                    setError('');
                    // Clean up preview URL
                    if (coverImagePreview) {
                      URL.revokeObjectURL(coverImagePreview);
                      setCoverImagePreview(null);
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  disabled={exporting}
                >
                  {t('common.back')}
                </button>
                <button
                  onClick={() => handleExport('epub')}
                  disabled={exporting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t('projectPage.exporting')}
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      {t('projectPage.epub.generate')}
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

                {/* Human Model (Style Profile) Selector - Feature #136 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Style Profile (Human Model)
                  </label>
                  <select
                    value={editForm.human_model_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, human_model_id: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={creating || loadingHumanModels}
                  >
                    <option value="">None (Default AI Style)</option>
                    {humanModels.map((model: any) => (
                      <option key={model.id} value={model.id}>
                        {model.name} {model.model_type !== 'romanziere_advanced' ? '(Basic)' : '(Advanced)'} - {model.style_strength}% strength
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Apply a trained writing style to AI generation. Create style profiles in the Human Model section.
                  </p>
                </div>

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
                  {t('projectPage.deleteDialog.title')}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('projectPage.deleteDialog.confirmMessage')} <span className="font-semibold text-gray-900 dark:text-gray-100">"{project?.title}"</span>?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                {t('projectPage.deleteDialog.warning')}
              </p>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <strong className="text-gray-700 dark:text-gray-300">{t('projectPage.deleteDialog.warningTitle')}</strong> {t('projectPage.deleteDialog.warningWillDelete')}
                </p>
                <ul className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                  <li>• {t('projectPage.deleteDialog.allChapters')} ({chapters.length})</li>
                  <li>• {t('projectPage.deleteDialog.allSources')} ({sources.length})</li>
                  <li>• {t('projectPage.deleteDialog.allCharacters')} ({characters.length})</li>
                  <li>• {t('projectPage.deleteDialog.allLogs')}</li>
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
                {t('projectPage.deleteDialog.cancel')}
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('projectPage.deleteDialog.deleting')}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {t('projectPage.deleteDialog.deleteButton')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlink Source Dialog */}
      {showUnlinkSourceDialog && sourceToUnlink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Unlink className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('projectPage.sources.unlinkDialog.title')}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('projectPage.sources.unlinkDialog.confirmMessage')}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <span className="font-semibold">"{sourceToUnlink.file_name}"</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('projectPage.sources.unlinkDialog.note')}
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowUnlinkSourceDialog(false);
                  setSourceToUnlink(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                {t('projectPage.sources.unlinkDialog.cancel')}
              </button>
              <button
                onClick={confirmUnlinkSource}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Unlink className="w-4 h-4" />
                {t('projectPage.sources.unlinkDialog.unlinkButton')}
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
              {t('projectPage.chapters.title')}
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
            {/* Generate Outline button - Only for Romanziere projects (Feature #179) */}
            {project?.area === 'romanziere' && (
              <button
                onClick={handleGenerateOutline}
                disabled={generatingOutline}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('projectPage.chapters.generateOutlineHint')}
              >
                <FileText className="w-4 h-4" />
                {generatingOutline ? t('common.loading') : t('projectPage.chapters.generateOutline')}
              </button>
            )}

            {/* Plot Hole Detection button - Only for Romanziere projects (Feature #182, #282, #283) */}
            {project?.area === 'romanziere' && (
              <>
                <button
                  onClick={handleDetectPlotHoles}
                  disabled={detectingPlotHoles}
                  className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('projectPage.chapters.detectPlotHolesHint')}
                >
                  {detectingPlotHoles ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {detectingPlotHoles ? t('common.loading') : t('projectPage.chapters.detectPlotHoles')}
                  {/* Feature #283: Show last analysis indicator */}
                  {savedPlotHoleAnalysis && !detectingPlotHoles && (
                    <span className="ml-1 text-xs opacity-75">
                      ({savedPlotHoleAnalysis.total_issues})
                    </span>
                  )}
                </button>
                {/* Feature #283: View Last Analysis button */}
                {savedPlotHoleAnalysis && (
                  <button
                    onClick={handleViewSavedAnalysis}
                    disabled={loadingSavedAnalysis}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('projectPage.plotHoles.viewLastAnalysisHint', 'View the last saved plot hole analysis')}
                  >
                    {loadingSavedAnalysis ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    {t('projectPage.plotHoles.viewLastAnalysis', 'View Analysis')}
                  </button>
                )}
              </>
            )}

            {/* Consistency Checker button - Only for Romanziere projects (Feature #183) */}
            {project?.area === 'romanziere' && (
              <>
                <button
                  onClick={handleCheckConsistency}
                  disabled={checkingConsistency}
                  className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('projectPage.chapters.checkConsistencyHint')}
                >
                  <Network className="w-4 h-4" />
                  {checkingConsistency ? t('common.loading') : t('projectPage.chapters.checkConsistency')}
                  {/* Feature #291: Show last analysis indicator */}
                  {savedConsistencyCheck && !checkingConsistency && (
                    <span className="ml-1 text-xs opacity-75">
                      ({savedConsistencyCheck.total_issues})
                    </span>
                  )}
                </button>
                {/* Feature #291: View Last Consistency Check button */}
                {savedConsistencyCheck && (
                  <button
                    onClick={handleViewSavedConsistency}
                    disabled={loadingSavedConsistency}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('projectPage.consistency.viewLastCheckHint', 'View the last saved consistency check')}
                  >
                    {loadingSavedConsistency ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    {t('projectPage.consistency.viewLastCheck', 'View Coherence')}
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => setShowAddChapter(!showAddChapter)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('projectPage.chapters.add')}
            </button>
          </div>
        </div>

        {/* Feature #282: Loading indicator for plot hole detection */}
        {detectingPlotHoles && (
          <div className="px-4 py-4 bg-rose-50 dark:bg-rose-900/20 border-b border-rose-200 dark:border-rose-800 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-rose-600 dark:text-rose-400 animate-spin" />
            <div>
              <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                {t('projectPage.plotHoles.analyzing', 'Analisi buchi di trama in corso...')}
              </p>
              <p className="text-xs text-rose-500 dark:text-rose-400 mt-0.5">
                {t('projectPage.plotHoles.analyzingHint', 'Questa operazione potrebbe richiedere qualche minuto con l\'AI.')}
              </p>
            </div>
          </div>
        )}

        {/* Feature #282: Loading indicator for consistency check */}
        {checkingConsistency && (
          <div className="px-4 py-4 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-200 dark:border-teal-800 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-teal-600 dark:text-teal-400 animate-spin" />
            <div>
              <p className="text-sm font-medium text-teal-700 dark:text-teal-300">
                {t('projectPage.consistency.analyzing', 'Verifica coerenza in corso...')}
              </p>
              <p className="text-xs text-teal-500 dark:text-teal-400 mt-0.5">
                {t('projectPage.consistency.analyzingHint', 'Questa operazione potrebbe richiedere qualche minuto con l\'AI.')}
              </p>
            </div>
          </div>
        )}

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
                placeholder={t('projectPage.chapters.titlePlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={creating}
              />
              <button
                type="submit"
                disabled={creating || !newChapterTitle.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {creating ? t('common.loading') : t('common.create')}
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
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}

        {/* Project Not Found (404) */}
        {projectNotFound && (
          <div className="p-8 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
              Project not found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The project you're looking for doesn't exist or has been deleted.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Chapters List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && !projectNotFound ? (
            <ChapterListSkeleton count={5} />
          ) : chapters.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
              <p className="text-lg font-medium mb-1">{t('projectPage.chapters.noChapters')}</p>
              <p className="text-sm">{t('projectPage.chapters.createFirst')}</p>
            </div>
          ) : (
            chapters.map((chapter, index) => (
              <div
                key={chapter.id}
                id={`chapter-${chapter.id}`}
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
                    {chapter.summary && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 italic">
                        {chapter.summary}
                      </p>
                    )}
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
                        {chapter.word_count} {t('chapterEditor.wordCount')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                </div>
                <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRegenerateChapter(chapter.id);
                    }}
                    disabled={regeneratingChapterId === chapter.id}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={t('projectPage.chapters.regenerateChapterHint')}
                  >
                    <RefreshCw className={`w-4 h-4 ${regeneratingChapterId === chapter.id ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChapter(chapter.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title={t('projectPage.chapters.deleteChapterHint')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
              {t('projectPage.sources.title')}
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
                  <option value="all">{t('sources.allTags')}</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowLinkSources(true);
                setSelectedSourcesToLink(new Set());
                loadLinkableSources();
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Network className="w-4 h-4" />
              {t('projectPage.sources.linkSources')}
            </button>
          </div>
        </div>

        {/* Sources List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sources.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
              <p className="text-lg font-medium mb-1">{t('projectPage.sources.noSources')}</p>
              <p className="text-sm">{t('projectPage.sources.linkSourcesHint', 'Use "Link Sources" to add existing sources to this project')}</p>
            </div>
          ) : (
            sources
              .filter(source => selectedTagFilter === 'all' || (source.tags && source.tags.includes(selectedTagFilter)))
              .map((source) => {
                // Determine if this is a saga-wide source (shared from another project or saga-level)
                const isSagaSource = source.saga_id && source.saga_id === project?.saga_id && source.project_id !== project?.id;
                const isSharedWithSaga = source.saga_id && source.saga_id === project?.saga_id && source.project_id === project?.id;

                return (
                <div
                  key={source.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <h3 className="text-gray-900 dark:text-gray-100 font-medium flex items-center gap-2">
                        {source.file_name}
                        {isSagaSource && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 rounded-full">
                            <Layers className="w-3 h-3" />
                            {t('projectPage.sources.sagaSource', 'Saga')}
                          </span>
                        )}
                        {isSharedWithSaga && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-50 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-700">
                            <Share2 className="w-3 h-3" />
                            {t('projectPage.sources.sharedWithSaga', 'Shared')}
                          </span>
                        )}
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
                        {/* Tags display - read-only in project view, manage tags from Sources page */}
                        {source.tags && source.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {source.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {/* Only show unlink button for project-specific sources, not saga sources from other projects */}
                    {!isSagaSource && (
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('project.removeFromProject', 'Remove from project')}
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );})
          )}
        </div>
      </div>

      {/* Saggista Configuration - Only for Saggista projects */}
      {project?.area === 'saggista' && (
        <div className="mt-6 space-y-6">
          {/* Table of Contents */}
          {chapters.length > 0 && (
            <TableOfContents chapters={chapters} projectTitle={project.title} />
          )}

          {/* Saggista Configuration */}
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
                {t('projectPage.characters.title')}
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({characters.length})
              </span>
            </div>
            <div className="flex gap-2">
              {characters.length >= 2 && (
                <button
                  onClick={() => setShowRelationshipMap(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  title={t('projectPage.characters.relationshipMapHint')}
                >
                  <Network className="w-4 h-4" />
                  {t('relationships.title')}
                </button>
              )}
              <button
                onClick={handleViewSynopsis}
                disabled={loadingSynopsis}
                className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                title={t('projectPage.characters.readSynopsisHint')}
              >
                <BookOpen className="w-4 h-4" />
                {loadingSynopsis ? t('projectPage.synopsis.loading') : t('projectPage.synopsis.readSynopsis')}
              </button>
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
                {t('projectPage.characters.add')}
              </button>
            </div>
          </div>

          {/* Add/Edit Character Form */}
          {showAddCharacter && (
            <form onSubmit={editingCharacter ? handleUpdateCharacter : handleCreateCharacter} className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {editingCharacter ? t('projectPage.characters.editTitle') : t('projectPage.characters.addTitle')}
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={characterForm.name}
                  onChange={(e) => setCharacterForm({ ...characterForm, name: e.target.value })}
                  placeholder={t('projectPage.characters.namePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  disabled={creating}
                />
                <textarea
                  value={characterForm.description}
                  onChange={(e) => setCharacterForm({ ...characterForm, description: e.target.value })}
                  placeholder={t('projectPage.characters.descriptionPlaceholder')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  disabled={creating}
                />
                <textarea
                  value={characterForm.traits}
                  onChange={(e) => setCharacterForm({ ...characterForm, traits: e.target.value })}
                  placeholder={t('projectPage.characters.traitsPlaceholder')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  disabled={creating}
                />
                <textarea
                  value={characterForm.backstory}
                  onChange={(e) => setCharacterForm({ ...characterForm, backstory: e.target.value })}
                  placeholder={t('projectPage.characters.backstoryPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  disabled={creating}
                />
                <input
                  type="text"
                  value={characterForm.role_in_story}
                  onChange={(e) => setCharacterForm({ ...characterForm, role_in_story: e.target.value })}
                  placeholder={t('projectPage.characters.rolePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  disabled={creating}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !characterForm.name.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {creating ? t('common.loading') : t('common.create')}
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
                <p className="text-lg font-medium mb-1">{t('projectPage.characters.noCharacters')}</p>
                <p className="text-sm">{t('projectPage.characters.createForProject')}</p>
              </div>
            ) : (
              characters.map((character) => (
                <div
                  key={character.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                          {character.name}
                        </h3>
                        {/* Character Status Badge */}
                        {character.status_at_end && character.status_at_end !== 'unknown' && (
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                            character.status_at_end === 'alive' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            character.status_at_end === 'dead' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            character.status_at_end === 'injured' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            character.status_at_end === 'missing' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {character.status_at_end === 'alive' && '🟢 '}
                            {character.status_at_end === 'dead' && '🔴 '}
                            {character.status_at_end === 'injured' && '🟡 '}
                            {character.status_at_end === 'missing' && '⚪ '}
                            {character.status_at_end === 'unknown' && '❓ '}
                            {t(`projectPage.characters.status.${character.status_at_end}`)}
                          </span>
                        )}
                        {character.role_in_story && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            {character.role_in_story}
                          </span>
                        )}
                      </div>
                      {character.status_notes && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 italic">
                          {character.status_notes}
                        </p>
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
                        title={t('projectPage.characters.editHint')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCharacter(character.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title={t('projectPage.characters.deleteHint')}
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
                {t('projectPage.locations.title')}
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
              {t('projectPage.locations.add')}
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
                  placeholder={t('projectPage.locations.namePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={creating}
                />
                <textarea
                  value={locationForm.description}
                  onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
                  placeholder={t('projectPage.locations.descriptionPlaceholder')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  disabled={creating}
                />
                <textarea
                  value={locationForm.significance}
                  onChange={(e) => setLocationForm({ ...locationForm, significance: e.target.value })}
                  placeholder={t('projectPage.locations.significancePlaceholder')}
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
                    {creating ? t('common.loading') : t('common.create')}
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
                    {t('common.cancel')}
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
                <p className="text-lg font-medium mb-1">{t('projectPage.locations.noLocations')}</p>
                <p className="text-sm">{t('projectPage.locations.createForProject')}</p>
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
                        title={t('projectPage.locations.editHint')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(location.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('projectPage.locations.deleteHint')}
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
                {t('projectPage.plotEvents.title')}
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
              {t('projectPage.plotEvents.add')}
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
                  placeholder={t('projectPage.plotEvents.titlePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={creating}
                />
                <textarea
                  value={plotEventForm.description}
                  onChange={(e) => setPlotEventForm({ ...plotEventForm, description: e.target.value })}
                  placeholder={t('projectPage.plotEvents.descriptionPlaceholder')}
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
                  <option value="">{t('projectPage.plotEvents.linkToChapter')}</option>
                  {chapters.map(chapter => (
                    <option key={chapter.id} value={chapter.id}>{chapter.title}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={plotEventForm.event_type}
                  onChange={(e) => setPlotEventForm({ ...plotEventForm, event_type: e.target.value })}
                  placeholder={t('projectPage.plotEvents.typePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={creating}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !plotEventForm.title.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {creating ? t('common.loading') : t('common.create')}
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
                    {t('common.cancel')}
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
                <p className="text-lg font-medium mb-1">{t('projectPage.plotEvents.noPlotEvents')}</p>
                <p className="text-sm">{t('projectPage.plotEvents.createForProject')}</p>
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
                        title={t('projectPage.plotEvents.editHint')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlotEvent(plotEvent.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('projectPage.plotEvents.deleteHint')}
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

      {/* Link Sources Dialog */}
      {showLinkSources && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('projectPage.sources.linkModalTitle')}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowLinkSources(false);
                  setSelectedSourcesToLink(new Set());
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="px-4 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {project?.saga_id
                  ? t('projectPage.sources.linkModalDescWithSaga', 'Select sources to link to this project. You can link standalone sources or sources from other projects in the saga.')
                  : t('projectPage.sources.linkModalDesc')}
              </p>
              {selectedSourcesToLink.size > 0 && (
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">
                  {t('projectPage.sources.selectedCount', { count: selectedSourcesToLink.size })}
                </p>
              )}
            </div>

            {/* Content - Linkable Sources List */}
            <div className="flex-1 overflow-auto p-4">
              {loadingStandaloneSources ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : standaloneSources.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t('projectPage.sources.noSourcesAvailable')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {t('projectPage.sources.noSourcesAvailableDesc')}
                  </p>
                  <button
                    onClick={() => navigate('/sources')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    {t('projectPage.sources.goToSources')}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {standaloneSources.map((source) => {
                    const isSelected = selectedSourcesToLink.has(source.id);
                    const isSagaSource = (source as any)._sourceType === 'saga';
                    return (
                      <div
                        key={source.id}
                        onClick={() => {
                          const newSelected = new Set(selectedSourcesToLink);
                          if (newSelected.has(source.id)) {
                            newSelected.delete(source.id);
                          } else {
                            newSelected.add(source.id);
                          }
                          setSelectedSourcesToLink(newSelected);
                        }}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                            isSelected
                              ? 'bg-purple-600 border-purple-600'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-gray-900 dark:text-gray-100 font-medium truncate flex items-center gap-2">
                              {source.file_name}
                              {isSagaSource && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 rounded-full">
                                  <Layers className="w-3 h-3" />
                                  {t('projectPage.sources.sagaSource')}
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                                {source.file_type.split('/')[1] || 'file'}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {((source.file_size || 0) / 1024).toFixed(1)} KB
                              </span>
                              <span
                                className={`px-2 py-0.5 text-xs rounded ${
                                  source.source_type === 'upload'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                }`}
                              >
                                {source.source_type === 'upload'
                                  ? t('sources.typeUpload')
                                  : t('sources.typeWebSearch')}
                              </span>
                              {source.tags && source.tags.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {source.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-2 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowLinkSources(false);
                  setSelectedSourcesToLink(new Set());
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                {t('projectPage.sources.cancel')}
              </button>
              <button
                onClick={handleLinkSources}
                disabled={selectedSourcesToLink.size === 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {t('projectPage.sources.confirm')}
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

      {/* Feature #182, #282, #283: Plot Hole Detection Results - with defensive rendering */}
      {showPlotHolesResults && plotHolesResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-rose-50 dark:bg-rose-900/20">
              <div className="flex items-center gap-3">
                {viewingSavedAnalysis ? (
                  <Eye className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                ) : (
                  <RefreshCw className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('projectPage.plotHoles.title')}
                    {viewingSavedAnalysis && (
                      <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                        ({t('projectPage.plotHoles.savedAnalysis', 'Saved')})
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('projectPage.plotHoles.issue', { count: Array.isArray(plotHolesResults) ? plotHolesResults.length : 0 })}
                    {viewingSavedAnalysis && savedPlotHoleAnalysis?.created_at && (
                      <span className="ml-2">
                        • {t('projectPage.plotHoles.analyzedOn', 'Analyzed')} {new Date(savedPlotHoleAnalysis.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPlotHolesResults(false);
                  setPlotHolesResults(null);
                  setViewingSavedAnalysis(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content - Feature #282: Defensive rendering with Array.isArray check */}
            <div className="flex-1 overflow-auto p-6">
              {(!Array.isArray(plotHolesResults) || plotHolesResults.length === 0) ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t('projectPage.plotHoles.noIssuesTitle')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('projectPage.plotHoles.noIssuesDesc')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {plotHolesResults.map((hole: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-l-4 ${
                        hole.severity === 'high'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                          : hole.severity === 'medium'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            hole.severity === 'high'
                              ? 'bg-red-500 text-white'
                              : hole.severity === 'medium'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-blue-500 text-white'
                          }`}>
                            {hole.severity.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            {hole.type}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {hole.description}
                      </h4>

                      {hole.chapter_references && hole.chapter_references.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{t('projectPage.plotHoles.referencedChapters')}</span>
                          <div className="flex flex-wrap gap-1">
                            {hole.chapter_references.map((ref: string, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600"
                              >
                                {ref}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {hole.suggestion && (
                        <div className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <strong>{t('projectPage.plotHoles.suggestion')}</strong> {hole.suggestion}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feature #183: Consistency Check Results */}
      {showConsistencyResults && consistencyResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-teal-50 dark:bg-teal-900/20">
              <div className="flex items-center gap-3">
                <Network className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('projectPage.consistency.title')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('projectPage.consistency.issue', { count: consistencyResults.length })}
                    {savedConsistencyCheck?.created_at && (
                      <span className="ml-2">
                        • {t('projectPage.consistency.checkedOn', 'Verificata il')} {new Date(savedConsistencyCheck.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowConsistencyResults(false);
                  setConsistencyResults(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {consistencyResults.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t('projectPage.consistency.noIssuesTitle')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('projectPage.consistency.noIssuesDesc')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consistencyResults.map((issue: any, index: number) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            issue.type === 'character'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                              : issue.type === 'location'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : issue.type === 'timeline'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {issue.type === 'character'
                              ? t('projectPage.consistency.typeCharacter').toUpperCase()
                              : issue.type === 'location'
                              ? t('projectPage.consistency.typeLocation').toUpperCase()
                              : issue.type === 'timeline'
                              ? t('projectPage.consistency.typeTimeline').toUpperCase()
                              : t('projectPage.consistency.typeOther').toUpperCase()}
                          </span>
                          {issue.entity_name && (
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              "{issue.entity_name}"
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        {issue.description}
                      </p>

                      {issue.chapter_references && issue.chapter_references.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{t('projectPage.consistency.referencedChapters')}</span>
                          <div className="flex flex-wrap gap-1">
                            {issue.chapter_references.map((ref: string, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600"
                              >
                                {ref}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {issue.suggestion && (
                        <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded border border-teal-200 dark:border-teal-800">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <strong>{t('projectPage.consistency.suggestion')}</strong> {issue.suggestion}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feature #181: Relationship Map */}
      {showRelationshipMap && (
        <RelationshipMap
          characters={characters}
          projectTitle={project?.title}
          onClose={() => setShowRelationshipMap(false)}
          onAddRelationship={handleAddRelationship}
        />
      )}

      {/* Feature #226: Styled Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteConfirmDialog}
        title={
          deleteConfirmConfig?.type === 'character'
            ? t('projectPage.characters.deleteTitle', 'Delete Character')
            : deleteConfirmConfig?.type === 'location'
            ? t('projectPage.locations.deleteTitle', 'Delete Location')
            : t('projectPage.plotEvents.deleteTitle', 'Delete Plot Event')
        }
        message={
          deleteConfirmConfig?.type === 'character'
            ? t('projectPage.characters.confirmDelete')
            : deleteConfirmConfig?.type === 'location'
            ? t('projectPage.locations.confirmDelete')
            : t('projectPage.plotEvents.confirmDelete')
        }
        itemName={deleteConfirmConfig?.name}
        onConfirm={handleDeleteConfirmAction}
        onCancel={handleDeleteConfirmCancel}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
      />

      {/* Feature #230: Styled Delete Chapter Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteChapterDialog}
        title={t('projectPage.chapters.deleteTitle', 'Delete Chapter')}
        message={t('projectPage.chapters.confirmDelete')}
        itemName={chapterToDelete?.title}
        onConfirm={handleDeleteChapterConfirm}
        onCancel={handleDeleteChapterCancel}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
      />

      {/* Feature #230: Styled Regenerate Chapter Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRegenerateChapterDialog}
        title={t('projectPage.chapters.regenerateTitle', 'Regenerate Chapter')}
        message={t('projectPage.chapters.confirmRegenerateSimple', 'Are you sure you want to regenerate this chapter? Only this chapter will be regenerated. All other chapters will remain unchanged.')}
        itemName={chapterToRegenerate?.title}
        onConfirm={handleRegenerateChapterConfirm}
        onCancel={handleRegenerateChapterCancel}
        confirmText={t('projectPage.chapters.regenerate', 'Regenerate')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="info"
      />

      {/* Feature #240: Outline Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showOutlineConfirmDialog}
        title={t('projectPage.outlineConfirm.title', 'Generate Outline')}
        message={t('projectPage.outlineConfirm.message', 'This project already has chapters. Generating an outline will add new chapters to the existing ones. Continue?')}
        onConfirm={() => {
          setShowOutlineConfirmDialog(false);
          executeGenerateOutline();
        }}
        onCancel={() => setShowOutlineConfirmDialog(false)}
        confirmText={t('common.confirm', 'Continue')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="warning"
      />

      {/* Feature #240: Duplicate Project Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDuplicateDialog}
        title={t('projectPage.duplicateConfirm.title', 'Duplicate Project')}
        message={t('projectPage.duplicateConfirm.message', 'All chapters, characters, locations, and sources will be duplicated.')}
        itemName={project?.title}
        onConfirm={executeDuplicateProject}
        onCancel={() => setShowDuplicateDialog(false)}
        confirmText={t('projectPage.duplicate', 'Duplicate')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="info"
      />

      {/* Feature #240: Archive Project Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showArchiveDialog}
        title={t('projectPage.archiveConfirmTitle', 'Archive Project')}
        message={t('projectPage.archiveConfirm', 'It will be hidden from the main project list.')}
        itemName={project?.title}
        onConfirm={executeArchive}
        onCancel={() => setShowArchiveDialog(false)}
        confirmText={t('projectPage.archive', 'Archive')}
        cancelText={t('common.cancel', 'Cancel')}
        variant="warning"
      />

      {/* Feature #250: Synopsis Modal */}
      {showSynopsisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSynopsisModal(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                {t('projectPage.synopsis.title')}
              </h2>
              <button
                onClick={() => setShowSynopsisModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingSynopsis ? (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 text-teal-600 dark:text-teal-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{t('projectPage.synopsis.loading')}</p>
                </div>
              ) : synopsisError ? (
                <div className="text-center py-8">
                  <p className="text-red-600 dark:text-red-400">{synopsisError}</p>
                </div>
              ) : synopsisContent ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {synopsisContent}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{t('projectPage.synopsis.noSynopsis')}</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">{t('projectPage.synopsis.noSynopsisDescription')}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowSynopsisModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
