export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  readTime: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "why-listening-first",
    title: "Why Listening First? The Science Behind Comprehensible Input",
    excerpt:
      "Decades of research show that language acquisition starts with listening. Here's why ListenFlow puts real conversations at the center of learning.",
    date: "2026-03-20",
    author: "ListenFlow Team",
    readTime: "4 min read",
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
];
