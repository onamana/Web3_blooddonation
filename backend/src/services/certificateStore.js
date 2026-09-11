import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultFile = fileURLToPath(new URL("../../data/certificates.sqlite", import.meta.url));
let db;
function database() {
  if (db) return db;
  const filename = process.env.CERTIFICATE_DB_PATH || defaultFile;
  mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS issuance (
      scope TEXT NOT NULL, request_id TEXT NOT NULL, payload TEXT NOT NULL,
      raw_tx TEXT NOT NULL, tx_hash TEXT NOT NULL, token_id TEXT,
      PRIMARY KEY (scope, request_id), UNIQUE (scope, token_id)
    )`);
  return db;
}

export function findIssuance(scope, requestId) {
  return database().prepare("SELECT * FROM issuance WHERE scope = ? AND request_id = ?").get(scope, requestId);
}

// Persist the signed transaction BEFORE broadcasting. A retry sends exactly the same
// transaction, even after a timeout/restart; it cannot mint a second certificate.
export function prepareIssuance(scope, requestId, payload, rawTx, txHash) {
  database().prepare("INSERT INTO issuance (scope, request_id, payload, raw_tx, tx_hash) VALUES (?, ?, ?, ?, ?)")
    .run(scope, requestId, payload, rawTx, txHash);
  return findIssuance(scope, requestId);
}

export function confirmIssuance(scope, requestId, tokenId) {
  database().prepare("UPDATE issuance SET token_id = ? WHERE scope = ? AND request_id = ?")
    .run(tokenId, scope, requestId);
}

export function certificateMetadata(scope, tokenId) {
  const row = database().prepare("SELECT payload FROM issuance WHERE scope = ? AND token_id = ?").get(scope, tokenId);
  if (!row) return {};
  const { donationType, volumeMl } = JSON.parse(row.payload);
  return { donationType, ...(volumeMl === undefined ? {} : { volumeMl }) };
}

export function pendingIssuances(scope) {
  return database().prepare("SELECT * FROM issuance WHERE scope = ? AND token_id IS NULL").all(scope);
}

export function allPendingIssuances() {
  return database().prepare("SELECT * FROM issuance WHERE token_id IS NULL").all();
}
