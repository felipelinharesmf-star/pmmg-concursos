-- Create user_bookmarks table
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    question_id BIGINT NOT NULL, -- Assuming 'questões crs'.ID is bigint
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, question_id)
);

-- Enable RLS
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own bookmarks"
ON public.user_bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bookmarks"
ON public.user_bookmarks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
ON public.user_bookmarks FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_question ON public.user_bookmarks(user_id, question_id);
