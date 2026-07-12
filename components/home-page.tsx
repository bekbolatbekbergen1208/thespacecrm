"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { normalizeLocale, translateLiteral, type Locale } from "@/lib/i18n";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  Cloud,
  CreditCard,
  GraduationCap,
  HeartPulse,
  LineChart,
  MessageCircle,
  Package,
  Phone,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  UserRoundCog,
  UsersRound,
  Utensils,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const features = [
  { title: "Customer Management", icon: UsersRound },
  { title: "Employee Management", icon: UserRoundCog },
  { title: "Task Management", icon: Check },
  { title: "Inventory Tracking", icon: Package },
  { title: "Financial Reports", icon: WalletCards },
  { title: "AI Business Assistant", icon: Bot },
  { title: "WhatsApp Integration", icon: MessageCircle },
  { title: "Telegram Integration", icon: RadioTower },
  { title: "Analytics Dashboard", icon: BarChart3 },
  { title: "Cloud Access", icon: Cloud },
];

const industries = [
  { title: "Retail", icon: Store, metric: "POS, stock, loyalty" },
  { title: "Education", icon: GraduationCap, metric: "Students, billing, teams" },
  { title: "Restaurants", icon: Utensils, metric: "Tables, shifts, inventory" },
  { title: "Healthcare", icon: HeartPulse, metric: "Patients, schedules, finance" },
  { title: "Logistics", icon: Truck, metric: "Routes, tasks, dispatch" },
  { title: "Service Businesses", icon: BriefcaseBusiness, metric: "Jobs, clients, invoices" },
];

const pricing = [
  {
    name: "Starter",
    price: "$19",
    text: "For lean teams launching operations.",
    items: ["CRM workspace", "Task boards", "Basic reports", "Mobile app access"],
  },
  {
    name: "Business",
    price: "$59",
    text: "For growing companies running every day in CRM.Space.",
    items: ["AI assistant", "Inventory and finance", "Team permissions", "Messaging integrations"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    text: "For multi-location operations with advanced controls.",
    items: ["Custom automation", "Advanced analytics", "Dedicated success", "Security review"],
  },
];

const testimonials = [
  {
    quote:
      "CRM.Space replaced five tools in our stores. Managers now see customers, shifts, revenue, and inventory before they even reach the office.",
    name: "Amina R.",
    role: "Retail Founder",
  },
  {
    quote:
      "Our education center runs from phones now. Tasks, student payments, and employee performance finally live in one clean system.",
    name: "Daniel K.",
    role: "Operations Director",
  },
  {
    quote:
      "The AI assistant makes weekly reporting feel instant. We ask business questions and get answers our team can act on.",
    name: "Maya S.",
    role: "Clinic Owner",
  },
];

const personas: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Founder / Business Owner",
    description: "Create and manage your company, employees, reports, and operations.",
    icon: Building2,
  },
  {
    title: "Employee",
    description: "Join your company workspace, manage tasks, and collaborate with your team.",
    icon: UsersRound,
  },
];

