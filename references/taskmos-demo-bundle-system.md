# Reference Notes — `taskmos-demo (2).html`

> **Captured:** 2026-05-24 from a self-contained HTML demo the user shared.
> **Purpose:** Behavior-only extract per `phnote.md` §26. Styling / colors / class names / fonts (Bricolage Grotesque, Geist, Hind Siliguri, lime-on-near-black palette, Tailwind CDN) are **explicitly ignored** — TaskMOS implementation will use its own design system (`components/ui/`, purple/pink tokens, lucide, Inter).
> **Status:** Reference only. No implementation has been done. When the user says "ai feature ta baniye den", refer back here.

---

## 1. What the demo is

A single-page HTML mock of a **Group Task Bundle** system with two views switchable via a top-right toggle:

1. **Worker / User view** — browse available bundles, accept and submit proof, see your submissions/history.
2. **Admin / Creator view** — review pending submissions, create new bundles, manage campaigns.

The demo is feature-rich — 43 bundle examples spanning 27 platforms in 4 categories, each with platform-specific action sets, credit values, content fields, and worker instructions.

---

## 2. Top-level structure

| Section | Worker view | Admin view |
|---|---|---|
| Hero stats | Balance, Tasks Done, Worker Tier, Withdraw button | Active Campaigns, Pending Review, Total Engagement, Budget Used |
| Tab 1 | Available Bundles (grid of 43 cards) | Review Queue (list + detail split) |
| Tab 2 | My Submissions (table-like rows) | Create Bundle (form + live preview) |
| Tab 3 | History (placeholder summary) | My Campaigns (list of live + paused campaigns) |
| Persistent header | Logo, role toggle, credit balance, avatar | (same) |

---

## 3. Platform categories (27 platforms in 4 groups)

### 3.1 Social Media (10)
Instagram · Facebook · X/Twitter · Threads · YouTube · TikTok · LinkedIn · Pinterest · Reddit · Quora

### 3.2 Music Streaming (5)
Spotify · TIDAL · Deezer · SoundCloud · Bandcamp

### 3.3 Review Sites (10) — "business promotion" category
Google Business · Yelp · Trustpilot · Tripadvisor · BBB · G2 · Capterra · Sitejabber · Glassdoor · Facebook Reviews

### 3.4 Local & Other (2)
Google Maps · Website / Blog

> **TaskMOS DB cross-check:** `lib/constants/platforms.ts` already lists exactly these 27 platforms (matches across `pinterest`, `facebook`, `twitter`, `instagram`, `youtube`, `linkedin`, `tiktok`, `reddit`, `discord` (extra), `telegram` (extra), `spotify`, `tidal`, `deezer`, `soundcloud`, `bandcamp`, `google_business`, `yelp`, `trustpilot`, `tripadvisor`, `bbb`, `g2`, `capterra`, `sitejabber`, `glassdoor`, `facebook_reviews`). Demo introduces **Threads, Quora, Google Maps, Website** — TaskMOS doesn't have these yet. Migration 049 already seeded music + reviews into `platforms` and `task_types` tables.

---

## 4. Two bundle modes (per-platform)

Each social platform supports two distinct bundle types via a toggle in the admin Create form:

### 4.1 Engagement mode (default)
Worker performs actions on **existing** brand content — like, save, comment, share, follow, etc. Proof = screenshot.

### 4.2 Content Creation mode (✨ "Create")
Worker creates **new** content for the brand — IG post, Pinterest pin, TikTok video, YouTube Short, Reddit post, Quora answer, Spotify playlist, Threads chain, multi-group FB post, etc. Proof = URL of created content + must remain live for N days (auto-checked).

> **TaskMOS DB cross-check:** Bundle items already support this via `task_bundle_items.task_type_id` + `item_data` JSONB. No schema change needed — just need a `category` flag on `tasks` (or derive from selected task_types). Currently `tasks` doesn't have a `category` column; would be a one-line migration: `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'engagement'` with check constraint `engagement|creation`.

---

## 5. Action library (the vocabulary of "what a worker can do")

Each platform has its own **action set** with **default credit values** baked into the demo's `PLATFORM_CONFIG` object. Admin can adjust credits per campaign.

