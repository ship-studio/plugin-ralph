export type RalphPhase = 'loading' | 'not-installed' | 'not-enabled' | 'ready' | 'running';

export interface RalphStatus {
  status: string;
  loop_count?: number;
  calls_made_this_hour?: number;
  max_calls_per_hour?: number;
  last_action?: string;
  exit_reason?: string;
  timestamp?: string;
  next_reset?: string;
}

export interface RalphConfig {
  MAX_CALLS_PER_HOUR?: string;
  CLAUDE_TIMEOUT_MINUTES?: string;
  PROJECT_TYPE?: string;
  STAGNATION_THRESHOLD?: string;
  [key: string]: string | undefined;
}

export interface RalphState {
  phase: RalphPhase;
  config: RalphConfig;
  status: RalphStatus | null;
  logLines: string;
  prereqs: {
    claude: boolean | null;
    git: boolean | null;
    node: boolean | null;
    jq: boolean | null;
    coreutils: boolean | null;
  };
  install: () => void;
  enable: (goals: string, tasks: string, rateLimit: number, timeout: number) => Promise<void>;
  startRalph: (form: { goals: string; tasks: string; rateLimit: number; timeout: number }) => Promise<void>;
  stopRalph: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface PluginContextValue {
  pluginId: string;
  project: {
    name: string;
    path: string;
    currentBranch: string;
    hasUncommittedChanges: boolean;
  } | null;
  actions: {
    showToast: (message: string, type?: 'success' | 'error') => void;
    refreshGitStatus: () => void;
    refreshBranches: () => void;
    focusTerminal: () => void;
    openUrl: (url: string) => void;
    openTerminal: (command: string, args: string[], options?: { title?: string }) => void;
  };
  shell: {
    exec: (command: string, args: string[], options?: { timeout?: number }) => Promise<{
      stdout: string;
      stderr: string;
      exit_code: number;
    }>;
  };
  storage: {
    read: () => Promise<Record<string, unknown>>;
    write: (data: Record<string, unknown>) => Promise<void>;
  };
  invoke: {
    call: <T = unknown>(command: string, args?: Record<string, unknown>) => Promise<T>;
  };
  theme: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    accent: string;
    accentHover: string;
    action: string;
    actionHover: string;
    actionText: string;
    error: string;
    success: string;
  };
}
