// Staff sign-in — same Supabase Auth instance as apps/web (Technical Design
// Document, Section 3.3: a staff member's identity can be shared across
// both apps if they're also a storefront customer).
export default function AdminSignInPage() {
  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold">Staff Sign In</h1>
      <p className="mt-2 text-slate-500">Wire up Supabase Auth&apos;s email sign-in here.</p>
    </div>
  );
}
