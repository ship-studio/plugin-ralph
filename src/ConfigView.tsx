import { useState } from 'react';
import { useTheme } from './context';
import type { RalphState } from './types';

export function ConfigView({ ralph }: { ralph: RalphState }) {
  const theme = useTheme();

  const [goals, setGoals] = useState('');
  const [tasks, setTasks] = useState('');
  const [rateLimit, setRateLimit] = useState('100');
  const [timeout, setTimeout] = useState('15');
  const [starting, setStarting] = useState(false);

  const canStart = goals.trim().length > 0;

  const handleStart = async () => {
    setStarting(true);
    await ralph.startRalph({
      goals,
      tasks,
      rateLimit: Number(rateLimit) || 100,
      timeout: Number(timeout) || 15,
    });
    setStarting(false);
  };

  const lastRunSummary = ralph.status && ralph.status.status !== 'running'
    ? `Last run: ${ralph.status.status}${ralph.status.loop_count ? `, ${ralph.status.loop_count} loops` : ''}`
    : null;

  return (
    <div>
      {lastRunSummary && <div className="rw-last-run">{lastRunSummary}</div>}

      <div className="rw-section">
        <label className="rw-label">Goals</label>
        <div className="rw-hint">What should Ralph build or fix?</div>
        <textarea
          className="rw-textarea"
          style={{ borderColor: theme.border }}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Build a responsive landing page with a hero section and contact form"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
        />
      </div>

      <div className="rw-section">
        <label className="rw-label">Tasks</label>
        <div className="rw-hint">Specific steps, one per line.</div>
        <textarea
          className="rw-textarea"
          style={{ borderColor: theme.border }}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={"Create hero component with CTA button\nAdd mobile navigation menu\nWrite unit tests for form validation"}
          value={tasks}
          onChange={(e) => setTasks(e.target.value)}
        />
      </div>

      <div className="rw-input-row" style={{ marginBottom: 0 }}>
        <div className="rw-input-group">
          <label className="rw-label">API calls/hr</label>
          <div className="rw-hint">Max Claude calls per hour.</div>
          <input
            type="number"
            className="rw-input"
            style={{ borderColor: theme.border }}
            value={rateLimit}
            onChange={(e) => setRateLimit(e.target.value)}
            min={1}
          />
        </div>
        <div className="rw-input-group">
          <label className="rw-label">Timeout (min)</label>
          <div className="rw-hint">Per-call time limit.</div>
          <input
            type="number"
            className="rw-input"
            style={{ borderColor: theme.border }}
            value={timeout}
            onChange={(e) => setTimeout(e.target.value)}
            min={1}
          />
        </div>
      </div>

      <div className="rw-actions">
        <button
          className="rw-btn rw-btn--action"
          onClick={handleStart}
          disabled={!canStart || starting}
        >
          {starting ? <><span className="rw-spinner" /> Starting...</> : 'Start Ralph'}
        </button>
      </div>
    </div>
  );
}