### 5.1 Universal engagement actions (most platforms)
| Action ID | Default credit | Proof |
|---|---:|---|
| `like` / `react` | 1 | Screenshot |
| `save` / `bookmark` | 2 | Screenshot |
| `comment` / `reply` | 3 | Screenshot of comment text |
| `share` / `retweet` / `repost` | 4 | Share link or screenshot |
| `follow` / `subscribe` / `connect` | 5 | Screenshot of follow state |
| `upvote` (Reddit, Quora) | 1 | Screenshot |
| `quote` (X, Threads) | 5 | URL of quote post |
| `duet` (TikTok) | 8 | URL of duet |

### 5.2 Watch-time actions
| Action | Default | Notes |
|---|---:|---|
| `watch` (YouTube) | tier-based: 30s/60s/3m/5m/9m → 2/3/5/7/10 cr | Customizable tiers per campaign |
| `watch` (Facebook Reels/Videos) | 15s/30s/60s/90s/180s → 2/3/5/7/10 cr | Different defaults from YT |
| `visit` (Website) | 2 cr (30+ sec) | URL of page |
| `scroll` (Website) | 2 cr | Bottom-of-page screenshot |
| `checkin` (Yelp) | 3 cr | Check-in screenshot |

### 5.3 Music streaming actions
| Action | Default | Notes |
|---|---:|---|
| `stream` (Spotify/TIDAL/Deezer/SoundCloud) | 3–4 cr | 30 sec min; Bandcamp = full track (~180s) |
| `playlist` | 5 cr | Add to your playlist |
| `like` (music) | 2 cr | Heart / favorite |
| `follow` (artist) | 4 cr | |
| `repost` (SoundCloud) | 5 cr | |
| `save` (Spotify pre-save album) | 6 cr | |

### 5.4 Review site actions
| Action | Default | Notes |
|---|---:|---|
| `rate` (star rating) | 5–6 cr | 5 stars required |
| `review` (write text) | 7–10 cr | Word minimum (40+ / 50+ / 80+ depending on platform) |
| `photo` (upload) | 4–5 cr | Real photo, not stock |
| `verify` (account) | 3–5 cr | LinkedIn / phone / email verification |
| `recommend` | 4–5 cr | "Yes, recommend" toggle |
| `cons` | 4–5 cr | Cons section text |
| `ceo` (Glassdoor) | 3 cr | Approve of CEO |
| `qa` (answer Q&A on Google Maps / Business) | 4 cr | |

### 5.5 Content creation actions
| Action | Default | Platform examples |
|---|---:|---|
| `create_post` | 10–20 cr | IG, FB, LinkedIn |
| `create_pin` | 8 cr | Pinterest |
| `create_story` | 6–8 cr | IG, FB (24hr) |
| `create_reel` | 25 cr | IG (15+ sec) |
| `create_short` | 30 cr | YouTube (15–60s) |
| `create_video` | 25–50 cr | TikTok, YouTube |
| `create_tweet` | 8 cr | X / Twitter |
| `create_thread` | 18 cr | Twitter (3+ tweets) |
| `create_thread_chain` | 18 cr | Threads (3+ chained posts) |
| `create_answer` | 18 cr | Quora (150+ words) |
| `create_article` | 35 cr | LinkedIn |
| `create_community` | 8 cr | YouTube community post |
| `create_playlist` | 6–8 cr | Spotify, SoundCloud |
| `create_board` | 5 cr | Pinterest |
| `create_duet` | 15 cr | TikTok |
| `post_group` | 12 cr | FB single group |
| `multi_groups` | 18 cr | FB 2+ groups |
| `multi_pages` | 14 cr | FB 2+ pages cross-post |
| `cross_post` | 10 cr | Reddit 2+ subreddits |
| `keep_live` | 5–10 cr | Auto-checked weekly/monthly |

### 5.6 Tagging / metadata actions
| Action | Default | Notes |
|---|---:|---|
| `caption` | 5 cr | Caption text with brand mention |
| `description` | 5 cr | SEO description |
| `hashtag` | 2–3 cr | Use brand hashtag |
| `mention` / `tag` | 3–4 cr | Tag @brand handle |
| `link` | 4 cr | Brand URL embedded in post |
| `media` | 4 cr | Image/video attached |
| `post_title` | 3 cr | Compelling title with keywords |
| `post_body` | 6 cr | Body text 100+ words |
| `bell` (YouTube) | 2 cr | Turn on notifications |

---

## 6. The 43 example bundles (b1–b43)

