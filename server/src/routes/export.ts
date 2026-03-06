// @ts-nocheck
import express, { Response, Request } from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePremium } from '../middleware/roles';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import JSZip from 'jszip';
// import { google } from 'googleapis'; // Temporarily disabled
// import { OAuth2Client } from 'google-auth-library'; // Temporarily disabled

// Configure Google Drive OAuth2
// const OAuth2 = OAuth2Client; // Temporarily disabled

// Google Drive scopes needed
// const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file']; // Temporarily disabled

// Helper function to get Google Drive client for a user
// Temporarily disabled - googleapis not installed
async function getDriveClient(user: any) {
  throw new Error('Google Drive integration temporarily unavailable.');
  /*
  if (!user.google_access_token || !user.google_refresh_token) {
    throw new Error('Google account not connected. Please connect your Google account first.');
  }

  const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || '/api/auth/google/callback'
  );

  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token
  });

  // Refresh token if needed
  oauth2Client.on('tokens', (tokens: any) => {
    // Update tokens in database
    const db = getDatabase();
    if (tokens.access_token) {
      db.prepare('UPDATE users SET google_access_token = ? WHERE id = ?')
        .run(tokens.access_token, user.id);
    }
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
  */
}

// Helper function to export project as buffer
async function exportProjectAsBuffer(projectId: string, format: string): Promise<Buffer> {
  const db = getDatabase();
  const project = db.prepare('SELECT p.*, u.name as author_name FROM projects p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ?').get(projectId) as any;
  const chapters = db.prepare(
    'SELECT id, title, content FROM chapters WHERE project_id = ? ORDER BY order_index ASC'
  ).all(projectId);

  if (format === 'docx') {
    return await generateDocx(project.title, project.description || '', chapters, project.area, project.author_name);
  } else if (format === 'epub') {
    return await generateEpub(project.title, project.description || '', chapters);
  } else {
    return generateTxt(project.title, project.description || '', chapters, project.area);
  }
}

const router = express.Router();

// Premium export formats: epub, pdf, rtf
const PREMIUM_FORMATS = ['epub', 'pdf', 'rtf'];

// Configure multer for cover image uploads with custom storage
// Feature #331: Use absolute path and preserve file extension
const coversDir = path.resolve(__dirname, '../../../uploads/covers');

// Ensure covers directory exists
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, coversDir);
  },
  filename: (req, file, cb) => {
    // Preserve the original file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: coverStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
    }
  }
});

