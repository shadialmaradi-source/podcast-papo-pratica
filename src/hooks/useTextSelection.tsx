import { useState, useEffect, useCallback, RefObject } from 'react';

interface TextSelection {
  text: string;
  position: { x: number; y: number };
  fullSentence: string;
}

interface UseTextSelectionOptions {
  maxLength?: number;
  onSelectionTooLong?: (length: number) => void;
}

export function useTextSelection(
  containerRef: RefObject<HTMLElement>,
  options: UseTextSelectionOptions = {}
) {
  const { maxLength = 100, onSelectionTooLong } = options;
  const [selection, setSelection] = useState<TextSelection | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      
      if (!sel || sel.isCollapsed || sel.toString().trim().length === 0) {
        return;
      }

      // Check if selection is within our container
      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        return;
      }

      const selectedText = sel.toString().trim();
      
      // Check length limit
      if (selectedText.length > maxLength) {
        onSelectionTooLong?.(selectedText.length);
        return;
      }

      // Get position for popover
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Position relative to viewport, centered above selection
      const x = rect.left + rect.width / 2;
      const y = rect.top - 10;

      // Try to get full sentence from the paragraph/line
      let fullSentence = selectedText;
      const parentElement = range.commonAncestorContainer.parentElement;
      if (parentElement) {
        const parentText = parentElement.textContent || '';
        // Find sentence containing selection
        const sentences = parentText.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (sentence.includes(selectedText)) {
            fullSentence = sentence.trim();
            break;
          }
        }
      }

      setSelection({
        text: selectedText,
        position: { x, y },
        fullSentence,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Small delay to ensure selection is complete
      setTimeout(handleSelectionChange, 10);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Small delay for touch selection
      setTimeout(handleSelectionChange, 50);
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Don't clear if clicking on the popover or its children
      if (target.closest('[data-selection-popover]')) {
        return;
      }
      
      // Clear selection when clicking elsewhere
      if (selection && !container.contains(target)) {
        clearSelection();
      }
    };

    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [containerRef, maxLength, onSelectionTooLong, selection, clearSelection]);

  return { selection, clearSelection };
}

export default useTextSelection;
