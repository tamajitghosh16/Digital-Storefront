export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">You can&rsquo;t open this</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Your account doesn&rsquo;t have back-office access. Ask the shop owner to give you a staff role.
      </p>
    </div>
  );
}
