import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export interface FlashcardExportData {
  id: string;
  phrase: string;
  translation: string;
  why: string;
  difficulty: string;
  videoTitle: string;
  language: string;
}

export interface UserPdfInfo {
  username: string;
  language: string;
}

// PDF dimensions in mm (A4)
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 10;
const CARD_WIDTH = 90;
const CARD_HEIGHT = 75;
const CARDS_PER_ROW = 2;
const CARDS_PER_PAGE = 6;

// Colors (RGB)
const PRIMARY_COLOR: [number, number, number] = [34, 197, 94]; // #22c55e
const TEXT_COLOR: [number, number, number] = [26, 26, 26]; // #1a1a1a
const MUTED_COLOR: [number, number, number] = [107, 114, 128]; // #6b7280
const BORDER_COLOR: [number, number, number] = [229, 231, 235]; // #e5e7eb

/**
 * Generate a PDF containing all user flashcards
 */
export async function generateFlashcardPDF(
  flashcards: FlashcardExportData[],
  userInfo: UserPdfInfo
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Create cover page
  createCoverPage(doc, userInfo, flashcards.length);

  // Create flashcard fronts
  createFlashcardFronts(doc, flashcards);

  // Create flashcard backs
  createFlashcardBacks(doc, flashcards);

  // Create footer page
  createFooterPage(doc);

  // Download the PDF
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const sanitizedUsername = userInfo.username.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `flashcards_${sanitizedUsername}_${dateStr}.pdf`;
  
  doc.save(filename);
}

/**
 * Create the cover page with branding and user info
 */
function createCoverPage(doc: jsPDF, userInfo: UserPdfInfo, cardCount: number): void {
  const centerX = PAGE_WIDTH / 2;
  
  // Background gradient simulation (light green rectangle)
  doc.setFillColor(240, 253, 244); // Light green bg
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  
  // Decorative circle
  doc.setFillColor(...PRIMARY_COLOR);
  doc.circle(centerX, 80, 30, 'F');
  
  // Book icon text (emojis not supported in jsPDF)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('LF', centerX, 85, { align: 'center' });
  
  // Title
  doc.setTextColor(...TEXT_COLOR);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('My Flashcards', centerX, 130, { align: 'center' });
  
  // Divider line
  doc.setDrawColor(...PRIMARY_COLOR);
  doc.setLineWidth(0.5);
  doc.line(centerX - 40, 145, centerX + 40, 145);
  
  // User info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED_COLOR);
  
  doc.text(`Created for: ${userInfo.username}`, centerX, 165, { align: 'center' });
  doc.text(`Language: ${formatLanguage(userInfo.language)}`, centerX, 180, { align: 'center' });
  doc.text(`Total cards: ${cardCount}`, centerX, 195, { align: 'center' });
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, centerX, 210, { align: 'center' });
  
  // App branding at bottom
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ListenFlow', centerX, 260, { align: 'center' });
  
  doc.setTextColor(...MUTED_COLOR);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Learn languages with real content', centerX, 270, { align: 'center' });
}

/**
 * Create pages with flashcard fronts (phrase + difficulty)
 */
function createFlashcardFronts(doc: jsPDF, flashcards: FlashcardExportData[]): void {
  for (let i = 0; i < flashcards.length; i++) {
    if (i % CARDS_PER_PAGE === 0) {
      doc.addPage();
      // Page header
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
      
      doc.setTextColor(...MUTED_COLOR);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const pageNum = Math.floor(i / CARDS_PER_PAGE) + 1;
      const totalPages = Math.ceil(flashcards.length / CARDS_PER_PAGE);
      doc.text(`Front Side - Page ${pageNum} of ${totalPages}`, MARGIN, MARGIN - 2);
    }

    const card = flashcards[i];
    const posInPage = i % CARDS_PER_PAGE;
    const row = Math.floor(posInPage / CARDS_PER_ROW);
    const col = posInPage % CARDS_PER_ROW;
    
    const x = MARGIN + col * (CARD_WIDTH + 5);
    const y = MARGIN + 5 + row * (CARD_HEIGHT + 5);
    
    drawCardFront(doc, x, y, card);
  }
}

/**
 * Create pages with flashcard backs (translation + context)
 */
