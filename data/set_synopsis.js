const Database = require('/Users/rosario/CODICE/omniwriter/server/node_modules/better-sqlite3');
const db = new Database('/Users/rosario/CODICE/omniwriter/server/data/omniwriter.db');

const synopsis = `Giulia, una giovane scrittrice di ventotto anni, arriva al castello di Monteverde per una residenza artistica di tre mesi. Durante il suo soggiorno, scopre una storia d'amore proibito tra Isabella, figlia del conte, e Marco, il figlio del giardiniere, vissuta negli anni '20. Aiutata dal custode Antonio e dalla contessa Margherita, Giulia trasforma questa tragedia d'amore nel cuore del suo romanzo storico, trovando l'ispirazione che cercava tra le mura del castello.`;

db.prepare('UPDATE projects SET synopsis = ? WHERE id = ?').run(synopsis, 'd1bccd34-f0f1-48d6-a12b-cbde0e6bd97b');
console.log('Synopsis updated');

const result = db.prepare('SELECT synopsis FROM projects WHERE id = ?').get('d1bccd34-f0f1-48d6-a12b-cbde0e6bd97b');
console.log('Verification:', result);
