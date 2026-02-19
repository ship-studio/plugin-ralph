import { useEffect, useRef } from 'react';
import { useTheme } from './context';
import type { RalphState } from './types';

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function StatusView({ ralph, onClose }: { ralph: RalphState; onClose: () => void }) {
  const theme = useTheme();
  const logRef = useRef<HTMLPreElement>(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [ralph.logLines]);

  const loopCount = ralph.status?.loop_count ?? 0;
  const apiUsed = ralph.status?.calls_made_this_hour ?? 0;
  const maxApi = ralph.status?.max_calls_per_hour ?? Number(ralph.config.MAX_CALLS_PER_HOUR ?? '100');

  return (
    <div>
      {/* Compact status row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="rw-status-dot-inline" />
          <span style={{ fontWeight: 600, fontSize: 13 }}>Running</span>
          <span style={{ opacity: 0.4, fontSize: 11 }}>
            Loop {loopCount} &middot; {apiUsed}/{maxApi} calls
          </span>
        </div>
      </div>

      {/* Log viewer */}
      <pre
        ref={logRef}
        className="rw-log-viewer"
        style={{
          background: '#0d1117',
          border: `1px solid ${theme.border}`,
        }}
      >
        {ralph.logLines ? stripAnsi(ralph.logLines) : 'Waiting for output...'}
      </pre>

      <div style={{ fontSize: 11, opacity: 0.4, textAlign: 'center', marginTop: 10 }}>
        Ralph runs in the background — you can close this window.
      </div>

      {/* Actions */}
      <div className="rw-actions-row" style={{ marginTop: 8 }}>
        <button
          className="rw-btn rw-btn--danger"
          style={{ flex: 1 }}
          onClick={ralph.stopRalph}
        >
          Stop
        </button>
      </div>
    </div>
  );
}