function ButtonLink({
  children,
  variant = "primary",
  href = "/auth",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  href?: string;
}) {
  return (
    <a
      href={href}
      className={`group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition duration-300 ${
        variant === "primary"
          ? "bg-white text-slate-950 shadow-glow hover:bg-cyan-100"
          : "border border-white/14 bg-white/[0.06] text-white hover:border-cyan-300/50 hover:bg-white/[0.1]"
      }`}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </a>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

function PhoneMockup({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative mx-auto ${compact ? "h-[420px] w-[214px]" : "h-[560px] w-[285px]"}`}
      aria-label="CRM.Space mobile dashboard mockup"
    >
      <div className="absolute -inset-7 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="phone-depth relative h-full rounded-[2rem] border border-white/14 bg-slate-950 p-2">
        <div className="h-full overflow-hidden rounded-[1.55rem] border border-white/10 bg-gradient-to-b from-slate-900 via-[#061225] to-black">
          <div className="mx-auto mt-3 h-5 w-24 rounded-full bg-black/70" />
          <div className="px-4 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">Today</p>
                <h3 className="mt-1 text-lg font-bold text-white">Command Center</h3>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-cyan-300/15 text-cyan-100">
                <Building2 className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["Revenue", "$42.8k", "cyan"],
                ["Orders", "1,248", "violet"],
                ["Tasks", "84%", "emerald"],
                ["Stock", "97%", "sky"],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-[8px] border border-white/10 bg-white/[0.055] p-3">
                  <p className="text-[10px] text-slate-400">{label}</p>
                  <p className={`mt-1 text-lg font-bold ${color === "violet" ? "text-violet-200" : "text-cyan-100"}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Bot className="h-4 w-4 text-cyan-200" />
                <p className="text-xs font-semibold text-cyan-50">AI Insight</p>
              </div>
              <p className="text-xs leading-5 text-slate-200">
                Revenue is up 18%. Inventory risk detected in 3 fast-moving items.
              </p>
            </div>

            <div className="mt-4 rounded-[8px] border border-white/10 bg-white/[0.045] p-3">
              <div className="flex items-end gap-2">
                {[36, 54, 42, 68, 62, 86, 74].map((height, index) => (
                  <div key={index} className="flex-1 rounded-t bg-gradient-to-t from-violet-500 to-cyan-300" style={{ height }} />
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {["Approve supplier payment", "Assign delivery route", "Review top employee"].map((task) => (
                <div key={task} className="flex items-center justify-between rounded-[8px] bg-white/[0.045] px-3 py-2">
                  <span className="text-xs text-slate-200">{task}</span>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, rotate: 1 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="relative min-h-[590px] lg:min-h-[680px]"
    >
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10" />
      <div className="absolute left-[8%] top-[16%] h-3 w-3 animate-orbit rounded-full bg-cyan-200 shadow-glow" />
      <div className="absolute bottom-[18%] right-[9%] h-2 w-2 animate-pulse rounded-full bg-violet-300 shadow-violet" />
      <div className="absolute left-[12%] top-[34%] hidden rounded-[8px] border border-white/10 bg-white/[0.06] px-4 py-3 text-xs text-slate-200 backdrop-blur md:block">
        <p className="font-semibold text-white">Live revenue</p>
        <p className="mt-1 text-cyan-100">+24.7% this week</p>
      </div>
      <div className="absolute bottom-[20%] right-[2%] hidden rounded-[8px] border border-white/10 bg-white/[0.06] px-4 py-3 text-xs text-slate-200 backdrop-blur md:block">
        <p className="font-semibold text-white">AI automation</p>
        <p className="mt-1 text-violet-100">18 hours saved</p>
      </div>
      <div className="perspective-phone animate-float pt-14">
        <PhoneMockup />
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>("ru");
  const tt = (value: string) => translateLiteral(locale, value);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )crm_locale=([^;]+)/);
    setLocale(normalizeLocale(match ? decodeURIComponent(match[1]) : null));
  }, []);

  return (
    <main className="relative z-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/8 bg-slate-950/60 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-gradient-to-br from-cyan-300 to-violet-500 text-slate-950 shadow-glow">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-base font-bold tracking-wide text-white">CRM.Space</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
            <a className="hover:text-white" href="#features">{tt("Features")}</a>
            <a className="hover:text-white" href="#industries">{tt("Industries")}</a>
            <a className="hover:text-white" href="#pricing">{tt("Pricing")}</a>
            <a className="hover:text-white" href="#contact">{tt("Contact")}</a>
            <Link className="hover:text-white" href="/login">{tt("Sign In")}</Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LanguageSwitcher compact />
            </div>
            <Link href="/auth" className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">
              {tt("Start Free")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-20 pt-28 md:pt-32 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div className="relative">
          <motion.div initial="hidden" animate="visible" transition={{ staggerChildren: 0.1 }}>
            <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-sm text-cyan-100">
              <ShieldCheck className="h-4 w-4" />
              {tt("Mobile-first business operating system")}
            </motion.div>
            <motion.h1 variants={fadeUp} className="max-w-4xl text-5xl font-black leading-[0.96] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {tt("Manage Your Entire Business From Your Phone")}
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              {tt("CRM.Space helps businesses manage customers, employees, tasks, inventory, finances, analytics, and AI automation from a single platform.")}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink>{tt("Start Free")}</ButtonLink>
              <ButtonLink variant="secondary" href="#demo">{tt("Watch Demo")}</ButtonLink>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-sm text-slate-300">
              {["CRM", "Finance", "AI"].map((item) => (
                <div key={item} className="rounded-[8px] border border-white/10 bg-white/[0.045] px-4 py-3 text-center">
                  <span className="font-semibold text-white">{item}</span> {tt("in one app")}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
        <HeroVisual />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="text-center">
          <SectionLabel>{tt("Choose your path")}</SectionLabel>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{tt("Who are you?")}</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {personas.map(({ title, description, icon: Icon }) => (
            <motion.a
              key={title}
              href="/auth"
              whileHover={{ y: -6 }}
              className="glass group rounded-[8px] p-7 transition hover:border-cyan-300/35"
            >
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-[8px] bg-white/[0.07] text-cyan-100">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-white">{tt(title)}</h3>
              <p className="mt-3 max-w-xl leading-7 text-slate-300">{tt(description)}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
                {tt("Continue")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </motion.a>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <SectionLabel>{tt("Unified operations")}</SectionLabel>
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-5xl">{tt("Everything your business runs on, connected.")}</h2>
          <p className="max-w-md leading-7 text-slate-300">{tt("Move from scattered tools to one calm, fast mobile workspace that keeps teams, money, stock, and customers in sync.")}</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {features.map(({ title, icon: Icon }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: index * 0.04 }}
              className="glass rounded-[8px] p-5 transition hover:-translate-y-1 hover:border-cyan-300/30"
            >
              <Icon className="h-6 w-6 text-cyan-100" />
              <h3 className="mt-5 text-base font-bold text-white">{tt(title)}</h3>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="industries" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="glass overflow-hidden rounded-[8px] p-6 sm:p-10">
          <SectionLabel>Built for operators</SectionLabel>
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl">A premium control layer for real-world businesses.</h2>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {industries.map(({ title, icon: Icon, metric }) => (
              <div key={title} className="rounded-[8px] border border-white/10 bg-slate-950/45 p-5">
                <Icon className="h-7 w-7 text-violet-100" />
                <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm text-slate-400">{metric}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:px-8">
        <div>
          <SectionLabel>AI assistant</SectionLabel>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">Ask your business anything. Get instant insight.</h2>
          <p className="mt-5 max-w-xl leading-8 text-slate-300">CRM.Space turns your operational data into answers, summaries, forecasts, and recommended next actions.</p>
        </div>
        <div className="glass rounded-[8px] p-5">
          <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-cyan-300/15 text-cyan-100">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-white">CRM.Space AI</p>
              <p className="text-xs text-cyan-100">Insight engine active</p>
            </div>
          </div>
          <div className="space-y-3">
            {["How much revenue did we make this month?", "Which employee performed best?", "Show sales trends."].map((question) => (
              <div key={question} className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4 text-sm text-slate-200">
                {question}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[8px] border border-cyan-300/25 bg-gradient-to-br from-cyan-300/14 to-violet-500/14 p-4">
            <p className="text-sm font-semibold text-white">Generated insight</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              June revenue is trending 21% above last month. Store 2 leads growth, and Aigerim closed the highest-value customer segment.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[0.85fr_1fr] lg:px-8">
        <div className="relative flex justify-center gap-4">
          <div className="-rotate-6 scale-90">
            <PhoneMockup compact />
          </div>
          <div className="hidden rotate-6 scale-90 sm:block">
            <PhoneMockup compact />
          </div>
        </div>
        <div>
          <SectionLabel>Mobile experience</SectionLabel>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">Designed primarily for smartphones.</h2>
          <p className="mt-5 max-w-xl leading-8 text-slate-300">Owners and employees can capture leads, assign work, check stock, approve spending, and review analytics from the device already in their hand.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {["Fast dashboards", "Offline-ready workflows", "Role-based access", "Push-ready operations"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.045] p-4">
                <Phone className="h-5 w-5 text-cyan-100" />
                <span className="font-semibold text-white">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="text-center">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">Scale from first team to global operation.</h2>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {pricing.map((plan) => (
            <div key={plan.name} className={`rounded-[8px] p-6 ${plan.featured ? "border border-cyan-300/35 bg-cyan-300/10 shadow-glow" : "glass"}`}>
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-4xl font-black text-white">{plan.price}</span>
                {plan.price !== "Custom" && <span className="pb-1 text-slate-400">/month</span>}
              </div>
              <p className="mt-4 min-h-12 text-sm leading-6 text-slate-300">{plan.text}</p>
              <ul className="mt-6 space-y-3">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-200">
                    <Check className="h-4 w-4 text-cyan-100" />
                    {item}
                  </li>
                ))}
              </ul>
          <a href="/auth" className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">
                Start Free <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {testimonials.map((item) => (
            <div key={item.name} className="glass rounded-[8px] p-6">
              <p className="leading-7 text-slate-200">&quot;{item.quote}&quot;</p>
              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="font-bold text-white">{item.name}</p>
                <p className="text-sm text-cyan-100">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="relative overflow-hidden rounded-[8px] border border-white/10 bg-gradient-to-br from-cyan-300/16 via-violet-500/18 to-white/[0.04] p-8 text-center shadow-glow sm:p-14">
          <LineChart className="mx-auto mb-6 h-12 w-12 text-cyan-100" />
          <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">Launch Your Business Into The Future</h2>
          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-300">Bring your customers, employees, finance, inventory, analytics, and automation into one premium mobile workspace.</p>
          <Link href="/auth" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">
            Start Free Today <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-gradient-to-br from-cyan-300 to-violet-500 text-slate-950">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="font-bold text-white">CRM.Space</span>
          </Link>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
            <a href="#demo" className="hover:text-white">About</a>
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#contact" className="hover:text-white">Contact</a>
            <Link href="/auth" className="hover:text-white">Start Free</Link>
            <Link href="/login" className="hover:text-white">Sign In</Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CreditCard className="h-4 w-4" />
            2026 CRM.Space
          </div>
        </div>
      </footer>
    </main>
  );
}
