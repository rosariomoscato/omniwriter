const Database = require('./server/node_modules/better-sqlite3');
const db = new Database('./server/data/omniwriter.db');

const sagaCount = db.prepare('SELECT COUNT(*) as count FROM sagas').get();
const continuityCount = db.prepare('SELECT COUNT(*) as count FROM saga_continuity').get();

console.log('Sagas:', sagaCount.count);
console.log('Saga continuity records:', continuityCount.count);

if (continuityCount.count > 0) {
  const records = db.prepare('SELECT id, saga_id, episode_number, cumulative_synopsis FROM saga_continuity LIMIT 3').all();
  console.log('\nSample continuity records:', JSON.stringify(records, null, 2));
}

db.close();
