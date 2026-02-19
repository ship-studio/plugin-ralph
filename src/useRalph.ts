import { useState, useEffect, useCallback, useRef } from 'react';
import { useShell, useProject, useToast, useAppActions, usePluginStorage } from './context';
import type { RalphPhase, RalphConfig, RalphStatus, RalphState } from './types';

function parseRalphrc(raw: string): RalphConfig {
  const config: RalphConfig = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    config[key] = value;
  }
  return config;
}

function serializeRalphrc(config: RalphConfig): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) continue;
    if (/\s/.test(value) || value.includes('#')) {
      lines.push(`${key}="${value}"`);
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  return lines.join('\n') + '\n';
}

type ShellType = { exec: (cmd: string, args: string[], opts?: { timeout?: number }) => Promise<{ stdout: string; stderr: string; exit_code: number }> };

async function writeFile(
  shell: ShellType,
  filePath: string,
  content: string,
): Promise<boolean> {
  const encoded = btoa(
    new TextEncoder()
      .encode(content)
      .reduce((s, b) => s + String.fromCharCode(b), ''),
  );
  const result = await shell.exec('node', [
    '-e',
    'require("fs").writeFileSync(process.argv[1], Buffer.from(process.argv[2], "base64"))',
    filePath,
    encoded,
  ]);
  return result.exit_code === 0;
}

async function isRalphProcessAlive(
  sh: ShellType,
  pid?: number,
): Promise<boolean> {
  if (pid && pid > 0) {
    const result = await sh.exec('kill', ['-0', String(pid)]);
    return result.exit_code === 0;
  }
  // Fallback for externally-started ralph
  const result = await sh.exec('bash', ['-c', 'ps aux | grep -E "ralph_loop|ralph.*--live" | grep -v grep | head -1']);
  return result.exit_code === 0 && result.stdout.trim().length > 0;
}

const DEFAULT_AGENT_MD = `# Agent Instructions

## Build & Test
- Run \`npm test\` to execute tests
- Run \`npm run build\` to build the project
- Run \`npm run lint\` to check linting

## Code Style
- Follow existing patterns in the codebase
- Use TypeScript strict mode
- Keep functions small and focused
`;

