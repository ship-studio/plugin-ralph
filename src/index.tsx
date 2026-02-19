import { useState, useEffect } from 'react';
import { useRalph } from './useRalph';
import { Modal } from './Modal';
import { InstallView } from './InstallView';
import { SetupView } from './SetupView';
import { ConfigView } from './ConfigView';
import { StatusView } from './StatusView';
import { RW_STYLE_ID, RALPH_CSS } from './styles';
import type { RalphPhase } from './types';

function useInjectStyles() {
  useEffect(() => {
    if (document.getElementById(RW_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = RW_STYLE_ID;
    style.textContent = RALPH_CSS;
    document.head.appendChild(style);
    return () => {
      document.getElementById(RW_STYLE_ID)?.remove();
    };
  }, []);
}

function statusTitle(phase: RalphPhase): string {
  switch (phase) {
    case 'loading': return 'Ralph: Checking...';
    case 'not-installed': return 'Ralph: Not installed';
    case 'not-enabled': return 'Ralph: Click to set up';
    case 'ready': return 'Ralph: Ready';
    case 'running': return 'Ralph: Running';
  }
}

function modalTitle(phase: RalphPhase): string {
  switch (phase) {
    case 'loading': return 'Ralph Wiggum';
    case 'not-installed': return 'Install Ralph';
    case 'not-enabled': return 'Set Up Ralph';
    case 'ready': return 'Ralph Wiggum';
    case 'running': return 'Ralph Wiggum — Running';
  }
}

function RalphToolbar() {
  useInjectStyles();
  const ralph = useRalph();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        className={`toolbar-icon-btn${ralph.phase === 'running' ? ' rw-toolbar-running' : ''}`}
        title={statusTitle(ralph.phase)}
        onClick={() => setShowModal(true)}
        style={{ position: 'relative' }}
      >
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 0 1 7.07 2.93" />
          <path d="M19.07 4.93l-2.83-.35.35-2.83" />
          <path d="M22 12a10 10 0 0 1-2.93 7.07" />
          <path d="M19.07 19.07l.35-2.83 2.83.35" />
          <path d="M12 22a10 10 0 0 1-7.07-2.93" />
          <path d="M4.93 19.07l2.83.35-.35 2.83" />
          <path d="M2 12A10 10 0 0 1 4.93 4.93" />
          <path d="M4.93 4.93l-.35 2.83-2.83-.35" />
        </svg>
      </button>
      {showModal && (
        <Modal onClose={() => setShowModal(false)} title={modalTitle(ralph.phase)} wide={ralph.phase === 'running'}>
          {ralph.phase === 'loading' && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <span className="rw-spinner" style={{ width: 20, height: 20 }} />
            </div>
          )}
          {ralph.phase === 'not-installed' && <InstallView ralph={ralph} onClose={() => setShowModal(false)} />}
          {ralph.phase === 'not-enabled' && <SetupView ralph={ralph} />}
          {ralph.phase === 'ready' && <ConfigView ralph={ralph} />}
          {ralph.phase === 'running' && <StatusView ralph={ralph} onClose={() => setShowModal(false)} />}
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Module exports (required by Ship Studio plugin loader)
// ---------------------------------------------------------------------------

export const name = 'Ralph Wiggum';

export const slots = {
  toolbar: RalphToolbar,
};

export function onActivate() {
  console.log('[ralph] Plugin activated');
}

export function onDeactivate() {
  console.log('[ralph] Plugin deactivated');
  const styleEl = document.getElementById(RW_STYLE_ID);
  if (styleEl) styleEl.remove();
}
