import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import TaskGrid from './components/TaskGrid';
import Login from './components/Login';
import { Task, ProjectStats } from './types';
import { INITIAL_TASKS } from './constants';
import { calculateStats } from './services/projectService';
import { supabase } from './lib/supabase';
import {
  GanttChartSquare,
  Clock,
  RefreshCw,
  LogOut
} from 'lucide-react';
import EventSelector from './components/EventSelector';
import { Atividade, Evento, ShutdownStats } from './types/shutdown';
import { shutdownService } from './services/shutdownService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeEvent, setActiveEvent] = useState<Evento | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleString('pt-BR'));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (activeEvent) {
      fetchShutdownData();

      // Realtime subscription for activities
      const channel = supabase
        .channel(`atividades-${activeEvent.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'atividades', filter: `evento_id=eq.${activeEvent.id}` },
          () => fetchShutdownData()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeEvent]);

  const fetchShutdownData = async () => {
    if (!activeEvent) return;
    try {
      const data = await shutdownService.getAtividades(activeEvent.id);
      setAtividades(data);
      setShutdownStats(shutdownService.calculateStats(data, activeEvent));
    } catch (error) {
      console.error('Error fetching shutdown data:', error);
    }
  };

  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [shutdownStats, setShutdownStats] = useState<ShutdownStats>({
    progresso_real: 0,
    progresso_planejado: 0,
    spi: 1,
    desvio: 0
  });

  const handleUpdateProgress = async (id: string, progress: number) => {
    try {
      await shutdownService.updateAtividadeProgress(id, progress);
      // Local update for immediate feedback
      // (Realtime will also trigger refetch)
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleImportShutdown = async (data: any[]) => {
    if (!activeEvent) return;
    setLoading(true);
    try {
      await shutdownService.importFromData(activeEvent.id, data);
      await fetchShutdownData();
    } catch (error) {
      console.error('Error importing shutdown:', error);
      alert('Erro ao importar dados. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!session) return <Login />;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
              <GanttChartSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-base leading-tight">PCM SWM BRASIL</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">GESTÃO DE PARADAS</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 mx-2" />
          <EventSelector
            selectedEvent={activeEvent || undefined}
            onSelect={(e) => setActiveEvent(e)}
          />
        </div>

        {/* Center Navigation */}
        <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'schedule'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
          >
            Cronograma
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <div className="p-1 bg-blue-50 rounded-md">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin-slow" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Última atualização</p>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <p className="text-xs font-bold text-slate-700">{lastUpdate}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-6 relative">
        {activeTab === 'dashboard' && (
          <div className="h-full overflow-hidden">
            <Dashboard
              stats={shutdownStats}
              tasks={atividades}
              activeEvent={activeEvent}
            />
          </div>
        )}
        {activeTab === 'schedule' && (
          <div className="h-full">
            <TaskGrid
              atividades={atividades}
              onUpdateProgress={handleUpdateProgress}
              onImport={handleImportShutdown}
            />
          </div>
        )}
      </div>


      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div >
  );
};

export default App;
