export default function SetupPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-16 text-white">
      <div className="mx-auto max-w-2xl rounded-[8px] border border-white/10 bg-white/[0.04] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Supabase setup required</p>
        <h1 className="mt-4 text-3xl font-bold">Connect CRM.Space to Supabase</h1>
        <p className="mt-4 leading-7 text-slate-300">
          Add your Supabase project URL and anon key to `.env.local`, then run the SQL schema from `supabase/schema.sql`.
        </p>
        <pre className="mt-6 overflow-auto rounded-[8px] bg-black p-4 text-sm text-cyan-100">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key`}
        </pre>
      </div>
    </main>
  );
}
