// server/index.js
// Main Server Entrypoint for Walmart PT Classification Library

import { startApiServer } from './api.js';
import { loadTaxonomy } from './taxonomy.js';

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  console.log('----------------------------------------------------');
  console.log('WALMART PT CLASSIFICATION LIBRARY: ENTERPRISE RBAC');
  console.log('----------------------------------------------------');

  // 1. Index Walmart Taxonomy from D:\Walmart files\Taxonomy csv.csv
  console.log('Indexing Walmart Product Type Taxonomy...');
  loadTaxonomy();

  // 2. Start REST API Server
  await startApiServer(PORT);
  console.log(`Backend API available at http://localhost:${PORT}/api`);
  console.log('Permissions: ADMIN (Workspace Owner), EDITOR, VIEWER active.');
  console.log('----------------------------------------------------');
}

bootstrap().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
