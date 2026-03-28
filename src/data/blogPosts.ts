export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  readTime: string;
  language: string;
  content: string;
}

/** Helper: get all unique base slugs (without language suffix) */
export const getBlogBaseSlugs = (): string[] => {
  const bases = new Set(blogPosts.map((p) => p.slug.replace(/-(?:it|es|pt)$/, "")));
  return Array.from(bases);
};

/** Get all language versions available for a given base slug */
export const getLanguageVersions = (slug: string): { language: string; slug: string; flag: string }[] => {
  const baseSlug = slug.replace(/-(?:it|es|pt)$/, "");
  const flags: Record<string, string> = { en: "🇬🇧", it: "🇮🇹", es: "🇪🇸", pt: "🇧🇷" };
  return blogPosts
    .filter((p) => p.slug.replace(/-(?:it|es|pt)$/, "") === baseSlug)
    .map((p) => ({ language: p.language, slug: p.slug, flag: flags[p.language] || "🌐" }));
};

export const blogPosts: BlogPost[] = [
  // ── English ────────────────────────────────────────────
  {
    slug: "why-listening-first",
    title: "Why Listening First? The Science Behind Comprehensible Input",
    excerpt:
      "Decades of research show that language acquisition starts with listening. Here's why ListenFlow puts real conversations at the center of learning.",
    date: "2026-03-20",
    author: "ListenFlow Team",
    readTime: "4 min read",
    language: "en",
    content: `Language learning has been dominated by grammar drills and vocabulary lists for decades. But research tells a different story.

## The Input Hypothesis

In the 1980s, linguist Stephen Krashen proposed that we acquire language primarily through **comprehensible input** — hearing or reading language that is just slightly above our current level.

This idea, known as the Input Hypothesis (i+1), suggests that conscious grammar study plays a much smaller role than most textbooks assume.

## From Theory to Practice

ListenFlow applies this research directly. Instead of artificial dialogues, you listen to **real conversations** — the same content native speakers enjoy. Each 60-second clip is selected to match your level, so the input stays comprehensible.

## What About Speaking?

Krashen's work is complemented by Merrill Swain's **Output Hypothesis**, which shows that producing language (speaking, writing) is essential for noticing gaps in your knowledge. That's why every ListenFlow lesson ends with a speaking step — you practice the phrases you just heard in context.

## The Result

By combining listening-first input with targeted speaking output, ListenFlow mirrors how children naturally acquire their first language — and how adults can do it more efficiently.`,
  },
  {
    slug: "60-second-lessons-work",
    title: "Why 60-Second Lessons Actually Work",
    excerpt:
      "Short doesn't mean shallow. Micro-lessons backed by spaced repetition and active recall can outperform hour-long study sessions.",
    date: "2026-03-10",
    author: "ListenFlow Team",
    readTime: "3 min read",
    language: "en",
    content: `You might think a 60-second lesson can't teach much. But cognitive science disagrees.

## The Spacing Effect

Research shows that **distributed practice** — short sessions spread over time — leads to stronger long-term retention than massed practice (cramming). A single focused minute, repeated daily, compounds faster than you'd expect.

## Active Recall in Every Lesson

Each ListenFlow lesson follows a three-step loop:

1. **Watch** a 60-second clip from a real conversation
2. **Answer** 10 comprehension questions (active recall)
3. **Speak** 5 key phrases (output practice)

Every step forces your brain to retrieve and apply what you just heard — the most effective form of learning.

## Consistency Over Intensity

The biggest predictor of language-learning success isn't talent or hours studied — it's **consistency**. Sixty seconds is short enough to fit into any day, removing the biggest barrier to regular practice.

## The Bottom Line

Short lessons aren't a shortcut. They're a research-backed strategy for building durable language skills, one minute at a time.`,
  },
  {
    slug: "real-content-vs-textbooks",
    title: "Real Content vs. Textbooks: What Works Better?",
    excerpt:
      "Textbook dialogues feel safe but don't prepare you for real conversations. Here's why authentic content accelerates fluency.",
    date: "2026-02-28",
    author: "ListenFlow Team",
    readTime: "3 min read",
    language: "en",
    content: `If you've ever understood your textbook perfectly but frozen in a real conversation, you're not alone.

## The Textbook Trap

Traditional courses use **scripted dialogues** with controlled vocabulary and unnaturally slow speech. They're easy to follow — but they don't prepare you for how people actually talk.

Real speech includes hesitations, contractions, slang, background noise, and speed variation. If you never practice with these, your first real conversation will feel overwhelming.

## Authentic Input

ListenFlow uses clips from **real YouTube videos and podcasts** — the same content native speakers watch and listen to. This means you hear natural pacing, colloquial expressions, and varied accents from day one.

## Scaffolded Difficulty

Authentic content doesn't mean throwing you into the deep end. ListenFlow selects clips matched to your level and provides:

- Playback speed control
- Targeted comprehension questions
- Key phrase extraction with translations

You get the benefits of real input with the support of a structured lesson.

## Why It Matters

When you finally have a conversation in your target language, you'll recognize the rhythms, fillers, and patterns you've been hearing all along. That's the difference between textbook knowledge and real fluency.`,
  },

  // ── Italian translations ───────────────────────────────
  {
    slug: "why-listening-first-it",
    title: "Perché ascoltare prima? La scienza dietro l'input comprensibile",
    excerpt:
      "Decenni di ricerche dimostrano che l'acquisizione linguistica inizia dall'ascolto. Ecco perché ListenFlow mette le conversazioni reali al centro dell'apprendimento.",
    date: "2026-03-20",
    author: "ListenFlow Team",
    readTime: "4 min",
    language: "it",
    content: `L'apprendimento delle lingue è stato dominato da esercizi di grammatica e liste di vocaboli per decenni. Ma la ricerca racconta una storia diversa.

## L'ipotesi dell'input

Negli anni '80, il linguista Stephen Krashen propose che acquisiamo la lingua principalmente attraverso l'**input comprensibile** — ascoltando o leggendo lingua che è leggermente al di sopra del nostro livello attuale.

Questa idea, nota come Ipotesi dell'Input (i+1), suggerisce che lo studio consapevole della grammatica gioca un ruolo molto più piccolo di quanto la maggior parte dei libri di testo presuma.

## Dalla teoria alla pratica

ListenFlow applica questa ricerca direttamente. Invece di dialoghi artificiali, ascolti **conversazioni reali** — gli stessi contenuti che i madrelingua apprezzano. Ogni clip di 60 secondi è selezionato per corrispondere al tuo livello.

## E il parlato?

Il lavoro di Krashen è completato dall'**Ipotesi dell'Output** di Merrill Swain, che dimostra che produrre lingua (parlare, scrivere) è essenziale per notare le lacune nella propria conoscenza. Ecco perché ogni lezione di ListenFlow termina con un esercizio di speaking.

## Il risultato

Combinando input basato sull'ascolto con output di speaking mirato, ListenFlow rispecchia il modo in cui i bambini acquisiscono naturalmente la loro prima lingua.`,
  },
  {
    slug: "60-second-lessons-work-it",
    title: "Perché le lezioni da 60 secondi funzionano davvero",
    excerpt:
      "Breve non significa superficiale. Le micro-lezioni supportate dalla ripetizione spaziata possono superare sessioni di studio di un'ora.",
    date: "2026-03-10",
    author: "ListenFlow Team",
    readTime: "3 min",
    language: "it",
    content: `Potresti pensare che una lezione di 60 secondi non possa insegnare molto. Ma le scienze cognitive non sono d'accordo.

## L'effetto di spaziatura

La ricerca dimostra che la **pratica distribuita** — sessioni brevi distribuite nel tempo — porta a una ritenzione a lungo termine più forte rispetto alla pratica massiva (studiare tutto insieme).

## Richiamo attivo in ogni lezione

Ogni lezione di ListenFlow segue un ciclo in tre fasi:

1. **Guarda** un clip di 60 secondi da una conversazione reale
2. **Rispondi** a 10 domande di comprensione
3. **Parla** 5 frasi chiave

Ogni passaggio costringe il tuo cervello a recuperare e applicare ciò che hai appena sentito.

## Costanza, non intensità

Il miglior predittore del successo nell'apprendimento linguistico non è il talento — è la **costanza**. Sessanta secondi sono abbastanza brevi da inserirsi in qualsiasi giornata.

## In conclusione

Le lezioni brevi non sono una scorciatoia. Sono una strategia supportata dalla ricerca per costruire competenze linguistiche durature, un minuto alla volta.`,
  },

  // ── Spanish translations ───────────────────────────────
  {
    slug: "why-listening-first-es",
    title: "¿Por qué escuchar primero? La ciencia detrás del input comprensible",
    excerpt:
      "Décadas de investigación demuestran que la adquisición del idioma comienza con la escucha. Así es como ListenFlow pone las conversaciones reales en el centro.",
    date: "2026-03-20",
    author: "ListenFlow Team",
    readTime: "4 min",
    language: "es",
    content: `El aprendizaje de idiomas ha estado dominado por ejercicios de gramática y listas de vocabulario durante décadas. Pero la investigación cuenta una historia diferente.

## La hipótesis del input

En los años 80, el lingüista Stephen Krashen propuso que adquirimos el lenguaje principalmente a través del **input comprensible** — escuchando o leyendo lenguaje que está ligeramente por encima de nuestro nivel actual.

Esta idea, conocida como la Hipótesis del Input (i+1), sugiere que el estudio consciente de la gramática juega un papel mucho menor de lo que la mayoría de los libros de texto asumen.

## De la teoría a la práctica

ListenFlow aplica esta investigación directamente. En lugar de diálogos artificiales, escuchas **conversaciones reales** — el mismo contenido que disfrutan los hablantes nativos.

## ¿Y hablar?

El trabajo de Krashen se complementa con la **Hipótesis del Output** de Merrill Swain, que muestra que producir lenguaje es esencial para notar las lagunas en tu conocimiento. Por eso cada lección de ListenFlow termina con un ejercicio de habla.

## El resultado

Al combinar input basado en la escucha con output de habla dirigido, ListenFlow refleja cómo los niños adquieren naturalmente su primera lengua.`,
  },
];
