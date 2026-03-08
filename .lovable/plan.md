

# Plan: Clean Up Pricing Tiers

Remove specific features from the pricing cards and comparison table.

## Changes (single file: `src/pages/TeacherPricing.tsx`)

### Pricing Cards
- **Pro tier**: Remove "Priority support" from features list
- **Premium tier**: Remove "API access" and "Dedicated support" from features list; remove the "Contact Sales" button

### Comparison Table
- Remove the "Support" and "API Access" rows from `comparisonRows`

