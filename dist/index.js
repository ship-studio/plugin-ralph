import { jsx, jsxs, Fragment } from "data:text/javascript,const _R=window.__SHIPSTUDIO_REACT__;function _jsx(t,p,k){if(k!==undefined)p=Object.assign({},p,{key:k});const c=p.children;if(c===undefined)return _R.createElement(t,p);const r=Object.assign({},p);delete r.children;if(Array.isArray(c))return _R.createElement(t,r,...c);return _R.createElement(t,r,c)}export const jsx=_jsx;export const jsxs=_jsx;export const Fragment=_R.Fragment;";
import { useRef, useState, useCallback, useEffect } from "data:text/javascript,export default window.__SHIPSTUDIO_REACT__;export const useState=window.__SHIPSTUDIO_REACT__.useState;export const useEffect=window.__SHIPSTUDIO_REACT__.useEffect;export const useCallback=window.__SHIPSTUDIO_REACT__.useCallback;export const useMemo=window.__SHIPSTUDIO_REACT__.useMemo;export const useRef=window.__SHIPSTUDIO_REACT__.useRef;export const useContext=window.__SHIPSTUDIO_REACT__.useContext;export const createElement=window.__SHIPSTUDIO_REACT__.createElement;export const Fragment=window.__SHIPSTUDIO_REACT__.Fragment;";
const _w = window;
function usePluginContext() {
  const React = _w.__SHIPSTUDIO_REACT__;
  const CtxRef = _w.__SHIPSTUDIO_PLUGIN_CONTEXT_REF__;
  if (CtxRef && (React == null ? void 0 : React.useContext)) {
    const ctx = React.useContext(CtxRef);
    if (ctx) return ctx;
  }
  return null;
}
function useProject() {
  var _a;
  return ((_a = usePluginContext()) == null ? void 0 : _a.project) ?? null;
}
function useShell() {
  var _a;
  return ((_a = usePluginContext()) == null ? void 0 : _a.shell) ?? null;
}
function useToast() {
  var _a;
  return ((_a = usePluginContext()) == null ? void 0 : _a.actions.showToast) ?? null;
}
function usePluginStorage() {
  var _a;
  return ((_a = usePluginContext()) == null ? void 0 : _a.storage) ?? null;
}
function useAppActions() {
  var _a;
  return ((_a = usePluginContext()) == null ? void 0 : _a.actions) ?? null;
}
function useTheme() {
  var _a;
  return ((_a = usePluginContext()) == null ? void 0 : _a.theme) ?? null;
}
function parseRalphrc(raw) {
  const config = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    config[key] = value;
  }
  return config;
}
function serializeRalphrc(config) {
  const lines = [];
  for (const [key, value] of Object.entries(config)) {
    if (value === void 0) continue;
    if (/\s/.test(value) || value.includes("#")) {
      lines.push(`${key}="${value}"`);
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  return lines.join("\n") + "\n";
}
async function writeFile(shell, filePath, content) {
  const encoded = btoa(
    new TextEncoder().encode(content).reduce((s, b) => s + String.fromCharCode(b), "")
  );
  const result = await shell.exec("node", [
    "-e",
    'require("fs").writeFileSync(process.argv[1], Buffer.from(process.argv[2], "base64"))',
    filePath,
    encoded
  ]);
  return result.exit_code === 0;
}
async function isRalphProcessAlive(sh, pid) {
  if (pid && pid > 0) {
    const result2 = await sh.exec("kill", ["-0", String(pid)]);
    return result2.exit_code === 0;
  }
  const result = await sh.exec("bash", ["-c", 'ps aux | grep -E "ralph_loop|ralph.*--live" | grep -v grep | head -1']);
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
function useRalph() {
  const shell = useShell();
  const project = useProject();
  const showToast = useToast();
  const actions = useAppActions();
  const storage = usePluginStorage();
  const contextReady = !!(shell && actions && storage);
  const shellRef = useRef(shell);
  shellRef.current = shell;
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const toastRef = useRef(showToast);
  toastRef.current = showToast;
  const storageRef = useRef(storage);
  storageRef.current = storage;
  const [phase, setPhase] = useState("loading");
  const [config, setConfig] = useState({});
  const [status, setStatus] = useState(null);
  const [logLines, setLogLines] = useState("");
  const [prereqs, setPrereqs] = useState({ claude: null, git: null, node: null, jq: null, coreutils: null });
  const pollRef = useRef(null);
  const ralphPathRef = useRef("ralph");
  const startedAtRef = useRef(0);
  const pidRef = useRef(0);
  const projectPath = (project == null ? void 0 : project.path) ?? "";
  const detect = useCallback(async () => {
    const sh = shellRef.current;
    const store = storageRef.current;
    if (!sh || !store || !projectPath) {
      setPhase("not-installed");
      return;
    }
    const claudeCheck = await sh.exec("which", ["claude"]);
    if (claudeCheck.exit_code !== 0) {
      setPhase("no-claude");
      return;
    }
    const whichResult = await sh.exec("which", ["ralph"]);
    if (whichResult.exit_code === 0) {
      ralphPathRef.current = whichResult.stdout.trim();
    } else {
      const localBin = await sh.exec("bash", ["-c", 'test -x "$HOME/.local/bin/ralph" && echo "$HOME/.local/bin/ralph"']);
      if (localBin.exit_code === 0 && localBin.stdout.trim()) {
        ralphPathRef.current = localBin.stdout.trim();
      } else {
        const loopCheck = await sh.exec("bash", ["-c", 'test -x "$HOME/.ralph/ralph_loop.sh"']);
        if (loopCheck.exit_code !== 0) {
          setPhase("not-installed");
          return;
        }
        const homePath = await sh.exec("bash", ["-c", 'echo "$HOME/.local/bin/ralph"']);
        ralphPathRef.current = homePath.stdout.trim();
      }
    }
    const dirResult = await sh.exec("test", ["-d", `${projectPath}/.ralph`]);
    if (dirResult.exit_code !== 0) {
      setPhase("not-enabled");
      return;
    }
    const [rcResult, statusResult] = await Promise.all([
      sh.exec("cat", [`${projectPath}/.ralphrc`]),
      sh.exec("cat", [`${projectPath}/.ralph/status.json`])
    ]);
    if (rcResult.exit_code === 0) setConfig(parseRalphrc(rcResult.stdout));
    if (statusResult.exit_code === 0) {
      try {
        const parsed = JSON.parse(statusResult.stdout);
        setStatus(parsed);
      } catch {
      }
    }
    let storageData = {};
    try {
      storageData = await store.read();
    } catch {
    }
    if (storageData.running === true) {
      const storedPid = typeof storageData.pid === "number" ? storageData.pid : void 0;
      const alive2 = await isRalphProcessAlive(sh, storedPid);
      if (alive2) {
        pidRef.current = storedPid ?? 0;
        setPhase("running");
        return;
      }
      try {
        await store.write({ ...storageData, running: false });
      } catch {
      }
    }
    const alive = await isRalphProcessAlive(sh);
    if (alive) {
      try {
        await store.write({ ...storageData, running: true });
      } catch {
      }
      setPhase("running");
      return;
    }
    setPhase("ready");
  }, [projectPath, contextReady]);
  const checkPrereqs = useCallback(async () => {
    const sh = shellRef.current;
    if (!sh) return;
    const [claudeResult, gitResult, nodeResult, jqResult, coreutilsResult] = await Promise.all([
      sh.exec("which", ["claude"]),
      sh.exec("which", ["git"]),
      sh.exec("which", ["node"]),
      sh.exec("which", ["jq"]),
      sh.exec("bash", ["-c", "command -v gtimeout || command -v timeout"])
    ]);
    setPrereqs({
      claude: claudeResult.exit_code === 0,
      git: gitResult.exit_code === 0,
      node: nodeResult.exit_code === 0,
      jq: jqResult.exit_code === 0,
      coreutils: coreutilsResult.exit_code === 0
    });
  }, []);
  useEffect(() => {
    if (contextReady) detect();
  }, [detect, contextReady]);
  useEffect(() => {
    if (phase === "not-installed") {
      checkPrereqs();
    }
  }, [phase, checkPrereqs]);
  useEffect(() => {
    if (phase === "running" && projectPath) {
      const GRACE_PERIOD_MS = 15e3;
      const poll = async () => {
        const sh = shellRef.current;
        const store = storageRef.current;
        const [statusRes, logRes] = await Promise.all([
          sh.exec("cat", [`${projectPath}/.ralph/status.json`]),
          sh.exec("bash", ["-c", `tail -40 "${projectPath}/.ralph/output.log" 2>/dev/null`])
        ]);
        if (logRes.exit_code === 0 && logRes.stdout) {
          setLogLines(logRes.stdout);
        }
        if (statusRes.exit_code === 0) {
          try {
            const parsed = JSON.parse(statusRes.stdout);
            setStatus(parsed);
          } catch {
          }
        }
        const elapsed = Date.now() - startedAtRef.current;
        if (elapsed < GRACE_PERIOD_MS) return;
        const alive = await isRalphProcessAlive(sh, pidRef.current || void 0);
        if (!alive) {
          try {
            const storageData = await store.read();
            await store.write({ ...storageData, running: false });
          } catch {
          }
          setPhase("ready");
        }
      };
      const firstPollDelay = setTimeout(() => {
        poll();
        pollRef.current = setInterval(poll, 2e3);
      }, 3e3);
      return () => {
        clearTimeout(firstPollDelay);
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [phase, projectPath]);
  const install = useCallback(() => {
    if (!actionsRef.current) return;
    const script = [
      "set -e",
      'echo "Checking dependencies..."',
      'if [ "$(uname)" = "Darwin" ] && command -v brew >/dev/null 2>&1; then',
      "  for pkg in jq coreutils; do",
      '    if ! brew list "$pkg" >/dev/null 2>&1; then',
      '      echo "Installing $pkg via Homebrew..."',
      '      brew install "$pkg"',
      "    fi",
      "  done",
      "fi",
      'if [ -d "$HOME/.ralph-repo" ]; then',
      '  cd "$HOME/.ralph-repo" && git pull',
      "else",
      '  git clone https://github.com/frankbria/ralph-claude-code.git "$HOME/.ralph-repo" && cd "$HOME/.ralph-repo"',
      "fi",
      "bash install.sh"
    ].join("\n");
    actionsRef.current.openTerminal("bash", ["-c", script], { title: "Install Ralph" });
  }, []);
  const enable = useCallback(async (goals, tasks, rateLimit, timeout) => {
    var _a, _b;
    if (!projectPath) return;
    const sh = shellRef.current;
    if (!sh) return;
    await sh.exec("mkdir", ["-p", `${projectPath}/.ralph`]);
    const rcContent = serializeRalphrc({
      MAX_CALLS_PER_HOUR: String(rateLimit),
      CLAUDE_TIMEOUT_MINUTES: String(timeout),
      ALLOWED_TOOLS: "Write,Read,Edit,Bash(git *),Bash(npm *),Bash(npx *)",
      SESSION_CONTINUITY: "true",
      CLAUDE_OUTPUT_FORMAT: "json"
    });
    const homePath = await sh.exec("bash", ["-c", 'echo "$HOME"']);
    const agentTpl = await sh.exec("cat", [`${homePath.stdout.trim()}/.ralph/templates/AGENT.md`]);
    const agentContent = agentTpl.exit_code === 0 ? agentTpl.stdout : DEFAULT_AGENT_MD;
    const [p1, p2, p3, p4] = await Promise.all([
      writeFile(sh, `${projectPath}/.ralph/PROMPT.md`, goals),
      writeFile(sh, `${projectPath}/.ralph/fix_plan.md`, tasks),
      writeFile(sh, `${projectPath}/.ralph/AGENT.md`, agentContent),
      writeFile(sh, `${projectPath}/.ralphrc`, rcContent)
    ]);
    if (p1 && p2 && p3 && p4) {
      (_a = toastRef.current) == null ? void 0 : _a.call(toastRef, "Ralph enabled", "success");
      await detect();
    } else {
      (_b = toastRef.current) == null ? void 0 : _b.call(toastRef, "Failed to write config files", "error");
    }
  }, [projectPath, detect]);
  const startRalph = useCallback(async (form) => {
    const sh = shellRef.current;
    const store = storageRef.current;
    if (!sh || !store) return;
    await sh.exec("mkdir", ["-p", `${projectPath}/.ralph`]);
    const rcContent = serializeRalphrc({
      MAX_CALLS_PER_HOUR: String(form.rateLimit),
      CLAUDE_TIMEOUT_MINUTES: String(form.timeout),
      ALLOWED_TOOLS: "Write,Read,Edit,Bash(git *),Bash(npm *),Bash(npx *)",
      SESSION_CONTINUITY: "true",
      CLAUDE_OUTPUT_FORMAT: "json"
    });
    const homePath = await sh.exec("bash", ["-c", 'echo "$HOME"']);
    const agentTpl = await sh.exec("cat", [`${homePath.stdout.trim()}/.ralph/templates/AGENT.md`]);
    const agentContent = agentTpl.exit_code === 0 ? agentTpl.stdout : DEFAULT_AGENT_MD;
    await Promise.all([
      writeFile(sh, `${projectPath}/.ralph/PROMPT.md`, form.goals),
      writeFile(sh, `${projectPath}/.ralph/fix_plan.md`, form.tasks),
      writeFile(sh, `${projectPath}/.ralph/AGENT.md`, agentContent),
      writeFile(sh, `${projectPath}/.ralphrc`, rcContent)
    ]);
    await sh.exec("bash", [
      "-c",
      `rm -f "${projectPath}/.ralph/.circuit_breaker_state" "${projectPath}/.ralph/.exit_signals" "${projectPath}/.ralph/.response_analysis" "${projectPath}/.ralph/.circuit_breaker_history" "${projectPath}/.ralph/status.json"`
    ]);
    const logFile = `${projectPath}/.ralph/output.log`;
    const pidFile = `${projectPath}/.ralph/.pid`;
    const launcher = [
      `cd "${projectPath}"`,
      `nohup "${ralphPathRef.current}" --live > "${logFile}" 2>&1 &`,
      `echo $! > "${pidFile}"`,
      `disown`
    ].join("\n");
    await sh.exec("bash", ["-c", launcher], { timeout: 5e3 });
    const pidResult = await sh.exec("cat", [pidFile]);
    const pid = parseInt(pidResult.stdout.trim(), 10);
    pidRef.current = !isNaN(pid) && pid > 0 ? pid : 0;
    try {
      const storageData = await store.read();
      await store.write({ ...storageData, running: true, pid: pidRef.current });
    } catch {
    }
    startedAtRef.current = Date.now();
    setLogLines("");
    setPhase("running");
  }, [projectPath]);
  const stopRalph = useCallback(async () => {
    var _a;
    const sh = shellRef.current;
    if (!sh) return;
    if (pidRef.current > 0) {
      await sh.exec("kill", ["-TERM", String(pidRef.current)]);
      await sh.exec("bash", ["-c", `kill -TERM -${pidRef.current} 2>/dev/null; true`]);
    }
    await sh.exec("bash", ["-c", 'pkill -TERM -f "ralph.*--live" 2>/dev/null; pkill -TERM -f "ralph_loop" 2>/dev/null; true']);
    pidRef.current = 0;
    try {
      const storageData = await storageRef.current.read();
      await storageRef.current.write({ ...storageData, running: false, pid: 0 });
    } catch {
    }
    (_a = toastRef.current) == null ? void 0 : _a.call(toastRef, "Ralph stopped", "success");
    setPhase("ready");
  }, []);
  const refresh = useCallback(async () => {
    setPhase("loading");
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
    refresh
  };
}
function Modal({
  onClose,
  title,
  children,
  wide
}) {
  const theme = useTheme();
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return /* @__PURE__ */ jsx("div", { className: "rw-overlay", onClick: onClose, children: /* @__PURE__ */ jsxs(
    "div",
    {
      className: `rw-modal${wide ? " rw-modal--running" : ""}`,
      style: {
        background: theme.bgPrimary,
        color: theme.textPrimary,
        border: `1px solid ${theme.border}`
      },
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: "rw-modal-header",
            style: { borderBottom: `1px solid ${theme.border}` },
            children: [
              /* @__PURE__ */ jsx("span", { style: { display: "flex", alignItems: "center", gap: 8 }, children: title }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  className: "rw-close-btn",
                  onClick: onClose,
                  style: { color: theme.textMuted },
                  children: "✕"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "rw-modal-body", children })
      ]
    }
  ) });
}
function PrereqIcon({ ok }) {
  if (ok === null) return /* @__PURE__ */ jsx("span", { className: "rw-prereq-icon", style: { color: "#888" }, children: "-" });
  if (ok) return /* @__PURE__ */ jsx("span", { className: "rw-prereq-icon", style: { color: "#22c55e" }, children: "✓" });
  return /* @__PURE__ */ jsx("span", { className: "rw-prereq-icon", style: { color: "#ef4444" }, children: "✗" });
}
function InstallView({ ralph, onClose }) {
  const theme = useTheme();
  const handleInstall = () => {
    ralph.install();
    onClose();
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("p", { className: "rw-description", children: "Ralph Wiggum is not installed. Ralph is an autonomous AI development framework that runs Claude Code in a loop to iteratively build your projects." }),
    /* @__PURE__ */ jsxs("div", { className: "rw-info-box", style: {
      background: theme.bgSecondary,
      border: `1px solid ${theme.border}`
    }, children: [
      /* @__PURE__ */ jsx("strong", { style: { fontSize: 11, opacity: 0.6 }, children: "PREREQUISITES" }),
      /* @__PURE__ */ jsxs("div", { className: "rw-prereq-list", children: [
        /* @__PURE__ */ jsxs("div", { className: "rw-prereq-item", children: [
          /* @__PURE__ */ jsx(PrereqIcon, { ok: ralph.prereqs.claude }),
          /* @__PURE__ */ jsx("span", { children: "Claude CLI" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rw-prereq-item", children: [
          /* @__PURE__ */ jsx(PrereqIcon, { ok: ralph.prereqs.git }),
          /* @__PURE__ */ jsx("span", { children: "Git" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rw-prereq-item", children: [
          /* @__PURE__ */ jsx(PrereqIcon, { ok: ralph.prereqs.node }),
          /* @__PURE__ */ jsx("span", { children: "Node.js" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rw-prereq-item", children: [
          /* @__PURE__ */ jsx(PrereqIcon, { ok: ralph.prereqs.jq }),
          /* @__PURE__ */ jsx("span", { children: "jq" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rw-prereq-item", children: [
          /* @__PURE__ */ jsx(PrereqIcon, { ok: ralph.prereqs.coreutils }),
          /* @__PURE__ */ jsx("span", { children: "coreutils (timeout)" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rw-actions", children: [
      /* @__PURE__ */ jsx("button", { className: "rw-btn rw-btn--primary", onClick: handleInstall, children: "Install Ralph" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "rw-btn rw-btn--secondary rw-btn--small",
          onClick: ralph.refresh,
          style: { color: theme.textSecondary, borderColor: theme.border },
          children: "Re-check"
        }
      )
    ] })
  ] });
}
function SetupView({ ralph }) {
  const theme = useTheme();
  const project = useProject();
  const [goals, setGoals] = useState("");
  const [tasks, setTasks] = useState("");
  const [rateLimit, setRateLimit] = useState(100);
  const [timeout, setTimeout2] = useState(15);
  const [enabling, setEnabling] = useState(false);
  const handleEnable = async () => {
    setEnabling(true);
    try {
      await ralph.enable(goals, tasks, rateLimit, timeout);
    } finally {
      setEnabling(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("p", { className: "rw-description", children: [
      "Enable Ralph for ",
      /* @__PURE__ */ jsx("strong", { children: (project == null ? void 0 : project.name) ?? "this project" }),
      ". Configure your project goals and tasks to get started."
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rw-section", children: [
      /* @__PURE__ */ jsx("label", { className: "rw-label", children: "Project Goals" }),
      /* @__PURE__ */ jsx(
        "textarea",
        {
          className: "rw-textarea",
          style: { borderColor: theme.border },
          autoCorrect: "off",
          autoCapitalize: "off",
          spellCheck: false,
          placeholder: "Describe what you want Ralph to build or improve...",
          value: goals,
          onChange: (e) => setGoals(e.target.value)
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rw-section", children: [
      /* @__PURE__ */ jsx("label", { className: "rw-label", children: "Tasks" }),
      /* @__PURE__ */ jsx(
        "textarea",
        {
          className: "rw-textarea",
          style: { borderColor: theme.border },
          autoCorrect: "off",
          autoCapitalize: "off",
          spellCheck: false,
          placeholder: "List specific tasks, one per line...",
          value: tasks,
          onChange: (e) => setTasks(e.target.value)
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rw-input-row", children: [
      /* @__PURE__ */ jsxs("div", { className: "rw-input-group", children: [
        /* @__PURE__ */ jsx("label", { className: "rw-label", children: "Max API calls/hour" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            className: "rw-input",
            style: { borderColor: theme.border },
            value: rateLimit,
            onChange: (e) => setRateLimit(Number(e.target.value)),
            min: 1
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rw-input-group", children: [
        /* @__PURE__ */ jsx("label", { className: "rw-label", children: "Timeout (minutes)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            className: "rw-input",
            style: { borderColor: theme.border },
            value: timeout,
            onChange: (e) => setTimeout2(Number(e.target.value)),
            min: 1
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "rw-actions", children: /* @__PURE__ */ jsx(
      "button",
      {
        className: "rw-btn rw-btn--primary",
        onClick: handleEnable,
        disabled: enabling,
        children: enabling ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { className: "rw-spinner" }),
          " Enabling..."
        ] }) : "Enable Ralph"
      }
    ) })
  ] });
}
function ConfigView({ ralph }) {
  const theme = useTheme();
  const [goals, setGoals] = useState("");
  const [tasks, setTasks] = useState("");
  const [rateLimit, setRateLimit] = useState("100");
  const [timeout, setTimeout2] = useState("15");
  const [starting, setStarting] = useState(false);
  const canStart = goals.trim().length > 0;
  const handleStart = async () => {
    setStarting(true);
    await ralph.startRalph({
      goals,
      tasks,
      rateLimit: Number(rateLimit) || 100,
      timeout: Number(timeout) || 15
    });
    setStarting(false);
  };
  const lastRunSummary = ralph.status && ralph.status.status !== "running" ? `Last run: ${ralph.status.status}${ralph.status.loop_count ? `, ${ralph.status.loop_count} loops` : ""}` : null;
  return /* @__PURE__ */ jsxs("div", { children: [
    lastRunSummary && /* @__PURE__ */ jsx("div", { className: "rw-last-run", children: lastRunSummary }),
    /* @__PURE__ */ jsxs("div", { className: "rw-section", children: [
      /* @__PURE__ */ jsx("label", { className: "rw-label", children: "Goals" }),
      /* @__PURE__ */ jsx("div", { className: "rw-hint", children: "What should Ralph build or fix?" }),
      /* @__PURE__ */ jsx(
        "textarea",
        {
          className: "rw-textarea",
          style: { borderColor: theme.border },
          autoCorrect: "off",
          autoCapitalize: "off",
          spellCheck: false,
          placeholder: "Build a responsive landing page with a hero section and contact form",
          value: goals,
          onChange: (e) => setGoals(e.target.value)
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rw-section", children: [
      /* @__PURE__ */ jsx("label", { className: "rw-label", children: "Tasks" }),
      /* @__PURE__ */ jsx("div", { className: "rw-hint", children: "Specific steps, one per line." }),
      /* @__PURE__ */ jsx(
        "textarea",
        {
          className: "rw-textarea",
          style: { borderColor: theme.border },
          autoCorrect: "off",
          autoCapitalize: "off",
          spellCheck: false,
          placeholder: "Create hero component with CTA button\nAdd mobile navigation menu\nWrite unit tests for form validation",
          value: tasks,
          onChange: (e) => setTasks(e.target.value)
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rw-input-row", style: { marginBottom: 0 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "rw-input-group", children: [
        /* @__PURE__ */ jsx("label", { className: "rw-label", children: "API calls/hr" }),
        /* @__PURE__ */ jsx("div", { className: "rw-hint", children: "Max Claude calls per hour." }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            className: "rw-input",
            style: { borderColor: theme.border },
            value: rateLimit,
            onChange: (e) => setRateLimit(e.target.value),
            min: 1
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rw-input-group", children: [
        /* @__PURE__ */ jsx("label", { className: "rw-label", children: "Timeout (min)" }),
        /* @__PURE__ */ jsx("div", { className: "rw-hint", children: "Per-call time limit." }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            className: "rw-input",
            style: { borderColor: theme.border },
            value: timeout,
            onChange: (e) => setTimeout2(e.target.value),
            min: 1
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "rw-actions", children: /* @__PURE__ */ jsx(
      "button",
      {
        className: "rw-btn rw-btn--action",
        onClick: handleStart,
        disabled: !canStart || starting,
        children: starting ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("span", { className: "rw-spinner" }),
          " Starting..."
        ] }) : "Start Ralph"
      }
    ) })
  ] });
}
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}
function StatusView({ ralph, onClose }) {
  var _a, _b, _c;
  const theme = useTheme();
  const logRef = useRef(null);
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [ralph.logLines]);
  const loopCount = ((_a = ralph.status) == null ? void 0 : _a.loop_count) ?? 0;
  const apiUsed = ((_b = ralph.status) == null ? void 0 : _b.calls_made_this_hour) ?? 0;
  const maxApi = ((_c = ralph.status) == null ? void 0 : _c.max_calls_per_hour) ?? Number(ralph.config.MAX_CALLS_PER_HOUR ?? "100");
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10
    }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
      /* @__PURE__ */ jsx("span", { className: "rw-status-dot-inline" }),
      /* @__PURE__ */ jsx("span", { style: { fontWeight: 600, fontSize: 13 }, children: "Running" }),
      /* @__PURE__ */ jsxs("span", { style: { opacity: 0.4, fontSize: 11 }, children: [
        "Loop ",
        loopCount,
        " · ",
        apiUsed,
        "/",
        maxApi,
        " calls"
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(
      "pre",
      {
        ref: logRef,
        className: "rw-log-viewer",
        style: {
          background: "#0d1117",
          border: `1px solid ${theme.border}`
        },
        children: ralph.logLines ? stripAnsi(ralph.logLines) : "Waiting for output..."
      }
    ),
    /* @__PURE__ */ jsx("div", { style: { fontSize: 11, opacity: 0.4, textAlign: "center", marginTop: 10 }, children: "Ralph runs in the background — you can close this window." }),
    /* @__PURE__ */ jsx("div", { className: "rw-actions-row", style: { marginTop: 8 }, children: /* @__PURE__ */ jsx(
      "button",
      {
        className: "rw-btn rw-btn--danger",
        style: { flex: 1 },
        onClick: ralph.stopRalph,
        children: "Stop"
      }
    ) })
  ] });
}
const RW_STYLE_ID = "rw-plugin-styles";
const RALPH_CSS = `
@keyframes rwPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes rwSpin {
  to { transform: rotate(360deg); }
}

@keyframes rwFadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes rwDotPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}

/* Toolbar button disabled state */
.rw-toolbar-disabled {
  opacity: 0.3 !important;
}

/* Toolbar button running state */
.rw-toolbar-running {
  background: rgba(59, 130, 246, 0.25) !important;
  color: #60a5fa !important;
  animation: rwToolbarPulse 2s ease-in-out infinite;
}

.rw-toolbar-running svg {
  animation: rwSpin 2s linear infinite;
}

@keyframes rwToolbarPulse {
  0%, 100% { background: rgba(59, 130, 246, 0.2); }
  50% { background: rgba(59, 130, 246, 0.35); }
}

/* Modal overlay */
.rw-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: rwFadeIn 0.15s ease-out;
}

.rw-modal {
  width: 440px;
  max-height: 80vh;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: rwFadeIn 0.2s ease-out;
}

.rw-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 600;
}

.rw-close-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  opacity: 0.4;
  line-height: 1;
  border-radius: 4px;
}

.rw-close-btn:hover {
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.06);
}

.rw-modal-body {
  padding: 14px 16px 16px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.5;
}

/* Prereq checks */
.rw-prereq-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 12px 0;
}

.rw-prereq-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.rw-prereq-icon {
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

/* Buttons */
.rw-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  transition: filter 0.12s, opacity 0.12s;
  width: 100%;
}

.rw-btn:hover {
  filter: brightness(0.9);
}

.rw-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rw-btn--primary {
  background: #6C5CE7;
  color: #fff;
}

.rw-btn--action {
  background: #3b82f6;
  color: #fff;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
}

.rw-btn--action:hover {
  background: #2563eb;
}

.rw-btn--danger {
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.rw-btn--secondary {
  background: transparent;
  border: 1px solid;
  color: inherit;
}

.rw-btn--small {
  padding: 5px 10px;
  font-size: 11px;
  width: auto;
}

/* Spinner */
.rw-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: rwSpin 0.6s linear infinite;
}

/* Form elements */
.rw-section {
  margin-bottom: 14px;
}

.rw-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
  margin-bottom: 6px;
}

.rw-hint {
  font-size: 11px;
  opacity: 0.4;
  margin-top: -3px;
  margin-bottom: 8px;
}

.rw-textarea {
  width: 100%;
  min-height: 80px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid;
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
}

.rw-textarea::placeholder,
.rw-input::placeholder {
  color: rgba(255, 255, 255, 0.15);
}

.rw-textarea::-webkit-scrollbar {
  display: none;
}

.rw-textarea {
  scrollbar-width: none;
}

.rw-textarea:focus {
  outline: none;
  border-color: var(--accent, #6C5CE7);
}

.rw-input {
  width: 100%;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid;
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-family: inherit;
  box-sizing: border-box;
  color-scheme: dark;
}

.rw-input:focus {
  outline: none;
  border-color: var(--accent, #6C5CE7);
}

.rw-input-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.rw-input-group {
  flex: 1;
}

/* Status view */
.rw-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 14px;
  font-size: 12px;
  font-weight: 500;
}

.rw-status-dot-inline {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #3b82f6;
  animation: rwDotPulse 1.5s ease-in-out infinite;
}

.rw-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 14px;
  font-size: 12px;
}

.rw-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rw-stat-value {
  font-size: 18px;
  font-weight: 600;
}

.rw-stat-label {
  opacity: 0.5;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.rw-progress-bar {
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 14px;
}

.rw-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.rw-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.rw-actions-row {
  display: flex;
  gap: 8px;
}

/* Info box */
.rw-info-box {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  margin-bottom: 12px;
}

/* Section with save button */
.rw-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.rw-last-run {
  font-size: 11px;
  opacity: 0.5;
  margin-bottom: 14px;
}

/* Description text */
.rw-description {
  font-size: 12px;
  line-height: 1.6;
  opacity: 0.7;
  margin-bottom: 14px;
}

/* Log viewer */
.rw-log-viewer {
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: #c9d1d9;
  padding: 10px 12px;
  border-radius: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: 340px;
  min-height: 180px;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

/* Wider modal when running */
.rw-modal--running {
  width: 560px;
  max-height: 85vh;
}

`;
function useInjectStyles() {
  useEffect(() => {
    if (document.getElementById(RW_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = RW_STYLE_ID;
    style.textContent = RALPH_CSS;
    document.head.appendChild(style);
    return () => {
      var _a;
      (_a = document.getElementById(RW_STYLE_ID)) == null ? void 0 : _a.remove();
    };
  }, []);
}
function statusTitle(phase) {
  switch (phase) {
    case "loading":
      return "Ralph: Checking...";
    case "no-claude":
      return "Ralph: Claude Code required";
    case "not-installed":
      return "Ralph: Not installed";
    case "not-enabled":
      return "Ralph: Click to set up";
    case "ready":
      return "Ralph: Ready";
    case "running":
      return "Ralph: Running";
  }
}
function modalTitle(phase) {
  switch (phase) {
    case "loading":
      return "Ralph Wiggum";
    case "no-claude":
      return "Ralph Wiggum";
    case "not-installed":
      return "Install Ralph";
    case "not-enabled":
      return "Set Up Ralph";
    case "ready":
      return "Ralph Wiggum";
    case "running":
      return "Ralph Wiggum — Running";
  }
}
function RalphToolbar() {
  useInjectStyles();
  const ralph = useRalph();
  const [showModal, setShowModal] = useState(false);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        className: `toolbar-icon-btn${ralph.phase === "running" ? " rw-toolbar-running" : ralph.phase === "no-claude" ? " rw-toolbar-disabled" : ""}`,
        title: statusTitle(ralph.phase),
        onClick: () => setShowModal(true),
        style: { position: "relative" },
        children: /* @__PURE__ */ jsxs("svg", { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ jsx("path", { d: "M12 2a10 10 0 0 1 7.07 2.93" }),
          /* @__PURE__ */ jsx("path", { d: "M19.07 4.93l-2.83-.35.35-2.83" }),
          /* @__PURE__ */ jsx("path", { d: "M22 12a10 10 0 0 1-2.93 7.07" }),
          /* @__PURE__ */ jsx("path", { d: "M19.07 19.07l.35-2.83 2.83.35" }),
          /* @__PURE__ */ jsx("path", { d: "M12 22a10 10 0 0 1-7.07-2.93" }),
          /* @__PURE__ */ jsx("path", { d: "M4.93 19.07l2.83.35-.35 2.83" }),
          /* @__PURE__ */ jsx("path", { d: "M2 12A10 10 0 0 1 4.93 4.93" }),
          /* @__PURE__ */ jsx("path", { d: "M4.93 4.93l-.35 2.83-2.83-.35" })
        ] })
      }
    ),
    showModal && /* @__PURE__ */ jsxs(Modal, { onClose: () => setShowModal(false), title: modalTitle(ralph.phase), wide: ralph.phase === "running", children: [
      ralph.phase === "loading" && /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: 20 }, children: /* @__PURE__ */ jsx("span", { className: "rw-spinner", style: { width: 20, height: 20 } }) }),
      ralph.phase === "no-claude" && /* @__PURE__ */ jsxs("div", { style: { padding: "8px 0", fontSize: 13, lineHeight: 1.6, opacity: 0.7 }, children: [
        "You must have ",
        /* @__PURE__ */ jsx("strong", { children: "Claude Code" }),
        " installed to use the Ralph Wiggum plugin."
      ] }),
      ralph.phase === "not-installed" && /* @__PURE__ */ jsx(InstallView, { ralph, onClose: () => setShowModal(false) }),
      ralph.phase === "not-enabled" && /* @__PURE__ */ jsx(SetupView, { ralph }),
      ralph.phase === "ready" && /* @__PURE__ */ jsx(ConfigView, { ralph }),
      ralph.phase === "running" && /* @__PURE__ */ jsx(StatusView, { ralph, onClose: () => setShowModal(false) })
    ] })
  ] });
}
const name = "Ralph Wiggum";
const slots = {
  toolbar: RalphToolbar
};
function onActivate() {
  console.log("[ralph] Plugin activated");
}
function onDeactivate() {
  console.log("[ralph] Plugin deactivated");
  const styleEl = document.getElementById(RW_STYLE_ID);
  if (styleEl) styleEl.remove();
}
export {
  name,
  onActivate,
  onDeactivate,
  slots
};
