import { useState } from "react";
import { ChevronDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  selectedTopic: string | null;
  selectedLength: string | null;
  onTopicChange: (topic: string | null) => void;
  onLengthChange: (length: string | null) => void;
}

const topics = [
  { id: null, label: 'All Topics' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'travel', label: 'Travel' },
  { id: 'daily', label: 'Daily Life' },
  { id: 'work', label: 'Work' },
  { id: 'culture', label: 'Culture' },
];

const lengths = [
  { id: null, label: 'Any Length' },
  { id: '0-60', label: '0-1 min' },
  { id: '60-180', label: '1-3 min' },
  { id: '180+', label: '3+ min' },
];

export function FilterBar({
  selectedTopic,
  selectedLength,
  onTopicChange,
  onLengthChange,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasActiveFilters = selectedTopic || selectedLength;

  const getTopicLabel = () => {
    const topic = topics.find(t => t.id === selectedTopic);
    return topic?.label || 'All Topics';
  };

  const getLengthLabel = () => {
    const length = lengths.find(l => l.id === selectedLength);
    return length?.label || 'Any Length';
  };

  const clearFilters = () => {
    onTopicChange(null);
    onLengthChange(null);
  };

  return (
    <div className="space-y-2">
      {/* Mobile toggle */}
      <div className="flex items-center justify-between md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {(selectedTopic ? 1 : 0) + (selectedLength ? 1 : 0)}
            </span>
          )}
          <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", isExpanded && "rotate-180")} />
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Filter dropdowns */}
      <div className={cn(
        "flex items-center gap-2 flex-wrap",
        !isExpanded && "hidden md:flex"
      )}>
        {/* Topic filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={selectedTopic ? "default" : "outline"}
              size="sm"
              className="gap-1"
            >
              {getTopicLabel()}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {topics.map((topic) => (
              <DropdownMenuItem
                key={topic.id || 'all'}
                onClick={() => onTopicChange(topic.id)}
                className={cn(selectedTopic === topic.id && "bg-accent")}
              >
                {topic.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Length filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={selectedLength ? "default" : "outline"}
              size="sm"
              className="gap-1"
            >
              {getLengthLabel()}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {lengths.map((length) => (
              <DropdownMenuItem
                key={length.id || 'all'}
                onClick={() => onLengthChange(length.id)}
                className={cn(selectedLength === length.id && "bg-accent")}
              >
                {length.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear button (desktop) */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hidden md:flex"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
