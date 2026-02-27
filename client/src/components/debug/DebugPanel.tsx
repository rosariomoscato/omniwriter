import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug, X, Trash2, ChevronDown, ChevronUp, Wifi, WifiOff, Clock, Zap, AlertCircle, CheckCircle } from 'lucide-react';

// Types for debug log entries
export type DebugLogEventType = 'phase' | 'delta' | 'done' | 'error' | 'connection' | 'timing';

export interface DebugLogEntry {
  id: string;
  timestamp: Date;
  type: DebugLogEventType;
  content: string;
  details?: Record<string, unknown>;
}

export interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  logs: DebugLogEntry[];
  onClear: () => void;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

// Color mapping for event types
const eventTypeStyles: Record<DebugLogEventType, { bg: string; text: string; icon: typeof Zap }> = {
  phase: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: Zap },
  delta: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: ChevronDown },
  done: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', icon: CheckCircle },
  error: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: AlertCircle },
  connection: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', icon: Wifi },
  timing: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: Clock },
};

export function DebugPanel({ isOpen, onClose, logs, onClear, connectionStatus }: DebugPanelProps) {
  const { t } = useTranslation();
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current && !isMinimized) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isMinimized]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (!logsContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[500px] max-w-[calc(100vw-2rem)] bg-gray-900 dark:bg-gray-950 rounded-lg shadow-2xl border border-gray-700 font-mono text-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-green-400" />
          <span className="text-green-400 font-semibold">Debug Panel</span>
          {/* Connection status indicator */}
          <div className="flex items-center gap-1 ml-3">
            {connectionStatus === 'connected' ? (
              <Wifi className="w-3 h-3 text-green-400" />
            ) : connectionStatus === 'connecting' ? (
              <Wifi className="w-3 h-3 text-yellow-400 animate-pulse" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-400" />
            )}
            <span className={`text-xs ${
              connectionStatus === 'connected' ? 'text-green-400' :
              connectionStatus === 'connecting' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {connectionStatus}
            </span>
          </div>
          {/* Log count */}
          <span className="text-gray-500 text-xs ml-2">
            ({logs.length} entries)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClear}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title={t('debug.clearLogs', 'Clear logs')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title={isMinimized ? t('debug.expand', 'Expand') : t('debug.minimize', 'Minimize')}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title={t('debug.close', 'Close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs container */}
      {!isMinimized && (
        <div
          ref={logsContainerRef}
          onScroll={handleScroll}
          className="h-64 overflow-y-auto p-2 space-y-1"
        >
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              {t('debug.noLogs', 'No logs yet. Start a generation to see debug info.')}
            </div>
          ) : (
            logs.map((log) => {
              const style = eventTypeStyles[log.type];
              const Icon = style.icon;
              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 p-2 rounded ${style.bg} ${style.text}`}
                >
                  <Icon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase">
                        {log.type}
                      </span>
                      <span className="text-xs opacity-60">
                        {log.timestamp.toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          fractionalSecondDigits: 3
                        })}
                      </span>
                    </div>
                    <div className="text-xs break-all mt-0.5">
                      {log.content}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <pre className="text-xs mt-1 opacity-70 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      )}

      {/* Auto-scroll indicator */}
      {!isMinimized && !autoScroll && (
        <div className="absolute bottom-2 right-2">
          <button
            onClick={() => {
              setAutoScroll(true);
              logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
          >
            {t('debug.scrollToBottom', 'Scroll to bottom')}
          </button>
        </div>
      )}
    </div>
  );
}

// Hook for managing debug logs
export function useDebugLogs(maxEntries: number = 100) {
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);

  const addLog = useCallback((type: DebugLogEventType, content: string, details?: Record<string, unknown>) => {
    const entry: DebugLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      content,
      details,
    };

    setLogs((prev) => {
      const newLogs = [...prev, entry];
      // Keep only the last maxEntries
      if (newLogs.length > maxEntries) {
        return newLogs.slice(-maxEntries);
      }
      return newLogs;
    });
  }, [maxEntries]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setGenerationStartTime(null);
  }, []);

  // Log phase event
  const logPhase = useCallback((phase: string, message: string) => {
    addLog('phase', `${phase}: ${message}`, { phase, message });
  }, [addLog]);

  // Log delta event
  const logDelta = useCallback((content: string, totalLength?: number) => {
    const preview = content.length > 100 ? `${content.substring(0, 100)}...` : content;
    addLog('delta', `+${content.length} chars${totalLength ? ` (total: ${totalLength})` : ''}`, {
      chunkSize: content.length,
      totalLength,
      preview
    });
  }, [addLog]);

  // Log done event
  const logDone = useCallback((data: { message: string; word_count: number; chapter_id?: string; warning?: string }) => {
    const duration = generationStartTime ? Date.now() - generationStartTime : null;
    addLog('done', data.message, {
      word_count: data.word_count,
      chapter_id: data.chapter_id,
      warning: data.warning,
      duration_ms: duration
    });
    if (duration) {
      addLog('timing', `Generation completed in ${(duration / 1000).toFixed(2)}s`, { duration_ms: duration });
    }
    setConnectionStatus('connected');
    setGenerationStartTime(null);
  }, [addLog, generationStartTime]);

  // Log error event
  const logError = useCallback((error: string) => {
    addLog('error', error, { error });
    setConnectionStatus('disconnected');
    setGenerationStartTime(null);
  }, [addLog]);

  // Log connection event
  const logConnection = useCallback((status: 'connecting' | 'connected' | 'disconnected', message?: string) => {
    setConnectionStatus(status);
    addLog('connection', message || status, { status });
    if (status === 'connecting') {
      setGenerationStartTime(Date.now());
    }
  }, [addLog]);

  // Feature #393: Log waiting event for slow reasoning models
  const logWaiting = useCallback((reason: string, elapsedTime: number) => {
    const elapsedSec = Math.round(elapsedTime / 1000);
    addLog('waiting', `Waiting for model... (${elapsedSec}s)`, { reason, elapsed_ms: elapsedTime });
  }, [addLog]);

  return {
    logs,
    connectionStatus,
    addLog,
    clearLogs,
    logPhase,
    logDelta,
    logDone,
    logError,
    logConnection,
    logWaiting,
  };
}

export default DebugPanel;
