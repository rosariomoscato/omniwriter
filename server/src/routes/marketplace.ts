// @ts-nocheck
import express from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Ensure marketplace EPUB directory exists
const marketplaceEpubDir = path.resolve(__dirname, '../../../uploads/marketplace-epub');
if (!fs.existsSync(marketplaceEpubDir)) {
  fs.mkdirSync(marketplaceEpubDir, { recursive: true });
}

// Helper function to escape XML content
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper function to convert markdown to XHTML paragraphs
function markdownToXhtml(text: string): string {
  if (!text) return '';
  let html = escapeXml(text);
  // Bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic: *text* -> <em>text</em>
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Line breaks to paragraphs
  const paragraphs = html.split('\n').filter(p => p.trim());
  return paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n  ');
}

/**
 * Generate branded EPUB for marketplace with OmniWriter branding
 */
async function generateMarketplaceEpub(
  title: string,
  author: string,
  description: string,
  chapters: any[],
  language: string = 'it'
): Promise<{ buffer: Buffer; filename: string }> {
  console.log('[Marketplace] Generating branded EPUB for:', title);
  const zip = new JSZip();
  const uuid = uuidv4();
  const bookId = `urn:uuid:${uuid}`;
  const now = new Date().toISOString();
  const epubFilename = `marketplace_${uuid}_${Date.now()}.epub`;

  // Generate unique IDs for chapters
  const chapterIds = chapters.map((_, i) => `chapter-${i + 1}-${uuidv4().slice(0, 8)}`);

  // ========== mimetype (must be first, uncompressed) ==========
  zip.file('mimetype', 'application/epub+zip');

  // ========== META-INF/container.xml ==========
  const metaInf = zip.folder('META-INF');
  metaInf?.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // ========== OEBPS folder ==========
  const oebps = zip.folder('OEBPS');

  // CSS stylesheet with branding styles
  const cssContent = `body {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.8;
  margin: 1em;
  padding: 0;
  color: #333;
}
h1 {
  text-align: center;
  font-size: 1.8em;
  margin-top: 1em;
  margin-bottom: 0.5em;
  page-break-before: always;
}
h1:first-of-type {
  page-break-before: avoid;
}
h2 {
  text-align: center;
  font-size: 1.5em;
  margin: 1em 0;
}
p {
  text-indent: 1.5em;
  margin: 0.5em 0;
  text-align: justify;
}
p:first-child {
  text-indent: 0;
}
.cover {
  text-align: center;
  page-break-after: always;
  padding: 2em;
}
.cover h1 {
  font-size: 2em;
  page-break-before: avoid;
}
.description {
  font-style: italic;
  color: #666;
  margin: 1em 2em;
}
.toc {
  page-break-after: always;
}
.toc ol {
  list-style: decimal;
  padding-left: 2em;
}
.toc li {
  margin: 0.5em 0;
}
.toc a {
  text-decoration: none;
  color: #3b82f6;
}
.colophon {
  page-break-before: always;
  text-align: center;
  margin-top: 3em;
  padding: 2em;
  font-size: 0.9em;
  color: #666;
}
.colophon h2 {
  font-size: 1.2em;
  margin-bottom: 1em;
}
.colophon p {
  text-indent: 0;
  margin: 0.5em 0;
  text-align: center;
}
.branding {
  font-weight: bold;
  color: #8b5cf6;
  font-size: 1.1em;
  margin-top: 1em;
}
strong { font-weight: bold; }
em { font-style: italic; }
`;
  oebps?.file('styles/style.css', cssContent);

  // Cover page XHTML with OmniWriter branding
  const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/style.css"/>
</head>
<body>
  <div class="cover">
    <h1>${escapeXml(title)}</h1>
    ${description ? `<p class="description">${escapeXml(description)}</p>` : ''}
    <p class="description">${escapeXml(author)}</p>
  </div>
</body>
</html>`;
  oebps?.file('cover.xhtml', coverXhtml);

  // Table of Contents page
  const tocTitle = language === 'it' ? 'Indice' : 'Table of Contents';
  const chapterLabel = language === 'it' ? 'Capitolo' : 'Chapter';
  const tocXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}">
<head>
  <meta charset="UTF-8"/>
  <title>${tocTitle}</title>
  <link rel="stylesheet" type="text/css" href="styles/style.css"/>
</head>
<body>
  <div class="toc">
    <h2>${tocTitle}</h2>
    <nav epub:type="toc">
      <ol>
${chapters.map((ch, i) => `        <li><a href="chapter_${i + 1}.xhtml">${escapeXml(ch.title || `${chapterLabel} ${i + 1}`)}</a></li>`).join('\n')}
      </ol>
    </nav>
  </div>
</body>
</html>`;
  oebps?.file('toc.xhtml', tocXhtml);

  // Chapter XHTML files
  chapters.forEach((chapter, index) => {
    const chapterTitle = escapeXml(chapter.title || `${chapterLabel} ${index + 1}`);
    const chapterContent = markdownToXhtml(chapter.content || '');

    const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}">
<head>
  <meta charset="UTF-8"/>
  <title>${chapterTitle}</title>
  <link rel="stylesheet" type="text/css" href="styles/style.css"/>
</head>
<body epub:type="bodymatter">
  <h1>${chapterTitle}</h1>
  ${chapterContent}
</body>
</html>`;
    oebps?.file(`chapter_${index + 1}.xhtml`, chapterXhtml);
  });

  // Colophon page with OmniWriter branding
  const colophonTitle = language === 'it' ? 'Colofone' : 'Colophon';
  const brandingText = language === 'it' ? 'Creato con OmniWriter' : 'Created with OmniWriter';
  const generatedWithText = language === 'it' ? 'Questa opera è stata creata con l\'aiuto di OmniWriter' : 'This work was created with the help of OmniWriter';
  const platformText = language === 'it' ? 'Piattaforma di scrittura professionale basata su intelligenza artificiale' : 'Professional AI-powered writing platform';
  const downloadFromText = language === 'it' ? 'Scaricabile dal Marketplace OmniWriter' : 'Downloaded from the OmniWriter Marketplace';
  const shareText = language === 'it' ? 'Condividi le tue opere con la community' : 'Share your works with the community';

  const colophonXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}">
<head>
  <meta charset="UTF-8"/>
  <title>${colophonTitle}</title>
  <link rel="stylesheet" type="text/css" href="styles/style.css"/>
</head>
<body>
  <div class="colophon">
    <h2>${colophonTitle}</h2>
    <p class="branding">${brandingText}</p>
    <p>${generatedWithText}</p>
    <p>${platformText}</p>
    <p>${downloadFromText}</p>
    <p style="margin-top: 2em; font-size: 0.85em;">${shareText}</p>
    <p style="margin-top: 2em; font-size: 0.8em; color: #999;">${now.split('T')[0]}</p>
  </div>
</body>
</html>`;
  oebps?.file('colophon.xhtml', colophonXhtml);

  // content.opf - Package document with OmniWriter in metadata
  const manifestItems = [
    `<item id="css" href="styles/style.css" media-type="text/css"/>`,
    `<item id="cover-xhtml" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="toc-xhtml" href="toc.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="colophon-xhtml" href="colophon.xhtml" media-type="application/xhtml+xml"/>`,
    ...chapters.map((_, i) => `<item id="chapter-${i + 1}" href="chapter_${i + 1}.xhtml" media-type="application/xhtml+xml"/>`)
  ];

  const spineItems = [
    `<itemref idref="cover-xhtml"/>`,
    `<itemref idref="toc-xhtml"/>`,
    ...chapters.map((_, i) => `<itemref idref="chapter-${i + 1}"/>`),
    `<itemref idref="colophon-xhtml"/>`
  ];

  const publisher = 'OmniWriter';
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>${language}</dc:language>
    <dc:publisher>${escapeXml(publisher)}</dc:publisher>
    <dc:date>${now}</dc:date>
    ${description ? `<dc:description>${escapeXml(description)}</dc:description>` : ''}
    <meta property="dcterms:modified">${now.split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine>
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
  oebps?.file('content.opf', contentOpf);

  // toc.ncx - Navigation Control file
  const coverLabel = language === 'it' ? 'Copertina' : 'Cover';
  const colophonLabel = language === 'it' ? 'Colofone' : 'Colophon';
  const navPoints = chapters.map((ch, i) => `
    <navPoint id="chapter-${i + 1}" playOrder="${i + 3}">
      <navLabel><text>${escapeXml(ch.title || `${chapterLabel} ${i + 1}`)}</text></navLabel>
      <content src="chapter_${i + 1}.xhtml"/>
    </navPoint>`).join('');

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
    <navPoint id="cover" playOrder="1">
      <navLabel><text>${coverLabel}</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>
    <navPoint id="toc" playOrder="2">
      <navLabel><text>${tocTitle}</text></navLabel>
      <content src="toc.xhtml"/>
    </navPoint>${navPoints}
    <navPoint id="colophon" playOrder="${chapters.length + 3}">
      <navLabel><text>${colophonLabel}</text></navLabel>
      <content src="colophon.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
  oebps?.file('toc.ncx', tocNcx);

  // Generate the ZIP buffer
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  console.log('[Marketplace] Branded EPUB generated, size:', buffer.length, 'bytes');

  // Save to marketplace-epub directory
  const epubPath = path.join(marketplaceEpubDir, epubFilename);
  fs.writeFileSync(epubPath, buffer);
  console.log('[Marketplace] EPUB saved to:', epubPath);

  return { buffer, filename: epubFilename };
}

/**
 * POST /api/marketplace
 * Publish a work from an existing project (only romanziere/saggista areas).
 * The user must own the project.
 */
router.post(
  '/',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const db = getDatabase();
      const userId = req.user!.id;
      const { project_id, description } = req.body;

      if (!project_id) {
        return res.status(400).json({ message: 'project_id is required' });
      }

      // Verify the project exists and belongs to the user
      const project = db.prepare(
        'SELECT p.*, u.name as author_name FROM projects p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ? AND p.user_id = ?'
      ).get(project_id, userId) as any;

      if (!project) {
        return res.status(404).json({ message: 'Project not found or you do not own it' });
      }

      // Only romanziere and saggista projects can be published
      if (!['romanziere', 'saggista'].includes(project.area)) {
        return res.status(400).json({ message: 'Only Romanziere and Saggista projects can be published to the marketplace' });
      }

      // Check if this project is already published
      const existing = db.prepare(
        'SELECT id FROM marketplace_items WHERE project_id = ?'
      ).get(project_id) as any;

      if (existing) {
        return res.status(409).json({ message: 'This project is already published in the marketplace', listing_id: existing.id });
      }

      // Get chapter count and total word count
      const chapterStats = db.prepare(
        'SELECT COUNT(*) as chapter_count, COALESCE(SUM(word_count), 0) as total_words FROM chapters WHERE project_id = ?'
      ).get(project_id) as { chapter_count: number; total_words: number };

      const id = uuidv4();
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO marketplace_items (id, project_id, user_id, title, author_name, description, category, genre, word_count, download_count, average_rating, review_count, is_approved, is_visible, published_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0.0, 0, 1, 1, ?, ?)`
      ).run(
        id,
        project_id,
        userId,
        project.title,
        project.author_name || project.name || 'Unknown',
        description || project.description || '',
        project.area,
        project.genre || '',
        chapterStats.total_words || project.word_count || 0,
        now,
        now
      );

      const listing = db.prepare('SELECT * FROM marketplace_items WHERE id = ?').get(id);

      res.status(201).json(listing);
    } catch (error) {
      console.error('[Marketplace] Error publishing work:', error);
      res.status(500).json({ message: 'Failed to publish work to marketplace' });
    }
  }
);

/**
 * GET /api/marketplace
 * Public listing with filters: category, genre, search, sort.
 * No authentication required (public endpoint).
 */
router.get(
  '/',
  async (req, res) => {
    try {
      const db = getDatabase();
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;
      const category = req.query.category as string || '';
      const genre = req.query.genre as string || '';
      const search = req.query.search as string || '';
      const sort = req.query.sort as string || 'newest';

      let query = `
        SELECT mi.*, u.name as author_display_name
        FROM marketplace_items mi
        LEFT JOIN users u ON mi.user_id = u.id
        WHERE mi.is_visible = 1 AND mi.is_approved = 1
      `;
      const params: any[] = [];

      if (category && ['romanziere', 'saggista'].includes(category)) {
        query += ' AND mi.category = ?';
        params.push(category);
      }

      if (genre) {
        query += ' AND mi.genre LIKE ?';
        params.push(`%${genre}%`);
      }

      if (search) {
        query += ' AND (mi.title LIKE ? OR mi.description LIKE ? OR mi.author_name LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // Sorting
      switch (sort) {
        case 'oldest':
          query += ' ORDER BY mi.published_at ASC';
          break;
        case 'most_downloaded':
          query += ' ORDER BY mi.download_count DESC';
          break;
        case 'highest_rated':
          query += ' ORDER BY mi.average_rating DESC, mi.review_count DESC';
          break;
        case 'title_asc':
          query += ' ORDER BY mi.title ASC';
          break;
        case 'title_desc':
          query += ' ORDER BY mi.title DESC';
          break;
        case 'newest':
        default:
          query += ' ORDER BY mi.published_at DESC';
          break;
      }

      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const items = db.prepare(query).all(...params);

      // Get total count with same filters
      let countQuery = `
        SELECT COUNT(*) as total
        FROM marketplace_items mi
        WHERE mi.is_visible = 1 AND mi.is_approved = 1
      `;
      const countParams: any[] = [];

      if (category && ['romanziere', 'saggista'].includes(category)) {
        countQuery += ' AND mi.category = ?';
        countParams.push(category);
      }

      if (genre) {
        countQuery += ' AND mi.genre LIKE ?';
        countParams.push(`%${genre}%`);
      }

      if (search) {
        countQuery += ' AND (mi.title LIKE ? OR mi.description LIKE ? OR mi.author_name LIKE ?)';
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern);
      }

      const countResult = db.prepare(countQuery).get(...countParams) as { total: number };

      res.json({
        items,
        pagination: {
          page,
          limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit)
        }
      });
    } catch (error) {
      console.error('[Marketplace] Error listing items:', error);
      res.status(500).json({ message: 'Failed to fetch marketplace listings' });
    }
  }
);

/**
 * GET /api/marketplace/admin
 * Admin-only: List all marketplace items (including hidden ones) with filters.
 * NOTE: This route MUST be defined before /:id to prevent Express from matching 'admin' as an :id parameter.
 */
router.get(
  '/admin',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const db = getDatabase();
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;
      const category = req.query.category as string || '';
      const search = req.query.search as string || '';
      const isVisible = req.query.is_visible as string;

      let query = `
        SELECT mi.*, u.name as author_display_name
        FROM marketplace_items mi
        LEFT JOIN users u ON mi.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (category && ['romanziere', 'saggista'].includes(category)) {
        query += ' AND mi.category = ?';
        params.push(category);
      }

      if (isVisible) {
        query += ' AND mi.is_visible = ?';
        params.push(isVisible === '1' ? 1 : 0);
      }

      if (search) {
        query += ' AND (mi.title LIKE ? OR mi.description LIKE ? OR mi.author_name LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      query += ' ORDER BY mi.published_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const items = db.prepare(query).all(...params);

      // Get total count with same filters
      let countQuery = 'SELECT COUNT(*) as total FROM marketplace_items mi WHERE 1=1';
      const countParams: any[] = [];

      if (category && ['romanziere', 'saggista'].includes(category)) {
        countQuery += ' AND mi.category = ?';
        countParams.push(category);
      }

      if (isVisible) {
        countQuery += ' AND mi.is_visible = ?';
        countParams.push(isVisible === '1' ? 1 : 0);
      }

      if (search) {
        countQuery += ' AND (mi.title LIKE ? OR mi.description LIKE ? OR mi.author_name LIKE ?)';
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern);
      }

      const countResult = db.prepare(countQuery).get(...countParams) as { total: number };

      res.json({
        items,
        pagination: {
          page,
          limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit)
        }
      });
    } catch (error) {
      console.error('[Marketplace] Error listing admin items:', error);
      res.status(500).json({ message: 'Failed to fetch marketplace items' });
    }
  }
);

