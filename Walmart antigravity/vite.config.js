import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const globalModules = 'C:/Users/Dell/AppData/Local/Programs/Antigravity IDE/resources/app/node_modules';

const vitePath = path.join(globalModules, 'vite/dist/node/index.js');
const { defineConfig } = await import(`file://${vitePath}`);

let reactPlugin;
try {
  const pluginPath = path.join(globalModules, '@vitejs/plugin-react/dist/index.js');
  const mod = await import(`file://${pluginPath}`);
  reactPlugin = mod.default || mod;
} catch (e) {
  console.warn('Could not load @vitejs/plugin-react:', e.message);
}

export default defineConfig({
  plugins: reactPlugin ? [reactPlugin()] : [],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: 'react/jsx-runtime', replacement: path.join(globalModules, 'react/jsx-runtime.js') },
      { find: 'react/jsx-dev-runtime', replacement: path.join(globalModules, 'react/jsx-dev-runtime.js') },
      { find: 'react-dom/client', replacement: path.join(globalModules, 'react-dom/client.js') },
      { find: 'react-dom', replacement: path.join(globalModules, 'react-dom/index.js') },
      { find: 'react', replacement: path.join(globalModules, 'react/index.js') },
      { find: 'lucide-react', replacement: path.join(globalModules, 'lucide-react/dist/esm/lucide-react.js') },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
