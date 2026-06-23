import React from 'react';

export default function Dashboard() {
  const stats = [
    { name: 'Active Agents', value: '13', description: '8 Python | 5 NestJS', color: 'from-blue-500 to-indigo-500' },
    { name: 'Active Workflows', value: '12', description: 'Running in Temporal', color: 'from-amber-500 to-orange-500' },
    { name: 'Pending Approvals', value: '4', description: 'Requires Human Review', color: 'from-rose-500 to-pink-500' },
    { name: 'Knowledge Docs', value: '412', description: 'Qdrant Collections', color: 'from-emerald-500 to-teal-500' },
  ];

  const agentsList = [
    { id: 'analytics-agent', name: 'Analytics Agent', type: 'Python FastAPI', status: 'idle', desc: 'OLAP audits, anomaly reports, ClickHouse analytics' },
    { id: 'research-agent', name: 'Research Agent', type: 'Python FastAPI', status: 'working', desc: 'RTO records lookup, engine chassis verification' },
    { id: 'architecture-agent', name: 'Architecture Agent', type: 'Python FastAPI', status: 'idle', desc: 'HLD, LLD, API structures compilation' },
    { id: 'engineering-agent', name: 'Engineering Agent', type: 'Python FastAPI', status: 'working', desc: 'Auto code gen: web, mobile components, DB migrations' },
    { id: 'security-agent', name: 'Security Agent', type: 'Python FastAPI', status: 'idle', desc: 'Threat modelling, code audit, penetration tests' },
    { id: 'quality-agent', name: 'Quality Agent', type: 'Python FastAPI', status: 'idle', desc: 'Automated test suite builder, code coverage' },
    { id: 'content-agent', name: 'Content Agent', type: 'Python FastAPI', status: 'idle', desc: 'Vehicle documentation, reports compiler' },
    { id: 'legal-finance-agent', name: 'Legal Finance Agent', type: 'Python FastAPI', status: 'idle', desc: 'Indian MV act verification, insurance compliance' },
    { id: 'orchestration-agent', name: 'Orchestration Agent', type: 'NestJS', status: 'working', desc: 'Coordinating execution graphs, task dispatching' },
    { id: 'product-agent', name: 'Product Agent', type: 'NestJS', status: 'idle', desc: 'PRD synthesis, functional rules translation' },
    { id: 'devops-agent', name: 'DevOps Agent', type: 'NestJS', status: 'idle', desc: 'Docker packaging, K8s deployments, Helm values' },
    { id: 'growth-agent', name: 'Growth Agent', type: 'NestJS', status: 'idle', desc: 'Performance monitoring, notification schedules' },
    { id: 'support-agent', name: 'Support Agent', type: 'NestJS', status: 'idle', desc: 'Ticket escalations, support kb ingest' },
  ];

  const recentEvents = [
    { id: '1', event: 'product.prd.approved', source: 'product-agent', time: '2 mins ago', details: 'PRD for DL RTO verification pipeline approved.' },
    { id: '2', event: 'architecture.hld.ready', source: 'architecture-agent', time: '5 mins ago', details: 'HLD schema layout generated for Postgres storage.' },
    { id: '3', event: 'engineering.task.accepted', source: 'engineering-agent', time: '8 mins ago', details: 'Accepted UI/UX component synthesis task.' },
    { id: '4', event: 'analytics.anomaly.detected', source: 'analytics-agent', time: '15 mins ago', details: 'Detected spike in RTO API latency (MH, KA).' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Title */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Control Plane Dashboard</h2>
        <p className="text-sm text-slate-400">Real-time status of India Vehicle Information Platform agents and durable workflows.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.name} className="relative rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md overflow-hidden group hover:border-slate-700 transition-all duration-200">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${s.color} opacity-10 blur-xl group-hover:opacity-20 transition-opacity duration-300`}></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.name}</p>
            <p className="text-4xl font-bold mt-2 text-white">{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.description}</p>
          </div>
        ))}
      </div>

      {/* Grid containing Agents and Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: AI Agents status */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-semibold text-slate-200">AI Agent Fleet Registry</h3>
            <span className="text-xs text-slate-500">13 services registered</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agentsList.map((agent) => (
              <div key={agent.id} className="p-5 rounded-xl border border-slate-900 bg-slate-900/20 hover:bg-slate-900/40 transition-colors duration-150 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-slate-100">{agent.name}</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      agent.status === 'working'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {agent.status === 'working' ? 'Busy' : 'Idle'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{agent.desc}</p>
                </div>
                <div className="flex items-center justify-between mt-4 border-t border-slate-900/60 pt-3">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">{agent.type}</span>
                  <a href={`#agent/${agent.id}`} className="text-[11px] font-semibold text-rose-400 hover:text-rose-300">View Node &rarr;</a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Kafka streaming events & approvals */}
        <div className="space-y-6">
          {/* Kafka stream */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-md font-semibold text-slate-200">Recent Kafka Event Stream</h3>
              <p className="text-xs text-slate-500">Listening to cluster broker-1</p>
            </div>

            <div className="space-y-4">
              {recentEvents.map((evt) => (
                <div key={evt.id} className="relative pl-6 pb-2 border-l border-slate-800">
                  <div className="absolute top-1.5 -left-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-300">{evt.event}</span>
                    <span className="text-[10px] text-slate-500">{evt.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{evt.details}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Source: {evt.source}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-md font-semibold text-slate-200">Required Human Approvals</h3>
              <p className="text-xs text-slate-500">Locks active on workflow steps</p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400">Step: PRD_RTO_Schema</span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/10">Pending</span>
                </div>
                <p className="text-xs text-slate-300">Approval requested by `architecture-agent` for Delhi RTO Postgres schemas mapping modifications.</p>
                <div className="flex space-x-2 pt-1.5">
                  <button className="flex-1 py-1 rounded bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors">Approve</button>
                  <button className="flex-1 py-1 rounded bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700 transition-colors">Reject</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