| ID | Title | Platform | Mode | Reward (sum + bonus) | Slots filled |
|---|---|---|---|---:|---|
| b1 | Instagram Growth Bundle | Instagram | engage | 15+5=20 | 213/500 |
| b2 | YouTube Watch + Engage | YouTube | engage | 16+4=20 | 388/1000 |
| b3 | Quick Like + Comment | Facebook | engage | 4+1=5 | 112/200 |
| b4 | Social Boost Medium | Twitter | engage | 10+5=15 | 158/300 |
| b5 | YouTube Long Watch | YouTube | engage | 14+6=20 | 149/200 |
| b6 | Profile Follow + Pin | Instagram | engage | 7+3=10 | 185/400 |
| b7 | Pinterest Pin Bundle | Pinterest | engage | 12+4=16 | 122/300 |
| b8 | TikTok Viral Push | TikTok | engage | 15+5=20 | 377/800 |
| b9 | LinkedIn Pro Engagement | LinkedIn | engage | 19+6=25 | 133/200 |
| b10 | Website Engagement Bundle | Website | engage | 13+3=16 | 188/500 |
| b11 | Google Business 5★ Review | Google Business | review | 21+9=30 | 53/100 |
| b12 | Trustpilot Verified Review | Trustpilot | review | 18+7=25 | 61/150 |
| b13 | Yelp Restaurant Boost | Yelp | review | 21+5=26 | 66/200 |
| b14 | Google Maps Location Boost | Google Maps | review | 20+6=26 | 82/250 |
| b15 | G2 Software Review | G2 | review | 28+7=35 | 56/80 |
| b16 | Spotify Stream + Save | Spotify | music | 14+4=18 | 213/500 |
| b17 | SoundCloud Repost Boost | SoundCloud | music | 13+4=17 | 102/300 |
| b18 | Reddit Karma Push | Reddit | engage | 11+4=15 | 144/400 |
| b19 | Quora Q&A Engagement | Quora | engage | 12+4=16 | 108/250 |
| b20 | TIDAL HiFi Promotion | TIDAL | music | 15+5=20 | 113/300 |
| b21 | Deezer Stream Boost | Deezer | music | 14+4=18 | 132/350 |
| b22 | Bandcamp Artist Support | Bandcamp | music | 15+5=20 | 58/150 |
| b23 | Tripadvisor Hotel Review | Tripadvisor | review | 20+6=26 | 62/120 |
| b24 | BBB Positive Review | BBB | review | 20+8=28 | 49/80 |
| b25 | Capterra SaaS Review | Capterra | review | 23+7=30 | 58/100 |
| b26 | Sitejabber Product Review | Sitejabber | review | 21+5=26 | 63/150 |
| b27 | Glassdoor Company Review | Glassdoor | review | 23+6=29 | 47/100 |
| b28 | Facebook Page Recommendation | FB Reviews | review | 18+5=23 | 76/200 |
| b29 | Instagram Post Creation | Instagram | **create** | 43+12=55 | 32/50 |
| b30 | Pinterest Pin Creation | Pinterest | **create** | 22+5=27 | 53/120 |
| b31 | TikTok Video Creation | TikTok | **create** | 43+12=55 | 46/80 |
| b32 | YouTube Shorts Creation | YouTube | **create** | 42+8=50 | 38/60 |
| b33 | Reddit Post Creation | Reddit | **create** | 28+7=35 | 59/100 |
| b34 | Facebook Post Creation | Facebook | **create** | 27+6=33 | 62/150 |
| b35 | Twitter Thread Creation | Twitter | **create** | 27+5=32 | 88/200 |
| b36 | LinkedIn Post Creation | LinkedIn | **create** | 28+6=34 | 52/100 |
| b37 | Quora Answer Creation | Quora | **create** | 30+7=37 | 47/120 |
| b38 | Spotify Playlist Creation | Spotify | **create** | 19+5=24 | 66/200 |
| b39 | Threads Engagement Bundle | Threads | engage | 18+4=22 | 82/250 |
| b40 | Threads Chain Creation | Threads | **create** | 28+8=36 | 39/60 |
| b41 | Facebook Multi-Group Post | Facebook | **create** | 31+9=40 | 48/80 |
| b42 | Reddit Cross-Post Boost | Reddit | **create** | 17+6=23 | 59/100 |
| b43 | Facebook Reel Watch + Engage | Facebook | engage | 13+4=17 | 113/300 |

---

## 7. CRITICAL: Music Play Lock behavior (developer note from demo)

> **The demo explicitly calls this out in a yellow "Developer Note" box** under the Music Play section of the admin create form. This is non-negotiable behavior for music streaming bundles.

When a worker starts playing the track (worker side):