/**
 * GET /api/marketplace/:id
 * Get detail of a public marketplace item.
 * No authentication required.
 */
router.get(
  '/:id',
  async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      const item = db.prepare(`
        SELECT mi.*, u.name as author_display_name
        FROM marketplace_items mi
        LEFT JOIN users u ON mi.user_id = u.id
        WHERE mi.id = ?
      `).get(id) as any;

      if (!item) {
        return res.status(404).json({ message: 'Marketplace item not found' });
      }

      // If item is hidden, only the author or admin can see it
      // For public access, hidden items are not visible
      if (!item.is_visible || !item.is_approved) {
        return res.status(404).json({ message: 'Marketplace item not found' });
      }

      res.json(item);
    } catch (error) {
      console.error('[Marketplace] Error fetching item detail:', error);
      res.status(500).json({ message: 'Failed to fetch marketplace item' });
    }
  }
);

/**
 * POST /api/marketplace/:id/download
 * Download EPUB of a marketplace item.
 * Requires login, tracks download.
 */
router.post(
  '/:id/download',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const userId = req.user!.id;

      // Get the marketplace item
      const item = db.prepare(`
        SELECT mi.*, p.id as source_project_id
        FROM marketplace_items mi
        LEFT JOIN projects p ON mi.project_id = p.id
        WHERE mi.id = ? AND mi.is_visible = 1 AND mi.is_approved = 1
      `).get(id) as any;

      if (!item) {
        return res.status(404).json({ message: 'Marketplace item not found' });
      }

      // Track download
      const downloadId = uuidv4();
      db.prepare(
        'INSERT INTO marketplace_downloads (id, marketplace_item_id, user_id, downloaded_at) VALUES (?, ?, ?, datetime(\'now\'))'
      ).run(downloadId, id, userId);

      // Update download count
      db.prepare(
        'UPDATE marketplace_items SET download_count = download_count + 1 WHERE id = ?'
      ).run(id);

      // Get chapters for the project to generate content
      const chapters = db.prepare(
        'SELECT id, title, content, order_index FROM chapters WHERE project_id = ? ORDER BY order_index ASC'
      ).all(item.source_project_id || item.project_id) as any[];

      // Generate a simple EPUB-like content as plain text for download
      // Build a text representation of the work
      let content = `# ${item.title}\n`;
      content += `Author: ${item.author_name}\n`;
      if (item.description) {
        content += `\n${item.description}\n`;
      }
      content += '\n---\n\n';

      if (chapters && chapters.length > 0) {
        for (const chapter of chapters) {
          content += `## ${chapter.title || 'Untitled Chapter'}\n\n`;
          content += `${chapter.content || '(No content)'}\n\n`;
        }
      } else {
        content += '(No chapters available)\n';
      }

      // Return as downloadable text file
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${item.title.replace(/[^a-zA-Z0-9\s-_]/g, '')}.txt"`);
      res.send(content);
    } catch (error) {
      console.error('[Marketplace] Error downloading item:', error);
      res.status(500).json({ message: 'Failed to download marketplace item' });
    }
  }
);

