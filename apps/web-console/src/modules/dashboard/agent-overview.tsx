const agents = ['analytics', 'research', 'architecture', 'engineering', 'security', 'quality', 'content', 'legal-finance'];

export function AgentOverview() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Vehicle Information AI Agent Platform</h1>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {agents.map((agent) => (
          <article key={agent} className="rounded border border-slate-200 bg-white p-4">
            <h2 className="font-medium">{agent}</h2>
            <p className="mt-2 text-sm text-slate-600">Status and task metrics placeholder.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
