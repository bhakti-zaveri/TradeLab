import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Link,
  Route,
  Router as WouterRouter,
  Switch,
  useLocation,
} from "wouter";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Command,
  Gauge,
  GraduationCap,
  LineChart,
  ListChecks,
  LockKeyhole,
  Menu,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import {
  getGetAnalyticsQueryKey,
  getGetDashboardQueryKey,
  getGetPortfolioQueryKey,
  getGetReplayQueryKey,
  getListOrdersQueryKey,
  getListTradesQueryKey,
  useCreateJournalEntry,
  useGetAnalytics,
  useGetDashboard,
  useGetPortfolio,
  useGetReplay,
  useHealthCheck,
  useListInstruments,
  useListOrders,
  useListTrades,
  usePerformReplayAction,
  usePlaceOrder,
} from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

const money = (value = 0) =>
  `${value < 0 ? "-" : ""}₹${Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (value = 0) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
const dateTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function Button({
  children,
  className = "",
  variant = "primary",
  onClick,
  type = "button",
  disabled,
  testId,
}: any) {
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:brightness-105",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-border bg-card text-foreground hover:bg-secondary",
    ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
    lime: "bg-accent text-accent-foreground hover:brightness-105",
    danger: "bg-destructive text-destructive-foreground hover:brightness-105",
  };
  return (
    <button
      data-testid={testId}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-45 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "", title, action }: any) {
  return (
    <section
      className={`rounded-xl border border-card-border bg-card text-card-foreground ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Kpi({ label, value, detail, tone = "default", icon: Icon }: any) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";
  return (
    <Card className="lift p-4">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
          {label}
        </p>
        {Icon && <Icon className="h-4 w-4 text-primary" />}
      </div>
      <p
        className={`mt-3 font-mono text-2xl font-medium tracking-tight ${toneClass}`}
        data-testid={`text-kpi-${label.toLowerCase().replaceAll(" ", "-")}`}
      >
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </Card>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-secondary ${className}`} />
  );
}
function QueryState({ loading, error, children, empty }: any) {
  if (loading)
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  if (error)
    return (
      <Card className="border-destructive/30 p-8 text-center">
        <CircleHelp className="mx-auto h-7 w-7 text-destructive" />
        <h3 className="mt-3 font-semibold">Data connection interrupted</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try the page again in a moment.
        </p>
      </Card>
    );
  if (empty)
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  return children;
}

const navGroups = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: Gauge },
      { href: "/replay", label: "Replay terminal", icon: Activity },
      { href: "/portfolio", label: "Portfolio", icon: WalletCards },
    ],
  },
  {
    label: "Learn",
    items: [
      { href: "/academy", label: "Academy", icon: GraduationCap },
    ],
  },
  {
    label: "Review",
    items: [
      { href: "/orders", label: "Orders", icon: ListChecks },
      { href: "/journal", label: "Trade journal", icon: BookOpen },
      { href: "/analytics", label: "Behaviour lab", icon: BrainCircuit },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin", label: "Admin", icon: ShieldCheck },
      { href: "/settings", label: "Settings", icon: Settings2 },
    ],
  },
];

function Shell({ children }: { children: any }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const title =
    navGroups.flatMap((g) => g.items).find((item) => item.href === location)
      ?.label ?? "TradeLab";
  return (
    <div className="min-h-[100dvh] bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[250px] flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-3">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            data-testid="link-brand"
          >
            <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-sidebar">
              <Zap className="h-4 w-4 fill-current" />
            </span>
            <span className="font-semibold tracking-tight text-sidebar-foreground">
              Trade<span className="text-accent">Lab</span>
            </span>
          </Link>
          <button
            className="text-sidebar-foreground/60 md:hidden"
            onClick={() => setOpen(false)}
            data-testid="button-close-menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-3 mt-8 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.14em] text-sidebar-foreground/55">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Simulated mode
          </div>
          <p className="mt-2 text-xs leading-5 text-sidebar-foreground/80">
            Replay fictional markets. Build evidence, not predictions.
          </p>
        </div>
        <nav className="mt-7 flex-1 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-sidebar-foreground/40">
                {group.label}
              </p>
              <div className="mt-2 space-y-1">
                {group.items.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    data-testid={`link-nav-${label.toLowerCase().replaceAll(" ", "-")}`}
                    className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${location === href ? "bg-accent text-accent-foreground font-semibold" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {href === "/replay" && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent group-[.bg-accent]:bg-sidebar" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border pt-3">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent"
            data-testid="link-profile"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold">
              AR
            </span>
            <span>
              <span className="block text-sidebar-foreground">Alex Rivera</span>
              <span className="block text-[11px] text-sidebar-foreground/45">
                Learner account
              </span>
            </span>
          </Link>
        </div>
      </aside>
      {open && (
        <button
          className="fixed inset-0 z-20 bg-sidebar/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <main className="md:pl-[250px]">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur-md sm:px-7">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md p-2 hover:bg-secondary md:hidden"
              onClick={() => setOpen(true)}
              data-testid="button-open-menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
                TradeLab / workspace
              </p>
              <h1 className="text-sm font-semibold">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              API connected
            </div>
            <Button variant="ghost" className="px-2" testId="button-help">
              <CircleHelp className="h-4 w-4" />
            </Button>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              AR
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] p-4 sm:p-7">{children}</div>
      </main>
    </div>
  );
}

function PageIntro({ eyebrow, title, description, actions }: any) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-primary">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold tracking-[-.03em] sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-[100dvh] bg-sidebar text-sidebar-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          data-testid="link-landing-brand"
        >
          <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-sidebar">
            <Zap className="h-4 w-4 fill-current" />
          </span>
          <span className="font-semibold tracking-tight">
            Trade<span className="text-accent">Lab</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground"
            data-testid="link-login"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
            data-testid="link-start-learning"
          >
            Start learning <ArrowRight className="ml-1 inline h-4 w-4" />
          </Link>
        </div>
      </header>
      <div className="data-grid relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-16 px-5 pb-24 pt-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pb-32 lg:pt-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1.5 text-[11px] font-medium text-sidebar-foreground/75">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />A practice
              environment for deliberate traders
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-.065em] sm:text-7xl">
              Study the trade.
              <br />
              <span className="text-accent">Not the noise.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-sidebar-foreground/65 sm:text-lg">
              Replay fictional market sessions, make decisions under pressure,
              then turn every execution into a better process.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground"
                data-testid="link-hero-register"
              >
                Create a learner account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/replay"
                className="inline-flex items-center gap-2 rounded-md border border-sidebar-border px-5 py-3 text-sm font-semibold text-sidebar-foreground/80 hover:bg-sidebar-accent"
                data-testid="link-hero-replay"
              >
                Open a replay <Play className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-6 text-xs text-sidebar-foreground/40">
              No real money. No live quotes. No financial advice.
            </p>
          </div>
          <div className="relative">
            <div className="absolute -inset-12 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative rounded-xl border border-sidebar-border bg-sidebar-accent/75 p-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-sidebar-border pb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/45">
                    Replay terminal
                  </p>
                  <p className="mt-1 font-mono text-sm">NVDA / 2024.06.18</p>
                </div>
                <span className="rounded bg-accent/15 px-2 py-1 text-[10px] font-medium text-accent">
                  SIMULATED
                </span>
              </div>
              <div className="mt-5 h-56">
                <svg
                  viewBox="0 0 600 230"
                  className="h-full w-full"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 198 L60 180 L94 192 L140 138 L182 160 L225 112 L270 132 L312 96 L354 110 L400 66 L440 88 L480 47 L522 72 L600 28"
                    fill="none"
                    stroke="#d9f05a"
                    strokeWidth="3"
                  />
                  <path
                    d="M0 198 L60 180 L94 192 L140 138 L182 160 L225 112 L270 132 L312 96 L354 110 L400 66 L440 88 L480 47 L522 72 L600 28 V230 H0Z"
                    fill="url(#heroFill)"
                    opacity=".18"
                  />
                  <defs>
                    <linearGradient id="heroFill" x1="0" x2="0" y1="0" y2="1">
                      <stop stopColor="#d9f05a" />
                      <stop offset="1" stopColor="#d9f05a" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-sidebar-border pt-4 text-xs">
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Equity</p>
                  <p className="mt-1 font-mono text-accent">₹1,04,280.40</p>
                </div>
                <div>
                  <p className="text-sidebar-foreground/45">Session</p>
                  <p className="mt-1 font-mono">08:42:11</p>
                </div>
                <div>
                  <p className="text-sidebar-foreground/45">Decisions</p>
                  <p className="mt-1 font-mono">18 / 24</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-mono text-3xl text-accent">01</p>
            <h2 className="mt-4 text-xl font-semibold">Replay the evidence</h2>
            <p className="mt-2 text-sm leading-6 text-sidebar-foreground/55">
              Move through fictional candle data one decision at a time. Slow
              down when your process needs it.
            </p>
          </div>
          <div>
            <p className="font-mono text-3xl text-accent">02</p>
            <h2 className="mt-4 text-xl font-semibold">Execute with intent</h2>
            <p className="mt-2 text-sm leading-6 text-sidebar-foreground/55">
              Place virtual market, limit, and stop orders. Every fill is
              recorded in your learning history.
            </p>
          </div>
          <div>
            <p className="font-mono text-3xl text-accent">03</p>
            <h2 className="mt-4 text-xl font-semibold">Review the pattern</h2>
            <p className="mt-2 text-sm leading-6 text-sidebar-foreground/55">
              Journal the reason, risk, and mistake behind each trade. Study the
              behaviour your P&L cannot show.
            </p>
          </div>
        </div>
      </section>
      <footer className="border-t border-sidebar-border px-5 py-7 text-center text-xs text-sidebar-foreground/40">
        TradeLab is an educational simulator using fictional historical data. It
        is not investment advice.
      </footer>
    </div>
  );
}

function Auth({ mode }: { mode: "login" | "register" }) {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div className="min-h-[100dvh] bg-sidebar px-5 py-6 text-sidebar-foreground">
      <header className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="flex w-fit items-center gap-2.5"
          data-testid="link-auth-brand"
        >
          <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-sidebar">
            <Zap className="h-4 w-4 fill-current" />
          </span>
          <span className="font-semibold">
            Trade<span className="text-accent">Lab</span>
          </span>
        </Link>
      </header>
      <main className="mx-auto flex max-w-5xl items-center justify-center py-16 sm:py-24">
        <div className="w-full max-w-md rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-accent">
            {mode === "login" ? "Welcome back" : "Build your practice desk"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {mode === "login"
              ? "Log in to TradeLab"
              : "Create your learner account"}
          </h1>
          <p className="mt-2 text-sm text-sidebar-foreground/55">
            {mode === "login"
              ? "Your replay history is waiting."
              : "Start with fictional markets and a clean slate."}
          </p>
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setLocation("/dashboard");
            }}
          >
            <label className="block text-sm font-medium">
              Email
              <input
                data-testid="input-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="you@example.com"
                className="mt-2 w-full rounded-md border border-sidebar-border bg-sidebar px-3 py-2.5 text-sm outline-none ring-accent/40 placeholder:text-sidebar-foreground/25 focus:ring-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                data-testid="input-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={6}
                placeholder="Six or more characters"
                className="mt-2 w-full rounded-md border border-sidebar-border bg-sidebar px-3 py-2.5 text-sm outline-none ring-accent/40 placeholder:text-sidebar-foreground/25 focus:ring-2"
              />
            </label>
            <Button
              type="submit"
              variant="lime"
              className="mt-2 w-full py-3"
              testId="button-auth-submit"
            >
              {mode === "login" ? "Enter workspace" : "Create workspace"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-7 text-center text-sm text-sidebar-foreground/50">
            {mode === "login"
              ? "New to TradeLab? "
              : "Already have an account? "}
            <Link
              href={mode === "login" ? "/register" : "/login"}
              className="font-semibold text-accent hover:underline"
              data-testid="link-switch-auth"
            >
              {mode === "login" ? "Create one" : "Log in"}
            </Link>
          </p>
          <p className="mt-8 border-t border-sidebar-border pt-5 text-center text-[11px] leading-5 text-sidebar-foreground/35">
            <LockKeyhole className="mr-1 inline h-3 w-3" />
            This is a learning product. No brokerage connection, no real
            capital.
          </p>
        </div>
      </main>
    </div>
  );
}

function MiniEquity({ points = [] as any[] }) {
  const validPoints = points || [];
  const values = validPoints.length
    ? validPoints.map((p) => p.equity)
    : [100000, 100850, 100420, 101650, 101220, 102480, 103140, 104280];
  const min = Math.min(...values),
    max = Math.max(...values);
  const path = values
    .map(
      (v, i) =>
        `${(i / Math.max(values.length - 1, 1)) * 100},${88 - ((v - min) / Math.max(max - min, 1)) * 68}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      <polyline
        points={`0,88 ${path} 100,88`}
        fill="hsl(69 78% 65% / .14)"
        stroke="none"
      />
      <polyline
        points={path}
        fill="none"
        stroke="hsl(224 71% 48%)"
        strokeWidth="1.7"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Dashboard() {
  const { data, isLoading, isError } = useGetDashboard();
  const portfolio = data?.portfolio;
  return (
    <Shell>
      <PageIntro
        eyebrow="Trader overview"
        title="Your practice desk"
        description="A quick read on capital, open risk, and the decisions worth reviewing."
        actions={
          <Link
            href="/replay"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            data-testid="link-dashboard-replay"
          >
            <Play className="h-4 w-4" />
            Start a replay
          </Link>
        }
      />
      <QueryState loading={isLoading} error={isError}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Account equity"
            value={money(portfolio?.equity)}
            detail={`Cash ${money(portfolio?.cash)}`}
            icon={WalletCards}
          />
          <Kpi
            label="Win rate"
            value={`${(data?.winRate ?? 0).toFixed(1)}%`}
            detail={`${data?.openPositions ?? 0} open positions`}
            tone="positive"
            icon={Target}
          />
          <Kpi
            label="Realised P&L"
            value={money(portfolio?.realisedPnl)}
            detail="Across completed trades"
            tone={(portfolio?.realisedPnl ?? 0) >= 0 ? "positive" : "negative"}
            icon={TrendingUp}
          />
          <Kpi
            label="Current drawdown"
            value={`${(data?.drawdown ?? 0).toFixed(1)}%`}
            detail="From peak equity"
            tone="negative"
            icon={TrendingDown}
          />
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
          <Card
            title="Equity curve"
            action={
              <Link
                href="/analytics"
                className="text-xs font-semibold text-primary hover:underline"
                data-testid="link-dashboard-analytics"
              >
                Open analytics <ArrowRight className="ml-1 inline h-3 w-3" />
              </Link>
            }
          >
            <div className="h-64 p-4">
              <MiniEquity points={[]} />
            </div>
            <div className="flex justify-between border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
              <span>Jun 03</span>
              <span>Jun 18 · simulated</span>
            </div>
          </Card>
          <Card title="Coach notes">
            <div className="space-y-3 p-4">
              {(data?.insights?.length
                ? data.insights
                : [
                    "Journal the reason before you judge the result.",
                    "Your best setup is the one you can explain.",
                    "Use replay speed 1× when risk feels unclear.",
                  ]
              )
                .slice(0, 3)
                .map((note, i) => (
                  <div
                    key={note}
                    className="flex gap-3 border-b border-border/70 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="font-mono text-xs text-accent-foreground/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {note}
                    </p>
                  </div>
                ))}
            </div>
          </Card>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <Card
            title="Recent executions"
            action={
              <Link
                href="/journal"
                className="text-xs font-semibold text-primary hover:underline"
                data-testid="link-dashboard-journal"
              >
                Review journal
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Symbol</th>
                    <th className="px-4 py-3 font-medium">Side</th>
                    <th className="px-4 py-3 font-medium">P&L</th>
                    <th className="px-4 py-3 font-medium">Journal</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentTrades ?? []).slice(0, 5).map((trade: any) => (
                    <tr key={trade.id} className="border-t border-border/70">
                      <td className="px-4 py-3 font-mono font-medium">
                        {trade.symbol}
                      </td>
                      <td
                        className={`px-4 py-3 text-xs font-semibold uppercase ${trade.side === "buy" ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {trade.side}
                      </td>
                      <td
                        className={`px-4 py-3 font-mono ${trade.realisedPnl >= 0 ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {money(trade.realisedPnl)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {trade.journalStatus === "complete"
                          ? "Complete"
                          : "Needs review"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data?.recentTrades?.length && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No executions yet. Your first replay is a good place to start.
                </div>
              )}
            </div>
          </Card>
          <Card title="Learning mode">
            <div className="p-4">
              <div className="rounded-lg bg-secondary p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Fictional data, real reflection
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  TradeLab keeps the market imaginary so your attention can stay
                  on process, sizing, and behaviour.
                </p>
                <Link
                  href="/settings"
                  className="mt-4 inline-flex text-xs font-semibold text-primary hover:underline"
                  data-testid="link-dashboard-settings"
                >
                  Tune your workspace <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </QueryState>
    </Shell>
  );
}

function CandleChart({ candles = [] as any[], currentIndex = 0 }) {
  const validCandles = candles || [];
  const visible = validCandles.length
    ? validCandles.slice(0, Math.max(currentIndex + 1, 1))
    : [];
  const source = visible.length
    ? visible
    : Array.from({ length: 24 }, (_, i) => ({
        open: 100 + i * 0.8,
        high: 103 + i * 0.9,
        low: 98 + i * 0.6,
        close: 101 + i * 0.75,
        time: `${i}:00`,
      }));
  const min = Math.min(...source.map((c) => c.low)),
    max = Math.max(...source.map((c) => c.high));
  const y = (n: number) => 18 + ((max - n) / Math.max(max - min, 1)) * 72;
  const barW = 88 / source.length;
  return (
    <div className="relative h-full min-h-[280px] w-full overflow-hidden rounded-lg bg-secondary/40 p-3">
      <div className="pointer-events-none absolute inset-0 data-grid opacity-50" />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="relative h-full w-full"
      >
        {source.map((c, i) => {
          const x = 6 + i * barW;
          const up = c.close >= c.open;
          return (
            <g key={`${c.time}-${i}`}>
              <line
                x1={x}
                x2={x}
                y1={y(c.high)}
                y2={y(c.low)}
                stroke={up ? "#15946a" : "#d1544a"}
                strokeWidth=".35"
                vectorEffect="non-scaling-stroke"
              />
              <rect
                x={x - barW * 0.28}
                y={y(Math.max(c.open, c.close))}
                width={barW * 0.56}
                height={Math.max(
                  y(Math.min(c.open, c.close)) - y(Math.max(c.open, c.close)),
                  1.2,
                )}
                fill={up ? "#15946a" : "#d1544a"}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-2 left-3 right-3 flex justify-between font-mono text-[9px] text-muted-foreground">
        <span>{source[0]?.time?.slice?.(0, 10) ?? "09:30"}</span>
        <span>
          {source[source.length - 1]?.time?.slice?.(0, 10) ?? "16:00"}
        </span>
      </div>
    </div>
  );
}

function Replay() {
  const qc = useQueryClient();
  const { data: instruments, isLoading: instrumentsLoading } =
    useListInstruments();
  const { data: replay, isLoading, isError } = useGetReplay();
  const action = usePerformReplayAction();
  const order = usePlaceOrder();
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop">(
    "market",
  );
  const [quantity, setQuantity] = useState("10");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [toast, setToast] = useState("");
  const [showJournalModal, setShowJournalModal] = useState(false);
  const selectedSymbol =
    symbol || replay?.symbol || instruments?.[0]?.symbol || "AAPL";
  const selectedInstrument = instruments?.find(
    (i: any) => i.symbol === selectedSymbol,
  );
  const sendAction = (
    name: "play" | "pause" | "next" | "restart",
    speed?: 1 | 2 | 5 | 10,
    symbolOverride = selectedSymbol,
  ) =>
    action.mutate(
      { data: { action: name, speed, symbol: symbolOverride } },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: getGetReplayQueryKey() }),
      },
    );
  const submitOrder = (e: any) => {
    e.preventDefault();
    order.mutate(
      {
        data: {
          symbol: selectedSymbol,
          side,
          orderType,
          quantity: Number(quantity),
          limitPrice: orderType === "limit" ? Number(limitPrice) : null,
          stopPrice: Number(stopPrice),
        },
      },
      {
        onSuccess: (result: any) => {
          if (result?.status === "executed") {
            setShowJournalModal(true);
            setToast("Execution recorded.");
          } else {
            setToast("Order placed in the simulation.");
          }
          qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          qc.invalidateQueries({ queryKey: getListTradesQueryKey() });
          setTimeout(() => setToast(""), 4200);
        },
        onError: (err: any) => {
          setToast(err?.response?.data?.error || "Order rejected.");
          setTimeout(() => setToast(""), 4200);
        }
      },
    );
  };
  return (
    <Shell>
      <PageIntro
        eyebrow="Market replay"
        title="Replay terminal"
        description="Move through a fictional session, make one decision at a time, and leave an honest record behind."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5 text-[11px] font-semibold text-accent-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Educational simulation
          </span>
        }
      />
      <QueryState loading={isLoading || instrumentsLoading} error={isError}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
            Instrument
            <select
              data-testid="select-instrument"
              value={selectedSymbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                sendAction("restart", undefined, e.target.value);
              }}
              className="rounded-md border border-border bg-secondary px-3 py-2 font-mono text-xs font-medium text-foreground outline-none"
            >
              {(instruments ?? []).map((i: any) => (
                <option key={i.symbol} value={i.symbol}>
                  {i.symbol} · {i.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {replay?.replayDate ?? "Historical session"}
            </span>
            <div className="mx-1 h-5 w-px bg-border" />
            <Button
              variant="ghost"
              className="px-2"
              onClick={() => sendAction("restart")}
              testId="button-replay-restart"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant={replay?.isPlaying ? "secondary" : "primary"}
              onClick={() => sendAction(replay?.isPlaying ? "pause" : "play")}
              testId="button-replay-play"
            >
              {replay?.isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {replay?.isPlaying ? "Pause" : "Play"}
            </Button>
            <Button
              variant="outline"
              onClick={() => sendAction("next")}
              testId="button-replay-next"
            >
              Next candle <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-5">
            <Card className="terminal-glow">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono text-lg font-medium">
                      {replay?.symbol ?? selectedSymbol}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {replay?.instrumentName ??
                        selectedInstrument?.name ??
                        "Fictional instrument"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedInstrument?.exchange ?? "SIM"} ·{" "}
                    {replay?.replayDate ??
                      "Replay date hidden until session loads"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-medium">
                    {money(replay?.currentPrice ?? selectedInstrument?.price)}
                  </p>
                  <p
                    className={`font-mono text-xs ${(selectedInstrument?.change ?? 1) >= 0 ? "text-emerald-600" : "text-destructive"}`}
                  >
                    {pct(selectedInstrument?.changePct ?? 0)} today
                  </p>
                </div>
              </div>
              <div className="h-[340px] p-3 sm:h-[430px]">
                <CandleChart
                  candles={replay?.candles}
                  currentIndex={replay?.candleIndex ?? 0}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Candle{" "}
                  <span className="font-mono text-foreground">
                    {(replay?.candleIndex ?? 0) + 1}
                  </span>{" "}
                  / {replay?.totalCandles ?? replay?.candles?.length ?? "—"}
                </div>
                <div className="flex items-center gap-1 rounded-md bg-secondary p-1">
                  {([1, 2, 5, 10] as const).map((speed) => (
                    <button
                      key={speed}
                      onClick={() =>
                        sendAction(replay?.isPlaying ? "play" : "pause", speed)
                      }
                      className={`rounded px-2 py-1 text-[11px] font-mono ${replay?.speed === speed ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      data-testid={`button-speed-${speed}`}
                    >
                      {speed}×
                    </button>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent/30 text-accent-foreground">
                  <CircleHelp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Replay discipline</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {selectedInstrument?.description ??
                      "The chart is fictional by design. Treat each candle as evidence, not a forecast."}
                  </p>
                </div>
              </div>
            </Card>
          </div>
          <div className="space-y-5">
            <Card title="Place virtual order">
              <form onSubmit={submitOrder} className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-2">
                  {(["buy", "sell"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSide(value)}
                      className={`rounded-md border py-2 text-sm font-semibold uppercase transition ${side === value ? (value === "buy" ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : "border-destructive bg-destructive/10 text-destructive") : "border-border text-muted-foreground"}`}
                      data-testid={`button-side-${value}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  Order type
                  <select
                    data-testid="select-order-type"
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as any)}
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {["market", "limit", "stop"].map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted-foreground">
                  Quantity
                  <input
                    data-testid="input-order-quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    type="number"
                    min="1"
                    step="1"
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                {orderType === "limit" && (
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Limit price
                    <input
                      data-testid="input-limit-price"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      type="number"
                      min="0"
                      step=".01"
                      required
                      className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                )}
                <label className="block text-xs font-semibold text-muted-foreground">
                  Stop loss
                  <input
                    data-testid="input-stop-price"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                    type="number"
                    min="0"
                    step=".01"
                    required
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                {stopPrice && quantity && (
                  <div className="rounded border border-accent/20 bg-accent/5 p-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Risk per share</span>
                      <span className="font-mono">
                        {money(
                          Math.abs(
                            (orderType === "limit" ? Number(limitPrice || replay?.currentPrice) : (replay?.currentPrice ?? 0)) - Number(stopPrice)
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="font-semibold text-muted-foreground">Total risk</span>
                      <span className="font-mono font-semibold text-destructive">
                        {money(
                          Math.abs(
                            ((orderType === "limit" ? Number(limitPrice || replay?.currentPrice) : (replay?.currentPrice ?? 0)) - Number(stopPrice)) * Number(quantity)
                          )
                        )}
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full py-2.5"
                  disabled={order.isPending}
                  testId="button-submit-order"
                >
                  {order.isPending
                    ? "Recording order…"
                    : `Submit ${side} order`}
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
                <p className="text-center text-[11px] leading-4 text-muted-foreground">
                  Virtual only. Orders fill against the simulated replay state.
                </p>
              </form>
            </Card>
            {toast && (
              <div className="fade-up rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700">
                <Check className="mr-2 inline h-4 w-4" />
                {toast}
              </div>
            )}
            
            {showJournalModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
                <Card className="w-full max-w-md shadow-lg" title="Trade Executed">
                  <div className="p-5 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Your order has been filled. Great traders always document their reasoning. Would you like to journal this trade now?
                    </p>
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => setShowJournalModal(false)}>
                        Maybe Later
                      </Button>
                      <Link href="/journal" className="flex-1">
                        <Button className="w-full">
                          Open Journal
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </div>
            )}
            <Card title="Session readout">
              <div className="grid grid-cols-2 gap-px bg-border">
                {[
                  ["Previous close", money(replay?.previousClose)],
                  [
                    "Progress",
                    `${Math.round((((replay?.candleIndex ?? 0) + 1) / Math.max(replay?.totalCandles ?? 1, 1)) * 100)}%`,
                  ],
                  ["Speed", `${replay?.speed ?? 1}×`],
                  ["Status", replay?.isPlaying ? "Playing" : "Paused"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-card p-3">
                    <p className="text-[10px] uppercase tracking-[.1em] text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-1 font-mono text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </QueryState>
    </Shell>
  );
}

function Portfolio() {
  const { data, isLoading, isError } = useGetPortfolio();
  return (
    <Shell>
      <PageIntro
        eyebrow="Capital & risk"
        title="Portfolio"
        description="See where your simulated capital is working and where it is sitting idle."
        actions={
          <Link
            href="/replay"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            data-testid="link-portfolio-replay"
          >
            <Plus className="h-4 w-4" />
            Place a trade
          </Link>
        }
      />
      <QueryState loading={isLoading} error={isError}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Total equity"
            value={money(data?.equity)}
            detail={`Cash ${money(data?.cash)}`}
            icon={WalletCards}
          />
          <Kpi
            label="Invested value"
            value={money(data?.investedValue)}
            detail={`${data?.positions?.length ?? 0} positions`}
            icon={BarChart3}
          />
          <Kpi
            label="Unrealised P&L"
            value={money(data?.unrealisedPnl)}
            tone={(data?.unrealisedPnl ?? 0) >= 0 ? "positive" : "negative"}
            detail="Open position mark-to-market"
            icon={Activity}
          />
          <Kpi
            label="Realised P&L"
            value={money(data?.realisedPnl)}
            tone={(data?.realisedPnl ?? 0) >= 0 ? "positive" : "negative"}
            detail="Closed trades"
            icon={Check}
          />
        </div>
        <Card className="mt-5" title="Open positions">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-secondary/60 text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                <tr>
                  {[
                    "Instrument",
                    "Quantity",
                    "Avg price",
                    "Last",
                    "Market value",
                    "Return",
                    "Weight",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.positions ?? []).map((position: any) => (
                  <tr
                    key={position.symbol}
                    className="border-t border-border/70 hover:bg-secondary/30"
                    data-testid={`row-position-${position.symbol}`}
                  >
                    <td className="px-4 py-4">
                      <p className="font-mono font-semibold">
                        {position.symbol}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {position.name}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-mono">{position.quantity}</td>
                    <td className="px-4 py-4 font-mono">
                      {money(position.averagePrice)}
                    </td>
                    <td className="px-4 py-4 font-mono">
                      {money(position.currentPrice)}
                    </td>
                    <td className="px-4 py-4 font-mono">
                      {money(position.marketValue)}
                    </td>
                    <td
                      className={`px-4 py-4 font-mono ${position.returnPct >= 0 ? "text-emerald-600" : "text-destructive"}`}
                    >
                      {pct(position.returnPct)}
                    </td>
                    <td className="px-4 py-4 font-mono text-muted-foreground">
                      {position.weight.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.positions?.length && (
              <div className="p-12 text-center">
                <WalletCards className="mx-auto h-7 w-7 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">Your book is clear</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Place a virtual order in replay to see positions here.
                </p>
              </div>
            )}
          </div>
        </Card>
      </QueryState>
    </Shell>
  );
}

function Orders() {
  const { data, isLoading, isError } = useListOrders();
  return (
    <Shell>
      <PageIntro
        eyebrow="Execution log"
        title="Orders"
        description="A factual record of every instruction sent to the simulation."
        actions={
          <Link
            href="/replay"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            data-testid="link-orders-replay"
          >
            <Plus className="h-4 w-4" />
            New order
          </Link>
        }
      />
      <QueryState
        loading={isLoading}
        error={isError}
        empty={
          !data?.length &&
          "No orders recorded yet. Open a replay to place your first virtual order."
        }
      >
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-secondary/60 text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                <tr>
                  {[
                    "Created",
                    "Instrument",
                    "Side",
                    "Type",
                    "Qty",
                    "Fill",
                    "Status",
                    "Journal",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((order: any) => (
                  <tr
                    key={order.id}
                    className="border-t border-border/70 hover:bg-secondary/30"
                    data-testid={`row-order-${order.id}`}
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {dateTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {order.symbol}
                    </td>
                    <td
                      className={`px-4 py-3 text-xs font-semibold uppercase ${order.side === "buy" ? "text-emerald-600" : "text-destructive"}`}
                    >
                      {order.side}
                    </td>
                    <td className="px-4 py-3 text-xs uppercase text-muted-foreground">
                      {order.orderType}
                    </td>
                    <td className="px-4 py-3 font-mono">{order.quantity}</td>
                    <td className="px-4 py-3 font-mono">
                      {order.executedPrice ? money(order.executedPrice) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {order.journalStatus === "needs_review" ? (
                        <span className="text-amber-600">Needs review</span>
                      ) : (
                        order.journalStatus
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </QueryState>
    </Shell>
  );
}

function Journal() {
  const { data, isLoading, isError } = useListTrades();
  const create = useCreateJournalEntry();
  const [active, setActive] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [mistake, setMistake] = useState("");
  const [notes, setNotes] = useState("");
  const [confidence, setConfidence] = useState("3");
  const save = (e: any) => {
    e.preventDefault();
    if (!active) return;
    create.mutate(
      {
        data: {
          tradeId: active.id,
          reason,
          mistake: mistake || null,
          confidence: Number(confidence),
          plannedEntry: active.entryPrice,
          plannedStop: null,
          plannedTarget: null,
          notes,
        },
      },
      {
        onSuccess: () => {
          setActive(null);
          setReason("");
          setMistake("");
          setNotes("");
        },
      },
    );
  };
  return (
    <Shell>
      <PageIntro
        eyebrow="Decision memory"
        title="Trade journal"
        description="The result is only half the lesson. Capture the thinking that produced it."
      />
      <QueryState
        loading={isLoading}
        error={isError}
        empty={
          !data?.length &&
          "Your completed trades will appear here with a prompt to journal the decision."
        }
      >
        <div className="space-y-3">
          {(data ?? []).map((trade: any) => (
            <Card key={trade.id} className="lift">
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-md ${trade.realisedPnl >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}
                  >
                    {trade.realisedPnl >= 0 ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-mono font-semibold">{trade.symbol}</p>
                      <span
                        className={`text-xs font-semibold uppercase ${trade.side === "buy" ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {trade.side}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {dateTime(trade.executedAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {trade.reason || "No reason recorded yet."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <div className="text-right">
                    <p
                      className={`font-mono font-medium ${trade.realisedPnl >= 0 ? "text-emerald-600" : "text-destructive"}`}
                    >
                      {money(trade.realisedPnl)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pct(trade.returnPct)}
                    </p>
                  </div>
                  {trade.journalStatus === "complete" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <Check className="h-4 w-4" />
                      Complete
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActive(trade);
                        setReason(trade.reason ?? "");
                        setMistake(trade.mistake ?? "");
                      }}
                      testId={`button-journal-${trade.id}`}
                    >
                      Journal trade <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </QueryState>
      {active && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-sidebar/40 p-0 sm:items-center sm:p-5">
          <div className="w-full max-w-lg rounded-t-xl bg-card p-5 shadow-2xl sm:rounded-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-primary">
                  Execution debrief
                </p>
                <h3 className="mt-1 text-xl font-semibold">
                  {active.symbol} · {money(active.realisedPnl)}
                </h3>
              </div>
              <button
                onClick={() => setActive(null)}
                className="rounded-md p-1 hover:bg-secondary"
                data-testid="button-close-journal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={save} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">
                What was the reason for the trade?
                <textarea
                  data-testid="input-journal-reason"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Describe the setup you thought you saw…"
                  className="mt-1.5 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-sm font-medium">
                What would you change?
                <textarea
                  data-testid="input-journal-mistake"
                  value={mistake}
                  onChange={(e) => setMistake(e.target.value)}
                  rows={2}
                  placeholder="Be specific. No hindsight theatre."
                  className="mt-1.5 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <label className="block text-sm font-medium">
                  Confidence
                  <select
                    data-testid="select-journal-confidence"
                    value={confidence}
                    onChange={(e) => setConfidence(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="1">1 — tentative</option>
                    <option value="2">2</option>
                    <option value="3">3 — measured</option>
                    <option value="4">4</option>
                    <option value="5">5 — certain</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <div className="w-full rounded-md bg-secondary p-2 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Entry
                    </p>
                    <p className="font-mono text-sm">
                      {money(active.entryPrice)}
                    </p>
                  </div>
                </div>
              </div>
              <label className="block text-sm font-medium">
                Private notes
                <textarea
                  data-testid="input-journal-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything you want to remember next session?"
                  className="mt-1.5 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <Button
                type="submit"
                className="w-full"
                disabled={create.isPending}
                testId="button-save-journal"
              >
                {create.isPending ? "Saving reflection…" : "Save reflection"}{" "}
                <Check className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Analytics() {
  const { data, isLoading, isError } = useGetAnalytics();
  const a = data ?? {};
  return (
    <Shell>
      <PageIntro
        eyebrow="Behaviour lab"
        title="Analytics"
        description="Patterns across your decisions, not just the scoreboard."
        actions={
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            All simulated sessions
          </span>
        }
      />
      <QueryState loading={isLoading} error={isError}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Total trades"
            value={a.totalTrades ?? 0}
            detail={`${a.winningTrades ?? 0} wins · ${a.losingTrades ?? 0} losses`}
            icon={ListChecks}
          />
          <Kpi
            label="Win rate"
            value={`${(a.winRate ?? 0).toFixed(1)}%`}
            detail="Outcome frequency"
            tone="positive"
            icon={Target}
          />
          <Kpi
            label="Profit factor"
            value={(a.profitFactor ?? 0).toFixed(2)}
            detail={`Risk / reward ${(a.riskReward ?? 0).toFixed(2)}`}
            icon={BarChart3}
          />
          <Kpi
            label="Max drawdown"
            value={`${(a.maxDrawdown ?? 0).toFixed(1)}%`}
            detail="Peak to trough"
            tone="negative"
            icon={TrendingDown}
          />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
          <Card title="Equity curve">
            <div className="h-72 p-4">
              <MiniEquity points={a.equityCurve ?? []} />
            </div>
            <div className="flex justify-between border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
              <span>{a.equityCurve?.[0]?.date ?? "First session"}</span>
              <span>{a.equityCurve?.at?.(-1)?.date ?? "Current"}</span>
            </div>
          </Card>
          <Card title="Trade quality">
            <div className="space-y-5 p-4">
              {[
                ["Average win", money(a.averageWin)],
                ["Average loss", money(a.averageLoss)],
                ["Largest win", money(a.largestWin)],
                ["Largest loss", money(a.largestLoss)],
                [
                  "Avg holding time",
                  `${(a.averageHoldingHours ?? 0).toFixed(1)}h`,
                ],
                ["Planned stops", `${(a.plannedStopPct ?? 0).toFixed(1)}%`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-border/70 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="font-mono text-sm">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <Card className="mt-5" title="P&L by reason">
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {(a.pnlByReason ?? []).map((item: any) => (
              <div key={item.reason} className="rounded-lg bg-secondary p-4">
                <p className="text-xs text-muted-foreground">{item.reason}</p>
                <p
                  className={`mt-2 font-mono text-xl ${item.pnl >= 0 ? "text-emerald-600" : "text-destructive"}`}
                >
                  {money(item.pnl)}
                </p>
                <div className="mt-3 h-1 rounded-full bg-border">
                  <div
                    className={`h-1 rounded-full ${item.pnl >= 0 ? "bg-emerald-500" : "bg-destructive"}`}
                    style={{
                      width: `${Math.min((Math.abs(item.pnl) / Math.max(...(a.pnlByReason ?? []).map((x: any) => Math.abs(x.pnl)), 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {!a.pnlByReason?.length && (
              <div className="col-span-full p-6 text-center text-sm text-muted-foreground">
                Journal a few executions to reveal your recurring reasons.
              </div>
            )}
          </div>
        </Card>
      </QueryState>
    </Shell>
  );
}

function Admin() {
  const { data, isLoading, isError } = useHealthCheck();
  return (
    <Shell>
      <PageIntro
        eyebrow="System"
        title="Admin"
        description="A quiet view of the learning environment and service health."
      />
      <QueryState loading={isLoading} error={isError}>
        <div className="grid gap-5 md:grid-cols-2">
          <Card title="Service health">
            <div className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">API service operational</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Health check returned{" "}
                  <span className="font-mono">{data?.status ?? "healthy"}</span>
                  .
                </p>
              </div>
            </div>
          </Card>
          <Card title="Environment">
            <div className="space-y-4 p-5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market data</span>
                <span className="font-mono">Fictional / historical</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Execution mode</span>
                <span className="font-mono">Paper only</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Advice status</span>
                <span className="font-mono text-accent-foreground">
                  Not provided
                </span>
              </div>
            </div>
          </Card>
        </div>
        <Card className="mt-5" title="Operator notes">
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <div className="rounded-lg bg-secondary p-4">
              <Command className="h-4 w-4 text-primary" />
              <p className="mt-3 text-sm font-semibold">Keep the loop short</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Replay, execute, journal, review. The product is designed around
                that cadence.
              </p>
            </div>
            <div className="rounded-lg bg-secondary p-4">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <p className="mt-3 text-sm font-semibold">Control the pace</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Slow down the candles when you are studying a decision, not
                chasing one.
              </p>
            </div>
            <div className="rounded-lg bg-secondary p-4">
              <BrainCircuit className="h-4 w-4 text-primary" />
              <p className="mt-3 text-sm font-semibold">Trust the record</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                The journal is a behavioural mirror. It does not need a perfect
                answer.
              </p>
            </div>
          </div>
        </Card>
      </QueryState>
    </Shell>
  );
}

function Settings() {
  const [saved, setSaved] = useState(false);
  const [density, setDensity] = useState("comfortable");
  const [confirm, setConfirm] = useState(true);
  return (
    <Shell>
      <PageIntro
        eyebrow="Workspace preferences"
        title="Settings"
        description="Tune the desk around the way you learn. These controls stay local to your workspace."
      />
      <div className="grid max-w-4xl gap-5 lg:grid-cols-[1fr_280px]">
        <Card title="Interface">
          <div className="space-y-5 p-5">
            <label className="flex items-center justify-between gap-5 text-sm">
              <span>
                <span className="block font-semibold">Table density</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Choose how much data fits in a review.
                </span>
              </span>
              <select
                data-testid="select-density"
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>comfortable</option>
                <option>compact</option>
              </select>
            </label>
            <div className="flex items-center justify-between gap-5 border-t border-border pt-5 text-sm">
              <span>
                <span className="block font-semibold">Confirm orders</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Ask before submitting a simulated order.
                </span>
              </span>
              <button
                data-testid="button-toggle-confirm"
                onClick={() => setConfirm(!confirm)}
                className={`relative h-6 w-11 rounded-full transition ${confirm ? "bg-primary" : "bg-secondary"}`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-card transition-transform ${confirm ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
            <Button
              onClick={() => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
              }}
              className="mt-2"
              testId="button-save-settings"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                "Save preferences"
              )}
            </Button>
          </div>
        </Card>
        <Card title="Account">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                AR
              </div>
              <div>
                <p className="font-semibold">Alex Rivera</p>
                <p className="text-xs text-muted-foreground">Learner account</p>
              </div>
            </div>
            <div className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
              TradeLab does not connect to brokerage accounts. All data here
              belongs to a simulated learning environment.
            </div>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              data-testid="link-settings-home"
            >
              Return to home <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>
    </Shell>
  );
}

function Academy() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Educational Center"
        title="TradeLab Academy"
        description="Learn the basics of market mechanics in a stress-free environment."
      />
      
      <div className="space-y-6">
        <Card title="How to Use This Platform">
          <div className="p-5 space-y-6 text-sm text-foreground">
            <div className="flex gap-4">
              <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</div>
              <div>
                <h3 className="font-semibold text-base mb-1">Pick a Market</h3>
                <p className="text-muted-foreground leading-relaxed">Choose a familiar Indian stock like Reliance or Nifty 50 to practice on. Go to the Replay Terminal and select it from the top dropdown.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</div>
              <div>
                <h3 className="font-semibold text-base mb-1">Analyze & Decide</h3>
                <p className="text-muted-foreground leading-relaxed">Look at the chart and decide if you think the price will go up or down. Don't overthink it, just observe the trend.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</div>
              <div>
                <h3 className="font-semibold text-base mb-1">Place Your Trade with a Safety Net</h3>
                <p className="text-muted-foreground leading-relaxed">Click Buy or Sell. Always set a <strong>Stop-Loss</strong>—a safety line that automatically closes your trade if you are wrong, so you never lose too much money.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">4</div>
              <div>
                <h3 className="font-semibold text-base mb-1">Review Your Mindset</h3>
                <p className="text-muted-foreground leading-relaxed">After the trade, write down <em>why</em> you made that choice in the Trade Journal. The goal is to learn about your own psychology and decision-making.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Market Notes & Glossary">
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {[
              {
                term: "Bull Market",
                def: "When prices are generally going up. (Think of a bull thrusting its horns upward)."
              },
              {
                term: "Bear Market",
                def: "When prices are generally going down. (Think of a bear swiping its paws downward)."
              },
              {
                term: "Stop-Loss",
                def: "A safety setting. If the stock falls to this price, the system automatically sells it to prevent bigger losses."
              },
              {
                term: "Portfolio/Equity",
                def: "The total amount of money and stock value you currently have in your account."
              },
              {
                term: "Volatility",
                def: "How wildly a stock's price jumps around. High volatility means big, fast changes."
              },
              {
                term: "Stop-Loss Hit / Liquidated",
                def: "When your trade went against you and the system automatically closed it to protect your remaining money."
              }
            ].map(({ term, def }) => (
              <div key={term} className="bg-card p-5">
                <p className="font-semibold text-primary mb-2">{term}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{def}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="pt-4 pb-12 flex justify-center">
          <Link href="/replay">
            <Button className="px-8 py-3 text-base">
              Start Practicing Now
              <ArrowRight className="ml-2 h-4 w-4 inline" />
            </Button>
          </Link>
        </div>
      </div>
    </Shell>
  );
}

function AppRoutes() {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login">
          <Auth mode="login" />
        </Route>
        <Route path="/register">
          <Auth mode="register" />
        </Route>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/academy" component={Academy} />
        <Route path="/replay" component={Replay} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/orders" component={Orders} />
        <Route path="/journal" component={Journal} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/admin" component={Admin} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
