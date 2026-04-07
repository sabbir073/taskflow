import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui";
import { BarChart3, Users, ListTodo } from "lucide-react";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requireRole(["super_admin", "admin", "group_leader"]);

  return (
    <div>
      <PageHeader title="Reports" description="View analytics and export reports" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { icon: ListTodo, title: "Task Reports", desc: "Completion rates, trends, distribution", color: "text-primary", bg: "bg-primary/10" },
          { icon: Users, title: "User Reports", desc: "Active users, registrations, retention", color: "text-accent", bg: "bg-accent/10" },
          { icon: BarChart3, title: "Platform Reports", desc: "Performance by platform and type", color: "text-success", bg: "bg-success/10" },
        ].map((r) => (
          <Card key={r.title} className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
            <CardContent className="text-center space-y-3">
              <div className={`w-12 h-12 rounded-xl ${r.bg} flex items-center justify-center mx-auto`}><r.icon className={`w-6 h-6 ${r.color}`} /></div>
              <h3 className="font-semibold">{r.title}</h3>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">Charts and export functionality available once task data is populated.</p></CardContent></Card>
    </div>
  );
}
