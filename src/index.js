import { getDb } from './db.js';

function main() {
  console.log('BinLid starting...');
  
  const db = getDb();
  
  // Quick sanity check
  const spacesCount = db.prepare('SELECT COUNT(*) as n FROM spaces').get();
  const itemsCount = db.prepare('SELECT COUNT(*) as n FROM items').get();
  
  console.log('Database:', process.env.BINLID_DB || './binlid.db');
  console.log('Spaces:', spacesCount.n);
  console.log('Items:', itemsCount.n);
  
  console.log('\nBinLid ready. Add items via:');
  console.log('  npm run cli -- add-space "Cupboard under stairs"');
  console.log('  npm run cli -- add-item "Bin lid" --space "Cupboard under stairs" --location "back left"');
  console.log('  npm run cli -- search "bin lid"');
  
  db.close();
}

main();
