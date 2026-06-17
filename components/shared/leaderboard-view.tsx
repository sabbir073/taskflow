"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Badge, Select } from "@/components/ui";
import { Trophy, Medal, Award, Flame, Coins, CheckCircle2, Crown } from "lucide-react";
import { getLeaderboard } from "@/lib/actions/points";
import { getInitials, cn } from "@/lib/utils";

type TimeFilter = "all_time" | "this_month" | "this_week" | "today";

const TIME_LABEL: Record<TimeFilter, string> = {
  all_time: "All Time",
  this_month: "This Month",
  this_week: "This Week",
  today: "Today",
};

// Avatar that renders the user's real profile photo when present, falling back
// to a gradient initials tile (and also on image load error). getLeaderboard
// already fetches `image` for every row — it was previously thrown away here.
function LbAvatar({
  name,
  image,
  className,
  fallbackClassName,
}: {
  name: string;
  image?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const [errored, setErrored] = useState(false);
  if (image && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        onError={() => setErrored(true)}
        className={cn("object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center font-bold",
        className,
        fallbackClassName ?? "bg-gradient-to-br from-primary/20 to-accent/20 text-primary",
      )}
    >
      {getInitials(name)}
    </div>
  );
}

// ============================================================================
// Leaderboard responsive layout
//   - Mobile (sm-): app-style — #1 champion hero + #2/#3 podium row + ranked
//     stacked cards.
//   - Tablet/Desktop (sm+): polished 3-column podium (champion elevated, medal
//     accent bars, real avatars) + a ranked table with avatars.
// Toggled with `hidden sm:*` and `sm:hidden` so neither side affects the other.
// ============================================================================

export function LeaderboardView({ currentUserId }: { currentUserId: string }) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all_time");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["leaderboard", "global", timeFilter],
    queryFn: () => getLeaderboard("global", timeFilter),
  });

  const medals = [
    { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", accent: "bg-yellow-500", label: "1st" },
    { icon: Medal, color: "text-gray-400", bg: "bg-gray-400/10", border: "border-gray-400/30", accent: "bg-gray-400", label: "2nd" },
    { icon: Award, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/30", accent: "bg-amber-600", label: "3rd" },
  ];

  const top3 = !isLoading && entries && entries.length > 0 ? entries.slice(0, 3) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Time-window filter */}
      <div className="flex items-center justify-end">
        <Select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
          className="w-40"
          aria-label="Leaderboard time window"
        >
          {(Object.keys(TIME_LABEL) as TimeFilter[]).map((k) => (
            <option key={k} value={k}>{TIME_LABEL[k]}</option>
          ))}
        </Select>
      </div>

      {/* ====================================================================
          DESKTOP / TABLET PODIUM — champion elevated, medal accents, avatars
          ==================================================================== */}
      {top3 && (
        <div className="hidden sm:grid grid-cols-3 gap-4 items-end mb-8">
          {[1, 0, 2].map((idx) => {
            const entry = top3[idx];
            if (!entry) return null;
            const medal = medals[idx];
            const MedalIcon = medal.icon;
            const isMe = entry.user_id === currentUserId;
            const isChampion = idx === 0;

            return (
              <Card
                key={entry.user_id}
                className={cn(
                  "relative overflow-hidden border-2 text-center",
                  medal.border,
                  isChampion ? "md:-mt-6 shadow-lg" : "",
                  isMe ? "ring-2 ring-primary/40" : "",
                )}
              >
                {isChampion && (
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-yellow-300/20 via-orange-300/15 to-pink-300/15 dark:from-yellow-500/15 dark:via-orange-500/10 dark:to-pink-500/10" />
                )}
                <div className={cn("absolute inset-x-0 top-0 h-1", medal.accent)} />

                <CardContent className={cn("relative", isChampion ? "p-6" : "p-5")}>
                  {/* Medal pill */}
                  <div className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full", medal.bg, medal.color)}>
                    <MedalIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">{medal.label}</span>
                  </div>

                  {/* Avatar with medal-color ring + crown for champion */}
                  <div className={cn("relative mx-auto mt-3", isChampion ? "w-20 h-20" : "w-16 h-16")}>
                    <div
                      className={cn(
                        "absolute inset-0 rounded-full p-[2.5px]",
                        isChampion ? "bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 shadow-lg shadow-orange-400/25" : medal.accent,
                      )}
                    >
                      <div className="w-full h-full rounded-full bg-card p-0.5">
                        <LbAvatar
                          name={entry.name}
                          image={entry.image}
                          className={cn("w-full h-full rounded-full", isChampion ? "text-xl" : "text-base")}
                        />
                      </div>
                    </div>
                    {isChampion && (
                      <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shadow ring-2 ring-card">
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  <p className={cn("mt-3 font-bold truncate", isChampion ? "text-base" : "text-sm")}>{entry.name}</p>
                  <p className={cn("font-black text-warning tabular-nums mt-1 leading-none", isChampion ? "text-3xl" : "text-2xl")}>
                    {entry.total_points.toFixed(2)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">points</p>

                  {/* Tasks + streak chips */}
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-bold tabular-nums">
                      <CheckCircle2 className="w-3 h-3" />{entry.tasks_completed}
                    </span>
                    {entry.current_streak > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-bold tabular-nums">
                        <Flame className="w-3 h-3" />{entry.current_streak}d
                      </span>
                    )}
                  </div>

                  {isMe && <Badge variant="primary" className="mt-2">You</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ====================================================================
          MOBILE PODIUM — featured #1 hero + #2/#3 row beneath
          ==================================================================== */}
      {top3 && (() => {
        const first = top3[0];
        const second = top3[1];
        const third = top3[2];
        const isMeFirst = first?.user_id === currentUserId;
        const isMeSecond = second?.user_id === currentUserId;
        const isMeThird = third?.user_id === currentUserId;
        const SecondIcon = medals[1].icon;
        const ThirdIcon = medals[2].icon;

        return (
          <div className="sm:hidden space-y-4">
            {/* HERO — Champion celebration card. Full-bleed past the page
                padding so it feels like a featured app screen. */}
            {first && (
              <div className="-mx-4">
                <Card className={`overflow-hidden border-0 rounded-none shadow-md ${isMeFirst ? "ring-2 ring-primary/40" : ""}`}>
                  <div className="relative">
                    {/* Layered gradient + decorative blurred blobs */}
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/30 via-orange-300/25 to-pink-300/25 dark:from-yellow-500/20 dark:via-orange-500/15 dark:to-pink-500/15" />
                    <div className="pointer-events-none absolute -top-24 -right-20 w-56 h-56 rounded-full bg-yellow-400/30 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-pink-400/20 blur-3xl" />

                    <div className="relative px-5 pt-6 pb-5 text-center">
                      {/* Champion pill */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/25 backdrop-blur text-yellow-700 dark:text-yellow-400 text-[10px] font-extrabold uppercase tracking-[0.15em]">
                        <Crown className="w-3.5 h-3.5" /> Champion
                      </div>

                      {/* Avatar with gradient ring + floating trophy */}
                      <div className="relative w-24 h-24 mx-auto mt-4">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 p-[3px] shadow-xl shadow-orange-400/30">
                          <div className="w-full h-full rounded-full bg-card flex items-center justify-center p-1">
                            <LbAvatar
                              name={first.name}
                              image={first.image}
                              className="w-full h-full rounded-full text-2xl"
                              fallbackClassName="bg-gradient-to-br from-primary to-accent text-white"
                            />
                          </div>
                        </div>
                        <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg ring-2 ring-card">
                          <Trophy className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      {/* Name */}
                      <p className="mt-3 text-lg font-extrabold leading-tight truncate px-4">{first.name}</p>
                      {isMeFirst && <Badge variant="primary" className="mt-1.5 text-[10px]">You</Badge>}

                      {/* Headline points */}
                      <div className="mt-3">
                        <p className="text-4xl font-black text-warning leading-none tabular-nums">
                          {first.total_points.toFixed(2)}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mt-1.5">Total Points</p>
                      </div>

                      {/* Chip row — tasks + streak */}
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/70 backdrop-blur border border-border/50 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                          <span className="text-xs font-extrabold tabular-nums">{first.tasks_completed}</span>
                          <span className="text-[10px] text-muted-foreground">tasks</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/70 backdrop-blur border border-border/50 shadow-sm">
                          <Flame className="w-3.5 h-3.5 text-accent" />
                          <span className="text-xs font-extrabold tabular-nums">{first.current_streak}d</span>
                          <span className="text-[10px] text-muted-foreground">streak</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* PODIUM — #2 and #3 with medal accent bar */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { entry: second, isMe: isMeSecond, idx: 1, label: "2nd" },
                { entry: third, isMe: isMeThird, idx: 2, label: "3rd" },
              ].map((slot) => {
                if (!slot.entry) return null;
                const m = medals[slot.idx];
                const Icon = slot.idx === 1 ? SecondIcon : ThirdIcon;
                const accent = m.accent;

                return (
                  <Card key={slot.entry.user_id} className={`relative overflow-hidden ${slot.isMe ? "border-primary/40 ring-2 ring-primary/20" : "border-border/60"}`}>
                    {/* Top medal accent bar */}
                    <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />

                    <CardContent className="pt-5 pb-4 px-3 text-center">
                      {/* Medal pill */}
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>
                        <Icon className="w-3 h-3" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">{slot.label}</span>
                      </div>

                      {/* Circle avatar with subtle medal-color ring */}
                      <div className={`relative w-16 h-16 mx-auto mt-2.5 rounded-full p-[2px] ${accent}`}>
                        <div className="w-full h-full rounded-full bg-card flex items-center justify-center p-0.5">
                          <LbAvatar
                            name={slot.entry.name}
                            image={slot.entry.image}
                            className="w-full h-full rounded-full text-sm"
                          />
                        </div>
                      </div>

                      <p className="mt-2 text-sm font-bold leading-tight truncate">{slot.entry.name}</p>
                      <p className="mt-1.5 text-lg font-extrabold text-warning leading-none tabular-nums truncate">
                        {slot.entry.total_points.toFixed(2)}
                      </p>
                      <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">pts</p>

                      {slot.entry.current_streak > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-extrabold">
                          <Flame className="w-2.5 h-2.5" />
                          <span className="tabular-nums">{slot.entry.current_streak}d</span>
                        </div>
                      )}
                      {slot.isMe && <Badge variant="primary" className="mt-1.5 text-[10px]">You</Badge>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ====================================================================
          DESKTOP / TABLET FULL LIST — ranked table with avatars
          ==================================================================== */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground w-16">Rank</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Points</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Tasks</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Streak</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-border/30"><td colSpan={5} className="px-5 py-4"><div className="h-4 bg-muted rounded-lg animate-pulse" /></td></tr>
              )) : !entries || entries.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">No users on the leaderboard yet</td></tr>
              ) : entries.map((entry) => {
                const isMe = entry.user_id === currentUserId;
                const medal = medals[entry.rank - 1];

                return (
                  <tr key={entry.user_id} className={`border-b border-border/30 transition-colors ${isMe ? "bg-primary/5" : "hover:bg-muted/20"}`}>
                    <td className="px-5 py-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold tabular-nums",
                        medal ? `${medal.bg} ${medal.color} border ${medal.border}` : "text-muted-foreground",
                      )}>
                        {entry.rank}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <LbAvatar name={entry.name} image={entry.image} className="w-9 h-9 rounded-lg text-xs shrink-0" />
                        <span className="font-medium truncate">{entry.name}</span>
                        {isMe && <Badge variant="primary">You</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-warning tabular-nums">{entry.total_points.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{entry.tasks_completed}</td>
                    <td className="px-5 py-3 text-right">
                      {entry.current_streak > 0 && (
                        <span className="inline-flex items-center gap-1 tabular-nums"><Flame className="w-3 h-3 text-accent" />{entry.current_streak}d</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ====================================================================
          MOBILE FULL LIST — app-style ranked cards
          ==================================================================== */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.15em] text-muted-foreground">Full Ranking</h2>
          {entries && entries.length > 0 && (
            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{entries.length} players</span>
          )}
        </div>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}><CardContent className="p-3"><div className="h-12 bg-muted rounded-xl animate-pulse" /></CardContent></Card>
            ))
          ) : !entries || entries.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No users on the leaderboard yet</CardContent></Card>
          ) : (
            entries.map((entry) => {
              const isMe = entry.user_id === currentUserId;
              const medal = medals[entry.rank - 1];

              return (
                <Card key={entry.user_id} className={`relative overflow-hidden transition-colors active:scale-[0.99] ${isMe ? "border-primary/40 bg-primary/[0.04]" : ""}`}>
                  {/* Left accent stripe for current user */}
                  {isMe && <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-accent" />}

                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    {/* Rank pill */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                      ${medal ? `${medal.bg} border ${medal.border}` : "bg-muted border border-border/50"}`}>
                      <span className={`text-sm font-extrabold tabular-nums ${medal ? medal.color : "text-foreground"}`}>{entry.rank}</span>
                    </div>

                    {/* Avatar */}
                    <LbAvatar name={entry.name} image={entry.image} className="w-9 h-9 rounded-xl text-xs shrink-0" />

                    {/* Name + meta — gets all remaining space */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">
                        {entry.name}
                        {isMe && <span className="ml-1.5 text-[10px] font-bold text-primary">(You)</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5 tabular-nums">
                          <CheckCircle2 className="w-3 h-3" /> {entry.tasks_completed}
                        </span>
                        {entry.current_streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 tabular-nums">
                            <Flame className="w-3 h-3 text-accent" /> {entry.current_streak}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Points — compact, tabular */}
                    <div className="text-right shrink-0 pl-1">
                      <p className="text-sm font-extrabold text-warning leading-none inline-flex items-center gap-1 tabular-nums">
                        <Coins className="w-3 h-3" />
                        {entry.total_points.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">pts</p>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
