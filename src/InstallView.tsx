import type { RalphState } from './types';
import { useTheme } from './context';

function PrereqIcon({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="rw-prereq-icon" style={{ color: '#888' }}>-</span>;
  if (ok) return <span className="rw-prereq-icon" style={{ color: '#22c55e' }}>&#x2713;</span>;
  return <span className="rw-prereq-icon" style={{ color: '#ef4444' }}>&#x2717;</span>;
}

export function InstallView({ ralph, onClose }: { ralph: RalphState; onClose: () => void }) {
  const theme = useTheme();

  const handleInstall = () => {
    ralph.install();
    onClose(); // Close modal so user can see the terminal
  };

  return (
    <div>
      <p className="rw-description">
        Ralph Wiggum is not installed. Ralph is an autonomous AI development framework
        that runs Claude Code in a loop to iteratively build your projects.
      </p>

      <div className="rw-info-box" style={{
        background: theme.bgSecondary,
        border: `1px solid ${theme.border}`,
      }}>
        <strong style={{ fontSize: 11, opacity: 0.6 }}>PREREQUISITES</strong>
        <div className="rw-prereq-list">
          <div className="rw-prereq-item">
            <PrereqIcon ok={ralph.prereqs.claude} />
            <span>Claude CLI</span>
          </div>
          <div className="rw-prereq-item">
            <PrereqIcon ok={ralph.prereqs.git} />
            <span>Git</span>
          </div>
          <div className="rw-prereq-item">
            <PrereqIcon ok={ralph.prereqs.node} />
            <span>Node.js</span>
          </div>
          <div className="rw-prereq-item">
            <PrereqIcon ok={ralph.prereqs.jq} />
            <span>jq</span>
          </div>
          <div className="rw-prereq-item">
            <PrereqIcon ok={ralph.prereqs.coreutils} />
            <span>coreutils (timeout)</span>
          </div>
        </div>
      </div>

      <div className="rw-actions">
        <button className="rw-btn rw-btn--primary" onClick={handleInstall}>
          Install Ralph
        </button>
        <button
          className="rw-btn rw-btn--secondary rw-btn--small"
          onClick={ralph.refresh}
          style={{ color: theme.textSecondary, borderColor: theme.border }}
        >
          Re-check
        </button>
      </div>
    </div>
  );
}
