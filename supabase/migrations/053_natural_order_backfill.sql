-- ===========================================================================
-- 053_natural_order_backfill.sql
-- ---------------------------------------------------------------------------
-- WHY: Bundle items historically saved with sort_order = the admin's click
-- order in the task-form picker. That meant a YouTube bundle could persist
-- as "Like Video -> Comment -> Watch Video" if the admin clicked them in
-- that sequence -- even though no worker can like or comment a video they
-- haven't watched. Going forward the server enforces natural order on save
-- (see sortBundleItemsByNaturalFlow in lib/actions/tasks.ts), and this
-- one-shot migration backfills every existing task so the sequential gate
-- (Entry #16) reflects the natural workflow across the board.
--
-- IMPACT: Rewrites task_bundle_items.sort_order for every existing row.
-- No data destroyed -- only the ordering numeric is recomputed. Workers
-- with live in-flight assignments will see the order shift on next page
-- load; the sequential gate re-evaluates each render so the workflow stays
-- correct (a step that was already submitted/approved still counts as
-- submitted/approved regardless of its new position).
--
-- ROLLBACK: Click order was not preserved, so this migration is one-way.
-- Restore from backup if needed.
-- ===========================================================================

-- Re-numbering is purely an UPDATE; it's safely re-runnable because the
-- `IS DISTINCT FROM` guard skips rows that are already in the correct
-- position. CTE uses the same tier breakpoints as the TS helper
-- (lib/constants/action-priority.ts) so client + server + DB agree.
WITH ranked AS (
  SELECT
    bi.id,
    ROW_NUMBER() OVER (
      PARTITION BY bi.task_id
      ORDER BY
        CASE
          -- 0. Review-context overrides (special-cased FIRST so the generic
          -- save-/share- patterns below don't pull these into tiers 3 / 5).
          WHEN tt.slug IN ('mark-useful', 'mark-helpful')                            THEN 7.85
          WHEN tt.slug IN ('save-business', 'save-place', 'save-to-trip')            THEN 7.9
          WHEN tt.slug IN ('share-listing', 'share-recommendation', 'share-location') THEN 7.95

          -- 1. Foundation -- passive consumption, must do first
          WHEN tt.slug ~ '^(watch-|stream-|hifi-stream|play-track|visit-page|scroll-to-end)' THEN 1.0

          -- 2. Quick reactions
          WHEN tt.slug IN ('upvote', 'upvote-answer')                                THEN 2.0
          WHEN tt.slug ~ '^(like-|react-)'                                           THEN 2.5

          -- 3. Save / bookmark / collect (pre-save is a deferred save)
          WHEN tt.slug ~ '^(save-|add-to-|bookmark-|pre-save-)'                      THEN 3.0

          -- 4. Text engagement
          WHEN tt.slug ~ '^(comment(-|$)|reply-|leave-comment|leave-public-comment|comment-on-)' THEN 4.0
          WHEN tt.slug ~ '^quote-'                                                   THEN 4.5

          -- 5. Sharing
          WHEN tt.slug ~ '^(share-|retweet|repost-|forward-message|send-message|react-message)' THEN 5.0

          -- 6. Follow / subscribe / connect / bell
          WHEN tt.slug ~ '^(follow-|subscribe|connect|join-|turn-on-bell)'           THEN 6.0

          -- 7.x Review-specific natural order
          WHEN tt.slug ~ '^rate(-|$)'                                                THEN 7.1
          WHEN tt.slug ~ '^(write-review|write-answer|review-text)'                  THEN 7.2
          WHEN tt.slug ~ '^(pros-|cons-|recommend$|yes-recommend|approve-ceo)'       THEN 7.3
          WHEN tt.slug ~ '^(add-photo|upload-photo|add-product-photo)'               THEN 7.4
          WHEN tt.slug ~ '^(verify-|verified-|mark-verified)'                        THEN 7.5
          WHEN tt.slug ~ '^check-?in'                                                THEN 7.6
          WHEN tt.slug = 'answer-qa'                                                 THEN 7.7
          WHEN tt.slug ~ '^(salary-|interview-|tag-)'                                THEN 7.8

          -- 8.x Heavy creation
          WHEN tt.slug ~ '^(create-|post-tweet|post-story|post-in-)'                 THEN 8.1
          WHEN tt.slug ~ '^(cross-post|pin-to-multi|multi-pages|multi-groups)'       THEN 8.2
          WHEN tt.slug ~ '^(buy-track|download-track)'                               THEN 8.3
          WHEN tt.slug ~ '^(duet-|give-award)'                                       THEN 8.4

          -- 9. Always last -- ongoing commitment
          WHEN tt.slug ~ '^keep-'                                                    THEN 9.0

          -- Unknown -- middle of the pack (matches the TS helper's fallback)
          ELSE 5.5
        END,
        -- Stable tie-break: preserve prior sort_order so same-tier items keep
        -- their relative order (matters when an admin picked multiple
        -- comment-* or share-* actions and we don't want to scramble them).
        bi.sort_order,
        bi.id
    ) - 1 AS new_sort_order
  FROM task_bundle_items bi
  JOIN task_types tt ON tt.id = bi.task_type_id
)
UPDATE task_bundle_items bi
SET sort_order = ranked.new_sort_order
FROM ranked
WHERE bi.id = ranked.id
  AND bi.sort_order IS DISTINCT FROM ranked.new_sort_order;
