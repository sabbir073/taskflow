"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Badge } from "@/components/ui";
import { Trophy, Medal, Award, Flame, Coins, CheckCircle2 } from "lucide-react";
import { getLeaderboard } from "@/lib/actions/points";
import { getInitials } from "@/lib/utils";

// ============================================================================
// Leaderboard — desktop layout (podium grid + table) untouched.
// Mobile (sm-) gets an app-style layout:
//   - #1 featured "champion" hero card across the full width
//   - #2 & #3 as a 2-up row beneath
//   - Full ranking list as stacked cards instead of a horizontally-cramped
//     <table> that previously bled past the viewport.
// Toggled with `hidden sm:block` and `sm:hidden` so neither side affects
// the other.
// ============================================================================

export function LeaderboardView({ currentUserId }: { currentUserId: string }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["leaderboard", "global", "all_time"],
    queryFn: () => getLeaderboard("global", "all_time"),
  });

  const medals = [
    { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: "1st" },
    { icon: Medal, color: "text-gray-400", bg: "bg-gray-400/10", border: "border-gray-400/30", label: "2nd" },
    { icon: Award, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/30", label: "3rd" },
  ];

  const top3 = !isLoading && entries && entries.length >= 3 ? entries.slice(0, 3) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ====================================================================
          DESKTOP PODIUM — original 3-column layout, untouched
          ==================================================================== */}
      {top3 && (
        <div className="hidden sm:grid grid-cols-3 gap-4 mb-8">
          {[1, 0, 2].map((idx) => {
            const entry = top3[idx];
            if (!entry) return null;
            const medal = medals[idx];
            const MedalIcon = medal.icon;
            const isMe = entry.user_id === currentUserId;

            return (
              <Card key={entry.user_id} className={`${medal.border} border-2 ${idx === 0 ? "md:-mt-4" : ""} ${isMe ? "ring-2 ring-primary/30" : ""}`}>
                <CardContent className="p-5 text-center">
                  <div className={`w-12 h-12 rounded-full ${medal.bg} flex items-center justify-center mx-auto mb-3`}>
                    <MedalIcon className={`w-6 h-6 ${medal.color}`} />
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg font-bold text-primary mx-auto mb-2">
                    {getInitials(entry.name)}
                  </div>
                  <p className="font-bold text-sm truncate">{entry.name}</p>
                  <p className="text-2xl font-bold text-warning mt-1">{entry.total_points.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">pts</p>
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Flame className="w-3 h-3 text-accent" />
                    {entry.current_streak}d streak
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
        const FirstIcon = medals[0].icon;
        const SecondIcon = medals[1].icon;
        const ThirdIcon = medals[2].icon;

        return (
          <div className="sm:hidden space-y-3">
            {/* Champion card — full bleed, brand gradient */}
            {first && (
              <Card className={`overflow-hidden border-2 border-yellow-500/40 ${isMeFirst ? "ring-2 ring-primary/30" : ""}`}>
                <div className="relative bg-gradient-to-br from-yellow-500/15 via-amber-500/10 to-orange-500/15 px-5 py-5">
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-600 text-[10px] font-bold uppercase tracking-wider">
                    <Trophy className="w-3 h-3" /> Champion
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl font-bold text-white shadow-lg">
                        {getInitials(first.name)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center shadow-md">
                        <FirstIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-yellow-600">#1 &middot; All time</p>
                      <p className="text-lg font-bold leading-tight truncate mt-0.5">{first.name}</p>
                      {isMeFirst && <Badge variant="primary" className="mt-1">You</Badge>}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white/40 dark:bg-black/20 backdrop-blur-sm px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Points</p>
                      <p className="text-base font-bold text-warning leading-tight">{first.total_points.toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl bg-white/40 dark:bg-black/20 backdrop-blur-sm px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tasks</p>
                      <p className="text-base font-bold leading-tight">{first.tasks_completed}</p>
                    </div>
                    <div className="rounded-xl bg-white/40 dark:bg-black/20 backdrop-blur-sm px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Streak</p>
                      <p className="text-base font-bold leading-tight inline-flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-accent" />
                        {first.current_streak}d
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* #2 and #3 side-by-side */}
            <div className="grid grid-cols-2 gap-3">
              {second && (
                <Card className={`overflow-hidden border ${medals[1].border} ${isMeSecond ? "ring-2 ring-primary/30" : ""}`}>
                  <CardContent className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <SecondIcon className={`w-4 h-4 ${medals[1].color}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${medals[1].color}`}>2nd</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-primary mx-auto mb-1.5">
                      {getInitials(second.name)}
                    </div>
                    <p className="font-bold text-xs truncate">{second.name}</p>
                    <p className="text-base font-bold text-warning mt-0.5">{second.total_points.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 text-accent" />
                      {second.current_streak}d
                    </p>
                    {isMeSecond && <Badge variant="primary" className="mt-1.5 text-[10px]">You</Badge>}
                  </CardContent>
                </Card>
              )}
              {third && (
                <Card className={`overflow-hidden border ${medals[2].border} ${isMeThird ? "ring-2 ring-primary/30" : ""}`}>
                  <CardContent className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <ThirdIcon className={`w-4 h-4 ${medals[2].color}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${medals[2].color}`}>3rd</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-primary mx-auto mb-1.5">
                      {getInitials(third.name)}
                    </div>
                    <p className="font-bold text-xs truncate">{third.name}</p>
                    <p className="text-base font-bold text-warning mt-0.5">{third.total_points.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 text-accent" />
                      {third.current_streak}d
                    </p>
                    {isMeThird && <Badge variant="primary" className="mt-1.5 text-[10px]">You</Badge>}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );
      })()}

      {/* ====================================================================
          DESKTOP FULL LIST — original table, untouched
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
                      {medal ? (
                        <span className={`font-bold ${medal.color}`}>#{entry.rank}</span>
                      ) : (
                        <span className="text-muted-foreground">#{entry.rank}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary">
                          {getInitials(entry.name)}
                        </div>
                        <span className="font-medium">{entry.name}</span>
                        {isMe && <Badge variant="primary">You</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-warning">{entry.total_points.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right">{entry.tasks_completed}</td>
                    <td className="px-5 py-3 text-right">
                      {entry.current_streak > 0 && (
                        <span className="inline-flex items-center gap-1"><Flame className="w-3 h-3 text-accent" />{entry.current_streak}d</span>
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
      <div className="sm:hidden space-y-2">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Ranking</h2>

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
              <Card key={entry.user_id} className={`overflow-hidden ${isMe ? "border-primary/40 bg-primary/[0.04]" : ""}`}>
                <div className="flex items-center gap-3 px-3 py-3">
                  {/* Rank pill */}
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0
                    ${medal ? `${medal.bg} border ${medal.border}` : "bg-muted"}`}>
                    <span className={`text-[10px] font-bold leading-none ${medal ? medal.color : "text-muted-foreground"}`}>#</span>
                    <span className={`text-sm font-extrabold leading-none mt-0.5 ${medal ? medal.color : "text-foreground"}`}>{entry.rank}</span>
                  </div>

                  {/* Avatar + name */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {getInitials(entry.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{entry.name}</p>
                      {isMe && <Badge variant="primary" className="text-[10px] shrink-0">You</Badge>}
                    </div>
                    <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> {entry.tasks_completed}
                      </span>
                      {entry.current_streak > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-accent" /> {entry.current_streak}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-warning leading-none inline-flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      {entry.total_points.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">pts</p>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