1. **Full UI lock** — the entire dashboard locks behind a fullscreen modal overlay with `pointer-events: none` on background; no buttons / nav / clicks possible.
2. **Visible countdown ring** — admin-set play duration (default 30s for Spotify/TIDAL/Deezer/SoundCloud, 180s for Bandcamp).
3. **Background audio** — track plays in an audio element while the lock is active.
4. **Tab-switch defense** — `document.visibilitychange` listener pauses + resets the countdown if the worker switches tabs or loses focus. This prevents fake listens by background-tabbing.
5. **Auto-approve on completion** — once the duration elapses, system auto-approves the play (no admin review needed), triggers a **screenshot capture** of the player state, and **credits the worker immediately**.

> **TaskMOS cross-check:** `components/shared/music-play-lock-modal.tsx` and `lib/constants/platforms.ts` (`MUSIC_STREAM_SLUGS`, `MUSIC_PLATFORM_SLUGS`) already exist. Need to verify the implementation matches all 5 requirements above. Auto-approval + screenshot capture + visibility defense are the parts most likely to be incomplete.

---

## 8. Watch-time tiers (YouTube + Facebook)

Admin can configure **5 tiers** of watch-time → credit mapping per campaign. Workers see the tiers, pick one to commit to, and submit proof of watch progress.

| Tier | YouTube default | Facebook default |
|---|---|---|
| 1 | 30s → 2 cr | 15s → 2 cr |
| 2 | 60s → 3 cr | 30s → 3 cr |
| 3 | 180s → 5 cr | 60s → 5 cr |
| 4 | 300s → 7 cr | 90s → 7 cr |
| 5 | 540s → 10 cr | 180s → 10 cr |

Each tier's seconds + credit value is editable by admin in the campaign form.

> **TaskMOS cross-check:** `task_bundle_items.watch_duration_sec` (migration 046) already supports this on individual bundle items. Multiple watch-tier rows = multiple bundle items with the same `task_type` ("watch-video") and different `watch_duration_sec` values. Or could be encoded in `item_data` JSONB.

---

## 9. Worker bundle modal flow

When a worker clicks a bundle card on the available grid:

1. **Modal header**: platform icon, title, platform label · type · ETA, description, progress bar (X/Y actions complete + cr earned so far).
2. **Instructions box** (blue tint) — admin-provided step-by-step text if set.
3. **AI Prompt box** (purple tint) — copyable prompt to paste into ChatGPT/Claude if admin set one.
4. **Action list** — one row per bundle item:
   - Checkbox to mark "I did this".
   - Action icon + label + credit pill.
   - **Admin-provided content** (green-tinted box) — caption text / comment text / image URL / hashtags / etc. with **Copy** buttons.
   - **Proof upload box** — clickable, swaps to "uploaded" state after fake upload.
   - **Conditional inputs based on action ID**:
     - `comment` / `reply` / `qa` / `cons` → single-line text input ("paste your comment text")
     - `review` / `post_body` / `create_answer` / `caption` / `description` → textarea
     - `share` / `retweet` / `repost` / `quote` / `duet` / `share_playlist` → URL input
     - `watch` / `visit` / `scroll` / `stream` / `checkin` → URL input with platform-specific placeholder
     - `rate` → "Rating given: ★★★★★ 5/5" badge
     - `photo` / `media` → italic guidance "Use a real photo"
     - `recommend` → green "Marked as Yes, recommend" badge
     - `create_*` / `post_group` / `multiple_boards` / `include_track` → URL input "paste URL of content you created"
     - `tag` / `mention` / `tag_brand` / `tag_company` → blue guidance "Tag the brand handle"
     - `hashtag` / `post_title` / `playlist_name` → single-line text input
     - `keep_live` → amber "Content must remain live · auto-checked weekly" notice
     - `link` → URL input "Brand website URL included in post"
5. **Profile link field** (required) — "Your Profile Link" at the bottom of the form.
6. **Completion bonus banner** — "Full completion bonus unlocked" turns active when all items checked.
7. **Footer**:
   - Live "You'll earn N credits · Full bonus unlocked / X actions remaining"
   - **Save & Close** button (preserves progress) + **Submit Full / Submit Partial** button.

> **TaskMOS cross-check:** `components/shared/task-detail.tsx` is the existing worker-side detail view. Needs to be verified against this flow.

---

## 10. Admin review queue flow

