// Feature #321: Unified Sequel Creation Flow in Sagas Page
// Phase 1: Title + Source Selection + Import Summary
// Phase 2: Generate and select from 3 AI-generated plot proposals
// Phase 3: Generate chapter outline based on chosen plot
// Phase 4: Confirm and create the sequel
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { apiService, Project } from '../services/api';
import { useToastNotification } from './Toast';
import {
  X, BookOpen, MapPin, Users, Sparkles,
  Loader2, CheckCircle, ChevronDown, ChevronUp,
  RefreshCw, Check, Pencil, ArrowLeft, ArrowRight, Zap
} from 'lucide-react';

interface CreateSagaSequelModalProps {
  sagaId: string;
  sagaTitle: string;
  sagaProjects: Project[];
  onClose: () => void;
  onSuccess?: () => void;
}

interface PlotProposal {
  id: number;
  title: string;
  synopsis: string;
  themes: string[];
  key_characters: string[];
  tone: string;
}

interface ChapterOutline {
  title: string;
  summary: string;
  returning_characters?: string[];
  new_elements?: string[];
  connection_to_previous?: string;
}

interface Outline {
  sequelTitle: string;
  chapters: ChapterOutline[];
  themes?: string[];
  characterArcs?: string[];
}

interface EditingChapter {
  index: number;
  title: string;
  summary: string;
}

interface SequelContext {
  originalTitle: string;
  aliveCharactersCount: number;
  deadCharactersCount: number;
  locationsCount: number;
  plotEventsCount: number;
}

interface OutlineMeta {
  requestedChapters: number;
  generatedChapters: number;
  attempts: number;
}

type Phase = 'title' | 'proposals' | 'outline' | 'creating';

