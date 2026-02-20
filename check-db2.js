var Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
var db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

// Check all indices
var indices = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name").all();
console.log("Indices:");
indices.forEach(function(i) { console.log("  " + i.name + " on " + i.tbl_name); });

// Check saga_continuity indices specifically
console.log("\nSaga continuity indices:");
var scIndices = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='saga_continuity'").all();
console.log(scIndices.length > 0 ? scIndices.map(function(i) { return i.name; }).join(', ') : "NONE");

// Try to verify the table works
try {
  var count = db.prepare("SELECT COUNT(*) as c FROM saga_continuity").get();
  console.log("\nsaga_continuity row count:", count.c);
} catch(e) {
  console.log("Error querying saga_continuity:", e.message);
}

// Check table_info for saga_continuity
var cols = db.prepare("PRAGMA table_info(saga_continuity)").all();
console.log("\nsaga_continuity columns:");
cols.forEach(function(c) { console.log("  " + c.name + " " + c.type + " (notnull: " + c.notnull + ", default: " + c.dflt_value + ")"); });

db.close();