/**
 * DELETE /api/marketplace/:id
 * Remove own work from marketplace (author only).
 */
router.delete(
  '/:id',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const userId = req.user!.id;

      // Check if the item exists and belongs to the user
      const item = db.prepare(
        'SELECT id, user_id, title FROM marketplace_items WHERE id = ?'
      ).get(id) as any;

      if (!item) {
        return res.status(404).json({ message: 'Marketplace item not found' });
      }

      if (item.user_id !== userId) {
        return res.status(403).json({ message: 'You can only remove your own works from the marketplace' });
      }

      // Delete the listing (cascades to downloads and reviews)
      db.prepare('DELETE FROM marketplace_items WHERE id = ?').run(id);

      res.json({ message: 'Work removed from marketplace successfully', deleted_id: id, title: item.title });
    } catch (error) {
      console.error('[Marketplace] Error removing item:', error);
      res.status(500).json({ message: 'Failed to remove work from marketplace' });
    }
  }
);

/**
 * POST /api/marketplace/:id/reviews
 * Add a review (1-5 stars + text).
 * Requires login. Cannot review own work. One review per user per item.
 */
router.post(
  '/:id/reviews',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const userId = req.user!.id;
      const { rating, text } = req.body;

      // Validate rating
      const ratingNum = parseInt(rating);
      if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }

      // Check if the marketplace item exists
      const item = db.prepare(
        'SELECT id, user_id FROM marketplace_items WHERE id = ? AND is_visible = 1'
      ).get(id) as any;

      if (!item) {
        return res.status(404).json({ message: 'Marketplace item not found' });
      }

      // Cannot review own work
      if (item.user_id === userId) {
        return res.status(403).json({ message: 'You cannot review your own work' });
      }

      // Check for existing review by this user
      const existingReview = db.prepare(
        'SELECT id FROM marketplace_reviews WHERE marketplace_item_id = ? AND user_id = ?'
      ).get(id, userId) as any;

      if (existingReview) {
        return res.status(409).json({ message: 'You have already reviewed this work' });
      }

      const reviewId = uuidv4();
      db.prepare(
        'INSERT INTO marketplace_reviews (id, marketplace_item_id, user_id, rating, review_text, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
      ).run(reviewId, id, userId, ratingNum, text || '');

      // Update average rating and review count
      const ratingStats = db.prepare(
        'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM marketplace_reviews WHERE marketplace_item_id = ?'
      ).get(id) as { avg_rating: number; review_count: number };

      db.prepare(
        'UPDATE marketplace_items SET average_rating = ?, review_count = ? WHERE id = ?'
      ).run(
        Math.round((ratingStats.avg_rating || 0) * 100) / 100,
        ratingStats.review_count,
        id
      );

      const review = db.prepare('SELECT * FROM marketplace_reviews WHERE id = ?').get(reviewId);

      res.status(201).json(review);
    } catch (error) {
      console.error('[Marketplace] Error adding review:', error);
      res.status(500).json({ message: 'Failed to add review' });
    }
  }
);

