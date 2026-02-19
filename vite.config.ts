import { defineConfig } from 'vite';

/**
 * Vite build config for Ship Studio plugins.
 *
 * React/ReactDOM are externalized and their import paths are rewritten to
 * data: URLs that re-export from the host app's window globals.
 * This avoids bundling a separate React (which would break hooks).
 */

const reactDataUrl = `data:text/javascript,export default window.__SHIPSTUDIO_REACT__;export const useState=window.__SHIPSTUDIO_REACT__.useState;export const useEffect=window.__SHIPSTUDIO_REACT__.useEffect;export const useCallback=window.__SHIPSTUDIO_REACT__.useCallback;export const useMemo=window.__SHIPSTUDIO_REACT__.useMemo;export const useRef=window.__SHIPSTUDIO_REACT__.useRef;export const useContext=window.__SHIPSTUDIO_REACT__.useContext;export const createElement=window.__SHIPSTUDIO_REACT__.createElement;export const Fragment=window.__SHIPSTUDIO_REACT__.Fragment;`;

const jsxRuntimeDataUrl = `data:text/javascript,const _R=window.__SHIPSTUDIO_REACT__;function _jsx(t,p,k){if(k!==undefined)p=Object.assign({},p,{key:k});const c=p.children;if(c===undefined)return _R.createElement(t,p);const r=Object.assign({},p);delete r.children;if(Array.isArray(c))return _R.createElement(t,r,...c);return _R.createElement(t,r,c)}export const jsx=_jsx;export const jsxs=_jsx;export const Fragment=_R.Fragment;`;

const reactDomDataUrl = `data:text/javascript,export default window.__SHIPSTUDIO_REACT_DOM__`;

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        paths: {
          'react': reactDataUrl,
          'react-dom': reactDomDataUrl,
          'react/jsx-runtime': jsxRuntimeDataUrl,
        },
      },
    },
    minify: false,
    outDir: 'dist',
    emptyOutDir: true,
  },
});
