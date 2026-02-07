import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, BookOpen, Loader2 } from 'lucide-react';
import { type WordAnalysis } from '@/services/wordAnalysisService';

interface WordExplorerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: string;
  language: string;
  analysis: WordAnalysis | null;
  loading: boolean;
  onSaveFlashcard: () => void;
}

const PRONOUN_LABELS: Record<string, string> = {
  io: 'io',
  tu: 'tu',
  lui_lei: 'lui/lei',
  noi: 'noi',
  voi: 'voi',
  loro: 'loro',
};

export function WordExplorerPanel({
  open,
  onOpenChange,
  word,
  language,
  analysis,
  loading,
  onSaveFlashcard,
}: WordExplorerPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[440px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Explore Word
          </SheetTitle>
        </SheetHeader>

        {/* Word header */}
        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold text-foreground">{word}</h2>
          {loading ? (
            <Skeleton className="h-5 w-32" />
          ) : analysis ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{analysis.partOfSpeech}</Badge>
              {analysis.extras?.formality && (
                <Badge variant="outline">{analysis.extras.formality}</Badge>
              )}
              {analysis.extras?.gender && (
                <Badge variant="outline">{analysis.extras.gender}</Badge>
              )}
            </div>
          ) : null}
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : analysis ? (
          <div className="space-y-6">
            {/* Translation */}
            <Section title="Translation">
              <p className="text-lg font-medium text-foreground">{analysis.translation}</p>
            </Section>

            {/* Example sentence */}
            <Section title="Example">
              <p className="text-foreground italic">{analysis.exampleSentence}</p>
              <p className="text-sm text-muted-foreground mt-1">{analysis.exampleTranslation}</p>
            </Section>

            {/* Verb conjugation */}
            {analysis.partOfSpeech === 'verb' && analysis.extras?.conjugation && (
              <Section title="Conjugation">
                {analysis.extras.conjugation.infinitive && (
                  <p className="text-sm text-muted-foreground mb-3">
                    Infinitive: <span className="font-medium text-foreground">{analysis.extras.conjugation.infinitive}</span>
                  </p>
                )}
                <ConjugationTable conjugation={analysis.extras.conjugation} />
              </Section>
            )}

            {/* Noun details */}
            {analysis.partOfSpeech === 'noun' && (
              <>
                {analysis.extras?.plural && (
                  <Section title="Plural">
                    <p className="text-foreground font-medium">{analysis.extras.plural}</p>
                  </Section>
                )}
              </>
            )}

            {/* Adjective forms */}
            {analysis.partOfSpeech === 'adjective' && analysis.extras?.forms && (
              <Section title="Forms">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {analysis.extras.forms.masculine_singular && (
                    <FormItem label="Masc. Sing." value={analysis.extras.forms.masculine_singular} />
                  )}
                  {analysis.extras.forms.feminine_singular && (
                    <FormItem label="Fem. Sing." value={analysis.extras.forms.feminine_singular} />
                  )}
                  {analysis.extras.forms.masculine_plural && (
                    <FormItem label="Masc. Plur." value={analysis.extras.forms.masculine_plural} />
                  )}
                  {analysis.extras.forms.feminine_plural && (
                    <FormItem label="Fem. Plur." value={analysis.extras.forms.feminine_plural} />
                  )}
                  {analysis.extras.forms.comparative && (
                    <FormItem label="Comparative" value={analysis.extras.forms.comparative} />
                  )}
                  {analysis.extras.forms.superlative && (
                    <FormItem label="Superlative" value={analysis.extras.forms.superlative} />
                  )}
                </div>
              </Section>
            )}

            {/* Phrase literal meaning */}
            {analysis.extras?.literalMeaning && (
              <Section title="Literal Meaning">
                <p className="text-foreground">{analysis.extras.literalMeaning}</p>
              </Section>
            )}

            {/* Usage notes */}
            {analysis.extras?.usageNotes && (
              <Section title="Usage Notes">
                <p className="text-sm text-muted-foreground">{analysis.extras.usageNotes}</p>
              </Section>
            )}

            {/* Related words */}
            {analysis.extras?.relatedWords && analysis.extras.relatedWords.length > 0 && (
              <Section title="Related Words">
                <div className="flex flex-wrap gap-2">
                  {analysis.extras.relatedWords.map((rw, i) => (
                    <Badge key={i} variant="outline" className="text-sm py-1">
                      {rw.word} — {rw.translation}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Save as flashcard */}
            <Button onClick={onSaveFlashcard} className="w-full gap-2">
              <Sparkles className="w-4 h-4" />
              Save as Flashcard
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Could not analyze this word. Please try again.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FormItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded p-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}

function ConjugationTable({ conjugation }: { conjugation: NonNullable<WordAnalysis['extras']>['conjugation'] }) {
  if (!conjugation) return null;

  const tenses = [
    { key: 'present', label: 'Present' },
    { key: 'past', label: 'Past' },
    { key: 'future', label: 'Future' },
  ].filter((t) => conjugation[t.key as keyof typeof conjugation]);

  const pronouns = ['io', 'tu', 'lui_lei', 'noi', 'voi', 'loro'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium"></th>
            {tenses.map((t) => (
              <th key={t.key} className="text-left py-1.5 px-2 text-muted-foreground font-medium">
                {t.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pronouns.map((pronoun) => (
            <tr key={pronoun} className="border-b border-border/50">
              <td className="py-1.5 pr-3 text-muted-foreground font-medium">
                {PRONOUN_LABELS[pronoun] || pronoun}
              </td>
              {tenses.map((t) => {
                const tenseData = conjugation[t.key as keyof typeof conjugation];
                const value = typeof tenseData === 'object' && tenseData !== null
                  ? (tenseData as Record<string, string>)[pronoun] || '—'
                  : '—';
                return (
                  <td key={t.key} className="py-1.5 px-2 text-foreground">
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div>
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-3/4 mt-1" />
      </div>
      <div>
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div>
        <Skeleton className="h-3 w-20 mb-2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  );
}

export default WordExplorerPanel;
