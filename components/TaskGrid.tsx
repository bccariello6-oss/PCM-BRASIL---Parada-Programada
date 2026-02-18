
import React, { useState, useRef, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  AlertCircle,
  MoreVertical,
  Loader2,
  FileUp,
  CheckSquare,
  UserCircle,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  FileText,
  ChevronDown,
  Target,
  BrainCircuit,
  MapPin,
  Check,
  Info,
  Zap,
  MessageSquare,
  Send,
  User
} from 'lucide-react';
import { Task, Discipline, TaskStatus, Comment } from '../types';
import { AREAS, RESPONSIBLES } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

interface TaskGridProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onImportTasks: (newTasks: Task[]) => void;
}

const TaskGrid: React.FC<TaskGridProps> = ({ tasks, onUpdateTask, onImportTasks }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isAreaFilterOpen, setIsAreaFilterOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // States for comments
  const [commentingTaskId, setCommentingTaskId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const areaFilterRef = useRef<HTMLDivElement>(null);

  const commentingTask = useMemo(() =>
    tasks.find(t => t.id === commentingTaskId) || null
    , [tasks, commentingTaskId]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (areaFilterRef.current && !areaFilterRef.current.contains(event.target as Node)) {
        setIsAreaFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.wbs.includes(searchTerm) ||
        t.responsible.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDiscipline = disciplineFilter === 'all' || t.discipline === disciplineFilter;
      const matchesArea = selectedAreas.length === 0 || selectedAreas.includes(t.area);
      return matchesSearch && matchesDiscipline && matchesArea;
    });
  }, [tasks, searchTerm, disciplineFilter, selectedAreas]);

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTaskIds(new Set(filteredTasks.filter(t => t.duration > 0).map(t => t.id)));
    } else {
      setSelectedTaskIds(new Set());
    }
  };

  const toggleSelectTask = (id: string, isGroup: boolean) => {
    if (isGroup) return;
    const newSelection = new Set(selectedTaskIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTaskIds(newSelection);
  };

  const handleBulkUpdateResponsible = (responsible: string) => {
    selectedTaskIds.forEach(id => {
      onUpdateTask(id, { responsible });
    });
    setSelectedTaskIds(new Set());
  };

  const handleBulkUpdateStatus = (progress: number) => {
    selectedTaskIds.forEach(id => {
      onUpdateTask(id, { actualProgress: progress });
    });
    setSelectedTaskIds(new Set());
  };

  const handleAddComment = () => {
    if (!commentingTaskId || !newCommentText.trim()) return;

    const task = tasks.find(t => t.id === commentingTaskId);
    if (!task) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      userName: 'Eng. Roberto Plan', // Mock user
      text: newCommentText.trim(),
      timestamp: new Date().toISOString()
    };

    onUpdateTask(commentingTaskId, {
      comments: [...(task.comments || []), newComment]
    });

    setNewCommentText('');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Ativando Deep OCR para documentos de baixa qualidade...');
    setImportProgress(10);

    try {
      const base64Data = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      setImportStatus('Reconstruindo estrutura analítica (WBS) via IA Pro...');
      setImportProgress(35);

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: file.type || 'application/pdf',
                  data: base64Data
                }
              },
              {
                text: `You are a Senior Planning Engineer. I am providing a PDF/Image of an industrial schedule (MS Project or Primavera export).
                The document might have low-quality text, visual artifacts, or varying formats.
                
                CRITICAL INSTRUCTION:
                1. Identify Hierarchy: Look for activities that act as "Groups" or "Summary Tasks". These usually have sub-activities listed below them.
                2. WBS Mapping: Strictly follow the WBS hierarchy (e.g., 1.0, 1.1, 1.1.1).
                3. Group Recognition: If an activity has a duration of 0 or contains sub-tasks, mark it clearly. 
                4. Field Extraction:
                   - Name: The name of the task or group.
                   - Disciplines: Mecânica, Elétrica, Civil, Instrumentação, Andaime, Pintura.
                   - Area: Identify location/unit.
                   - Dates: Convert any date format into strict ISO 8601 strings.
                5. Context: Use Industrial Shutdown (Parada Industrial) terminology.
                
                Return a strictly valid JSON array of objects following the defined schema.`
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                wbs: { type: Type.STRING, description: "Hierarquia WBS ex: 1.2.3" },
                name: { type: Type.STRING, description: "Nome da atividade ou grupo" },
                discipline: { type: Type.STRING, description: "Mecânica, Elétrica, Civil, Instrumentação, Andaime ou Pintura" },
                area: { type: Type.STRING, description: "Local físico ou unidade" },
                responsible: { type: Type.STRING },
                duration: { type: Type.NUMBER, description: "Duração em horas. If it is a group/summary task, duration may be 0 or total sum." },
                start_date: { type: Type.STRING, description: "ISO 8601 Format" },
                end_date: { type: Type.STRING, description: "ISO 8601 Format" },
                is_critical: { type: Type.BOOLEAN },
                predecessors: { type: Type.ARRAY, items: { type: Type.STRING } },
                is_group: { type: Type.BOOLEAN, description: "True if this is a parent/summary task" }
              },
              required: ["wbs", "name", "discipline", "area", "start_date", "end_date"]
            }
          }
        }
      });

      setImportStatus('Sincronizando frentes de trabalho...');
      setImportProgress(75);

      const rawData = JSON.parse(response.text || "[]");
      const now = new Date();

      const mappedTasks: Task[] = rawData.map((item: any, index: number) => {
        // Robust mapping for Disciplines
        const dStr = (item.discipline || '').toLowerCase();
        let discipline = Discipline.MECHANICAL;
        if (dStr.includes('elét') || dStr.includes('elet')) discipline = Discipline.ELECTRICAL;
        else if (dStr.includes('civil')) discipline = Discipline.CIVIL;
        else if (dStr.includes('instrum') || dStr.includes('automa')) discipline = Discipline.INSTRUMENTATION;
        else if (dStr.includes('andai') || dStr.includes('scaff')) discipline = Discipline.SCAFFOLDING;
        else if (dStr.includes('pintu') || dStr.includes('paint')) discipline = Discipline.PAINTING;

        const start = new Date(item.start_date);
        const end = new Date(item.end_date);

        // Validation of extracted dates
        const validStart = isNaN(start.getTime()) ? now : start;
        const validEnd = isNaN(end.getTime()) ? new Date(validStart.getTime() + (item.duration || 8) * 3600000) : end;

        // Use provided duration or calculate from dates
        let duration = item.duration;
        if (duration === undefined || duration === null) {
          duration = Math.round((validEnd.getTime() - validStart.getTime()) / 3600000);
        }

        // Explicitly check for is_group or duration 0
        const isGroup = item.is_group === true || duration === 0;

        // Smart calculation of initial planned progress based on "today" relative to imported dates
        let plannedProgress = 0;
        if (now > validEnd) {
          plannedProgress = 100;
        } else if (now > validStart) {
          const totalTime = validEnd.getTime() - validStart.getTime();
          const elapsedTime = now.getTime() - validStart.getTime();
          plannedProgress = totalTime > 0 ? Math.round((elapsedTime / totalTime) * 100) : 0;
        }

        return {
          id: `TASK-${item.wbs || index}-${Date.now()}`,
          wbs: item.wbs || `${index + 1}`,
          name: item.name || 'Atividade Indefinida',
          discipline,
          area: item.area || 'Geral',
          responsible: item.responsible || RESPONSIBLES[index % RESPONSIBLES.length],
          duration: isGroup ? 0 : duration, // Ensure duration is 0 for groups
          baselineStart: validStart.toISOString(),
          baselineEnd: validEnd.toISOString(),
          currentStart: validStart.toISOString(),
          currentEnd: validEnd.toISOString(),
          plannedProgress: plannedProgress,
          actualProgress: 0,
          spi: plannedProgress > 0 ? 0 : 1.0,
          isCritical: !!item.is_critical,
          predecessors: item.predecessors || [],
          comments: []
        };
      });

      setImportProgress(100);
      onImportTasks(mappedTasks);

      setTimeout(() => {
        setIsImporting(false);
        setImportStatus('');
        setImportProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 600);

    } catch (error) {
      console.error("Erro na importação:", error);
      alert("O motor de IA Pro encontrou dificuldades para processar o documento. Certifique-se de que o arquivo não está corrompido ou excessivamente borrado.");
      setIsImporting(false);
    }
  };

  const getSlippageHours = (task: Task) => {
    const baseline = new Date(task.baselineEnd).getTime();
    const current = new Date(task.currentEnd).getTime();
    return Math.max(0, (current - baseline) / (1000 * 60 * 60));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusStyle = (task: Task) => {
    if (task.actualProgress === 100) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (task.actualProgress > 0) return 'bg-blue-50 text-blue-700 border-blue-200';
    const now = new Date();
    if (now > new Date(task.currentEnd) && task.actualProgress < 100) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-50 text-slate-500 border-slate-200';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative shadow-sm rounded-2xl border border-slate-200 bg-white">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.png,.jpg,.jpeg,.xml,.xlsx"
        className="hidden"
      />

      {/* Side Panel for Comments */}
      {commentingTask && (
        <>
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity animate-in fade-in"
            onClick={() => setCommentingTaskId(null)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[450px] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Comentários da Tarefa</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{commentingTask.wbs}</p>
                </div>
              </div>
              <button
                onClick={() => setCommentingTaskId(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 bg-white border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 leading-snug">{commentingTask.name}</h4>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">{commentingTask.discipline}</span>
                <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">{commentingTask.area}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {commentingTask.comments && commentingTask.comments.length > 0 ? (
                commentingTask.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4 group">
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-md">
                      {comment.userName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs font-black text-slate-900">{comment.userName}</span>
                        <span className="text-[10px] font-bold text-slate-400">{formatDate(comment.timestamp)}</span>
                      </div>
                      <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 text-sm text-slate-600 leading-relaxed">
                        {comment.text}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-10">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum comentário ainda</p>
                  <p className="text-xs text-slate-400 mt-2">Seja o primeiro a registrar um apontamento sobre esta atividade.</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <div className="relative">
                <textarea
                  placeholder="Escreva um comentário..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-14 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none min-h-[100px] font-medium text-slate-700"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newCommentText.trim()}
                  className="absolute bottom-4 right-4 p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modern Overlay de Importação Pro */}
      {isImporting && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-3xl flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] p-12 max-w-xl w-full shadow-2xl border border-white/20 scale-up-center">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-10">
                <div className="w-32 h-32 bg-blue-600 rounded-[40px] flex items-center justify-center shadow-2xl shadow-blue-500/40 animate-pulse">
                  <Zap className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center shadow-lg">
                  <BrainCircuit className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase">Importação IA Pro</h3>
              <p className="text-slate-500 text-lg mb-12 font-medium leading-relaxed px-6">{importStatus}</p>

              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-5 shadow-inner">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-1000 ease-out" style={{ width: `${importProgress}%` }} />
              </div>
              <div className="flex justify-between w-full px-2">
                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Escaneamento Profundo...
                </span>
                <span className="text-sm font-black text-blue-600">{importProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho de Controle e Filtros */}
      <div className="bg-white p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-6 shadow-sm z-10">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar no cronograma..."
              className="pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm w-80 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <Filter className="w-4 h-4 text-slate-400" />
            <select className="bg-transparent text-sm font-bold text-slate-700 outline-none border-none cursor-pointer pr-4" value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value)}>
              <option value="all">Disciplinas</option>
              {Object.values(Discipline).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="relative" ref={areaFilterRef}>
            <button
              onClick={() => setIsAreaFilterOpen(!isAreaFilterOpen)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-2xl border transition-all ${selectedAreas.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <MapPin className="w-4 h-4" />
              {selectedAreas.length === 0 ? 'Áreas' : `${selectedAreas.length} Selecionadas`}
              <ChevronDown className={`w-4 h-4 transition-transform ${isAreaFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAreaFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {AREAS.map((area) => (
                    <label key={area} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedAreas.includes(area) ? 'bg-blue-600 border-blue-600' : 'border-slate-200 group-hover:border-slate-300'}`}>
                        {selectedAreas.includes(area) && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={selectedAreas.includes(area)} onChange={() => toggleArea(area)} />
                      <span className={`text-xs font-bold ${selectedAreas.includes(area) ? 'text-blue-700' : 'text-slate-600'}`}>{area}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-3 px-8 py-3 text-sm font-black bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/30 hover:bg-slate-800 transition-all active:scale-95"
          >
            {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileUp className="w-5 h-5" />}
            IMPORTAR CRONOGRAMA
          </button>
        </div>
      </div>

      {/* Grade de Atividades */}
      <div className="flex-1 overflow-auto bg-slate-100 pb-32">
        {tasks.length > 0 ? (
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-20 bg-white shadow-md">
              <tr>
                <th className="px-6 py-5 text-center border-b border-slate-200 w-14">
                  <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600" checked={filteredTasks.filter(t => t.duration > 0).length > 0 && selectedTaskIds.size === filteredTasks.filter(t => t.duration > 0).length} onChange={handleSelectAll} />
                </th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-24">WBS</th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 min-w-[350px]">Atividade</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Previsão Fim</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Responsável</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">% Real</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTasks.map((task) => {
                const slippage = getSlippageHours(task);
                const isGroup = task.duration === 0;
                const indent = (task.wbs.split('.').length - 1) * 20;
                const hasComments = task.comments && task.comments.length > 0;

                return (
                  <tr
                    key={task.id}
                    className={`hover:bg-blue-50/20 transition-all group cursor-pointer ${selectedTaskIds.has(task.id) ? 'bg-blue-50/60' : ''} ${isGroup ? 'bg-slate-50/50' : ''}`}
                    onClick={() => toggleSelectTask(task.id, isGroup)}
                  >
                    <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                      {!isGroup && <input type="checkbox" className="w-5 h-5 rounded border-slate-300" checked={selectedTaskIds.has(task.id)} onChange={() => toggleSelectTask(task.id, isGroup)} />}
                    </td>
                    <td className={`px-6 py-5 text-xs font-mono font-bold ${isGroup ? 'text-slate-900' : 'text-slate-400'}`}>{task.wbs}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3" style={{ paddingLeft: `${indent}px` }}>
                        <div className="flex flex-col">
                          <span className={`text-sm tracking-tight leading-tight ${isGroup ? 'font-black text-slate-900 uppercase' : 'font-bold text-slate-700'}`}>
                            {task.name}
                          </span>
                          {!isGroup && (
                            <div className="flex gap-2 items-center mt-2">
                              <span className="text-[10px] text-slate-400 uppercase font-black px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200/50">{task.discipline}</span>
                              <span className="text-[10px] text-slate-400 font-medium italic truncate max-w-[180px]">{task.area}</span>
                              {task.isCritical && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-sm" title="Crítico"></div>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className={`px-6 py-5 text-center text-xs font-black ${isGroup ? 'text-slate-400' : 'text-slate-800'}`}>
                      {isGroup ? '-' : formatDate(task.currentEnd)}
                    </td>
                    <td className="px-6 py-5 text-center text-xs font-bold text-slate-500">
                      {isGroup ? '-' : task.responsible}
                    </td>
                    <td className="px-6 py-5 text-center min-w-[160px]" onClick={(e) => e.stopPropagation()}>
                      {!isGroup && (
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-black text-slate-700">{task.actualProgress}%</span>
                            <span className="text-[9px] text-slate-400 font-black">P: {task.plannedProgress}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={task.actualProgress}
                            className="w-full h-2.5 bg-slate-100 rounded-full accent-blue-600 cursor-pointer shadow-inner"
                            onChange={(e) => onUpdateTask(task.id, { actualProgress: parseInt(e.target.value) })}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                      {!isGroup && (
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => setCommentingTaskId(task.id)}
                            className={`p-2.5 rounded-xl transition-all relative ${hasComments ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                            title="Visualizar Comentários"
                          >
                            <MessageSquare className="w-5 h-5" />
                            {hasComments && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                {task.comments?.length}
                              </span>
                            )}
                          </button>
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest ${getStatusStyle(task)}`}>
                            {task.actualProgress === 100 ? 'CONCLUÍDO' : (task.actualProgress > 0 ? 'EM CURSO' : 'PENDENTE')}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-1000">
            <div className="relative mb-10">
              <div className="w-32 h-32 bg-slate-200 rounded-[40px] flex items-center justify-center text-slate-400 shadow-inner">
                <FileText className="w-14 h-14" />
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100">
                <BrainCircuit className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Área do Cronograma</h2>
            <p className="text-slate-500 max-w-lg text-center font-medium leading-relaxed text-lg px-4">
              Importe o PDF ou Imagem do seu cronograma. Nossa IA Pro utiliza OCR de alta precisão para reconstruir as atividades, frentes de trabalho e datas críticas.
            </p>
            <div className="mt-8 flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Powered by Gemini 3 Pro Vision</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      {selectedTaskIds.size > 0 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-20 duration-500">
          <div className="bg-slate-900/95 backdrop-blur-xl text-white px-10 py-6 rounded-[36px] shadow-[0_30px_70px_rgba(0,0,0,0.4)] border border-white/10 flex items-center gap-10">
            <div className="flex items-center gap-5 pr-10 border-r border-slate-700">
              <div className="bg-blue-600 p-3.5 rounded-2xl">
                <CheckSquare className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none mb-2">Seleção Lote</p>
                <p className="text-2xl font-black leading-none tracking-tight">{selectedTaskIds.size}</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <button onClick={() => handleBulkUpdateStatus(100)} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all">Finalizar Itens</button>
              <button onClick={() => setSelectedTaskIds(new Set())} className="p-3 text-slate-400 hover:text-white transition-all"><X className="w-7 h-7" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskGrid;
