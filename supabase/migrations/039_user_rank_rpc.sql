-- 039_user_rank_rpc.sql
-- Replace JS-side rank computation with a Postgres function.
--
-- The previous `getUserDashboardStats` impl pulled every active user's
-- user_id over the wire, then ran `findIndex` on the array to figure out
-- the caller's rank. At 10k active users that's 10k rows transferred per
-- dashboard load.
--
-- This function uses RANK() OVER (ORDER BY total_points DESC) within the
-- pool of active users and returns just the integer rank for the given
-- user — one round-trip, no list transfer. Returns NULL if the user has
-- no profile or isn't active (caller can default to "unranked").

CREATE OR REPLACE FUNCTION public.get_user_rank(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT rank::int FROM (
    SELECT user_id, RANK() OVER (ORDER BY total_points DESC) AS rank
    FROM profiles
    WHERE status = 'active'
  ) ranked
  WHERE user_id = p_user_id;
$$;
