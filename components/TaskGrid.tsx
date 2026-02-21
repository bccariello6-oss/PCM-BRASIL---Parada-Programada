import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileUp,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  MapPin,
  Clock,
  User,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Atividade } from '../types/shutdown';
import SmartImport from './SmartImport';

interface TaskGridProps {
  atividades: Atividade[];
  onUpdateProgress: (id: string, progress: number) => void;
  onImport: (data: any[]) => void;
}

const TaskGrid: React.FC<TaskGridProps> = ({ atividades, onUpdateProgress, onImport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderRow = (a: Atividade, level: number = 0) => {
    const isParent = a.subatividades && a.subatividades.length > 0;
    const isExpanded = expandedIds.has(a.id);

    return (
      <React.Fragment key={a.id}>
        <tr className={`hover:bg-slate-50 transition-colors border-b border-slate-100 ${level === 0 ? 'bg-white font-bold' : 'bg-white/50'}`}>
          <td className="px-6 py-4">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
              {isParent ? (
                <button onClick={() => toggleExpand(a.id)} className="p-1 hover:bg-slate-200 rounded transition-colors">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                </button>
              ) : (
                <div className="w-6" />
              )}
              <span className={`text-sm ${a.status === 'Atrasada' ? 'text-red-600' : 'text-slate-700'}`}>
                {a.nome}
              </span>
            </div>
          </td>
          <td className="px-6 py-4 text-center text-xs text-slate-500">
            {formatDate(a.inicio_previsto)} - {formatDate(a.fim_previsto)}
          </td>
          <td className="px-6 py-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-600 font-medium">{a.responsavel || '-'}</span>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="flex flex-col gap-1.5 min-w-[120px]">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-blue-600">{a.percentual_real}%</span>
                <span className="text-slate-400">P: {a.percentual_planejado}%</span>
              </div>
              {!isParent && (
                <input
                  type="range"
                  value={a.percentual_real}
                  onChange={(e) => onUpdateProgress(a.id, parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-full accent-blue-600 cursor-pointer"
                />
              )}
              {isParent && (
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all" style={{ width: `${a.percentual_real}%` }} />
                </div>
              )}
            </div>
          </td>
          <td className="px-6 py-4 text-center">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${a.status === 'Concluída' ? 'bg-green-50 text-green-700 border-green-200' :
                a.status === 'Atrasada' ? 'bg-red-50 text-red-700 border-red-200' :
                  a.status === 'Em Andamento' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
              {a.status.toUpperCase()}
            </span>
          </td>
        </tr>
        {isParent && isExpanded && a.subatividades!.map(sub => renderRow(sub, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar atividades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm w-64 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          />
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
        >
          <FileUp className="w-4 h-4" />
          IMPORTAR CRONOGRAMA
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white shadow-sm z-10">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atividade</th>
              <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Horário</th>
              <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsável</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progresso</th>
              <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {atividades.map(a => renderRow(a))}
            {atividades.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-slate-50 p-4 rounded-full">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">Nenhuma atividade vinculada a este evento.</p>
                    <button onClick={() => setShowImport(true)} className="text-blue-600 text-sm font-bold hover:underline">Importar agora</button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <SmartImport onImport={(data) => { onImport(data); setShowImport(false); }} onCancel={() => setShowImport(false)} />
        </div>
      )}
    </div>
  );
};

export default TaskGrid;
