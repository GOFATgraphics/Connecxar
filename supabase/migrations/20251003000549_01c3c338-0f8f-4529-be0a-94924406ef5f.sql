-- Create story_views table to track who viewed which stories
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Story views are viewable by story owner"
  ON public.story_views FOR SELECT
  USING (
    story_id IN (
      SELECT id FROM public.stories WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can record their own story views"
  ON public.story_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX idx_story_views_user_id ON public.story_views(user_id);