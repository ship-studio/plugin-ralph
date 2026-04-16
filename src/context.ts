import type { PluginContextValue } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _w = window as any;

export function usePluginContext(): PluginContextValue | null {
  const React = _w.__SHIPSTUDIO_REACT__;
  const CtxRef = _w.__SHIPSTUDIO_PLUGIN_CONTEXT_REF__;

  if (CtxRef && React?.useContext) {
    const ctx = React.useContext(CtxRef) as PluginContextValue | null;
    if (ctx) return ctx;
  }

  // Fall back to legacy global
  const directCtx = _w.__SHIPSTUDIO_PLUGIN_CONTEXT__ as PluginContextValue | undefined;
  if (directCtx) return directCtx;

  return null;
}

export function useProject() { return usePluginContext()?.project ?? null; }
export function useShell() { return usePluginContext()?.shell ?? null; }
export function useToast() { return usePluginContext()?.actions.showToast ?? null; }
export function usePluginStorage() { return usePluginContext()?.storage ?? null; }
export function useAppActions() { return usePluginContext()?.actions ?? null; }
export function useTheme() { return usePluginContext()?.theme ?? null; }
