import { List, ChevronRight } from 'lucide-react';
import { Chapter } from '../services/api';

interface TableOfContentsProps {
  chapters: Chapter[];
  projectTitle: string;
}

export default function TableOfContents({ chapters, projectTitle }: TableOfContentsProps) {
  // Generate TOC from chapters
  const generateTOC = () => {
    if (chapters.length === 0) {
      return null;
    }

    return chapters.map((chapter, index) => {
      const chapterNumber = index + 1;
      const chapterTitle = chapter.title || `Sezione ${chapterNumber}`;
      const anchor = `chapter-${chapter.id}`;

      return {
        number: chapterNumber,
        title: chapterTitle,
        anchor: anchor,
        id: chapter.id,
      };
    });
  };

  const tocEntries = generateTOC();

  if (!tocEntries || tocEntries.length === 0) {
    return null;
  }

  const scrollToChapter = (chapterId: string) => {
    const element = document.getElementById(`chapter-${chapterId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <List className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Indice del Saggio
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Indice generato automaticamente dalle sezioni del saggio
        </p>
      </div>

      <div className="p-4">
        <nav aria-label="Table of Contents">
          <ol className="space-y-2">
            {tocEntries.map((entry) => (
              <li key={entry.id}>
                <button
                  onClick={() => scrollToChapter(entry.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                >
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 flex-shrink-0" />
                  <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-teal-700 dark:group-hover:text-teal-300">
                    {entry.number}.
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 flex-1">
                    {entry.title}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Export as text option for including in exports */}
      <div className="px-4 pb-4">
        <button
          onClick={() => {
            const tocText = `INDICE\n${'='.repeat('INDICE'.length)}\n\n${tocEntries.map(e => `${e.number}. ${e.title}`).join('\n')}`;
            navigator.clipboard.writeText(tocText);
          }}
          className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
        >
          Copia indice negli appunti
        </button>
      </div>
    </div>
  );
}
