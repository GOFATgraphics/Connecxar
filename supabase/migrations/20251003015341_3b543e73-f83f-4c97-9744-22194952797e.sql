-- Add parent_comment_id to comments table for nested replies
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Add index for faster nested comment queries
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_comment_id);

-- Add index for faster post comments queries
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);

-- Add index for faster comment likes queries
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);

-- Function to get comment likes count
CREATE OR REPLACE FUNCTION get_comment_likes_count(comment_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)
  FROM comment_likes
  WHERE comment_likes.comment_id = $1;
$$;