/**
 * GET /api/marketplace/:id/reviews
 * List reviews for a marketplace item.
 * No authentication required.
 */
router.get(
  '/:id/reviews',
  async (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      // Check if item exists
      const item = db.prepare('SELECT id FROM marketplace_items WHERE id = ?').get(id) as any;
      if (!item) {
        return res.status(404).json({ message: 'Marketplace item not found' });
      }

      const reviews = db.prepare(`
        SELECT mr.*, u.name as reviewer_name
        FROM marketplace_reviews mr
        LEFT JOIN users u ON mr.user_id = u.id
        WHERE mr.marketplace_item_id = ?
        ORDER BY mr.created_at DESC
        LIMIT ? OFFSET ?
      `).all(id, limit, offset);

      const countResult = db.prepare(
        'SELECT COUNT(*) as total FROM marketplace_reviews WHERE marketplace_item_id = ?'
      ).get(id) as { total: number };

      res.json({
        reviews,
        pagination: {
          page,
          limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit)
        }
      });
    } catch (error) {
      console.error('[Marketplace] Error listing reviews:', error);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  }
);

/**
 * PATCH /api/marketplace/:id/hide
 * Admin hides a marketplace item (sets is_visible = 0).
 */
router.patch(
  '/:id/hide',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      const item = db.prepare('SELECT id, title, is_visible FROM marketplace_items WHERE id = ?').get(id) as any;
      if (!item) {
        return res.status(404).json({ message: 'Marketplace item not found' });
      }

      // Toggle visibility (if already hidden, unhide; if visible, hide)
      const newVisibility = item.is_visible ? 0 : 1;
      db.prepare('UPDATE marketplace_items SET is_visible = ? WHERE id = ?').run(newVisibility, id);

      res.json({
        message: newVisibility ? 'Marketplace item is now visible' : 'Marketplace item is now hidden',
        id,
        title: item.title,
        is_visible: newVisibility
      });
    } catch (error) {
      console.error('[Marketplace] Error toggling item visibility:', error);
      res.status(500).json({ message: 'Failed to update marketplace item visibility' });
    }
  }
);