### 10.1 Left pane — pending submissions list
- Filterable list of pending submissions with: avatar, user handle, submission ID, campaign name, total credit, submitted time.
- Click a row to load the right pane's detail.

### 10.2 Right pane — submission detail
- Header: submission ID, user, campaign, total reward.
- **Action-wise review rows** — one per bundle item, each showing:
  - Action label + credit pill
  - Proof viewer chip ("View screenshot" or "View link")
  - Inline preview of proof content (e.g. comment text in italics, share link in mono)
  - **Approve** button (green), **Reject** button (red), **Request more proof** button (icon).
- Per-action decisions tracked client-side (`reviewDecisions[subId+idx]`).
- Completion bonus banner — auto-applied when all actions approved.
- Footer global actions: **Approve Full Task**, **Approve Partial**, **Request More Proof**, **Reject**.

> **TaskMOS cross-check:** `components/shared/review-queue.tsx` + `lib/actions/assignments.ts` (`reviewItemSubmission`, `getPendingItemReviews`) already handle per-item review. Bundle RPCs in migration 048 do the points/wallet accounting.

---

## 11. Admin create bundle flow

### 11.1 Top: Credit Pricing Reference card (collapsible)
A read-only reference showing **standard credit values** across 6 categories:
- Engagement Actions
- YouTube Watch-Time
- Music Streaming
- Reviews & Ratings
- Content Creation (spans 2 columns — most actions)
- Completion Bonus

The card is a teaching tool — "these are standard rates, you can customize below".

### 11.2 Form (left, 2/3 width)

1. **Platform picker** — grouped into 4 sections (Social Media / Music Streaming / Review Sites / Local & Other). Click changes the entire action set + form context.
2. **Worker Instructions Hint box** (blue/amber tint) — shows the platform's `workerInstructions` and `useCase` from `PLATFORM_CONFIG`.
3. **Bundle Type toggle** — Engagement vs Content Creation. Only visible for platforms with both modes (most social platforms; not music/reviews/local).
4. **Campaign Title** + **Target Link** inputs — title is auto-filled from platform + mode, target link has platform-specific placeholder.
5. **Required Actions picker** — checklist of all platform-specific actions:
   - Each row: checkbox + icon + label + **credit input** (-/value/+ stepper, 0–99, free-text editable).
   - "Reset to defaults" link top-right.
6. **YouTube/Facebook Watch-Time Tiers section** (conditional on platform) — 5 editable tiers, each with seconds + credit input. Worker picks one tier per submission.
7. **Music Play Tracking section** (conditional on music platforms):
   - Play Count Target (how many workers should play)
   - Play Duration (seconds) — adjusts per platform default
   - Credit per Play
   - Live preview: progress bar showing "247 / 1000 plays · 12 workers playing now · Total cost: X cr"
   - **Developer Note box (yellow)** — the music play lock spec (see §7 above)
8. **Worker Content & Instructions** section (always present):
   - Step-by-step instructions textarea
   - Optional AI prompt textarea
   - **Dynamic per-action content fields** — appears only for selected actions that need admin content. E.g. for `comment` → "Exact Comment Text" textarea; for `create_post` → caption + hashtags + image URL inputs; for `create_pin` → title + description + URL + board + image URL inputs; for `multi_groups` → suggested groups list + post text; etc. Full mapping in demo's `ACTION_CONTENT_FIELDS` object.
9. **Completion Reward Settings**:
   - Full Completion Bonus (0–50 cr)
   - Full Completion Point (total, auto = actions + bonus; admin can override)
   - Live breakdown: "15 actions + 5 bonus = 20 cr"
10. **Total Submissions Needed** — 4 preset chips: 100 / 500 / 1,000 / 5,000.
11. **Comment Instruction** textarea (optional, e.g. "Minimum 5 words, no emoji-only").
12. **Required Proof Types** — chip multi-select: Screenshot · Profile link · Comment link · Share link · Text confirmation.

### 11.3 Live Preview (right, 1/3 width, sticky)

- Platform icon + title + sub-label (Platform · Engagement|Creation|Music|Review|Local)
- Action list with per-item credit (live updates as admin edits)
- Watch tier line (if applicable)
- Full bonus line
- Total Reward (sum)
- Cost calculation:
  - Cost per submission
  - Target submissions
  - Service fee (5%)
  - **Total cost** (highlighted)
- **Launch Campaign** primary button
- **Cancel Edit** ghost button (only in edit mode)

---

## 12. Edit campaign flow

Admin clicks **Edit** on a campaign row in "My Campaigns" tab:

