import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Activity,
  Target,
  BarChart3
} from 'lucide-react';
import { Atividade, Evento, ShutdownStats } from '../types/shutdown';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DashboardProps {
  stats: ShutdownStats;
  tasks: Atividade[];
  activeEvent: Evento | null;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, tasks, activeEvent }) => {
  // Mock S-Curve data for visualization
  const curveData = [
    { hora: '08:00', planejado: 0, real: 0 },
    { hora: '10:00', planejado: 15, real: 12 },
    { hora: '12:00', planejado: 35, real: 30 },
    { hora: '14:00', planejado: 55, real: 48 },
    { hora: '16:00', planejado: 75, real: 65 },
    { hora: '18:00', planejado: 85, real: null },
    { hora: '20:00', planejado: 95, real: null },
    { hora: '22:00', planejado: 100, real: null },
  ];

  const getSpiColor = (spi: number) => {
    if (spi >= 1) return 'text-green-600 bg-green-50 border-green-100';
    if (spi >= 0.85) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2 pb-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
              <Activity className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getSpiColor(stats.spi)}`}>
              {stats.spi >= 1 ? 'PRODUTIVO' : 'MENOR DESEMPENHO'}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SPI - Performance</p>
            <h3 className="text-3xl font-black text-slate-800">{stats.spi.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
              <Target className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase">
              Real vs Plan
            </span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso Real</p>
            <h3 className="text-3xl font-black text-slate-800">{Math.round(stats.progresso_real)}%</h3>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: `${stats.progresso_real}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="bg-amber-50 p-2 rounded-xl text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            {stats.desvio < 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <TrendingDown className="w-3 h-3" />
                <span className="text-[10px] font-bold">{Math.abs(Math.round(stats.desvio))}%</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desvio Cronograma</p>
            <h3 className={`text-3xl font-black ${stats.desvio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.desvio > 0 ? '+' : ''}{Math.round(stats.desvio)}%
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="bg-rose-50 p-2 rounded-xl text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linha de Corte (16h)</p>
            <h3 className="text-3xl font-black text-slate-800">
              {activeEvent ? new Date(new Date(activeEvent.data_inicio).getTime() + 16 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Curva S - Avanço Físico</h3>
              <p className="text-xs text-slate-400 font-medium">Acumulado Planejado vs Real</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Realizado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Planejado</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} unit="%" />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="planejado" stroke="#e2e8f0" strokeWidth={3} fill="transparent" />
                <Area type="monotone" dataKey="real" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorReal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col gap-6">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Status por Disciplina</h3>
          <div className="flex-1 flex flex-col gap-4 justify-center">
            {['Mecânica', 'Elétrica', 'Civil', 'Pintura'].map(disc => (
              <div key={disc} className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-slate-600">{disc}</span>
                  <span className="text-[10px] font-black text-blue-600">
                    {disc === 'Mecânica' ? '85%' : disc === 'Elétrica' ? '42%' : '100%'}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: disc === 'Mecânica' ? '85%' : disc === 'Elétrica' ? '42%' : '100%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
