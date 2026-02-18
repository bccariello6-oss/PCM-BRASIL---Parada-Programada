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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProjectStats>(calculateStats([]));
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
    if (session) {
      fetchTasks();
    }
  }, [session]);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('schedule_tasks')
      .select('*')
      .order('wbs', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else if (data) {
      // Map database snake_case to frontend camelCase
      const mapped: Task[] = data.map((t: any) => ({
        id: t.id,
        wbs: t.wbs,
        name: t.name,
        discipline: t.discipline,
        area: t.area,
        responsible: t.responsible,
        duration: t.duration,
        baselineStart: t.baseline_start,
        baselineEnd: t.baseline_end,
        currentStart: t.current_start,
        currentEnd: t.current_end,
        plannedProgress: t.planned_progress,
        actualProgress: t.actual_progress,
        spi: t.spi,
        isCritical: t.is_critical,
        predecessors: t.predecessors || [],
        parentId: t.parent_id
      }));
      setTasks(mapped);
    }
  };

  // Update stats whenever tasks change
  useEffect(() => {
    setStats(calculateStats(tasks));
    setLastUpdate(new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
  }, [tasks]);

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    const dbUpdates: any = {};
    if (updates.actualProgress !== undefined) dbUpdates.actual_progress = updates.actualProgress;
    if (updates.responsible !== undefined) dbUpdates.responsible = updates.responsible;

    // Update local state first for performance
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    // Persist to Supabase
    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase
        .from('schedule_tasks')
        .update(dbUpdates)
        .eq('id', id);

      if (error) console.error('Error updating task:', error);
    }
  };



  const handleImportTasks = async (newTasks: Task[]) => {
    setLoading(true);

    // Clear existing tasks in database first
    const { error: deleteError } = await supabase
      .from('schedule_tasks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error clearing tasks:', deleteError);
    }

    // Map frontend camelCase to database snake_case
    const dbTasks = newTasks.map(t => ({
      wbs: t.wbs,
      name: t.name,
      discipline: t.discipline,
      area: t.area,
      responsible: t.responsible,
      duration: t.duration,
      baseline_start: t.baselineStart,
      baseline_end: t.baselineEnd,
      current_start: t.currentStart || t.baselineStart,
      current_end: t.currentEnd || t.baselineEnd,
      planned_progress: t.plannedProgress,
      actual_progress: t.actualProgress,
      spi: t.spi,
      is_critical: t.isCritical,
      predecessors: t.predecessors
    }));

    const { error: insertError } = await supabase
      .from('schedule_tasks')
      .insert(dbTasks);

    if (insertError) {
      console.error('Error inserting tasks:', insertError);
      alert('Erro ao salvar no banco de dados.');
    } else {
      await fetchTasks(); // Refresh state from DB
    }

    setLoading(false);
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
            <Dashboard stats={stats} tasks={tasks} />
          </div>
        )}
        {activeTab === 'schedule' && (
          <div className="h-full">
            <TaskGrid
              tasks={tasks}
              onUpdateTask={handleUpdateTask}
              onImportTasks={handleImportTasks}
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