1. Form switches to **Edit Mode**:
   - Heading changes: "Edit Campaign"
   - Subheading: "Editing: <campaign title> · Changes apply to all future submissions"
   - Amber "Edit Mode" badge appears next to heading.
   - **Launch Campaign** button becomes **Save Changes**.
   - **Cancel Edit** ghost button appears.
2. Form pre-fills with the existing bundle's data:
   - Platform highlighted in picker.
   - Bundle Mode toggle set (engagement vs creation).
   - All actions pre-selected with their saved credit values.
   - Per-action admin content fields populated from `bundle.actions[i].adminContent`.
   - Instructions + AI prompt pre-filled.
   - Bonus + slot count pre-filled.
3. On Save → updates the in-memory bundle, re-renders campaigns list + task grid, switches back to My Campaigns tab.

> **TaskMOS cross-check:** `lib/actions/tasks.ts` already has `updateTask()`. Need to extend to handle bundle items (insert/update/delete bundle_items rows) + audit log entry per migration 034.

---

## 13. My Campaigns list (admin)

Each campaign row shows:
- Platform icon
- Title + Type chips ("✨ CREATE" or "★ N playing" for music) + status badge (Live with green pulse / Paused with amber dot)
- Progress: "213 / 500 submissions" or "287 / 500 plays completed" for music
- Reward per submission/play
- Action count
- Progress bar
- **Edit** + **Pause/Resume** buttons

---

## 14. Worker dashboard hero stats

Top 4 stat cards:
1. **Available Balance** (large) — credit count, "+182 today" + "4 pending review", Withdraw button.
2. **Tasks Done** — count + approval rate (92%).
3. **Worker Tier** — Gold / Silver / Platinum etc. + "N tasks to next tier".
4. (Stats column 2 reserved for context — currently shows balance details inline.)

## 15. Admin dashboard hero stats

Top 4 stat cards:
1. **Active Campaigns** + "+2 this week" trend
2. **Pending Review** (amber, with avg review time)
3. **Total Engagement** (actions completed across campaigns)
4. **Budget Used** (% + progress bar)

---

## 16. Worker submissions tab (My Submissions)

Table-like rows with columns:
- Submission ID (mono)
- Title + date
- Status badge (In Progress / Under Review / Approved / Rejected)
- Reward
- Details button

Status colors:
- **pending** (In Progress) → amber
- **review** (Under Review) → blue
- **approved** → green
- **rejected** → red

---

## 17. Worker history tab

Placeholder: "Showing 147 completed tasks across last 30 days. Total earned: 2,665 credits."

---

## 18. Cross-cutting features

- **Role toggle** (header) — animated pill between Worker / Admin / Creator views.
- **Credit pill in header** — shows current balance everywhere.
- **Avatar circle** — gradient background with initials.
- **Toasts** — bottom-right, lime border, auto-dismiss ~2.5s, used for all success/info confirmations.
- **Copy-to-clipboard** buttons — every admin-provided text snippet (caption, comment text, AI prompt, hashtags, etc.) has a Copy button with "Copied!" feedback.
- **Live preview** in create form updates as admin types (action count, sum, breakdown, cost).
- **Sticky right sidebar** on the create form.
- **Tab-switch defense** in music play lock.
- **Auto-checked weekly/monthly** for `keep_live` actions.

---

## 19. Mapping demo → TaskMOS DB tables

