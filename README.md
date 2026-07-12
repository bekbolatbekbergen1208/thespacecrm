# CRM.Space

Production-oriented CRM web application built with Next.js, React, TypeScript, Tailwind CSS, Supabase Auth, Supabase Postgres, and Row Level Security.

## Local setup

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/schema.sql`.
3. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Install dependencies and run:

```bash
npm install
npm run dev
```

## Implemented modules

- Premium landing page with functional Start Free, Watch Demo, Sign In, Features, Industries, Pricing, and Contact navigation
- Supabase authentication: account creation, founder sign up, employee sign up, login, logout, forgot password, and persisted SSR sessions
- Role selection after account creation
- Founder onboarding with company creation, business type, country, phone, generated Company ID, generated invite code, Founder role, and Free plan assignment
- Employee onboarding with Company ID or invite code joining
- Company invite code display in the app shell
- Founder dashboard with live metrics from Supabase
- Employee dashboard with My Tasks, Customer List, Notifications, and Profile Settings
- Customer CRUD
- Employee CRUD
- Task CRUD with employee assignment
- Inventory CRUD
- Analytics dashboard
- Company Settings with company information, invite employees, and company members list
- AI business assistant UI with analytics-driven insights
- SEO metadata, Open Graph, Twitter cards, sitemap, robots.txt, and structured data schema
- Supabase RLS policies for tenant isolation and role-based writes
- Mobile responsive app shell and forms

## Important

The app does not use local fake data. Without valid Supabase environment variables and the SQL schema installed, the app shows `/setup` and will not pretend that database-backed actions worked.
