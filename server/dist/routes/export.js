"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const router = express_1.default.Router();
// Premium export formats: epub, pdf, rtf
const PREMIUM_FORMATS = ['epub', 'pdf', 'rtf'];
// Configure multer for cover image uploads
const upload = (0, multer_1.default)({
    dest: 'uploads/covers/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
        }
    }
});
// Helper function to escape XML content
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
// Helper function to escape HTML content
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// Helper function to convert markdown to HTML
function markdownToHtml(text) {
    if (!text)
        return '';
    let html = escapeHtml(text);
    // Bold: **text** -> <strong>text</strong>
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic: *text* -> <em>text</em>
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Line breaks to <p> tags
    const paragraphs = html.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('\n');
    return paragraphs;
}
// Helper function to generate EPUB file (HTML-based eBook format)
function generateEpub(title, description, chapters, metadata, coverImagePath) {
    // Read cover image if provided
    let coverImageBase64 = '';
    let coverMediaType = '';
    if (coverImagePath && fs_1.default.existsSync(coverImagePath)) {
        const ext = path_1.default.extname(coverImagePath).toLowerCase();
        coverMediaType = ext === '.png' ? 'image/png' : 'image/jpeg';
        const imageBuffer = fs_1.default.readFileSync(coverImagePath);
        coverImageBase64 = imageBuffer.toString('base64');
    }
    // Generate XHTML content for each chapter
    const chapterFiles = chapters.map((chapter, index) => {
        const chapterTitle = escapeHtml(chapter.title || `Chapter ${index + 1}`);
        const chapterContent = markdownToHtml(chapter.content || '');
        return {
            id: `chapter_${index + 1}`,
            filename: `${chapter.id}.xhtml`,
            content: chapterContent
        };
    });
    // Build HTML eBook format with EPUB-compatible structure
    const epubHtml = `<!DOCTYPE html>
<html lang="${metadata?.language || 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&family=Open+Sans:wght@400;600&display=swap');

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Merriweather', Georgia, 'Times New Roman', serif;
      line-height: 1.8;
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fff;
      color: #333;
    }

    h1 {
      text-align: center;
      font-family: 'Open Sans', sans-serif;
      font-size: 2em;
      margin-top: 3em;
      margin-bottom: 1em;
      page-break-before: always;
      color: #1a1a2e;
    }

    h1:first-of-type {
      margin-top: 1em;
    }

    .cover-page {
      text-align: center;
      page-break-after: always;
      padding-top: 100px;
      min-height: 80vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .cover-page img {
      max-width: 300px;
      max-height: 400px;
      margin-bottom: 2em;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      border-radius: 8px;
    }

    .cover-page h1 {
      font-size: 2.5em;
      margin-bottom: 0.5em;
      margin-top: 1em;
      font-weight: 700;
    }

    .description {
      font-style: italic;
      color: #666;
      margin-bottom: 2em;
      max-width: 500px;
    }

    .metadata {
      font-style: italic;
      color: #888;
      margin-top: 2em;
      font-size: 0.9em;
    }

    .metadata p {
      margin: 0.5em 0;
    }

    .toc {
      page-break-after: always;
      padding: 2em 0;
    }

    .toc h2 {
      text-align: center;
      font-family: 'Open Sans', sans-serif;
      font-size: 1.5em;
      margin-bottom: 1.5em;
      color: #1a1a2e;
    }

    .toc ol {
      list-style: none;
      padding-left: 0;
      max-width: 500px;
      margin: 0 auto;
    }

    .toc li {
      padding: 0.75em 0;
      border-bottom: 1px solid #eee;
    }

    .toc li:last-child {
      border-bottom: none;
    }

    .toc a {
      text-decoration: none;
      color: #3b82f6;
      font-weight: 600;
      display: block;
      padding: 0.5em 0;
      transition: color 0.2s;
    }

    .toc a:hover {
      color: #1d4ed8;
    }

    .chapter {
      page-break-before: always;
    }

    .chapter h1 {
      font-size: 1.8em;
    }

    .chapter-content {
      text-align: justify;
      line-height: 1.9;
    }

    .chapter-content p {
      text-indent: 2em;
      margin: 0.75em 0;
    }

    .chapter-content p:first-child {
      text-indent: 0;
    }

    strong {
      font-weight: bold;
    }

    em {
      font-style: italic;
    }

    @media print {
      body {
        max-width: 100%;
        padding: 20px;
      }

      h1 {
        page-break-before: always;
      }

      .cover-page, .toc {
        page-break-after: always;
      }

      .chapter {
        page-break-inside: avoid;
      }
    }

    @media (max-width: 600px) {
      body {
        padding: 20px 15px;
      }

      .cover-page h1 {
        font-size: 1.8em;
      }

      .cover-page img {
        max-width: 200px;
        max-height: 280px;
      }

      h1 {
        font-size: 1.5em;
      }
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    ${coverImagePath ? `<img src="data:${coverMediaType};base64,${coverImageBase64}" alt="Cover">` : ''}
    <h1>${escapeHtml(title)}</h1>
    ${description ? `<p class="description">${escapeHtml(description)}</p>` : ''}
    <div class="metadata">
      ${metadata?.author ? `<p>By ${escapeHtml(metadata.author)}</p>` : ''}
      ${metadata?.publisher ? `<p>${escapeHtml(metadata.publisher)}</p>` : ''}
      ${metadata?.isbn ? `<p>ISBN: ${escapeHtml(metadata.isbn)}</p>` : ''}
    </div>
  </div>

  <!-- Table of Contents -->
  <div class="toc">
    <h2>Table of Contents</h2>
    <ol>
      ${chapterFiles.map((ch, i) => `
      <li><a href="#chapter_${i + 1}">${i + 1}. ${escapeHtml(chapters[i].title || 'Untitled')}</a></li>
      `).join('')}
    </ol>
  </div>

  <!-- Chapters -->
  ${chapterFiles.map((ch, i) => `
  <div class="chapter" id="chapter_${i + 1}">
    <h1>${escapeHtml(chapters[i].title || `Chapter ${i + 1}`)}</h1>
    <div class="chapter-content">
      ${markdownToHtml(chapters[i].content || '')}
    </div>
  </div>`).join('\n')}
</body>
</html>`;
    return Buffer.from(epubHtml, 'utf-8');
}
// Helper function to escape XML content for DOCX
function escapeXmlDocx(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
// Helper function to generate a simple DOCX file
function generateDocx(title, description, chapters) {
    const textContent = `${title}\n${'='.repeat(title.length)}\n\n${description ? description + '\n\n' : ''}${chapters.map((ch, i) => {
        const chapterTitle = `${i + 1}. ${ch.title || 'Untitled'}`;
        const separator = '-'.repeat(chapterTitle.length);
        return `\n\n${chapterTitle}\n${separator}\n\n${ch.content || ''}`;
    }).join('\n\n')}`;
    return Buffer.from(textContent, 'utf-8');
}
// Helper function to generate TXT file
function generateTxt(title, description, chapters) {
    const content = `${title}\n${'='.repeat(title.length)}\n\n${description ? description + '\n\n' : ''}${chapters.map((ch, i) => {
        const chapterTitle = `${i + 1}. ${ch.title || 'Untitled'}`;
        const separator = '-'.repeat(chapterTitle.length);
        return `\n\n${chapterTitle}\n${separator}\n\n${ch.content || ''}`;
    }).join('\n\n')}`;
    return Buffer.from(content, 'utf-8');
}
// POST /api/projects/:id/export - Export project
router.post('/projects/:id/export', auth_1.authenticateToken, (req, res) => {
    try {
        const { id: projectId } = req.params;
        const { format = 'txt', metadata, coverImageId } = req.body;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const db = (0, database_1.getDatabase)();
        console.log('[Export] Exporting project:', projectId, 'as format:', format);
        // Check if format requires premium subscription
        if (PREMIUM_FORMATS.includes(format.toLowerCase())) {
            if (userRole !== 'premium' && userRole !== 'lifetime' && userRole !== 'admin') {
                console.log('[Export] Premium format requested by free user:', format);
                return res.status(403).json({
                    message: `Export to ${format.toUpperCase()} requires a Premium subscription`,
                    code: 'PREMIUM_REQUIRED'
                });
            }
        }
        // Verify project belongs to user
        const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        // Get all chapters for project, ordered by order_index
        const chapters = db.prepare('SELECT id, title, content FROM chapters WHERE project_id = ? ORDER BY order_index ASC').all(projectId);
        console.log('[Export] Found', chapters.length, 'chapters');
        // Generate content based on format
        let content;
        let filename;
        let mimeType;
        // Get cover image path if provided
        let coverImagePath;
        if (coverImageId) {
            const coverRecord = db.prepare('SELECT file_path FROM export_history WHERE id = ? AND project_id = ?').get(coverImageId, projectId);
            if (coverRecord) {
                coverImagePath = coverRecord.file_path;
            }
        }
        if (format === 'epub') {
            // Parse metadata
            const epubMetadata = {
                author: metadata?.author || undefined,
                publisher: metadata?.publisher || undefined,
                isbn: metadata?.isbn || undefined,
                language: metadata?.language || 'en'
            };
            content = generateEpub(project.title, project.description || '', chapters, epubMetadata, coverImagePath);
            filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.epub`;
            mimeType = 'application/epub+zip';
        }
        else if (format === 'docx') {
            content = generateDocx(project.title, project.description || '', chapters);
            filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.docx`;
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
        else {
            // Default to TXT
            content = generateTxt(project.title, project.description || '', chapters);
            filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;
            mimeType = 'text/plain';
        }
        console.log('[Export] Generated file:', filename, 'size:', content.length, 'bytes');
        // Save export history for EPUB exports
        if (format === 'epub') {
            const exportId = (0, uuid_1.v4)();
            const metadataJson = JSON.stringify(metadata || {});
            const coverUrl = coverImagePath ? path_1.default.basename(coverImagePath) : null;
            db.prepare('INSERT INTO export_history (id, project_id, format, file_path, epub_metadata_json, epub_cover_url) VALUES (?, ?, ?, ?, ?, ?)').run(exportId, projectId, 'epub', filename, metadataJson, coverUrl);
            console.log('[Export] Saved export history:', exportId);
        }
        // Send file
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(content);
    }
    catch (error) {
        console.error('[Export] Error:', error);
        res.status(500).json({ message: 'Failed to export project' });
    }
});
// POST /api/projects/:id/export/cover - Upload cover image for EPUB export
router.post('/projects/:id/export/cover', auth_1.authenticateToken, upload.single('cover'), (req, res) => {
    try {
        const { id: projectId } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const db = (0, database_1.getDatabase)();
        // Check premium subscription
        if (userRole !== 'premium' && userRole !== 'lifetime' && userRole !== 'admin') {
            // Clean up uploaded file
            if (req.file?.path) {
                fs_1.default.unlinkSync(req.file.path);
            }
            return res.status(403).json({
                message: 'EPUB export features require a Premium subscription',
                code: 'PREMIUM_REQUIRED'
            });
        }
        // Verify project belongs to user
        const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
        if (!project) {
            // Clean up uploaded file
            if (req.file?.path) {
                fs_1.default.unlinkSync(req.file.path);
            }
            return res.status(404).json({ message: 'Project not found' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No cover image uploaded' });
        }
        // Create export history record for cover
        const exportId = (0, uuid_1.v4)();
        db.prepare('INSERT INTO export_history (id, project_id, format, file_path, epub_cover_url) VALUES (?, ?, ?, ?, ?)').run(exportId, projectId, 'cover', req.file.path, req.file.filename);
        console.log('[Export] Cover image uploaded:', req.file.filename, 'for project:', projectId);
        res.json({
            id: exportId,
            filename: req.file.filename,
            path: req.file.path
        });
    }
    catch (error) {
        console.error('[Export] Cover upload error:', error);
        // Clean up uploaded file on error
        if (req.file?.path) {
            try {
                fs_1.default.unlinkSync(req.file.path);
            }
            catch (e) {
                // File might already be deleted
            }
        }
        res.status(500).json({ message: 'Failed to upload cover image' });
    }
});
// GET /api/projects/:id/export/history - Get export history
router.get('/projects/:id/export/history', auth_1.authenticateToken, (req, res) => {
    try {
        const { id: projectId } = req.params;
        const userId = req.user?.id;
        const db = (0, database_1.getDatabase)();
        // Verify project belongs to user
        const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        // Get export history
        const history = db.prepare('SELECT id, format, file_path, epub_cover_url, epub_metadata_json, created_at FROM export_history WHERE project_id = ? ORDER BY created_at DESC LIMIT 20').all(projectId);
        // Parse JSON metadata for each record
        const formattedHistory = history.map((h) => ({
            ...h,
            metadata: h.epub_metadata_json ? JSON.parse(h.epub_metadata_json) : null
        }));
        res.json({ history: formattedHistory });
    }
    catch (error) {
        console.error('[Export] History error:', error);
        res.status(500).json({ message: 'Failed to fetch export history' });
    }
});
// POST /api/projects/:id/export/batch - Export multiple chapters
router.post('/projects/:id/export/batch', auth_1.authenticateToken, (req, res) => {
    try {
        const { id: projectId } = req.params;
        const { chapterIds, format = 'txt', metadata, coverImageId, combined = true } = req.body;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const db = (0, database_1.getDatabase)();
        console.log('[Batch Export] Exporting chapters:', chapterIds, 'as format:', format, 'combined:', combined);
        // Verify project belongs to user
        const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        // Validate chapter IDs
        if (!Array.isArray(chapterIds) || chapterIds.length === 0) {
            return res.status(400).json({ message: 'Please select at least one chapter to export' });
        }
        // Get selected chapters
        const placeholders = chapterIds.map(() => '?').join(',');
        const chapters = db.prepare(`SELECT id, title, content, order_index FROM chapters WHERE id IN (${placeholders}) AND project_id = ? ORDER BY order_index ASC`).all(...chapterIds, projectId);
        if (chapters.length === 0) {
            return res.status(404).json({ message: 'No valid chapters found' });
        }
        console.log('[Batch Export] Found', chapters.length, 'chapters to export');
        // Check premium requirements
        if (PREMIUM_FORMATS.includes(format.toLowerCase())) {
            if (userRole !== 'premium' && userRole !== 'lifetime' && userRole !== 'admin') {
                console.log('[Batch Export] Premium format requested by free user:', format);
                return res.status(403).json({
                    message: `Export to ${format.toUpperCase()} requires a Premium subscription`,
                    code: 'PREMIUM_REQUIRED'
                });
            }
        }
        // Get cover image path if provided
        let coverImagePath;
        if (coverImageId) {
            const coverRecord = db.prepare('SELECT file_path FROM export_history WHERE id = ? AND project_id = ?').get(coverImageId, projectId);
            if (coverRecord) {
                coverImagePath = coverRecord.file_path;
            }
        }
        let content;
        let filename;
        let mimeType;
        if (format === 'epub') {
            // For EPUB, use the EPUB generator with selected chapters
            const epubMetadata = {
                author: metadata?.author || undefined,
                publisher: metadata?.publisher || undefined,
                isbn: metadata?.isbn || undefined,
                language: metadata?.language || 'en'
            };
            content = generateEpub(project.title, project.description || '', chapters, epubMetadata, coverImagePath);
            filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_batch_${Date.now()}.epub`;
            mimeType = 'application/epub+zip';
        }
        else if (format === 'docx') {
            // Combine all chapters into one document
            const textContent = `${project.title}\n${'='.repeat(project.title.length)}\n\n${project.description ? project.description + '\n\n' : ''}${chapters.map((ch, i) => {
                const chapterTitle = `Chapter ${ch.order_index}: ${ch.title || 'Untitled'}`;
                const separator = '-'.repeat(chapterTitle.length);
                return `\n\n${chapterTitle}\n${separator}\n\n${ch.content || ''}`;
            }).join('\n\n')}`;
            content = Buffer.from(textContent, 'utf-8');
            filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_batch_${Date.now()}.docx`;
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
        else {
            // TXT - combine all chapters
            const textContent = `${project.title}\n${'='.repeat(project.title.length)}\n\n${project.description ? project.description + '\n\n' : ''}${chapters.map((ch, i) => {
                const chapterTitle = `Chapter ${ch.order_index}: ${ch.title || 'Untitled'}`;
                const separator = '-'.repeat(chapterTitle.length);
                return `\n\n${chapterTitle}\n${separator}\n\n${ch.content || ''}`;
            }).join('\n\n')}`;
            content = Buffer.from(textContent, 'utf-8');
            filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_batch_${Date.now()}.txt`;
            mimeType = 'text/plain';
        }
        console.log('[Batch Export] Generated file:', filename, 'size:', content.length, 'bytes');
        // Save export history
        const exportId = (0, uuid_1.v4)();
        const metadataJson = JSON.stringify(metadata || {});
        db.prepare('INSERT INTO export_history (id, project_id, format, file_path, epub_metadata_json, epub_cover_url) VALUES (?, ?, ?, ?, ?, ?)').run(exportId, projectId, format, filename, metadataJson, coverImagePath ? path_1.default.basename(coverImagePath) : null);
        // Send file
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(content);
    }
    catch (error) {
        console.error('[Batch Export] Error:', error);
        res.status(500).json({ message: 'Failed to export chapters' });
    }
});
exports.default = router;
//# sourceMappingURL=export.js.map