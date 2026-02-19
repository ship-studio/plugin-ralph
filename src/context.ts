import type { PluginContextValue } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _w = window as any;

export function usePluginContext(): PluginContextValue {
  const React = _w.__SHIPSTUDIO_REACT__;
  const CtxRef = _w.__SHIPSTUDIO_PLUGIN_CONTEXT_REF__;

  if (CtxRef && React?.useContext) {
    const ctx = React.useContext(CtxRef) as PluginContextValue | null;
    if (ctx) return ctx;
  }

  throw new Error('Plugin context not available.');
}

export function useProject() { return usePluginContext().project; }
export function useShell() { return usePluginContext().shell; }
export function useToast() { return usePluginContext().actions.showToast; }
export function usePluginStorage() { return usePluginContext().storage; }
export function useAppActions() { return usePluginContext().actions; }
export function useTheme() { return usePluginContext().theme; }
