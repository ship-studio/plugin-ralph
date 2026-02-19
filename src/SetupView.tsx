import { useState } from 'react';
import { useTheme, useProject } from './context';
import type { RalphState } from './types';

export function SetupView({ ralph }: { ralph: RalphState }) {
  const theme = useTheme();
  const project = useProject();
  const [goals, setGoals] = useState('');
  const [tasks, setTasks] = useState('');
  const [rateLimit, setRateLimit] = useState(100);
  const [timeout, setTimeout] = useState(15);
  const [enabling, setEnabling] = useState(false);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      await ralph.enable(goals, tasks, rateLimit, timeout);
    } finally {
      setEnabling(false);
    }
  };

  return (
    <div>
      <p className="rw-description">
        Enable Ralph for <strong>{project?.name ?? 'this project'}</strong>.
        Configure your project goals and tasks to get started.
      </p>

      <div className="rw-section">
        <label className="rw-label">Project Goals</label>
        <textarea
          className="rw-textarea"
          style={{ borderColor: theme.border }}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Describe what you want Ralph to build or improve..."
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
        />
      </div>

      <div className="rw-section">
        <label className="rw-label">Tasks</label>
        <textarea
          className="rw-textarea"
          style={{ borderColor: theme.border }}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="List specific tasks, one per line..."
          value={tasks}
          onChange={(e) => setTasks(e.target.value)}
        />
      </div>

      <div className="rw-input-row">
        <div className="rw-input-group">
          <label className="rw-label">Max API calls/hour</label>
          <input
            type="number"
            className="rw-input"
            style={{ borderColor: theme.border }}
            value={rateLimit}
            onChange={(e) => setRateLimit(Number(e.target.value))}
            min={1}
          />
        </div>
        <div className="rw-input-group">
          <label className="rw-label">Timeout (minutes)</label>
          <input
            type="number"
            className="rw-input"
            style={{ borderColor: theme.border }}
            value={timeout}
            onChange={(e) => setTimeout(Number(e.target.value))}
            min={1}
          />
        </div>
      </div>

      <div className="rw-actions">
        <button
          className="rw-btn rw-btn--primary"
          onClick={handleEnable}
          disabled={enabling}
        >
          {enabling ? <><span className="rw-spinner" /> Enabling...</> : 'Enable Ralph'}
        </button>
      </div>
    </div>
  );
}