// Helper function to escape XML content
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper function to escape regex special characters (Feature #335)
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper function to escape HTML content
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper function to generate table of contents for Saggista projects
function generateTableOfContents(chapters: any[]): string {
  if (chapters.length === 0) return '';
  return chapters.map((ch, i) => `${i + 1}. ${ch.title || 'Untitled'}`).join('\n');
}

// Helper function to convert markdown to HTML
function markdownToHtml(text: string): string {
  if (!text) return '';
  let html = escapeHtml(text);
  // Bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic: *text* -> <em>text</em>
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Line breaks to <p> tags
  const paragraphs = html.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('\n');
  return paragraphs;
}

// Helper function to generate EPUB file (proper EPUB 3.0 format)
async function generateEpub(
  title: string,
  description: string,
  chapters: any[],
  metadata?: {
    author?: string;
    publisher?: string;
    isbn?: string;
    language?: string;
  },
  coverImagePath?: string
): Promise<Buffer> {
  console.log('[Export] Generating proper EPUB 3.0 file');
  const zip = new JSZip();
  const uuid = uuidv4();
  const bookId = `urn:uuid:${uuid}`;
  const lang = metadata?.language || 'en';
  const author = metadata?.author || 'OmniWriter';
  const publisher = metadata?.publisher || 'OmniWriter';
  const now = new Date().toISOString();

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

  // Handle cover image
  let hasCover = false;
  let coverMediaType = 'image/jpeg';
  let coverFileName = 'cover.jpg';
  if (coverImagePath && fs.existsSync(coverImagePath)) {
    const ext = path.extname(coverImagePath).toLowerCase();
    // Feature #331: Properly detect media type from extension
    if (ext === '.png') {
      coverMediaType = 'image/png';
      coverFileName = 'cover.png';
    } else if (ext === '.webp') {
      coverMediaType = 'image/webp';
      coverFileName = 'cover.webp';
    } else {
      coverMediaType = 'image/jpeg';
      coverFileName = 'cover.jpg';
    }
    const imageBuffer = fs.readFileSync(coverImagePath);
    oebps?.file(`images/${coverFileName}`, imageBuffer);
    hasCover = true;
    console.log(`[Export] Cover image included: ${coverFileName}, media type: ${coverMediaType}`);
  }

  // CSS stylesheet
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
.cover img {
  max-width: 80%;
  max-height: 60vh;
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
strong { font-weight: bold; }
em { font-style: italic; }
`;
  oebps?.file('styles/style.css', cssContent);

  // Cover page XHTML
  const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/style.css"/>
</head>
<body>
  <div class="cover">
    ${hasCover ? `<img src="images/${coverFileName}" alt="Cover"/>` : ''}
    <h1>${escapeXml(title)}</h1>
    ${description ? `<p class="description">${escapeXml(description)}</p>` : ''}
    <p class="description">By ${escapeXml(author)}</p>
  </div>
</body>
</html>`;
  oebps?.file('cover.xhtml', coverXhtml);

  // Table of Contents page (Feature #344: localized heading)
  const tocTitle = lang === 'it' ? 'Indice' : 'Table of Contents';
  const chapterLabel = lang === 'it' ? 'Capitolo' : 'Chapter';
  const tocXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
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

  // Localized chapter label for fallback titles
  const chapterLabelLocal = lang === 'it' ? 'Capitolo' : 'Chapter';

  // Chapter XHTML files
  chapters.forEach((chapter, index) => {
    const chapterTitle = escapeXml(chapter.title || `${chapterLabelLocal} ${index + 1}`);
    // Feature #335: Remove duplicate title from chapter content
    let rawContent = chapter.content || '';
    // Check if content starts with the chapter title (with or without number/markdown heading)
    // Escape special regex characters in the title to prevent regex injection
    const rawTitle = chapter.title || 'Untitled';
    const escapedTitle = escapeRegex(rawTitle);
    const titlePattern = new RegExp(`^(#{1,3}\\s*)?(${escapedTitle}|${index + 1}\\.\\s*${escapedTitle})[\\s\\n]*`, 'i');
    rawContent = rawContent.replace(titlePattern, '');
    const chapterContent = markdownToXhtml(rawContent);

    const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
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

  // content.opf - Package document
  const manifestItems = [
    `<item id="css" href="styles/style.css" media-type="text/css"/>`,
    `<item id="cover-xhtml" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="toc-xhtml" href="toc.xhtml" media-type="application/xhtml+xml"/>`,
    ...chapters.map((_, i) => `<item id="chapter-${i + 1}" href="chapter_${i + 1}.xhtml" media-type="application/xhtml+xml"/>`)
  ];

  if (hasCover) {
    manifestItems.unshift(`<item id="cover-image" href="images/${coverFileName}" media-type="${coverMediaType}" properties="cover-image"/>`);
  }

  const spineItems = [
    `<itemref idref="cover-xhtml"/>`,
    `<itemref idref="toc-xhtml"/>`,
    ...chapters.map((_, i) => `<itemref idref="chapter-${i + 1}"/>`)
  ];

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>${lang}</dc:language>
    <dc:publisher>${escapeXml(publisher)}</dc:publisher>
    <dc:date>${now}</dc:date>
    ${metadata?.isbn ? `<dc:identifier id="isbn">${escapeXml(metadata.isbn)}</dc:identifier>` : ''}
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

  // toc.ncx - Navigation Control file (for backward compatibility)
  // Feature #344: Localized labels
  const coverLabel = lang === 'it' ? 'Copertina' : 'Cover';
  const navPoints = chapters.map((ch, i) => `
    <navPoint id="chapter-${i + 1}" playOrder="${i + 3}">
      <navLabel><text>${escapeXml(ch.title || `${chapterLabelLocal} ${i + 1}`)}</text></navLabel>
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
  </navMap>
</ncx>`;
  oebps?.file('toc.ncx', tocNcx);

  // Generate the ZIP buffer
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  console.log('[Export] EPUB file generated, size:', buffer.length, 'bytes');
  return buffer;
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

// Helper function to escape XML content for DOCX
function escapeXmlDocx(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper function to generate a proper DOCX file using docx library
async function generateDocx(title: string, description: string, chapters: any[], area?: string, authorName?: string): Promise<Buffer> {
  console.log('[Export] Generating DOCX file with docx library');
  const children: any[] = [];

  // Add title
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );

  // Add author name (if available)
  if (authorName && authorName.trim()) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: authorName.trim(),
            italics: true,
            size: 24
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );
  }

  // Add description if present
  if (description) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: description,
            italics: true,
            color: '666666'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      })
    );
  }

  // Add table of contents for Saggista and Romanziere projects (Feature #344)
  if ((area === 'saggista' || area === 'romanziere') && chapters.length > 0) {
    children.push(
      new Paragraph({
        text: 'INDICE',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 300 }
      })
    );

    chapters.forEach((chapter, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${chapter.title || 'Untitled'}`,
              size: 24
            })
          ],
          spacing: { after: 100 }
        })
      );
    });

    // Page break before content
    children.push(
      new Paragraph({
        children: [new PageBreak()]
      })
    );
  }

  // Add chapters
  chapters.forEach((chapter, index) => {
    // Chapter heading
    children.push(
      new Paragraph({
        text: `${index + 1}. ${chapter.title || 'Untitled'}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    // Clean content: remove leading title if it duplicates the chapter title
    let rawContent = chapter.content || '';
    const titlePattern = new RegExp(`^(${chapter.title || 'Untitled'}|${index + 1}\\.\\s*${chapter.title || 'Untitled'})[\\s\\n]*`, 'i');
    rawContent = rawContent.replace(titlePattern, '');

    // Chapter content - split by paragraphs and newlines
    const paragraphs = rawContent.split('\n').filter(p => p.trim());
    paragraphs.forEach(para => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: para.trim(),
              size: 24 // 12pt
            })
          ],
          spacing: { after: 200 }
        })
      );
    });

    // Add page break between chapters (except last)
    if (index < chapters.length - 1) {
      children.push(
        new Paragraph({
          children: [new PageBreak()]
        })
      );
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  console.log('[Export] DOCX file generated, size:', buffer.length, 'bytes');
  return buffer;
}

