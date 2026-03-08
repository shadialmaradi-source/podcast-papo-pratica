# Teacher Pricing Analysis

## Cost Per Lesson Type

| Lesson Type | Transcription | Exercise Gen | Total |
|------------|---------------|-------------|-------|
| Paragraph  | $0.00         | $0.06       | $0.06 |
| YouTube    | $0.024        | $0.06       | $0.084 |
| Speaking   | $0.00         | $0.12       | $0.12 |

*Whisper: $0.006/min audio. Average video: 3-5 min → ~$0.024.*
*GPT-4 exercise generation: ~$0.06 per lesson.*
*Speaking: topic + questions + translations: ~$0.12.*

## Tier Limits & Break-Even

| Tier | Price | Lessons/mo | Max Video | Worst-Case Cost | Profit |
|------|-------|-----------|-----------|-----------------|--------|
| Free | $0    | 10        | 5 min     | $0.84           | -$0.84 |
| Pro  | $19   | 60        | 10 min    | $5.04           | $13.96 (73%) |
| Premium | $39 | 160      | 15 min    | $16.80          | $22.20 (57%) |

## Usage Scenarios

**Light (Free):** 3 students, 6 lessons/mo → $0.49/mo cost.
**Active (Pro):** 15 students, 45 lessons/mo → $3.60/mo cost.
**Power (Premium):** 30 students, 120 lessons/mo → $9.48/mo cost.

## Video Duration Limits

| Tier | Max Duration | Upgrade Message |
|------|-------------|-----------------|
| Free | 5 min | "Upgrade to Pro for videos up to 10 min" |
| Pro  | 10 min | "Upgrade to Premium for videos up to 15 min" |
| Premium | 15 min | "Contact support for enterprise pricing" |

## Rationale

Free tier is a loss leader (~$0.84/mo max). Pro and Premium maintain 57-73% margins even at maximum usage. Limits are enforced client-side with server-side backup possible via RLS.
