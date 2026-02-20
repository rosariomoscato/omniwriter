var Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
var db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

// Check if idx_saga_continuity_source_project_id exists
var idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_saga_continuity_source_project_id'").get();
console.log("idx_saga_continuity_source_project_id:", idx ? "EXISTS" : "MISSING");

// Try creating it manually
try {
  db.exec("CREATE INDEX IF NOT EXISTS idx_saga_continuity_source_project_id ON saga_continuity(source_project_id)");
  console.log("Index created successfully!");
} catch(e) {
  console.log("Error creating index:", e.message);
}

// Check export_history index
var ehIdx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='export_history'").all();
console.log("\nexport_history indices:", ehIdx.map(function(i) { return i.name; }).join(', ') || "NONE");

db.close();
