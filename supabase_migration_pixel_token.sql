-- =====================================================================
-- MIGRAÇÃO PIXEL TOKEN — AdPulse
-- Adiciona suporte a access_token e provider na tabela product_pixels
-- =====================================================================

-- Adiciona colunas de access_token e provider se ainda não existem
ALTER TABLE public.product_pixels ADD COLUMN IF NOT EXISTS provider text DEFAULT 'facebook';
ALTER TABLE public.product_pixels ADD COLUMN IF NOT EXISTS access_token text;
ALTER TABLE public.product_pixels ADD COLUMN IF NOT EXISTS pixel_name text;
