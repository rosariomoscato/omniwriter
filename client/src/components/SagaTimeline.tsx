import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';
import { Calendar, User, MapPin, Flag, Skull, Heart, Activity } from 'lucide-react';

interface SagaTimelineProps {
  sagaId: string;
}

interface ContinuityData {
  saga: { id: string; title: string; description: string; area: string };
  episodes: Array<{
    id: string;
    saga_id: string;
    project_id: string;
    project_title: string;
    project_status: string;
    episode_number: number;
    synopsis: string;
    characters: Array<{ name: string; status: string; notes: string; role: string }>;
    events: Array<{ title: string; description: string; type: string }>;
    locations: Array<{ name: string; description: string; significance: string }>;
    finalized_at: string;
  }>;
  episode_count: number;
  cumulative: {
    characters: Array<{ name: string; status: string; notes: string; role: string; last_seen_episode: number }>;
    locations: Array<{ name: string; description: string; significance: string; last_seen_episode: number }>;
    events: Array<{ title: string; description: string; type: string; episode_number: number }>;
    characters_alive: number;
    characters_dead: number;
    characters_total: number;
  };
}

export default function SagaTimeline({ sagaId }: SagaTimelineProps) {
  const { t } = useTranslation();
  const [continuity, setContinuity] = useState<ContinuityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContinuity();
  }, [sagaId]);

  const loadContinuity = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getSagaContinuity(sagaId);
      setContinuity(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load continuity');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'alive':
      case 'vivo':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'dead':
      case 'morto':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'injured':
      case 'ferito':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'missing':
      case 'disperso':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'transformed':
      case 'trasformato':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'dead' || s === 'morto') return <Skull className="w-3 h-3" />;
    if (s === 'injured' || s === 'ferito') return <Activity className="w-3 h-3" />;
    return <Heart className="w-3 h-3" />;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!continuity || continuity.episode_count === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
            {t('projectPage.sagaContinuity.noEpisodes', 'No episodes finalized yet')}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            {t('projectPage.finalizeEpisode.noChapters', 'Create chapters and finalize episodes to see the timeline here')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cumulative Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Flag className="w-5 h-5 text-indigo-600" />
          {t('projectPage.sagaContinuity.cumulativeState', 'Cumulative State')}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {continuity.cumulative.characters_alive}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              {t('projectPage.sagaContinuity.charactersAlive', 'Characters Alive')}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {continuity.cumulative.characters_dead}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              {t('projectPage.sagaContinuity.charactersDead', 'Characters Dead')}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {continuity.cumulative.characters_total}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('projectPage.sagaContinuity.totalCharacters', 'Total Characters')}
            </p>
          </div>
        </div>
      </div>

      {/* Episodes Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          {t('projectPage.sagaContinuity.timeline', 'Events Timeline')}
        </h3>

        <div className="space-y-6">
          {continuity.episodes.map((episode, idx) => (
            <div key={episode.id} className="relative">
              {/* Timeline connector line */}
              {idx < continuity.episodes.length - 1 && (
                <div className="absolute left-4 top-12 w-0.5 h-full bg-gray-200 dark:bg-gray-700"></div>
              )}

              <div className="flex gap-4">
                {/* Episode number badge */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm z-10">
                  {episode.episode_number}
                </div>

                {/* Episode content */}
                <div className="flex-1 pb-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    {/* Episode title */}
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      {t('projectPage.finalizeEpisode.episodeNumber', { number: episode.episode_number })}
                      <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                        {episode.project_title}
                      </span>
                    </h4>

                    {/* Synopsis */}
                    {episode.synopsis && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg p-3">
                          {episode.synopsis}
                        </p>
                      </div>
                    )}

                    {/* Characters with status badges */}
                    {episode.characters && episode.characters.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {t('projectPage.characters', 'Characters')}
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {episode.characters.map((char, charIdx) => (
                            <span
                              key={charIdx}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(char.status)}`}
                              title={`${char.name}: ${char.status}${char.notes ? ` - ${char.notes}` : ''}`}
                            >
                              {getStatusIcon(char.status)}
                              {char.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key events */}
                    {episode.events && episode.events.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                          <Flag className="w-4 h-4" />
                          {t('projectPage.finalizeEpisode.events', 'Key Events')}
                        </h5>
                        <div className="space-y-1">
                          {episode.events.map((event, eventIdx) => (
                            <div key={eventIdx} className="text-sm">
                              <span className="font-medium text-gray-900 dark:text-white">{event.title}:</span>
                              <span className="text-gray-600 dark:text-gray-400 ml-1">{event.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Locations */}
                    {episode.locations && episode.locations.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {t('projectPage.finalizeEpisode.locations', 'Locations')}
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {episode.locations.map((loc, locIdx) => (
                            <span
                              key={locIdx}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              title={loc.significance}
                            >
                              <MapPin className="w-3 h-3" />
                              {loc.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
