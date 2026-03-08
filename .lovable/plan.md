

# Plan: Insert 20 Promo Codes

Insert 20 promo codes into the existing `promo_codes` table:

- **10 codes** with `type = 'duration'` and `duration_months = 1` (1-month free trial)
- **10 codes** with `type = 'unlimited'` and `duration_months = NULL` (forever/lifetime)

Code format: `TRIAL1M-XXXX` for 1-month codes, `FOREVER-XXXX` for lifetime codes (easy to distinguish).

### Codes to insert

**1-Month codes:**
`TRIAL1M-A001`, `TRIAL1M-A002`, `TRIAL1M-A003`, `TRIAL1M-A004`, `TRIAL1M-A005`, `TRIAL1M-A006`, `TRIAL1M-A007`, `TRIAL1M-A008`, `TRIAL1M-A009`, `TRIAL1M-A010`

**Forever codes:**
`FOREVER-B001`, `FOREVER-B002`, `FOREVER-B003`, `FOREVER-B004`, `FOREVER-B005`, `FOREVER-B006`, `FOREVER-B007`, `FOREVER-B008`, `FOREVER-B009`, `FOREVER-B010`

All codes: `active = true`, `max_uses = 1` (single use each), `current_uses = 0`.

### Implementation
Single SQL INSERT via the Supabase insert tool -- no schema changes needed.

