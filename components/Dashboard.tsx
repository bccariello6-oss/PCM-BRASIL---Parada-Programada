
import React from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  CheckCircle2,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Layers
} from 'lucide-react';
import { Task, ProjectStats, Discipline } from '../types';
import { generateSCurveData } from '../services/projectService';

interface DashboardProps {
  stats: ProjectStats;
  tasks: Task[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, tasks }) => {
  const curveData = generateSCurveData(tasks);

  // Cálculo real por disciplina
  const disciplineData = Object.values(Discipline).map(discipline => {
    const disciplineTasks = tasks.filter(t => t.discipline === discipline);
    if (disciplineTasks.length === 0) return null;

    const totalWeight = disciplineTasks.reduce((acc, t) => acc + (t.duration || 1), 0);
    const real = disciplineTasks.reduce((acc, t) => acc + (t.actualProgress * ((t.duration || 1) / totalWeight)), 0);
    const plan = disciplineTasks.reduce((acc, t) => acc + (t.plannedProgress * ((t.duration || 1) / totalWeight)), 0);

    return {
      name: discipline,
      real: Number(real.toFixed(1)),
      plan: Number(plan.toFixed(1))
    };
  }).filter(Boolean) as { name: string, real: number, plan: number }[];

  const StatCard = ({ title, value, sub, icon: Icon, color, trend, secondValue, secondTitle }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{sub}</span>
      </div>
      {secondValue !== undefined && (
        <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{secondTitle}</p>
          <span className="text-xs font-bold text-slate-700">{secondValue}</span>
        </div>
      )}
    </div>
  );

  const deviation = Number((stats.actualPhysical - stats.plannedPhysical).toFixed(1));

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Row: KPIs reais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 flex-none">
        <StatCard
          title="Volume de Escopo"
          value={stats.totalTasks}
          sub="Atividades"
          icon={Layers}
          color="bg-slate-700"
          secondTitle="Concluídas"
          secondValue={stats.completedTasks}
        />
        <StatCard
          title="Status Físico Real"
          value={`${stats.actualPhysical}%`}
          sub="Realizado"
          icon={Activity}
          color="bg-blue-600"
          trend={deviation}
        />
        <StatCard
          title="Status Físico Previsto"
          value={`${stats.plannedPhysical}%`}
          sub="Baseline"
          icon={Target}
          color="bg-indigo-600"
        />
        <StatCard
          title="SPI do Projeto"
          value={stats.overallSpi}
          sub="Produtividade"
          icon={CheckCircle2}
          color={stats.overallSpi >= 1 ? "bg-emerald-600" : stats.overallSpi > 0.9 ? "bg-amber-500" : "bg-rose-600"}
        />
        <StatCard
          title="Tarefas em Atraso"
          value={stats.delayedTasks}
          sub="Pendentes"
          icon={AlertTriangle}
          color="bg-amber-500"
        />
      </div>

      {/* Main Charts Row */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 pb-1">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4 flex-none">
            <div>
              <h4 className="text-lg font-bold text-slate-800">Curva S Realizada</h4>
              <p className="text-sm text-slate-500">Acompanhamento de progresso acumulado do projeto</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                <span className="text-xs font-medium text-slate-500">Planejado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                <span className="text-xs font-medium text-slate-500">Real</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curveData}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="planned" stroke="#cbd5e1" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="real" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorReal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <h4 className="text-lg font-bold text-slate-800 mb-4 flex-none">Avanço por Disciplina</h4>
          <div className="space-y-4 overflow-y-auto pr-2 flex-1 custom-scrollbar">
            {disciplineData.length > 0 ? disciplineData.map((d) => (
              <div key={d.name}>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold text-slate-700">{d.name}</span>
                  <div className="text-right">
                    <span className="text-xs font-bold text-blue-600">{d.real}%</span>
                    <span className="text-[10px] text-slate-400 ml-1">of {d.plan}%</span>
                  </div>
                </div>
                <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-slate-300 rounded-full"
                    style={{ width: `${d.plan}%` }}
                  />
                  <div
                    className={`absolute h-full rounded-full ${d.real >= d.plan ? 'bg-emerald-500' : 'bg-blue-600'}`}
                    style={{ width: `${d.real}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-400 italic text-center py-10">Nenhum dado por disciplina</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex-none">
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Atividades Críticas em Atraso</h5>
            <div className="space-y-3">
              {tasks.filter(t => t.isCritical && t.actualProgress < t.plannedProgress).length > 0 ? (
                tasks.filter(t => t.isCritical && t.actualProgress < t.plannedProgress).slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <div className="bg-rose-200 p-1.5 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-rose-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-rose-900 truncate">{t.name}</p>
                      <p className="text-[10px] text-rose-600">{t.area}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-rose-700">-{Math.round(t.plannedProgress - t.actualProgress)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400">Nenhum atraso crítico detectado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
