-- Add comment column to questions table
-- Table name has spaces: "questões crs"

ALTER TABLE public."questões crs" 
ADD COLUMN IF NOT EXISTS "comentario" text;

COMMENT ON COLUMN public."questões crs"."comentario" IS 'Explanation or comment displayed after answering the question';
