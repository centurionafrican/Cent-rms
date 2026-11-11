import Link from "next/link"
import {
  ArrowUpRight,
  CalendarCheck2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  ShieldCheck,
  UsersRound,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type CoordinatorStats = {
  pendingAssignments: number
  pendingLeaves: number
}

export function CoordinatorDashboard({ stats }: { stats: CoordinatorStats }) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 px-6 py-8 text-primary-foreground shadow-lg sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border border-primary-foreground/10" />
        <div className="pointer-events-none absolute -right-4 -top-12 size-48 rounded-full border border-primary-foreground/10" />
        <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-4 border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
              Coordinator workspace
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Keep every post covered.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-primary-foreground/80 sm:text-base">
              Coordinate assignments, stay ahead of requests, and keep your teams moving from one clear view.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary" className="shrink-0 rounded-xl font-semibold shadow-sm">
            <Link href="/dashboard/assignments">
              <ClipboardList data-icon="inline-start" />
              Make an assignment
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>

      <section aria-label="Coordinator overview" className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
            <div>
              <CardDescription>Assignments to review</CardDescription>
              <CardTitle className="mt-2 text-3xl tabular-nums">{stats.pendingAssignments}</CardTitle>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
              <ClipboardCheck aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Keep shift coverage moving.</p>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/assignments">View assignments <ArrowUpRight data-icon="inline-end" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
            <div>
              <CardDescription>Leave requests</CardDescription>
              <CardTitle className="mt-2 text-3xl tabular-nums">{stats.pendingLeaves}</CardTitle>
            </div>
            <div className="rounded-xl bg-violet-500/10 p-3 text-violet-600 dark:text-violet-400">
              <CalendarCheck2 aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Requests and plans in your workflow.</p>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/leaves">Open leaves <ArrowUpRight data-icon="inline-end" /></Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary"><ShieldCheck aria-hidden="true" /></div>
            <div>
              <CardTitle className="text-lg">Your operations hub</CardTitle>
              <CardDescription>Assignment work is one step away. Your other tools remain available in the sidebar.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <UsersRound aria-hidden="true" className="size-4 text-primary" />
            <span>Build a clear roster before the next shift begins.</span>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/dashboard/assignments">Open assignment board <ArrowUpRight data-icon="inline-end" /></Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function SupervisorDashboard() {
  const tools = [
    {
      href: "/dashboard/time-attendance",
      title: "Time & Attendance",
      description: "Review shift attendance and verify time records.",
      icon: Clock3,
    },
    {
      href: "/dashboard/guard-portal",
      title: "Guard Portal",
      description: "Open the guard-facing portal and its daily tools.",
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="rounded-3xl border border-border/70 bg-card px-6 py-8 shadow-sm sm:px-9">
        <Badge variant="outline" className="mb-4">Supervisor workspace</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your team, in view.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Choose a tool to check attendance or access the Guard Portal.</p>
      </section>
      <section aria-label="Supervisor tools" className="grid gap-4 sm:grid-cols-2">
        {tools.map(({ href, title, description, icon: Icon }) => (
          <Card key={href} className="rounded-2xl border-border/70 transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon aria-hidden="true" /></div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full justify-between rounded-xl">
                <Link href={href}>{title}<ArrowUpRight data-icon="inline-end" /></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
