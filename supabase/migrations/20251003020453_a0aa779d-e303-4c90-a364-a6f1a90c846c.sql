-- Fix function search path security issue
CREATE OR REPLACE FUNCTION get_comment_likes_count(comment_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM comment_likes
  WHERE comment_likes.comment_id = $1;
$$;