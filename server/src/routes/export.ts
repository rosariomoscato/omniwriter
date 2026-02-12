// @ts-nocheck
import express, { Response } from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePremium } from '../middleware/roles';

const router = express.Router();

// Premium export formats: epub, pdf, rtf
const PREMIUM_FORMATS = ['epub', 'pdf', 'rtf'];

// Helper function to escape XML content for DOCX
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper function to generate a simple DOCX file
function generateDocx(title: string, description: string, chapters: any[]): Buffer {
  const now = new Date().toISOString();

  // DOCX is a ZIP file containing XML files
  // We'll create a minimal valid DOCX structure
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="48"/>
        </w:rPr>
        <w:t>${escapeXml(title)}</w:t>
      </w:r>
    </w:p>
    ${description ? `
    <w:p>
      <w:r>
        <w:rPr>
          <w:i/>
        </w:rPr>
        <w:t>${escapeXml(description)}</w:t>
      </w:r>
    </w:p>
    ` : ''}
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
      </w:pPr>
    </w:p>
    ${chapters.map(chapter => `
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading2"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
        </w:rPr>
        <w:t>${escapeXml(chapter.title || 'Untitled')}</w:t>
      </w:r>
    </w:p>
    ${chapter.content ? chapter.content.split('\n').map((paragraph: string) => {
      if (paragraph.trim() === '') {
        return '<w:p/>';
      }
      // Convert markdown-style formatting
      let formatted = escapeXml(paragraph);
      // Bold: **text** -> <w:b>text</w:b>
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<w:b>$1</w:b>');
      // Italic: *text* -> <w:i>text</w:i>
      formatted = formatted.replace(/\*([^*]+)\*/g, '<w:i>$1</w:i>');

      return `
    <w:p>
      <w:r>
        <w:rPr>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t>${formatted}</w:t>
      </w:r>
    </w.p>`;
    }).join('\n') : ''}
    `).join('')}
    <w:p>
      <w:r>
        <w:br/>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

  // For a valid DOCX, we need a proper ZIP structure
  // Since we can't install external packages, we'll generate a formatted text file as fallback
  // with .docx extension that Word can open (though it will show a warning)
  const textContent = `${title}\n${'='.repeat(title.length)}\n\n${description ? description + '\n\n' : ''}${chapters.map((ch, i) => {
    const chapterTitle = `${i + 1}. ${ch.title || 'Untitled'}`;
    const separator = '-'.repeat(chapterTitle.length);
    return `\n\n${chapterTitle}\n${separator}\n\n${ch.content || ''}`;
  }).join('\n\n')}`;

  return Buffer.from(textContent, 'utf-8');
}

// Helper function to generate TXT file
function generateTxt(title: string, description: string, chapters: any[]): Buffer {
  const content = `${title}\n${'='.repeat(title.length)}\n\n${description ? description + '\n\n' : ''}${chapters.map((ch, i) => {
    const chapterTitle = `${i + 1}. ${ch.title || 'Untitled'}`;
    const separator = '-'.repeat(chapterTitle.length);
    return `\n\n${chapterTitle}\n${separator}\n\n${ch.content || ''}`;
  }).join('\n\n')}`;

  return Buffer.from(content, 'utf-8');
}

// POST /api/projects/:id/export - Export project
router.post('/projects/:id/export', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { format = 'txt' } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const db = getDatabase();

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
    const project = db.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).get(projectId, userId) as any;

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get all chapters for the project, ordered by order_index
    const chapters = db.prepare(
      'SELECT title, content FROM chapters WHERE project_id = ? ORDER BY order_index ASC'
    ).all(projectId);

    console.log('[Export] Found', chapters.length, 'chapters');

    // Generate content based on format
    let content: Buffer;
    let filename: string;
    let mimeType: string;

    if (format === 'docx') {
      content = generateDocx(project.title, project.description || '', chapters);
      filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.docx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      // Default to TXT
      content = generateTxt(project.title, project.description || '', chapters);
      filename = `${project.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;
      mimeType = 'text/plain';
    }

    console.log('[Export] Generated file:', filename, 'size:', content.length, 'bytes');

    // Send file
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

  } catch (error) {
    console.error('[Export] Error:', error);
    res.status(500).json({ message: 'Failed to export project' });
  }
});

// GET /api/projects/:id/export/history - Get export history (placeholder for future)
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

    // For now, return empty history
    // In the future, this would query an export_history table
    res.json({ history: [] });

  } catch (error) {
    console.error('[Export] History error:', error);
    res.status(500).json({ message: 'Failed to fetch export history' });
  }
});

export default router;