// Helper function to generate TXT file
function generateTxt(title: string, description: string, chapters: any[], area?: string, authorName?: string): Buffer {
  // Header: Title
  let content = `${title}\n${'='.repeat(title.length)}\n\n`;

  // Author name (if available)
  if (authorName && authorName.trim()) {
    content += `${authorName.trim()}\n\n`;
  }

  // Add table of contents for Saggista and Romanziere projects (Feature #344)
  if ((area === 'saggista' || area === 'romanziere') && chapters.length > 0) {
    content += `INDICE\n${'='.repeat('INDICE'.length)}\n\n${generateTableOfContents(chapters)}\n\n`;
    content += `${'='.repeat(60)}\n\n`;
  }

  content += description ? description + '\n\n' : '';

  // Add chapters - avoid duplicating chapter title in content
  content += chapters.map((ch, i) => {
    const chapterTitle = `${i + 1}. ${ch.title || 'Untitled'}`;
    const separator = '-'.repeat(chapterTitle.length);
    // Clean content: remove leading title if it duplicates the chapter title
    let chapterContent = ch.content || '';
    // Check if content starts with the chapter title (with or without number)
    const titlePattern = new RegExp(`^(${ch.title || 'Untitled'}|${i + 1}\\.\\s*${ch.title || 'Untitled'})[\\s\\n]*`, 'i');
    chapterContent = chapterContent.replace(titlePattern, '');
    return `\n\n${chapterTitle}\n${separator}\n\n${chapterContent.trim()}`;
  }).join('\n\n');

  return Buffer.from(content, 'utf-8');
}

