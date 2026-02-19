import { useEffect } from 'react';
import { useTheme } from './context';

export function Modal({
  onClose,
  title,
  children,
  wide,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const theme = useTheme();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="rw-overlay" onClick={onClose}>
      <div
        className={`rw-modal${wide ? ' rw-modal--running' : ''}`}
        style={{
          background: theme.bgPrimary,
          color: theme.textPrimary,
          border: `1px solid ${theme.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rw-modal-header"
          style={{ borderBottom: `1px solid ${theme.border}` }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {title}
          </span>
          <button
            className="rw-close-btn"
            onClick={onClose}
            style={{ color: theme.textMuted }}
          >
            &#x2715;
          </button>
        </div>
        <div className="rw-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