/**
 * DELETE /api/marketplace/:id/admin
 * Admin permanently deletes a marketplace item.
 */
router.delete(
  '/:id/admin',
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      const item = db.prepare('SELECT id, title, user_id, author_name FROM marketplace_items WHERE id = ?').get(id) as any;
      if (!item) {
        return res.status(404).json({ message: 'Marketplace item not found' });
      }

      // Delete the item (cascades to downloads and reviews)
      db.prepare('DELETE FROM marketplace_items WHERE id = ?').run(id);

      res.json({
        message: 'Marketplace item permanently deleted by admin',
        deleted_id: id,
        title: item.title,
        author: item.author_name
      });
    } catch (error) {
      console.error('[Marketplace] Error admin-deleting item:', error);
      res.status(500).json({ message: 'Failed to delete marketplace item' });
    }
  }
);

/**
 * GET /api/admin/marketplace/stats
 * Admin-only: Get marketplace statistics.
 * NOTE: This is mounted under the admin router path, not marketplace.
 * It must be registered separately in index.ts.
 */
// We export this handler separately for admin stats
export const marketplaceAdminStatsHandler = async (req: AuthRequest, res: express.Response) => {
  try {
    const db = getDatabase();

    const totalListings = db.prepare('SELECT COUNT(*) as count FROM marketplace_items').get() as { count: number };
    const visibleListings = db.prepare('SELECT COUNT(*) as count FROM marketplace_items WHERE is_visible = 1').get() as { count: number };
    const hiddenListings = db.prepare('SELECT COUNT(*) as count FROM marketplace_items WHERE is_visible = 0').get() as { count: number };
    const totalDownloads = db.prepare('SELECT COUNT(*) as count FROM marketplace_downloads').get() as { count: number };
    const totalReviews = db.prepare('SELECT COUNT(*) as count FROM marketplace_reviews').get() as { count: number };
    const avgRating = db.prepare('SELECT AVG(rating) as avg FROM marketplace_reviews').get() as { avg: number | null };

    // Top 5 most downloaded
    const topDownloaded = db.prepare(`
      SELECT mi.id, mi.title, mi.author_name, mi.download_count, mi.average_rating, mi.review_count
      FROM marketplace_items mi
      ORDER BY mi.download_count DESC
      LIMIT 5
    `).all();

    // Top 5 highest rated (with at least 1 review)
    const topRated = db.prepare(`
      SELECT mi.id, mi.title, mi.author_name, mi.download_count, mi.average_rating, mi.review_count
      FROM marketplace_items mi
      WHERE mi.review_count > 0
      ORDER BY mi.average_rating DESC, mi.review_count DESC
      LIMIT 5
    `).all();

    // Listings by category
    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM marketplace_items
      GROUP BY category
    `).all();

    res.json({
      totalListings: totalListings.count,
      visibleListings: visibleListings.count,
      hiddenListings: hiddenListings.count,
      totalDownloads: totalDownloads.count,
      totalReviews: totalReviews.count,
      averageRating: Math.round((avgRating.avg || 0) * 100) / 100,
      topDownloaded,
      topRated,
      listingsByCategory: byCategory
    });
  } catch (error) {
    console.error('[Marketplace] Error fetching admin stats:', error);
    res.status(500).json({ message: 'Failed to fetch marketplace statistics' });
  }
};

export default router;