| Demo concept | TaskMOS table / column | Status |
|---|---|---|
| Bundle (task with N items) | `tasks` + `task_bundle_items` | ✅ already exists (migration 046) |
| Per-item credit | `task_bundle_items.points` | ✅ DECIMAL(12,2) |
| Per-item proof type | `task_bundle_items.proof_type` | ✅ enum: url/screenshot/both/none |
| Per-item action config | `task_bundle_items.item_data` JSONB | ✅ flexible JSON |
| Per-item watch duration | `task_bundle_items.watch_duration_sec` | ✅ migration 046 |
| Completion bonus | `tasks.completion_bonus` | ✅ migration 046 |
| Worker submission | `task_assignments` + `assignment_item_submissions` | ✅ |
| Per-item approve/reject | `assignment_item_submissions.status` | ✅ |
| Bundle category (engagement vs creation) | **NOT YET** | ⚠️ Need column on `tasks` |
| Platform list | `platforms` table | ✅ 26 seeded in 049 |
| Task type list | `task_types` table | ✅ |
| Admin content (caption / hashtags / AI prompt / image URL) | `tasks.ai_prompt` + per-item `item_data` JSONB | ✅ partial (ai_prompt column exists, migration 032; per-item JSON works) |
| Instructions | `tasks.description` (currently used) | ✅ |
| Required proof types (multi-checkbox) | `task_bundle_items.proof_type` enum | ⚠️ enum is single-value; demo allows multi-select. May need a `proof_types TEXT[]` column. |
| Music play tracking (target / duration / credit) | `task_bundle_items.watch_duration_sec` + `tasks.point_budget` | ⚠️ "target plays" implied by `max_completions`; need to verify |
| Music play lock UI | `components/shared/music-play-lock-modal.tsx` | ✅ exists |
| Auto-approve music plays | needs SQL trigger / RPC | ⚠️ verify migration 048 covers it |
| YouTube watch tiers (5 per campaign) | multiple `task_bundle_items` with same task_type, different watch_duration_sec | ✅ possible via current schema |
| Edit campaign | `tasks` update + `task_bundle_items` upsert/delete | ⚠️ `updateTask()` exists; needs to handle bundle items |
| Audit log entries | `admin_audit_log` (migration 034) | ✅ |

### 19.1 Platforms demo introduces (not in current `platforms` seed)
- **Threads** (Meta) — needs INSERT
- **Quora** — needs INSERT
- **Google Maps** — needs INSERT (separate from `google_business`)
- **Website / Blog** — currently has `web` slug in TaskMOS but verify

### 19.2 Task types demo introduces
Many new action slugs (`create_post`, `create_pin`, `create_thread_chain`, `multi_groups`, `cross_post`, `keep_live`, `qa`, `rate`, etc.) — these probably need INSERTs into `task_types` with proper `required_fields` JSON schemas. Migration 049 seeded ~150+ task types for music + reviews; need to audit which content-creation ones are missing.

### 19.3 Constants demo references
- `MUSIC_PLATFORM_SLUGS`, `MUSIC_STREAM_SLUGS` — already in `lib/constants/platforms.ts`
- `taskTypeNeedsAiPrompt()` heuristic in `lib/content-task-types.ts` — needs to be checked against demo's action set (e.g. `create_post`, `create_answer`, `review` should all return true)

---

## 20. What TaskMOS likely needs to add (NOT YET DONE — implement when user asks)

### 20.1 DB-level (new migrations 051+)
- `ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT 'engagement' CHECK (category IN ('engagement','creation','review','music','maps','other'))` — enables filtering / different review flows per category.
- INSERT new platforms: `threads`, `quora`, `google_maps` (if `website` already exists).
- INSERT new task_types for content creation: `create_post`, `create_pin`, `create_short`, `create_video`, `create_thread`, `create_thread_chain`, `create_answer`, `create_playlist`, `create_board`, `create_story`, `create_reel`, `post_group`, `multi_groups`, `multi_pages`, `cross_post`, `keep_live`, `qa`, `bell`, `quote`, `duet`, `helpful`, `connect`, etc. — with appropriate `required_fields` JSON describing what worker has to submit.
- Verify migration 048's bundle RPCs handle the "music play auto-approve" path (no admin review for music streams).
- Possibly: `tasks.proof_types TEXT[]` if the multi-select proof requirement is real (demo allows screenshot + profile link + text confirmation simultaneously).

### 20.2 Server actions
- `lib/actions/tasks.ts` `createTask` / `updateTask` — handle new `category` field, per-item admin content, watch tiers as multiple items.
- `lib/actions/assignments.ts` — verify music auto-approve path is wired (no `reviewAssignment` call needed for music plays).

### 20.3 UI
- `components/shared/task-form.tsx` — bundle creation form needs:
  - Bundle Mode toggle (engagement vs creation)
  - Per-action credit stepper
  - Per-action admin content fields (caption / hashtags / image URL / etc. — dynamic based on selected action)
  - Music play tracking section
  - Watch-time tiers section
  - Credit pricing reference card (collapsible at top)
  - Live preview sidebar
- `components/shared/task-detail.tsx` (worker side) — bundle modal needs:
  - Instructions box (blue tint)
  - AI prompt box with Copy button
  - Per-action admin content boxes with Copy buttons
  - Per-action proof inputs (already there for some, need to extend per action type)
  - Profile link field
  - Completion bonus banner
