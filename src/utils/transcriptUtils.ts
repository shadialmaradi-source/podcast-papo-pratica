export interface TranscriptSegment {
  timestamp: string;      // "00:00" or "00:00:00"
  timeSeconds: number;    // Time in seconds
  text: string;           // Transcript text
}

/**
 * Parse raw transcript text into structured segments with timestamps
 * Handles formats like "(00:00)" or "[00:00]" at the start of lines
 */
export function parseTranscript(rawTranscript: string): TranscriptSegment[] {
  if (!rawTranscript || typeof rawTranscript !== 'string') {
    return [];
  }

  const segments: TranscriptSegment[] = [];
  const lines = rawTranscript.split('\n');
  
  // Regex to match timestamps in formats: (00:00), [00:00], (00:00:00), [00:00:00]
  const timestampRegex = /^[\(\[]((\d{1,2}:)?\d{1,2}:\d{2})[\)\]]\s*/;
  
  let currentSegment: TranscriptSegment | null = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // Skip header lines (title, URL, "Transcript:" header)
    if (trimmedLine.startsWith('http') || 
        trimmedLine.toLowerCase() === 'transcript:' ||
        trimmedLine.includes(' - YouTube')) {
      continue;
    }
    
    const match = trimmedLine.match(timestampRegex);
    
    if (match) {
      // Save previous segment if exists
      if (currentSegment) {
        segments.push(currentSegment);
      }
      
      const timestamp = match[1];
      const text = trimmedLine.replace(timestampRegex, '').trim();
      
      currentSegment = {
        timestamp,
        timeSeconds: timestampToSeconds(timestamp),
        text,
      };
    } else if (currentSegment) {
      // Append to current segment's text
      currentSegment.text += ' ' + trimmedLine;
    } else {
      // Line without timestamp and no current segment - create one at 0:00
      currentSegment = {
        timestamp: '0:00',
        timeSeconds: 0,
        text: trimmedLine,
      };
    }
  }
  
  // Don't forget the last segment
  if (currentSegment) {
    segments.push(currentSegment);
  }
  
  return segments;
}

/**
 * Convert timestamp string to seconds
 * Supports formats: "0:00", "00:00", "0:00:00", "00:00:00"
 */
export function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(p => parseInt(p, 10));
  
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }
  
  return 0;
}

/**
 * Convert seconds to timestamp string
 */
export function secondsToTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Find the index of the segment for the current playback time
 */
export function getCurrentSegmentIndex(segments: TranscriptSegment[], currentTimeSeconds: number): number {
  if (segments.length === 0) return -1;
  
  // Find the last segment that starts at or before current time
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].timeSeconds <= currentTimeSeconds) {
      return i;
    }
  }
  
  return 0;
}

/**
 * Extract the full sentence containing a selection from a text
 * Uses basic punctuation to determine sentence boundaries
 */
export function getFullSentence(fullText: string, selection: string): string {
  const selectionIndex = fullText.indexOf(selection);
  
  if (selectionIndex === -1) {
    return selection;
  }
  
  // Find sentence start (look backward for sentence-ending punctuation)
  let sentenceStart = 0;
  for (let i = selectionIndex - 1; i >= 0; i--) {
    if (['.', '!', '?', '\n'].includes(fullText[i])) {
      sentenceStart = i + 1;
      break;
    }
  }
  
  // Find sentence end (look forward for sentence-ending punctuation)
  let sentenceEnd = fullText.length;
  for (let i = selectionIndex + selection.length; i < fullText.length; i++) {
    if (['.', '!', '?', '\n'].includes(fullText[i])) {
      sentenceEnd = i + 1;
      break;
    }
  }
  
  return fullText.substring(sentenceStart, sentenceEnd).trim();
}

/**
 * Check if a phrase is too long for a flashcard
 */
export function isPhraseValid(phrase: string, maxLength: number = 100): { valid: boolean; message?: string } {
  const trimmed = phrase.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, message: 'Please select some text' };
  }
  
  if (trimmed.length > maxLength) {
    return { valid: false, message: `Selection too long (${trimmed.length}/${maxLength} characters). Please select a shorter phrase.` };
  }
  
  return { valid: true };
}

/**
 * Normalize phrase for comparison (lowercase, trim, collapse whitespace)
 */
export function normalizePhrase(phrase: string): string {
  return phrase.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if a phrase contains any of the saved phrases
 */
export function containsSavedPhrase(text: string, savedPhrases: string[]): string | null {
  const normalizedText = normalizePhrase(text);
  
  for (const saved of savedPhrases) {
    const normalizedSaved = normalizePhrase(saved);
    if (normalizedText.includes(normalizedSaved)) {
      return saved;
    }
  }
  
  return null;
}

/**
 * Get preview text for locked transcript (first N segments)
 */
export function getTranscriptPreview(segments: TranscriptSegment[], previewCount: number = 2): string {
  return segments
    .slice(0, previewCount)
    .map(s => `(${s.timestamp}) ${s.text}`)
    .join('\n');
}