export default function CreateSagaSequelModal({
  sagaId: _sagaId,
  sagaTitle,
  sagaProjects,
  onClose,
  onSuccess
}: CreateSagaSequelModalProps) {
  // _sagaId is reserved for future use (e.g., associating sequel with saga)
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToastNotification();

  const language = i18n.language === 'en' ? 'en' : 'it';
  const isItalian = language === 'it';

  // Phase state
  const [phase, setPhase] = useState<Phase>('title');
  const [loading, setLoading] = useState(false);

  // Phase 1: Title and Source
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceProjectId, setSelectedSourceProject] = useState<string>('');

  // Phase 2: Proposals
  const [proposals, setProposals] = useState<PlotProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<PlotProposal | null>(null);
  const [context, setContext] = useState<SequelContext | null>(null);
  const [numChapters, setNumChapters] = useState(10);

  // Phase 3: Outline
  const [outline, setOutline] = useState<Outline | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [editingChapter, setEditingChapter] = useState<EditingChapter | null>(null);
  const [outlineWarning, setOutlineWarning] = useState<string | null>(null);
  const [outlineMeta, setOutlineMeta] = useState<OutlineMeta | null>(null);

  // Auto-select the most recent project if available
  useEffect(() => {
    if (sagaProjects.length > 0 && !sourceProjectId) {
      // Projects are already sorted by created_at DESC from the API
      setSelectedSourceProject(sagaProjects[0].id);
    }
  }, [sagaProjects, sourceProjectId]);

  const selectedProject = sagaProjects.find(p => p.id === sourceProjectId);

  const defaultTitle = selectedProject?.title.includes(' - ')
    ? `${selectedProject.title.split(' - ')[0]} - Part 2`
    : selectedProject ? `${selectedProject.title} - Part 2` : '';

  // ==================== Phase 1: Generate Proposals ====================
  const handleGenerateProposals = async () => {
    if (!sourceProjectId) {
      toast.error(isItalian ? 'Seleziona un progetto sorgente' : 'Select a source project');
      return;
    }

    setLoading(true);
    setProposals([]);
    setSelectedProposal(null);

    try {
      const response = await apiService.generateSequelProposals(
        sourceProjectId,
        title.trim() || undefined,
        language
      );

      if (response.success && response.proposals.length > 0) {
        setProposals(response.proposals);
        setContext(response.context);
        setPhase('proposals');
      } else {
        toast.error(isItalian ? 'Nessuna proposta generata' : 'No proposals generated');
      }
    } catch (err: any) {
      toast.error(err.message || (isItalian ? 'Errore nella generazione delle proposte' : 'Failed to generate proposals'));
    } finally {
      setLoading(false);
    }
  };

  // ==================== Phase 2: Select Proposal ====================
  const handleSelectProposal = (proposal: PlotProposal) => {
    setSelectedProposal(proposal);
  };

  const handleConfirmProposal = () => {
    if (selectedProposal) {
      setPhase('outline');
      handleGenerateOutline();
    }
  };

  // ==================== Phase 3: Generate Outline ====================
  const handleGenerateOutline = async () => {
    if (!selectedProposal || !sourceProjectId) return;

    setLoading(true);
    setOutline(null);
    setOutlineWarning(null);
    setOutlineMeta(null);

    try {
      const response = await apiService.generateSequelOutline(
        sourceProjectId,
        title.trim() || undefined,
        language,
        numChapters,
        selectedProposal.synopsis
      );

      if (response.success && response.outline) {
        setOutline(response.outline);
        setExpandedChapters(new Set([0, 1, 2]));
        // Feature #343: Handle warning if chapter count doesn't match
        if (response.warning) {
          setOutlineWarning(response.warning);
        }
        if (response.meta) {
          setOutlineMeta(response.meta);
        }
      } else {
        toast.error(response.message || (isItalian ? 'Errore nella generazione dell\'outline' : 'Failed to generate outline'));
      }
    } catch (err: any) {
      toast.error(err.message || (isItalian ? 'Errore nella generazione dell\'outline' : 'Failed to generate outline'));
    } finally {
      setLoading(false);
    }
  };

  // ==================== Phase 4: Confirm & Create ====================
  const handleConfirmSequel = async () => {
    if (!outline || !sourceProjectId) return;

    setPhase('creating');
    setLoading(true);

    try {
      const response = await apiService.confirmSequel(
        sourceProjectId,
        title.trim() || outline.sequelTitle,
        outline,
        language
      );

      toast.success(isItalian ? 'Sequel creato con successo!' : 'Sequel created successfully!');

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onClose();

      // Navigate to the new project
      navigate(`/projects/${response.project.id}`);
    } catch (err: any) {
      toast.error(err.message || (isItalian ? 'Errore nella creazione del sequel' : 'Failed to create sequel'));
      setPhase('outline');
    } finally {
      setLoading(false);
    }
  };

  // ==================== Chapter Editing ====================
  const toggleChapter = (index: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChapters(newExpanded);
  };

  const startEditingChapter = (index: number) => {
    const chapter = outline?.chapters[index];
    if (chapter) {
      setEditingChapter({ index, title: chapter.title, summary: chapter.summary });
    }
  };

  const saveChapterEdit = () => {
    if (!outline || editingChapter === null) return;
    const updatedChapters = [...outline.chapters];
    updatedChapters[editingChapter.index] = {
      ...updatedChapters[editingChapter.index],
      title: editingChapter.title,
      summary: editingChapter.summary
    };
    setOutline({ ...outline, chapters: updatedChapters });
    setEditingChapter(null);
  };

  // ==================== Phase Indicator ====================
  const PhaseIndicator = () => {
    const phases = [
      { key: 'title', label: isItalian ? 'Titolo' : 'Title', num: 1 },
      { key: 'proposals', label: isItalian ? 'Trama' : 'Plot', num: 2 },
      { key: 'outline', label: isItalian ? 'Capitoli' : 'Chapters', num: 3 },
    ];
    const currentIdx = phases.findIndex(p => p.key === phase) || 0;

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {phases.map((p, idx) => (
          <div key={p.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              idx < currentIdx
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : idx === currentIdx
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {idx < currentIdx ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <span className="w-4 h-4 flex items-center justify-center rounded-full bg-current/10 text-[10px] font-bold">
                  {p.num}
                </span>
              )}
              {p.label}
            </div>
            {idx < phases.length - 1 && (
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {isItalian ? 'Crea Seguito' : 'Create Sequel'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {sagaTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading && phase === 'creating'}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <PhaseIndicator />

          {/* ==================== PHASE 1: Title Input & Source Selection ==================== */}
          {phase === 'title' && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                {isItalian
                  ? 'Crea un seguito per questa saga. Scegli il progetto sorgente e un titolo, poi l\'AI genererà 3 possibili trame.'
                  : 'Create a sequel for this saga. Choose the source project and a title, then AI will generate 3 possible plots.'}
              </p>

              {/* No projects warning */}
              {sagaProjects.length === 0 ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    {isItalian
                      ? 'Non ci sono progetti in questa saga. Aggiungi un progetto prima di creare un seguito.'
                      : 'There are no projects in this saga yet. Add a project before creating a sequel.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Source Project Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isItalian ? 'Progetto Sorgente' : 'Source Project'} *
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {isItalian
                        ? 'Il progetto da cui copiare personaggi e luoghi. Verrà usato il più recente se non selezionato.'
                        : 'The project to copy characters and locations from. The most recent will be used if not selected.'}
                    </p>
                    <select
                      value={sourceProjectId}
                      onChange={e => setSelectedSourceProject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      disabled={loading}
                    >
                      {sagaProjects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.title} ({new Date(project.created_at).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sequel Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isItalian ? 'Titolo del seguito' : 'Sequel Title'}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder={defaultTitle}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                    />
                  </div>

                  {/* Description (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isItalian ? 'Descrizione (opzionale)' : 'Description (optional)'}
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      rows={2}
                      placeholder={isItalian ? 'Descrizione opzionale del seguito...' : 'Optional description of the sequel...'}
                      disabled={loading}
                    />
                  </div>

                  {/* Preview of what will be imported */}
                  {selectedProject && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        {isItalian ? 'Cosa verrà importato:' : 'What will be imported:'}
                      </p>

                      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Users size={16} className="text-purple-600 dark:text-purple-400" />
                        <span>
                          {isItalian
                            ? `${selectedProject.character_count || 0} personaggi verranno importati (esclusi i morti)`
                            : `${selectedProject.character_count || 0} characters will be imported (excluding dead ones)`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <MapPin size={16} className="text-purple-600 dark:text-purple-400" />
                        <span>
                          {isItalian
                            ? `${selectedProject.location_count || 0} luoghi verranno importati`
                            : `${selectedProject.location_count || 0} locations will be imported`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <BookOpen size={16} className="text-purple-600 dark:text-purple-400" />
                        <span>
                          {isItalian
                            ? 'Fonti e impostazioni saranno preservate'
                            : 'Sources and settings will be preserved'}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleGenerateProposals}
                    disabled={loading || !sourceProjectId}
                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {isItalian ? 'Generazione proposte di trama...' : 'Generating plot proposals...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        {isItalian ? 'Genera 3 Proposte di Trama' : 'Generate 3 Plot Proposals'}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ==================== PHASE 2: Plot Proposals ==================== */}
          {phase === 'proposals' && (
            <div className="space-y-4">
              {/* Context info */}
              {context && (
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {context.aliveCharactersCount} {isItalian ? 'personaggi vivi' : 'alive characters'}
                    {context.deadCharactersCount > 0 && (
                      <span className="text-red-500"> + {context.deadCharactersCount} {isItalian ? 'morti' : 'dead'}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {context.locationsCount} {isItalian ? 'luoghi' : 'locations'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    {context.plotEventsCount} {isItalian ? 'eventi' : 'events'}
                  </span>
                </div>
              )}

              <p className="text-gray-600 dark:text-gray-400">
                {isItalian
                  ? 'Scegli la direzione che preferisci per il tuo seguito:'
                  : 'Choose the direction you prefer for your sequel:'}
              </p>

              {/* Proposal cards */}
              <div className="space-y-3">
                {proposals.map((proposal) => {
                  const isSelected = selectedProposal?.id === proposal.id;
                  return (
                    <div
                      key={proposal.id}
                      onClick={() => handleSelectProposal(proposal)}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm'
                      }`}
                    >
                      {/* Proposal header */}
                      <div className="flex items-start justify-between mb-2">
                        <h3 className={`font-semibold text-lg ${
                          isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {proposal.title}
                        </h3>
                        {isSelected && (
                          <CheckCircle className="w-6 h-6 text-purple-500 flex-shrink-0 ml-2" />
                        )}
                      </div>

                      {/* Tone badge */}
                      {proposal.tone && (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 mb-2">
                          {proposal.tone}
                        </span>
                      )}

                      {/* Synopsis */}
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                        {proposal.synopsis}
                      </p>

                      {/* Themes */}
                      {proposal.themes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {proposal.themes.map((theme, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Key characters */}
                      {proposal.key_characters.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {proposal.key_characters.map((char, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full"
                            >
                              {char}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Number of chapters */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isItalian ? 'Numero di capitoli per il seguito:' : 'Number of chapters for the sequel:'}
                </label>
                <input
                  type="number"
                  min={3}
                  max={30}
                  value={numChapters}
                  onChange={(e) => setNumChapters(Math.max(3, Math.min(30, parseInt(e.target.value) || 10)))}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPhase('title')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {isItalian ? 'Indietro' : 'Back'}
                </button>

                <button
                  onClick={handleGenerateProposals}
                  disabled={loading}
                  className="px-4 py-2 border border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {isItalian ? 'Rigenera proposte' : 'Regenerate'}
                </button>

                <button
                  onClick={handleConfirmProposal}
                  disabled={!selectedProposal || loading}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isItalian ? 'Generazione capitoli...' : 'Generating chapters...'}
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-5 h-5" />
                      {isItalian ? 'Conferma e Genera Capitoli' : 'Confirm & Generate Chapters'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ==================== PHASE 3: Chapter Outline ==================== */}
          {phase === 'outline' && (
            <div className="space-y-4">
              {/* Loading state */}
              {loading && !outline && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {isItalian ? 'Generazione outline capitoli...' : 'Generating chapter outline...'}
                  </p>
                </div>
              )}

              {outline && (
                <>
                  {/* Feature #343: Warning if chapter count doesn't match */}
                  {outlineWarning && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        ⚠️ {outlineWarning}
                      </p>
                      {outlineMeta && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          {isItalian
                            ? `Richiesti: ${outlineMeta.requestedChapters}, Generati: ${outlineMeta.generatedChapters} (tentativi: ${outlineMeta.attempts})`
                            : `Requested: ${outlineMeta.requestedChapters}, Generated: ${outlineMeta.generatedChapters} (attempts: ${outlineMeta.attempts})`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Selected plot summary */}
                  {selectedProposal && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                        {outline.sequelTitle}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {isItalian ? 'Trama scelta' : 'Chosen plot'}: <span className="font-medium">{selectedProposal.title}</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {outline.chapters.length} {isItalian ? 'capitoli pianificati' : 'chapters planned'}
                      </p>
                    </div>
                  )}

                  {/* Themes */}
                  {outline.themes && outline.themes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {outline.themes.map((theme, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Chapters list */}
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isItalian ? 'Clicca su un capitolo per espandere. Usa la matita per modificare.' : 'Click a chapter to expand. Use the pencil to edit.'}
                    </p>

                    {outline.chapters.map((chapter, index) => {
                      const isExpanded = expandedChapters.has(index);
                      const isEditing = editingChapter?.index === index;

                      return (
                        <div
                          key={index}
                          className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
                        >
                          {/* Chapter header */}
                          <div
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => !isEditing && toggleChapter(index)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-xs font-medium text-purple-500 w-6 flex-shrink-0">
                                #{index + 1}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {chapter.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {chapter.returning_characters && chapter.returning_characters.length > 0 && (
                                <span className="text-xs text-gray-400 mr-1">
                                  <Users className="w-3.5 h-3.5 inline" /> {chapter.returning_characters.length}
                                </span>
                              )}
                              {!isEditing && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); startEditingChapter(index); }}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-gray-500" />
                                </button>
                              )}
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                            </div>
                          </div>

                          {/* Chapter content */}
                          {isExpanded && (
                            <div className="p-3 border-t border-gray-200 dark:border-gray-600">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <input
                                    type="text"
                                    value={editingChapter!.title}
                                    onChange={(e) => setEditingChapter({ ...editingChapter!, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-purple-400 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
                                  />
                                  <textarea
                                    value={editingChapter!.summary}
                                    onChange={(e) => setEditingChapter({ ...editingChapter!, summary: e.target.value })}
                                    rows={5}
                                    className="w-full px-3 py-2 border border-purple-400 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingChapter(null)} className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                      {isItalian ? 'Annulla' : 'Cancel'}
                                    </button>
                                    <button onClick={saveChapterEdit} className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5" />
                                      {isItalian ? 'Salva' : 'Save'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {chapter.summary}
                                  </p>
                                  {chapter.returning_characters && chapter.returning_characters.length > 0 && (
                                    <div>
                                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {isItalian ? 'Personaggi' : 'Characters'}:
                                      </span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {chapter.returning_characters.map((char, idx) => (
                                          <span key={idx} className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                                            {char}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {chapter.new_elements && chapter.new_elements.length > 0 && (
                                    <div>
                                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {isItalian ? 'Nuovi elementi' : 'New elements'}:
                                      </span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {chapter.new_elements.map((el, idx) => (
                                          <span key={idx} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded">
                                            {el}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => { setOutline(null); setPhase('proposals'); }}
                      disabled={loading}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {isItalian ? 'Cambia trama' : 'Change plot'}
                    </button>

                    <button
                      onClick={handleGenerateOutline}
                      disabled={loading}
                      className="px-4 py-2 border border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      {isItalian ? 'Rigenera' : 'Regenerate'}
                    </button>

                    <button
                      onClick={handleConfirmSequel}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {isItalian ? 'Conferma e Crea Seguito' : 'Confirm & Create Sequel'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ==================== CREATING STATE ==================== */}
          {phase === 'creating' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {isItalian ? 'Creazione sequel in corso...' : 'Creating sequel...'}
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                {isItalian ? 'Copia personaggi, luoghi, fonti e capitoli...' : 'Copying characters, locations, sources and chapters...'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
