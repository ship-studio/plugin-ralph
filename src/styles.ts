export const RW_STYLE_ID = 'rw-plugin-styles';

export const RALPH_CSS = `
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
