"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input, Btn, Badge } from "@/components/ui";
import { Users, Lock, Globe, UserPlus, UserMinus, Crown, Mail } from "lucide-react";
import { useLeaveGroup, useRemoveMember, useAddMemberByEmail } from "@/hooks/use-groups";
import { getInitials, formatDate } from "@/lib/utils";

interface Props {
  data: { group: Record<string, unknown>; members: Record<string, unknown>[]; memberCount: number };
  currentUserId: string;
  isAdmin: boolean;
}

export function GroupDetail({ data, currentUserId, isAdmin }: Props) {
  const { group, members, memberCount } = data;
  const leaveGroup = useLeaveGroup();
  const removeMember = useRemoveMember();
  const addByEmail = useAddMemberByEmail();
  const [emailToAdd, setEmailToAdd] = useState("");

  const name = String(group.name || "");
  const description = String(group.description || "");
  const privacy = String(group.privacy || "public");
  const category = String(group.category || "Other");
  const maxMembers = Number(group.max_members || 50);
  const leaderId = String(group.leader_id || "");
  const isMember = members.some((m) => { const u = m.users as Record<string, unknown> | undefined; return (u?.id || m.user_id) === currentUserId; });
  const isLeader = leaderId === currentUserId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <div className="h-16 bg-gradient-to-r from-primary/80 to-accent/80 relative">
          <div className="absolute -bottom-6 left-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white border-4 border-card shadow-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
        <CardContent className="pt-10 space-y-4">
          <div>
            <h3 className="font-bold text-lg">{name}</h3>
            <span className="text-xs text-muted-foreground capitalize flex items-center gap-1 mt-0.5">
              {privacy === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />} {privacy} &middot; {category}
            </span>
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/40"><p className="text-xs text-muted-foreground">Members</p><p className="font-bold">{memberCount} / {maxMembers}</p></div>
            <div className="p-3 rounded-xl bg-muted/40"><p className="text-xs text-muted-foreground">Created</p><p className="font-medium text-sm">{group.created_at ? formatDate(String(group.created_at)) : "-"}</p></div>
          </div>
          {isMember && !isLeader && (
            <Btn variant="danger" className="w-full" disabled={leaveGroup.isPending} onClick={() => leaveGroup.mutate(group.id as number)}>Leave Group</Btn>
          )}
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-4">
        {(isLeader || isAdmin) && (
          <Card>
            <CardContent className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">Add Member by Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder="user@example.com" className="pl-11" value={emailToAdd} onChange={(e) => setEmailToAdd(e.target.value)} />
                </div>
              </div>
              <Btn disabled={!emailToAdd.trim() || addByEmail.isPending} onClick={() => { addByEmail.mutate({ groupId: group.id as number, email: emailToAdd.trim() }); setEmailToAdd(""); }}>
                <UserPlus className="w-4 h-4 mr-1" /> Add
              </Btn>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Members ({memberCount})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.map((member) => {
                const user = member.users as Record<string, unknown> | undefined;
                const userId = String(user?.id || member.user_id || "");
                const memberName = String(user?.name || "Unknown");
                const email = String(user?.email || "");
                const isThisLeader = userId === leaderId;

                return (
                  <div key={userId} className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary">
                        {getInitials(memberName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{memberName}</p>
                          {isThisLeader && <Badge variant="warning"><Crown className="w-3 h-3 mr-1" /> Leader</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{email}</p>
                      </div>
                    </div>
                    {(isAdmin || isLeader) && !isThisLeader && userId !== currentUserId && (
                      <Btn variant="ghost" size="sm" disabled={removeMember.isPending} onClick={() => removeMember.mutate({ groupId: group.id as number, userId })}>
                        <UserMinus className="w-4 h-4" />
                      </Btn>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
