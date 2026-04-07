"use client";

import { useState } from "react";
import { Card, CardContent, Input, Btn } from "@/components/ui";
import { Search, Users, Lock, Globe, UserPlus } from "lucide-react";
import { useGroups, useJoinGroup } from "@/hooks/use-groups";
import { EmptyState } from "./empty-state";
import { getInitials } from "@/lib/utils";
import Link from "next/link";

export function GroupsList({ isAdmin }: { isAdmin: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGroups({ page, pageSize: 20, search });
  const joinGroup = useJoinGroup();
  const groups = data?.data || [];
  const totalPages = data?.totalPages || 1;

  if (!isLoading && groups.length === 0 && !search) {
    return <EmptyState icon={Users} title="No groups yet" description={isAdmin ? "Create your first group" : "No groups available"} action={{ label: "Create Group", href: "/groups/create" }} />;
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search groups..." className="pl-11" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent><div className="h-24 bg-muted rounded-xl animate-pulse" /></CardContent></Card>
        )) : groups.map((group) => {
          const name = String(group.name || "");
          const description = String(group.description || "");
          const privacy = String(group.privacy || "public");
          const leader = group.users as Record<string, unknown> | undefined;
          const leaderName = String(leader?.name || "Unknown");
          const groupId = group.id as number;

          return (
            <Link key={groupId} href={`/groups/${groupId}`}>
              <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 h-full">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{name}</h3>
                      <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                        {privacy === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />} {privacy}
                      </span>
                    </div>
                  </div>
                  {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{getInitials(leaderName)}</div>
                      <span className="text-xs text-muted-foreground">{leaderName}</span>
                    </div>
                    {privacy === "public" && (
                      <Btn variant="outline" size="sm" disabled={joinGroup.isPending} onClick={(e) => { e.preventDefault(); joinGroup.mutate(groupId); }}>
                        <UserPlus className="w-3 h-3 mr-1" /> Join
                      </Btn>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Btn>
            <Btn variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