function createFlashcardBacks(doc: jsPDF, flashcards: FlashcardExportData[]): void {
  for (let i = 0; i < flashcards.length; i++) {
    if (i % CARDS_PER_PAGE === 0) {
      doc.addPage();
      // Page header
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
      
      doc.setTextColor(...MUTED_COLOR);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const pageNum = Math.floor(i / CARDS_PER_PAGE) + 1;
      const totalPages = Math.ceil(flashcards.length / CARDS_PER_PAGE);
      doc.text(`Back Side - Page ${pageNum} of ${totalPages}`, MARGIN, MARGIN - 2);
    }

    const card = flashcards[i];
    const posInPage = i % CARDS_PER_PAGE;
    const row = Math.floor(posInPage / CARDS_PER_ROW);
    const col = posInPage % CARDS_PER_ROW;
    
    const x = MARGIN + col * (CARD_WIDTH + 5);
    const y = MARGIN + 5 + row * (CARD_HEIGHT + 5);
    
    drawCardBack(doc, x, y, card);
  }
}

/**
 * Draw a single flashcard front
 */
function drawCardFront(doc: jsPDF, x: number, y: number, card: FlashcardExportData): void {
  // Card background with border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, CARD_WIDTH, CARD_HEIGHT, 3, 3, 'FD');
  
  // Top accent bar
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(x, y, CARD_WIDTH, 3, 'F');
  
  // Phrase (centered, large)
  doc.setTextColor(...TEXT_COLOR);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  
  const phrase = card.phrase.toUpperCase();
  const phraseLines = doc.splitTextToSize(phrase, CARD_WIDTH - 10);
  const phraseY = y + CARD_HEIGHT / 2 - (phraseLines.length * 6);
  doc.text(phraseLines, x + CARD_WIDTH / 2, phraseY, { align: 'center' });
  
  // Difficulty badge at bottom
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED_COLOR);
  const difficultyText = `(${card.difficulty})`;
  doc.text(difficultyText, x + CARD_WIDTH / 2, y + CARD_HEIGHT - 10, { align: 'center' });
}

/**
 * Draw a single flashcard back
 */
function drawCardBack(doc: jsPDF, x: number, y: number, card: FlashcardExportData): void {
  // Card background with border
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, CARD_WIDTH, CARD_HEIGHT, 3, 3, 'FD');
  
  // Phrase at top (smaller)
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const phraseText = card.phrase.toUpperCase();
  doc.text(phraseText, x + 5, y + 12, { maxWidth: CARD_WIDTH - 10 });
  
  // Divider
  doc.setDrawColor(...BORDER_COLOR);
  doc.line(x + 5, y + 17, x + CARD_WIDTH - 5, y + 17);
  
  // Translation
  doc.setTextColor(...TEXT_COLOR);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const translationLines = doc.splitTextToSize(card.translation, CARD_WIDTH - 10);
  doc.text(translationLines.slice(0, 2), x + 5, y + 26);
  
  // "Why" context
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  doc.setFont('helvetica', 'italic');
  const whyText = `Why: ${card.why}`;
  const whyLines = doc.splitTextToSize(whyText, CARD_WIDTH - 10);
  doc.text(whyLines.slice(0, 3), x + 5, y + 45);
  
  // Source at bottom
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED_COLOR);
  const sourceText = card.videoTitle ? `From: ${truncateText(card.videoTitle, 30)}` : '';
  if (sourceText) {
    doc.text(sourceText, x + 5, y + CARD_HEIGHT - 5);
  }
}

/**
 * Create footer page with branding
 */
function createFooterPage(doc: jsPDF): void {
  doc.addPage();
  const centerX = PAGE_WIDTH / 2;
  
  doc.setFillColor(240, 253, 244);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  
  // Thank you message
  doc.setTextColor(...TEXT_COLOR);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Happy Learning!', centerX, 120, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED_COLOR);
  doc.text('Print these cards and practice anywhere!', centerX, 140, { align: 'center' });
  doc.text('Cut along the lines for individual flashcards.', centerX, 155, { align: 'center' });
  
  // Tips
  doc.setFontSize(10);
  doc.text('Tips for studying:', centerX, 180, { align: 'center' });
  doc.text('• Review cards daily for best retention', centerX, 195, { align: 'center' });
  doc.text('• Quiz yourself with fronts first, then backs', centerX, 207, { align: 'center' });
  doc.text('• Mark cards you know well and focus on difficult ones', centerX, 219, { align: 'center' });
  
  // Branding
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ListenFlow', centerX, 260, { align: 'center' });
  
  doc.setTextColor(...MUTED_COLOR);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('listenflow.lovable.app', centerX, 270, { align: 'center' });
}

/**
 * Format language name for display
 */
function formatLanguage(lang: string): string {
  const languages: Record<string, string> = {
    portuguese: 'Portuguese (BR)',
    english: 'English (US)',
    spanish: 'Spanish (ES)',
    french: 'French (FR)',
    italian: 'Italian (IT)',
  };
  return languages[lang.toLowerCase()] || lang;
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
