const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const filename = process.env.DID_DB_PATH || (process.env.NODE_ENV === 'test' ? ':memory:' : path.resolve(__dirname, '../../data/credentials.sqlite'));
if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
const db = new DatabaseSync(filename);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS credentials(id TEXT PRIMARY KEY, holder TEXT NOT NULL, body TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
  CREATE UNIQUE INDEX IF NOT EXISTS active_holder ON credentials(holder) WHERE revoked=0;`);

function saveVC(vc) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE credentials SET revoked=1 WHERE holder=? AND revoked=0').run(vc.credentialSubject.id);
    db.prepare('INSERT INTO credentials(id,holder,body) VALUES(?,?,?)').run(vc.id, vc.credentialSubject.id, JSON.stringify(vc));
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
module.exports = {
  saveVC,
  listVCs: () => db.prepare('SELECT body FROM credentials WHERE revoked=0 ORDER BY rowid DESC').all().map(row => JSON.parse(row.body)),
  isRevoked: id => Boolean(db.prepare('SELECT revoked FROM credentials WHERE id=?').get(id)?.revoked),
  revokeVC: id => Number(db.prepare('UPDATE credentials SET revoked=1 WHERE id=?').run(id).changes) > 0,
  replaceForTest: vcs => {
    if (process.env.NODE_ENV !== 'test') throw new Error('Test-only operation');
    db.exec('DELETE FROM credentials');
    vcs.forEach(saveVC);
  },
};
