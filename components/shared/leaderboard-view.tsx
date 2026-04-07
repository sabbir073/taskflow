"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Badge } from "@/components/ui";
import { Trophy, Medal, Award, Flame } from "lucide-react";
import { getLeaderboard } from "@/lib/actions/points";
import { getInitials } from "@/lib/utils";

export function LeaderboardView({ currentUserId }: { currentUserId: string }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["leaderboard", "global", "all_time"],
    queryFn: () => getLeaderboard("global", "all_time"),
  });

  const medals = [
    { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    { icon: Medal, color: "text-gray-400", bg: "bg-gray-400/10", border: "border-gray-400/30" },
    { icon: Award, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/30" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top 3 podium */}
      {!isLoading && entries && entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 0, 2].map((idx) => {
            const entry = entries[idx];
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

      {/* Full list */}
      <Card>
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
    </div>
  );
}