- `components/shared/review-queue.tsx` (admin side) — per-action approve/reject row already exists; verify it matches demo's layout (action label + credit pill + proof viewer + approve/reject/request buttons).
- `components/shared/music-play-lock-modal.tsx` — verify all 5 lock requirements from §7.

### 20.4 Constants / config
- `lib/constants/platforms.ts` — extend `PLATFORM_CONFIG` with missing entries (Threads, Quora, Google Maps); ensure music/review platforms have correct icon names.
- `lib/content-task-types.ts` `taskTypeNeedsAiPrompt()` — extend include list with all `create_*` slugs + `review` + `qa` + `caption` + `description`.
- A new constants module for platform action defaults / credit values, since the demo's `PLATFORM_CONFIG` carries per-platform action sets with default credits. Currently TaskMOS reads task_types from DB; admin sets credits per campaign. Need to decide: defaults in DB (`task_types.default_points`) vs constants file.

---

## 21. Notable visual / UX patterns to mimic (BEHAVIOR, not styling)

These are the **interaction patterns**, not pixel-perfect matches:

1. **Two-pane review** — left list + right detail, click row → loads detail. Use existing TaskMOS `<Card>` split.
2. **Credit stepper** — minus button + numeric input + plus button for adjustable values. Already a common React pattern.
3. **Per-action expand on select** — when an action is checked, its admin content fields appear below. Use simple conditional render.
4. **Sticky preview sidebar** — `position: sticky; top: <header-height>` on the right column of the create form.
5. **Inline status badges** — small pill with colored dot + label (active/pending/review/approved/rejected). TaskMOS already has `<Badge variant="...">`.
6. **Copy-to-clipboard feedback** — button shows "Copied!" briefly after click. Use `navigator.clipboard.writeText()` + temporary state.
7. **Live progress bar** with pulsing live indicator dot on active campaigns.
8. **Collapsible reference card** — chevron rotates 90° on collapse, body display:none. Standard accordion pattern.
9. **Animated tab indicator** — sliding underline under the active tab.
10. **Role toggle pill** — animated background pill that slides between worker/admin segments. (Could be implemented but optional; a regular Tabs component works.)

---

## 22. Out of scope for TaskMOS implementation

Things in the demo that **don't** belong in TaskMOS (don't copy):

- `<script src="https://cdn.tailwindcss.com">` — TaskMOS uses Tailwind v4 at build time.
- Custom Google Fonts (Bricolage Grotesque, Geist, Hind Siliguri) — TaskMOS uses Inter only.
- `--lime: #c5f74f` palette and the dark-grid background — TaskMOS uses purple/pink + Tailwind tokens.
- Inline `<style>` block with custom classes (`.surface`, `.chip`, `.btn-primary`, etc.) — TaskMOS uses `components/ui/` primitives.
- Inline SVG icons — TaskMOS uses `lucide-react`.
- Demo's data objects (`BUNDLES`, `MY_SUBS`, `ADMIN_SUBS`, `ADMIN_CAMPAIGNS`) — replaced by real DB queries via server actions.
- Demo's `PLATFORM_CONFIG` (with `name`, `linkExample`, `actions[]`, `hasWatchTime`) — TaskMOS reads from `platforms` + `task_types` tables.
- Animated pill sliding under role toggle — purely visual flair; functional equivalent is a tab/role switch.

---

## 23. Open questions for the user

When the user asks me to implement parts of this demo, I should confirm:

1. **Bundle Mode (engagement vs creation)** — should this be a `category` column on `tasks` or derived from the selected `task_types`? Adds simplicity if explicit.
2. **Multi-select proof types** — demo allows mixing Screenshot + Profile link + Text confirmation. Current `proof_type` enum is single-value. Replace with `TEXT[]`?
3. **Music play target** — `tasks.max_completions` covers this conceptually. Confirm naming.
4. **Worker Tier (Gold/Silver/Platinum)** — not in current TaskMOS DB. New column on `profiles`? Computed from total_points? User decides.
5. **Withdraw button** — implies real money payout. Currently TaskMOS only tracks credits + plan purchases. Out of scope unless explicitly added.
6. **Service fee (5%)** — admin's cost = N × credits + 5% fee. Where does the fee accrue? New `point_packages.fee_percent` or hardcoded?
7. **"Auto-checked weekly/monthly" for `keep_live`** — requires a cron job + maybe a `verifications` table to log periodic checks. Big addition.
8. **Withdraw, Worker Tier, Auto-verification cron** — these are NEW features not in current TaskMOS. Confirm scope before adding.

---

*End of reference notes.*
