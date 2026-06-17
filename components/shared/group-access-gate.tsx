"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, Btn, Input, Modal, Badge } from "@/components/ui";
import {
  Crown, Users, ListChecks, BellRing, FolderKanban, ArrowRight,
  Clock, XCircle, Sparkles, CheckCircle2, Wallet,
} from "lucide-react";
import { useMyGroupAccessState, useApplyForGroupAccess, usePayForGroupApplication } from "@/hooks/use-group-access";
import { usePaymentMethods } from "@/hooks/use-payments";

const BENEFITS: { icon: typeof Users; text: string }[] = [
  { icon: FolderKanban, text: "Create your own groups and organize members into teams." },
  { icon: ListChecks, text: "Assign tasks to your whole team in one go." },
  { icon: Users, text: "Track every member — see who has completed their tasks and who hasn't." },
  { icon: BellRing, text: "Nudge the ones falling behind with a one-tap reminder." },
];

const AUDIENCE = ["Teachers & Instructors", "Marketing Leads", "Team Leaders", "Personal / Family groups"];

export function GroupAccessGate({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession();
  const { data: state, isLoading } = useMyGroupAccessState();
  const [applyOpen, setApplyOpen] = useState(false);

  if (isLoading) {
    return (
      <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
    );
  }

  const app = state?.application as Record<string, unknown> | null;
  const status = app ? String(app.status) : null;
  const pricing = state?.pricing;

  // An in-flight application → show its status (not the marketing card).
  if (status === "awaiting_quote") {
    return <StatusCard tone="pending" icon={Clock} title="Your request is under review"
      body="An admin will review your request and set your price. You'll be notified here and can pay once it's ready." />;
  }
  if (status === "awaiting_payment") {
    return <AwaitingPaymentCard app={app!} />;
  }
  if (status === "pending_review") {
    return <StatusCard tone="pending" icon={Clock} title="Payment submitted — awaiting approval"
      body="Thanks! An admin is verifying your payment. Your group access will unlock as soon as it's approved." />;
  }

  // No application, or a rejected one → marketing card + Apply (re-apply).
  const rejected = status === "rejected";

  return (
    <>
      {rejected && (
        <div className="mb-4">
          <StatusCard tone="error" icon={XCircle} title="Your previous application was rejected"
            body={app?.review_notes ? String(app.review_notes) : "You can adjust your request and apply again below."} compact />
        </div>
      )}

      {/* Compact banner — shown when the user already has groups (as a member)
          so we don't hide their groups; just offer the upsell to lead. */}
      {compact ? (
        <Card className="overflow-hidden border-primary/20">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-linear-to-br from-primary/5 to-accent/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">Want to lead your own teams?</p>
                <p className="text-xs text-muted-foreground">Apply for group access to create groups and assign tasks.</p>
              </div>
            </div>
            <Btn onClick={() => setApplyOpen(true)} className="shrink-0">
              <Sparkles className="w-4 h-4 mr-1.5" /> {rejected ? "Apply again" : "Apply for Group"}
            </Btn>
          </CardContent>
        </Card>
      ) : (
      /* Marketing / upsell card */
      <Card className="overflow-hidden border-primary/20">
        <div className="relative bg-linear-to-br from-primary/10 via-card to-accent/10 p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-16 -right-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Lead your own teams with Groups</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Groups let you manage people and their work in one place. Apply for group access to become a Group Leader —
              perfect for teachers, marketers, and team leads who need to keep everyone on track.
            </p>

            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              {BENEFITS.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.text} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{b.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Great for</span>
              {AUDIENCE.map((a) => (
                <Badge key={a} variant="default">{a}</Badge>
              ))}
            </div>

            <div className="mt-6">
              <Btn size="lg" onClick={() => setApplyOpen(true)}>
                <Sparkles className="w-4 h-4 mr-1.5" /> {rejected ? "Apply again" : "Apply for Group"}
              </Btn>
              {pricing?.mode === "admin" && (
                <p className="mt-2 text-xs text-muted-foreground">An admin will review your request and set a price.</p>
              )}
            </div>
          </div>
        </div>
      </Card>
      )}

      {applyOpen && (
        <ApplyModal
          name={session?.user?.name || ""}
          email={session?.user?.email || ""}
          pricing={pricing}
          onClose={() => setApplyOpen(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
function StatusCard({ tone, icon: Icon, title, body, compact }: {
  tone: "pending" | "error" | "success";
  icon: typeof Clock;
  title: string;
  body: string;
  compact?: boolean;
}) {
  const toneCls = tone === "error" ? "bg-error/10 text-error" : tone === "success" ? "bg-success/10 text-success" : "bg-warning/10 text-warning";
  return (
    <Card>
      <CardContent className={compact ? "py-4 flex items-start gap-3" : "py-12 text-center flex flex-col items-center gap-3"}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${toneCls}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={compact ? "min-w-0" : "max-w-md"}>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground mt-1">{body}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
function MethodPicker({ methodId, setMethodId }: { methodId: number | null; setMethodId: (id: number) => void }) {
  const { data: methods } = usePaymentMethods();
  const list = (methods || []) as Record<string, unknown>[];
  const selected = list.find((m) => (m.id as number) === methodId);
  if (list.length === 0) {
    return <p className="text-xs text-warning">No payment methods configured yet — contact an admin.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {list.map((m) => {
          const id = m.id as number;
          const active = id === methodId;
          return (
            <button key={id} type="button" onClick={() => setMethodId(id)}
              className={`text-left px-3 py-2 rounded-xl border text-sm transition ${active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-foreground/20"}`}>
              <span className="font-medium">{String(m.name || "")}</span>
              <span className="ml-1 text-[10px] uppercase text-muted-foreground">{String(m.currency || "")}</span>
            </button>
          );
        })}
      </div>
      {selected?.instruction ? (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap rounded-lg bg-muted/40 p-2.5">{String(selected.instruction)}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
function ApplyModal({ name, email, pricing, onClose }: {
  name: string;
  email: string;
  pricing?: { mode: "auto" | "admin"; ratePerGroup: number; ratePerMember: number; ratePerTask: number; basePrice: number };
  onClose: () => void;
}) {
  const apply = useApplyForGroupAccess();
  const [contact, setContact] = useState("");
  const [groups, setGroups] = useState(1);
  const [members, setMembers] = useState(10);
  const [tasks, setTasks] = useState(5);
  const [methodId, setMethodId] = useState<number | null>(null);
  const [txn, setTxn] = useState("");

  const auto = pricing?.mode === "auto";
  const price = pricing
    ? Math.max(0, Math.round((pricing.basePrice + groups * pricing.ratePerGroup + members * pricing.ratePerMember + tasks * pricing.ratePerTask) * 100) / 100)
    : 0;

  async function submit() {
    const r = await apply.mutateAsync({
      contact_number: contact,
      requested_groups: groups,
      requested_members: members,
      requested_tasks: tasks,
      ...(auto ? { payment_method_id: methodId ?? undefined, transaction_id: txn } : {}),
    });
    if (r.success) onClose();
  }

  return (
    <Modal isOpen onClose={onClose} panelClassName="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border/50 overflow-hidden">
      <div className="p-5 sm:p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center"><Crown className="w-4 h-4 text-white" /></div>
          <h3 className="text-lg font-bold">Apply for Group Access</h3>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Account name</label>
              <Input value={name} readOnly className="bg-muted/40" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input value={email} readOnly className="bg-muted/40" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Contact number</label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. +8801XXXXXXXXX" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Groups" value={groups} min={1} onChange={setGroups} />
            <NumberField label="Members" value={members} min={0} onChange={setMembers} />
            <NumberField label="Tasks" value={tasks} min={0} onChange={setTasks} />
          </div>

          {auto && pricing && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1.5"><Wallet className="w-4 h-4 text-primary" /> Total price</span>
                <span className="text-lg font-bold text-primary tabular-nums">{price.toFixed(2)} USD</span>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Payment method</label>
                <MethodPicker methodId={methodId} setMethodId={setMethodId} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Transaction ID</label>
                <Input value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="Your payment transaction ID" />
              </div>
            </div>
          )}

          {!auto && (
            <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 p-2.5">
              After you submit, an admin will review your request and set a price. You&apos;ll be notified here to complete payment.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} isLoading={apply.isPending}>{auto ? "Submit & Pay" : "Submit request"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

function NumberField({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input type="number" inputMode="numeric" min={min} value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))} />
    </div>
  );
}

// ---------------------------------------------------------------------------
function AwaitingPaymentCard({ app }: { app: Record<string, unknown> }) {
  const pay = usePayForGroupApplication();
  const [methodId, setMethodId] = useState<number | null>(null);
  const [txn, setTxn] = useState("");
  const price = Number(app.price || 0);
  const grantedGroups = app.granted_groups ?? app.requested_groups;
  const grantedMembers = app.granted_members ?? app.requested_members;
  const grantedTasks = app.granted_tasks ?? app.requested_tasks;

  async function submit() {
    if (!methodId || !txn.trim()) return;
    await pay.mutateAsync({ appId: app.id as number, methodId, transactionId: txn.trim() });
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
          <div>
            <p className="font-semibold">Your price is ready</p>
            <p className="text-xs text-muted-foreground">Complete payment to finish your group access application.</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <span className="text-sm font-medium">Amount due</span>
          <span className="text-xl font-bold text-primary tabular-nums">{price.toFixed(2)} USD</span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> {String(grantedGroups)} groups</span>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> {String(grantedMembers)} members</span>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> {String(grantedTasks)} tasks</span>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Payment method</label>
          <MethodPicker methodId={methodId} setMethodId={setMethodId} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Transaction ID</label>
          <Input value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="Your payment transaction ID" />
        </div>

        <div className="flex justify-end">
          <Btn onClick={submit} isLoading={pay.isPending} disabled={!methodId || !txn.trim()}>
            Submit payment <ArrowRight className="w-4 h-4 ml-1" />
          </Btn>
        </div>
      </CardContent>
    </Card>
  );
}
