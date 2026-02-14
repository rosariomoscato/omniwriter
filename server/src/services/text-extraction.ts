/**
 * Text Extraction Service
 *
 * Extracts plain text from various document formats:
 * - TXT: Plain text files (direct read)
 * - DOCX/DOC: Microsoft Word documents (using mammoth)
 * - RTF: Rich Text Format (regex-based extraction)
 * - PDF: PDF documents (using pdf2json)
 */

import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';

export interface ExtractionResult {
  text: string;
  wordCount: number;
  error?: string;
}

/**
 * Extract text from a file based on its extension
 */
export async function extractTextFromFile(filePath: string): Promise<ExtractionResult> {
  const ext = path.extname(filePath).toLowerCase();

  try {
    let text: string;

    switch (ext) {
      case '.txt':
        text = await extractFromTxt(filePath);
        break;

      case '.docx':
      case '.doc':
        text = await extractFromDocx(filePath);
        break;

      case '.rtf':
        text = await extractFromRtf(filePath);
        break;

      case '.pdf':
        text = await extractFromPdf(filePath);
        break;

      default:
        return {
          text: '',
          wordCount: 0,
          error: `Unsupported file format: ${ext}. Supported formats are: TXT, DOCX, DOC, RTF, PDF`,
        };
    }

    const wordCount = countWords(text);

    return {
      text,
      wordCount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during text extraction';
    console.error(`[TextExtraction] Error extracting from ${filePath}:`, errorMessage);

    return {
      text: '',
      wordCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Extract text from a plain text file
 */
async function extractFromTxt(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Extract text from a DOCX/DOC file using mammoth
 */
async function extractFromDocx(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Extract text from an RTF file using regex-based extraction
 * RTF is a text-based format, so we can strip the control words
 */
async function extractFromRtf(filePath: string): Promise<string> {
  const content = fs.readFileSync(filePath, 'utf-8');

  // RTF text extraction using regex
  // This is a simplified approach that handles common RTF structures
  let text = content;

  // Remove RTF header and control groups
  text = text.replace(/\{\\rtf1[^}]*\}/g, '');

  // Remove font table, color table, and other control tables
  text = text.replace(/\{\\fonttbl[^}]*\}/g, '');
  text = text.replace(/\{\\colortbl[^}]*\}/g, '');
  text = text.replace(/\{\\stylesheet[^}]*\}/g, '');
  text = text.replace(/\{\\info[^}]*\}/g, '');
  text = text.replace(/\{\\\*[^}]*\}/g, '');

  // Remove common control words
  text = text.replace(/\\[a-z]+\d*/g, '');
  text = text.replace(/\\[*]/g, '');

  // Remove remaining braces
  text = text.replace(/[{}]/g, '');

  // Handle special characters
  text = text.replace(/\\'/g, "'");
  text = text.replace(/\\\\/g, '\\');
  text = text.replace(/\\{/g, '{');
  text = text.replace(/\\}/g, '}');

  // Remove escape sequences
  text = text.replace(/\\[a-zA-Z]+\s?/g, '');

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ');
  text = text.trim();

  return text;
}

/**
 * Extract text from a PDF file using pdf2json
 */
async function extractFromPdf(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)(null, 1);

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error(errData.parserError || 'PDF parsing error'));
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        // Extract text from all pages
        const textParts: string[] = [];

        if (pdfData && pdfData.Pages) {
          for (const page of pdfData.Pages) {
            if (page.Texts) {
              for (const text of page.Texts) {
                if (text.R) {
                  for (const r of text.R) {
                    if (r.T) {
                      // Decode URI component for the text
                      textParts.push(decodeURIComponent(r.T));
                    }
                  }
                }
              }
            }
            // Add newline between pages
            textParts.push('\n');
          }
        }

        const fullText = textParts.join(' ');
        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    });

    pdfParser.loadPDF(filePath);
  });
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Check if a file extension is supported
 */
export function isSupportedFormat(extension: string): boolean {
  const supported = ['.txt', '.docx', '.doc', '.rtf', '.pdf'];
  return supported.includes(extension.toLowerCase());
}

/**
 * Get list of supported formats
 */
export function getSupportedFormats(): string[] {
  return ['TXT', 'DOCX', 'DOC', 'RTF', 'PDF'];
}

/**
 * Get file type from extension
 */
export function getMimeType(extension: string): string {
  const ext = extension.toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.rtf': 'application/rtf',
    '.pdf': 'application/pdf',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}
