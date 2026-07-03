ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS meta_revenue numeric DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS webhook_revenue numeric DEFAULT 0;
UPDATE public.user_stats SET meta_revenue = total_revenue WHERE meta_revenue = 0;