// POST /api/projects/:id/export - Export project
router.post('/projects/:id/export', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { format = 'txt', metadata, coverImageId } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const db = getDatabase();

    console.log('[Export] Exporting project:', projectId, 'as format:', format);

    // Feature #402: All authenticated users have access to all export formats
    // No premium check needed - user or admin role both have full access

    // Verify project belongs to user and get author name
    const project = db.prepare(
      'SELECT p.*, u.name as author_name FROM projects p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ? AND p.user_id = ?'
    ).get(projectId, userId) as any;

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get all chapters for project, ordered by order_index
    const chapters = db.prepare(
      'SELECT id, title, content FROM chapters WHERE project_id = ? ORDER BY order_index ASC'
    ).all(projectId);

    console.log('[Export] Found', chapters.length, 'chapters');

    // Generate content based on format
    let content: Buffer;
    let filename: string;
    let mimeType: string;

    // Get cover image path if provided
    let coverImagePath: string | undefined;
    if (coverImageId) {
      const coverRecord = db.prepare(
        'SELECT file_path FROM export_history WHERE id = ? AND project_id = ?'
      ).get(coverImageId, projectId) as any;
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
      content = await generateEpub(project.title, project.description || '', chapters, epubMetadata, coverImagePath);
      filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.epub`;
      mimeType = 'application/epub+zip';
    } else if (format === 'docx') {
      // Feature #336: Use author from metadata if provided, otherwise fall back to user name
      const authorName = metadata?.author || project.author_name;
      content = await generateDocx(project.title, project.description || '', chapters, project.area, authorName);
      filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.docx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      // Default to TXT
      // Feature #336: Use author from metadata if provided, otherwise fall back to user name
      const authorName = metadata?.author || project.author_name;
      content = generateTxt(project.title, project.description || '', chapters, project.area, authorName);
      filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;
      mimeType = 'text/plain';
    }

    console.log('[Export] Generated file:', filename, 'size:', content.length, 'bytes');

    // Save export history for EPUB exports
    if (format === 'epub') {
      const exportId = uuidv4();
      const metadataJson = JSON.stringify(metadata || {});
      const coverUrl = coverImagePath ? path.basename(coverImagePath) : null;
      db.prepare(
        'INSERT INTO export_history (id, project_id, format, file_path, epub_metadata_json, epub_cover_url) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(exportId, projectId, 'epub', filename, metadataJson, coverUrl);
      console.log('[Export] Saved export history:', exportId);
    }

    // Send file
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error('[Export] Error:', error);
    res.status(500).json({ message: 'Failed to export project' });
  }
});

// POST /api/projects/:id/export/cover - Upload cover image for EPUB export
router.post('/projects/:id/export/cover',
  authenticateToken,
  upload.single('cover'),
  (req: AuthRequest, res: Response) => {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;
      const db = getDatabase();

      // Feature #402: All authenticated users have access to EPUB export features
      // No premium check needed - user or admin role both have full access

      // Verify project belongs to user
      const project = db.prepare(
        'SELECT id FROM projects WHERE id = ? AND user_id = ?'
      ).get(projectId, userId);

      if (!project) {
        // Clean up uploaded file
        if (req.file?.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ message: 'Project not found' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No cover image uploaded' });
      }

      // Create export history record for cover
      const exportId = uuidv4();
      db.prepare(
        'INSERT INTO export_history (id, project_id, format, file_path, epub_cover_url) VALUES (?, ?, ?, ?, ?)'
      ).run(exportId, projectId, 'cover', req.file.path, req.file.filename);

      console.log('[Export] Cover image uploaded:', req.file.filename, 'for project:', projectId);

      res.json({
        id: exportId,
        filename: req.file.filename,
        path: req.file.path
      });

    } catch (error) {
      console.error('[Export] Cover upload error:', error);
      // Clean up uploaded file on error
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          // File might already be deleted
        }
      }
      res.status(500).json({ message: 'Failed to upload cover image' });
    }
  }
);

// GET /api/projects/:id/export/history - Get export history
router.get('/projects/:id/export/history', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const userId = (req as any).user?.id;
    const db = getDatabase();

    // Verify project belongs to user
    const project = db.prepare(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get export history
    const history = db.prepare(
      'SELECT id, format, file_path, epub_cover_url, epub_metadata_json, created_at FROM export_history WHERE project_id = ? ORDER BY created_at DESC LIMIT 20'
    ).all(projectId);

    // Parse JSON metadata for each record
    const formattedHistory = history.map((h: any) => ({
      ...h,
      metadata: h.epub_metadata_json ? JSON.parse(h.epub_metadata_json) : null
    }));

    res.json({ history: formattedHistory });

  } catch (error) {
    console.error('[Export] History error:', error);
    res.status(500).json({ message: 'Failed to fetch export history' });
  }
});

// POST /api/projects/:id/export/batch - Export multiple chapters
router.post('/projects/:id/export/batch', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { chapterIds, format = 'txt', metadata, coverImageId, combined = true } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const db = getDatabase();

    console.log('[Batch Export] Exporting chapters:', chapterIds, 'as format:', format, 'combined:', combined);

    // Verify project belongs to user and get author name
    const project = db.prepare(
      'SELECT p.*, u.name as author_name FROM projects p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ? AND p.user_id = ?'
    ).get(projectId, userId) as any;

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Validate chapter IDs
    if (!Array.isArray(chapterIds) || chapterIds.length === 0) {
      return res.status(400).json({ message: 'Please select at least one chapter to export' });
    }

    // Get selected chapters
    const placeholders = chapterIds.map(() => '?').join(',');
    const chapters = db.prepare(
      `SELECT id, title, content, order_index FROM chapters WHERE id IN (${placeholders}) AND project_id = ? ORDER BY order_index ASC`
    ).all(...chapterIds, projectId);

    if (chapters.length === 0) {
      return res.status(404).json({ message: 'No valid chapters found' });
    }

    console.log('[Batch Export] Found', chapters.length, 'chapters to export');

    // Feature #402: All authenticated users have access to all export formats
    // No premium check needed - user or admin role both have full access

    // Get cover image path if provided
    let coverImagePath: string | undefined;
    if (coverImageId) {
      const coverRecord = db.prepare(
        'SELECT file_path FROM export_history WHERE id = ? AND project_id = ?'
      ).get(coverImageId, projectId) as any;
      if (coverRecord) {
        coverImagePath = coverRecord.file_path;
      }
    }

    let content: Buffer;
    let filename: string;
    let mimeType: string;

    if (format === 'epub') {
      // For EPUB, use the EPUB generator with selected chapters
      const epubMetadata = {
        author: metadata?.author || undefined,
        publisher: metadata?.publisher || undefined,
        isbn: metadata?.isbn || undefined,
        language: metadata?.language || 'en'
      };
      content = await generateEpub(project.title, project.description || '', chapters, epubMetadata, coverImagePath);
      filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_batch_${Date.now()}.epub`;
      mimeType = 'application/epub+zip';
    } else if (format === 'docx') {
      // Use proper DOCX generator
      content = await generateDocx(project.title, project.description || '', chapters, project.area, project.author_name);
      filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_batch_${Date.now()}.docx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      // TXT - combine all chapters
      let textContent = `${project.title}\n${'='.repeat(project.title.length)}\n\n`;

      // Add table of contents for Saggista and Romanziere projects (Feature #344)
      if ((project.area === 'saggista' || project.area === 'romanziere') && chapters.length > 0) {
        textContent += `INDICE\n${'='.repeat('INDICE'.length)}\n\n${generateTableOfContents(chapters)}\n\n`;
        textContent += `${'='.repeat(60)}\n\n`;
      }

      textContent += project.description ? project.description + '\n\n' : '';
      textContent += chapters.map((ch: any, i: number) => {
        const chapterTitle = `Chapter ${ch.order_index}: ${ch.title || 'Untitled'}`;
        const separator = '-'.repeat(chapterTitle.length);
        return `\n\n${chapterTitle}\n${separator}\n\n${ch.content || ''}`;
      }).join('\n\n');

      content = Buffer.from(textContent, 'utf-8');
      filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_batch_${Date.now()}.txt`;
      mimeType = 'text/plain';
    }

    console.log('[Batch Export] Generated file:', filename, 'size:', content.length, 'bytes');

    // Save export history
    const exportId = uuidv4();
    const metadataJson = JSON.stringify(metadata || {});
    db.prepare(
      'INSERT INTO export_history (id, project_id, format, file_path, epub_metadata_json, epub_cover_url) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(exportId, projectId, format, filename, metadataJson, coverImagePath ? path.basename(coverImagePath) : null);

    // Send file
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error('[Batch Export] Error:', error);
    res.status(500).json({ message: 'Failed to export chapters' });
  }
});

// POST /api/projects/:id/google-drive/save - Save project to Google Drive
router.post('/projects/:id/google-drive/save', authenticateToken, requirePremium, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { format = 'docx' } = req.body;
    const userId = (req as any).user?.id;
    const db = getDatabase();

    console.log('[Google Drive] Saving project:', projectId, 'as format:', format);

    // Get user with Google tokens
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!user.google_access_token && !user.google_refresh_token) {
      return res.status(400).json({
        message: 'Google account not connected. Please connect your Google account first.',
        code: 'GOOGLE_NOT_CONNECTED'
      });
    }

    // Get project details
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as any;

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get Drive client
    const drive = await getDriveClient(user);

    // Export project as buffer
    const content = await exportProjectAsBuffer(projectId, format);
    const filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${format}`;

    // Create file metadata
    const fileMetadata = {
      name: filename,
      mimeType: format === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : format === 'epub'
        ? 'application/epub+zip'
        : 'text/plain',
      description: `OmniWriter project: ${project.title}\n${project.description || ''}`
    };

    // Create file media
    const media = {
      mimeType: fileMetadata.mimeType,
      body: content
    };

    // Upload to Google Drive
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink'
    });

    const file = response.data;

    console.log('[Google Drive] File saved:', file.id);

    res.json({
      message: 'Project saved to Google Drive successfully',
      file: {
        id: file.id,
        name: file.name,
        viewUrl: file.webViewLink,
        downloadUrl: file.webContentLink
      }
    });

  } catch (error: any) {
    console.error('[Google Drive] Save error:', error);
    if (error.message?.includes('not connected')) {
      return res.status(400).json({ message: error.message, code: 'GOOGLE_NOT_CONNECTED' });
    }
    res.status(500).json({ message: 'Failed to save project to Google Drive' });
  }
});