export function useRalph(): RalphState {
  const shell = useShell();
  const project = useProject();
  const showToast = useToast();
  const actions = useAppActions();
  const storage = usePluginStorage();

  // Use refs for unstable context values to keep callbacks stable
  const shellRef = useRef(shell);
  shellRef.current = shell;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const toastRef = useRef(showToast);
  toastRef.current = showToast;
  const storageRef = useRef(storage);
  storageRef.current = storage;

  const [phase, setPhase] = useState<RalphPhase>('loading');
  const [config, setConfig] = useState<RalphConfig>({});
  const [status, setStatus] = useState<RalphStatus | null>(null);
  const [logLines, setLogLines] = useState('');
  const [prereqs, setPrereqs] = useState<{
    claude: boolean | null;
    git: boolean | null;
    node: boolean | null;
    jq: boolean | null;
    coreutils: boolean | null;
  }>({ claude: null, git: null, node: null, jq: null, coreutils: null });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ralphPathRef = useRef<string>('ralph');
  const startedAtRef = useRef<number>(0);
  const pidRef = useRef<number>(0);
  const projectPath = project?.path ?? '';

  const detect = useCallback(async () => {
    const sh = shellRef.current;
    const store = storageRef.current;
    if (!projectPath) {
      setPhase('not-installed');
      return;
    }

    // Check if ralph CLI is installed
    const whichResult = await sh.exec('which', ['ralph']);
    if (whichResult.exit_code === 0) {
      ralphPathRef.current = whichResult.stdout.trim();
    } else {
      const localBin = await sh.exec('bash', ['-c', 'test -x "$HOME/.local/bin/ralph" && echo "$HOME/.local/bin/ralph"']);
      if (localBin.exit_code === 0 && localBin.stdout.trim()) {
        ralphPathRef.current = localBin.stdout.trim();
      } else {
        const loopCheck = await sh.exec('bash', ['-c', 'test -x "$HOME/.ralph/ralph_loop.sh"']);
        if (loopCheck.exit_code !== 0) {
          setPhase('not-installed');
          return;
        }
        const homePath = await sh.exec('bash', ['-c', 'echo "$HOME/.local/bin/ralph"']);
        ralphPathRef.current = homePath.stdout.trim();
      }
    }

    // Check if .ralph/ dir exists in the project
    const dirResult = await sh.exec('test', ['-d', `${projectPath}/.ralph`]);
    if (dirResult.exit_code !== 0) {
      setPhase('not-enabled');
      return;
    }

    // Read config + status
    const [rcResult, statusResult] = await Promise.all([
      sh.exec('cat', [`${projectPath}/.ralphrc`]),
      sh.exec('cat', [`${projectPath}/.ralph/status.json`]),
    ]);

    if (rcResult.exit_code === 0) setConfig(parseRalphrc(rcResult.stdout));

    if (statusResult.exit_code === 0) {
      try {
        const parsed = JSON.parse(statusResult.stdout) as RalphStatus;
        setStatus(parsed);
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Use plugin storage as primary source of truth for running state
    let storageData: Record<string, unknown> = {};
    try {
      storageData = await store.read();
    } catch {
      // Storage read failed, fall through to legacy detection
    }

    if (storageData.running === true) {
      // Storage says running — verify the process is actually alive
      const storedPid = typeof storageData.pid === 'number' ? storageData.pid : undefined;
      const alive = await isRalphProcessAlive(sh, storedPid);
      if (alive) {
        pidRef.current = storedPid ?? 0;
        setPhase('running');
        return;
      }
      // Process died while we weren't looking — clear storage
      try {
        await store.write({ ...storageData, running: false });
      } catch {
        // Best effort
      }
    }

    // Fallback: check process as backup (handles ralph started outside plugin)
    const alive = await isRalphProcessAlive(sh);
    if (alive) {
      // Process is running but storage didn't know — update storage
      try {
        await store.write({ ...storageData, running: true });
      } catch {
        // Best effort
      }
      setPhase('running');
      return;
    }

    setPhase('ready');
  }, [projectPath]);

  const checkPrereqs = useCallback(async () => {
    const sh = shellRef.current;
    const [claudeResult, gitResult, nodeResult, jqResult, coreutilsResult] = await Promise.all([
      sh.exec('which', ['claude']),
      sh.exec('which', ['git']),
      sh.exec('which', ['node']),
      sh.exec('which', ['jq']),
      sh.exec('bash', ['-c', 'command -v gtimeout || command -v timeout']),
    ]);
    setPrereqs({
      claude: claudeResult.exit_code === 0,
      git: gitResult.exit_code === 0,
      node: nodeResult.exit_code === 0,
      jq: jqResult.exit_code === 0,
      coreutils: coreutilsResult.exit_code === 0,
    });
  }, []);

  // Initial detection - runs once
  useEffect(() => {
    detect();
  }, [detect]);

  // Check prereqs when on not-installed phase
  useEffect(() => {
    if (phase === 'not-installed') {
      checkPrereqs();
    }
  }, [phase, checkPrereqs]);

  // Poll status + log when running
  useEffect(() => {
    if (phase === 'running' && projectPath) {
      const GRACE_PERIOD_MS = 15_000;

      const poll = async () => {
        const sh = shellRef.current;
        const store = storageRef.current;
        // Read status.json + log tail in parallel
        const [statusRes, logRes] = await Promise.all([
          sh.exec('cat', [`${projectPath}/.ralph/status.json`]),
          sh.exec('bash', ['-c', `tail -40 "${projectPath}/.ralph/output.log" 2>/dev/null`]),
        ]);

        if (logRes.exit_code === 0 && logRes.stdout) {
          setLogLines(logRes.stdout);
        }

        if (statusRes.exit_code === 0) {
          try {
            const parsed = JSON.parse(statusRes.stdout) as RalphStatus;
            setStatus(parsed);
          } catch {
            // Ignore parse errors
          }
        }

        // Skip liveness check during grace period after start
        const elapsed = Date.now() - startedAtRef.current;
        if (elapsed < GRACE_PERIOD_MS) return;

        // Check if process is still alive
        const alive = await isRalphProcessAlive(sh, pidRef.current || undefined);
        if (!alive) {
          // Process died — clear storage and transition to ready
          try {
            const storageData = await store.read();
            await store.write({ ...storageData, running: false });
          } catch {
            // Best effort
          }
          setPhase('ready');
        }
      };
      // Delay first poll 3s, then start interval polling
      const firstPollDelay = setTimeout(() => {
        poll();
        pollRef.current = setInterval(poll, 2000);
      }, 3000);
      return () => {
        clearTimeout(firstPollDelay);
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [phase, projectPath]);

  const install = useCallback(() => {
    const script = [
      'set -e',
      'echo "Checking dependencies..."',
      'if [ "$(uname)" = "Darwin" ] && command -v brew >/dev/null 2>&1; then',
      '  for pkg in jq coreutils; do',
      '    if ! brew list "$pkg" >/dev/null 2>&1; then',
      '      echo "Installing $pkg via Homebrew..."',
      '      brew install "$pkg"',
      '    fi',
      '  done',
      'fi',
      'if [ -d "$HOME/.ralph-repo" ]; then',
      '  cd "$HOME/.ralph-repo" && git pull',
      'else',
      '  git clone https://github.com/frankbria/ralph-claude-code.git "$HOME/.ralph-repo" && cd "$HOME/.ralph-repo"',
      'fi',
      'bash install.sh',
    ].join('\n');
    actionsRef.current.openTerminal('bash', ['-c', script], { title: 'Install Ralph' });
  }, []);

  const enable = useCallback(async (
    goals: string,
    tasks: string,
    rateLimit: number,
    timeout: number,
  ) => {
    if (!projectPath) return;
    const sh = shellRef.current;

    await sh.exec('mkdir', ['-p', `${projectPath}/.ralph`]);

    const rcContent = serializeRalphrc({
      MAX_CALLS_PER_HOUR: String(rateLimit),
      CLAUDE_TIMEOUT_MINUTES: String(timeout),
      ALLOWED_TOOLS: 'Write,Read,Edit,Bash(git *),Bash(npm *),Bash(npx *)',
      SESSION_CONTINUITY: 'true',
      CLAUDE_OUTPUT_FORMAT: 'json',
    });

    // Read default AGENT.md from ralph templates
    const homePath = await sh.exec('bash', ['-c', 'echo "$HOME"']);
    const agentTpl = await sh.exec('cat', [`${homePath.stdout.trim()}/.ralph/templates/AGENT.md`]);
    const agentContent = agentTpl.exit_code === 0 ? agentTpl.stdout : DEFAULT_AGENT_MD;

    const [p1, p2, p3, p4] = await Promise.all([
      writeFile(sh, `${projectPath}/.ralph/PROMPT.md`, goals),
      writeFile(sh, `${projectPath}/.ralph/fix_plan.md`, tasks),
      writeFile(sh, `${projectPath}/.ralph/AGENT.md`, agentContent),
      writeFile(sh, `${projectPath}/.ralphrc`, rcContent),
    ]);

    if (p1 && p2 && p3 && p4) {
      toastRef.current('Ralph enabled', 'success');
      await detect();
    } else {
      toastRef.current('Failed to write config files', 'error');
    }
  }, [projectPath, detect]);

  const startRalph = useCallback(async (form: { goals: string; tasks: string; rateLimit: number; timeout: number }) => {
    const sh = shellRef.current;
    const store = storageRef.current;

    // Ensure .ralph dir exists
    await sh.exec('mkdir', ['-p', `${projectPath}/.ralph`]);

    // Write config files from form data
    const rcContent = serializeRalphrc({
      MAX_CALLS_PER_HOUR: String(form.rateLimit),
      CLAUDE_TIMEOUT_MINUTES: String(form.timeout),
      ALLOWED_TOOLS: 'Write,Read,Edit,Bash(git *),Bash(npm *),Bash(npx *)',
      SESSION_CONTINUITY: 'true',
      CLAUDE_OUTPUT_FORMAT: 'json',
    });

    const homePath = await sh.exec('bash', ['-c', 'echo "$HOME"']);
    const agentTpl = await sh.exec('cat', [`${homePath.stdout.trim()}/.ralph/templates/AGENT.md`]);
    const agentContent = agentTpl.exit_code === 0 ? agentTpl.stdout : DEFAULT_AGENT_MD;

    await Promise.all([
      writeFile(sh, `${projectPath}/.ralph/PROMPT.md`, form.goals),
      writeFile(sh, `${projectPath}/.ralph/fix_plan.md`, form.tasks),
      writeFile(sh, `${projectPath}/.ralph/AGENT.md`, agentContent),
      writeFile(sh, `${projectPath}/.ralphrc`, rcContent),
    ]);

    // Clear stale state files that cause immediate re-halt
    await sh.exec('bash', ['-c',
      `rm -f "${projectPath}/.ralph/.circuit_breaker_state" "${projectPath}/.ralph/.exit_signals" "${projectPath}/.ralph/.response_analysis" "${projectPath}/.ralph/.circuit_breaker_history" "${projectPath}/.ralph/status.json"`
    ]);

    // Start ralph as a fully detached background process.
    // Write PID to file since sh.exec may block on child stdout.
    const logFile = `${projectPath}/.ralph/output.log`;
    const pidFile = `${projectPath}/.ralph/.pid`;
    const launcher = [
      `cd "${projectPath}"`,
      `(exec "${ralphPathRef.current}" --live > "${logFile}" 2>&1) &`,
      `echo $! > "${pidFile}"`,
    ].join('\n');

    await sh.exec('bash', ['-c', launcher], { timeout: 5000 });

    // Read PID from file
    const pidResult = await sh.exec('cat', [pidFile]);
    const pid = parseInt(pidResult.stdout.trim(), 10);
    pidRef.current = (!isNaN(pid) && pid > 0) ? pid : 0;

    try {
      const storageData = await store.read();
      await store.write({ ...storageData, running: true, pid: pidRef.current });
    } catch { /* best effort */ }

    startedAtRef.current = Date.now();
    setLogLines('');
    setPhase('running');
  }, [projectPath]);

  const stopRalph = useCallback(async () => {
    const sh = shellRef.current;
    if (pidRef.current > 0) {
      await sh.exec('kill', ['-INT', String(pidRef.current)]);
    } else {
      await sh.exec('pkill', ['-INT', '-f', 'ralph_loop']);
    }
    pidRef.current = 0;
    // Clear running state from storage
    try {
      const storageData = await storageRef.current.read();
      await storageRef.current.write({ ...storageData, running: false, pid: 0 });
    } catch {
      // Best effort
    }
    toastRef.current('Stop signal sent', 'success');
    setPhase('ready');
  }, []);

  const refresh = useCallback(async () => {
    setPhase('loading');
    await detect();
  }, [detect]);

  return {
    phase,
    config,
    status,
    logLines,
    prereqs,
    install,
    enable,
    startRalph,
    stopRalph,
    refresh,
  };
}
