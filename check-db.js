var Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
var db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

// Check the exact export_history schema in the DB vs what code expects
var exportSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='export_history'").get();
console.log("Current export_history schema:");
console.log(exportSchema.sql);

// Check if current schema matches the code's CREATE TABLE IF NOT EXISTS
// The code says: format TEXT NOT NULL CHECK(format IN ('docx', 'epub', 'rtf', 'pdf', 'txt', 'cover'))
// Does the existing table match?
console.log("\nDoes it include 'cover'?", exportSchema.sql.includes("'cover'"));

// Now try the full exec block from the migration - but just the export_history part
// to see if it causes a conflict
try {
  db.exec("CREATE TABLE IF NOT EXISTS export_history (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, format TEXT NOT NULL CHECK(format IN ('docx', 'epub', 'rtf', 'pdf', 'txt', 'cover')), file_path TEXT NOT NULL DEFAULT '', epub_cover_url TEXT, epub_metadata_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))");
  console.log("Re-creating export_history: OK (IF NOT EXISTS worked)");
} catch(e) {
  console.log("Re-creating export_history ERROR:", e.message);
}

// Let me try the FULL big exec to reproduce the error
var fs = require('fs');
var content = fs.readFileSync('/Users/rosario/CODICE/omniwriter/server/src/db/database.ts', 'utf8');

// Extract the big exec block
var match = content.match(/db\.exec\(`([\s\S]*?)`\)/);
if (match) {
  var sql = match[1];
  // Split by semicolons and try each statement
  var statements = sql.split(';').filter(function(s) { return s.trim().length > 0; });
  console.log("\nTotal statements in main exec:", statements.length);

  for (var i = 0; i < statements.length; i++) {
    try {
      db.exec(statements[i] + ';');
    } catch(e) {
      console.log("ERROR at statement " + i + ":", e.message);
      console.log("Statement:", statements[i].trim().substring(0, 100));
    }
  }
  console.log("All statements processed");
}

db.close();