// POST /api/projects/:id/google-drive/load - Load project from Google Drive
router.post('/projects/:id/google-drive/load', authenticateToken, requirePremium, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { fileId } = req.body;
    const userId = (req as any).user?.id;
    const db = getDatabase();

    console.log('[Google Drive] Loading file:', fileId, 'for project:', projectId);

    if (!fileId) {
      return res.status(400).json({ message: 'Google Drive file ID is required' });
    }

    // Get user with Google tokens
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!user.google_access_token && !user.google_refresh_token) {
      return res.status(400).json({
        message: 'Google account not connected. Please connect your Google account first.',
        code: 'GOOGLE_NOT_CONNECTED'
      });
    }

    // Get Drive client
    const drive = await getDriveClient(user);

    // Download file from Google Drive
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, { responseType: 'arraybuffer' });

    const buffer = Buffer.from(response.data as any);
    const file = response.data as any;

    // Get file metadata to determine type
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: 'name, mimeType'
    });

    const fileName = (metadata.data as any).name;
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'txt';

    console.log('[Google Drive] Downloaded file:', fileName, 'size:', buffer.length);

    // Parse the imported file based on type
    let parsed: { title: string; chapters: Array<{ title: string; content: string }> };

    if (fileExt === 'docx' || (metadata.data as any).mimeType.includes('wordprocessingml')) {
      // DOCX temporarily unavailable
      return res.status(400).json({ message: 'DOCX import temporarily unavailable. Please use TXT files.' });
      /*
      // Use mammoth to parse DOCX
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: buffer });
      parsed = parseTxtContent(result.value, fileName);
      */
    } else {
      // Treat as plain text
      const content = buffer.toString('utf-8');
      parsed = parseTxtContent(content, fileName);
    }

    if (parsed.chapters.length === 0) {
      return res.status(400).json({ message: 'Could not extract any content from the file' });
    }

    // Get existing project to update
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId) as any;

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Delete existing chapters
    db.prepare('DELETE FROM chapters WHERE project_id = ?').run(projectId);

    // Create new chapters from imported content
    let totalWordCount = 0;
    for (let i = 0; i < parsed.chapters.length; i++) {
      const chapter = parsed.chapters[i];
      const chapterId = uuidv4();
      const wordCount = chapter.content.split(/\s+/).filter(w => w.length > 0).length;
      totalWordCount += wordCount;

      db.prepare(
        `INSERT INTO chapters (id, project_id, title, content, summary, order_index, status, word_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, '', ?, 'imported', ?, datetime('now'), datetime('now'))`
      ).run(chapterId, projectId, chapter.title, chapter.content, i, wordCount);
    }

    // Update project word count
    db.prepare('UPDATE projects SET word_count = ?, updated_at = datetime("now") WHERE id = ?')
      .run(totalWordCount, projectId);

    console.log('[Google Drive] Imported', parsed.chapters.length, 'chapters to project:', projectId);

    res.json({
      message: 'Project loaded from Google Drive successfully',
      chaptersImported: parsed.chapters.length,
      totalWordCount
    });

  } catch (error: any) {
    console.error('[Google Drive] Load error:', error);
    if (error.message?.includes('not connected')) {
      return res.status(400).json({ message: error.message, code: 'GOOGLE_NOT_CONNECTED' });
    }
    res.status(500).json({ message: 'Failed to load project from Google Drive' });
  }
});

// GET /api/google-drive/files - List user's Google Drive files
router.get('/google-drive/files', authenticateToken, requirePremium, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const db = getDatabase();

    // Get user with Google tokens
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!user.google_access_token && !user.google_refresh_token) {
      return res.status(400).json({
        message: 'Google account not connected. Please connect your Google account first.',
        code: 'GOOGLE_NOT_CONNECTED'
      });
    }

    // Get Drive client
    const drive = await getDriveClient(user);

    // List files from Google Drive
    const response = await drive.files.list({
      q: "name contains 'omniwriter' or trashed=false",
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink, webContentLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 20
    });

    const files = (response.data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      size: file.size,
      viewUrl: file.webViewLink,
      downloadUrl: file.webContentLink
    }));

    console.log('[Google Drive] Found', files.length, 'files');

    res.json({ files });

  } catch (error: any) {
    console.error('[Google Drive] List files error:', error);
    if (error.message?.includes('not connected')) {
      return res.status(400).json({ message: error.message, code: 'GOOGLE_NOT_CONNECTED' });
    }
    res.status(500).json({ message: 'Failed to list Google Drive files' });
  }
});

export default router;
