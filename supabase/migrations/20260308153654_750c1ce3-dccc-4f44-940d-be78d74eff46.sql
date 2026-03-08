
CREATE TABLE public.teacher_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.teacher_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can select own subscription" ON public.teacher_subscriptions FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Service role can manage teacher subscriptions" ON public.teacher_subscriptions FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Teachers can insert own subscription" ON public.teacher_subscriptions FOR INSERT WITH CHECK (auth.uid() = teacher_id);
