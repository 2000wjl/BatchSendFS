import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy:{
      "/api":{
        target:"https://open.feishu.cn",
        changeOrigin:true,
        rewrite:(path)=>path.replace(/^\/api/,""),
      }
    }
  }
})
