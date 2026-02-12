import React, { createContext, useContext, useState, useCallback } from 'react';

export type GenerationPhase = 'idle' | 'structure' | 'writing' | 'revision' | 'completed' | 'failed';

export interface GenerationProgress {
  phase: GenerationPhase;
  currentStep: number;
  totalSteps: number;
  message: string;
  percentage: number;
  tokenCount?: number;
}

interface GenerationContextType {
  progress: GenerationProgress;
  startGeneration: () => void;
  updateProgress: (updates: Partial<GenerationProgress>) => void;
  completeGeneration: () => void;
  failGeneration: (error: string) => void;
  resetGeneration: () => void;
  cancelGeneration: () => void;
}

const GenerationProgressContext = createContext<GenerationContextType | undefined>(undefined);

const INITIAL_PROGRESS: GenerationProgress = {
  phase: 'idle',
  currentStep: 0,
  totalSteps: 3,
  message: '',
  percentage: 0,
};

// Global abort controller for canceling generation
let generationAbortController: AbortController | null = null;

export function setGenerationAbortController(controller: AbortController | null) {
  generationAbortController = controller;
}

export function abortGeneration() {
  if (generationAbortController) {
    generationAbortController.abort();
    generationAbortController = null;
  }
}

export function GenerationProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<GenerationProgress>(INITIAL_PROGRESS);

  const startGeneration = useCallback(() => {
    setProgress({
      phase: 'structure',
      currentStep: 1,
      totalSteps: 3,
      message: 'Analyzing structure and planning...',
      percentage: 10,
    });
  }, []);

  const updateProgress = useCallback((updates: Partial<GenerationProgress>) => {
    setProgress((prev) => ({ ...prev, ...updates }));
  }, []);

  const completeGeneration = useCallback(() => {
    setProgress({
      phase: 'completed',
      currentStep: 3,
      totalSteps: 3,
      message: 'Generation completed successfully!',
      percentage: 100,
    });
  }, []);

  const failGeneration = useCallback((error: string) => {
    setProgress({
      phase: 'failed',
      currentStep: 0,
      totalSteps: 3,
      message: error,
      percentage: 0,
    });
  }, []);

  const resetGeneration = useCallback(() => {
    setProgress(INITIAL_PROGRESS);
  }, []);

  const cancelGeneration = useCallback(() => {
    // Abort the fetch request
    abortGeneration();
    // Reset progress to idle
    setProgress(INITIAL_PROGRESS);
  }, []);

  const value: GenerationContextType = {
    progress,
    startGeneration,
    updateProgress,
    completeGeneration,
    failGeneration,
    resetGeneration,
    cancelGeneration,
  };

  return (
    <GenerationProgressContext.Provider value={value}>
      {children}
    </GenerationProgressContext.Provider>
  );
}

export function useGenerationProgress() {
  const context = useContext(GenerationProgressContext);
  if (context === undefined) {
    throw new Error('useGenerationProgress must be used within a GenerationProgressProvider');
  }
  return context;
}
