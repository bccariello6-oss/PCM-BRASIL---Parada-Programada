import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, Loader2, Zap, BrainCircuit, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";

interface SmartImportProps {
    onImport: (data: any[]) => void;
    onCancel: () => void;
}

const SmartImport: React.FC<SmartImportProps> = ({ onImport, onCancel }) => {
    const [isAIProcessing, setIsAIProcessing] = useState(false);
    const [aiStatus, setAIStatus] = useState('');
    const [error, setError] = useState<string | null>(null);

    const expectedFields = [
        { key: 'atividade', label: 'Atividade', required: true },
        { key: 'inicio_previsto', label: 'Início Previsto', required: true },
        { key: 'fim_previsto', label: 'Fim Previsto', required: true },
        { key: 'percentual_real', label: '% Real' },
        { key: 'responsavel', label: 'Responsável' },
        { key: 'area', label: 'Área' },
        { key: 'subatividade', label: 'Subatividade' },
        { key: 'percentual_planejado', label: '% Planejado' },
        { key: 'duracao', label: 'Duração (h)' }
    ];

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setError(null);
        setIsAIProcessing(true);

        try {
            if (uploadedFile.type === 'application/pdf' || uploadedFile.type.startsWith('image/')) {
                await handleAIParsing(uploadedFile);
            } else {
                await handleExcelParsing(uploadedFile);
            }
        } catch (err) {
            console.error("Import error:", err);
            setError('Falha ao processar o arquivo. Verifique o formato e tente novamente.');
            setIsAIProcessing(false);
        }
    };

    const handleExcelParsing = (uploadedFile: File): Promise<void> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const bstr = event.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length > 0) {
                    const headers = Object.keys(data[0] as object);
                    const mapping = autoMap(headers);

                    const finalData = data.map((row: any) => {
                        const obj: any = {};
                        expectedFields.forEach(field => {
                            const mappedHeader = mapping[field.key];
                            if (mappedHeader) {
                                obj[field.key] = row[mappedHeader];
                            }
                        });
                        return obj;
                    });

                    onImport(finalData);
                } else {
                    setError('Arquivo Excel está vazio.');
                    setIsAIProcessing(false);
                }
                resolve();
            };
            reader.readAsBinaryString(uploadedFile);
        });
    };

    const handleAIParsing = async (uploadedFile: File) => {
        setAIStatus('Extraindo dados via IA Pro...');

        try {
            const base64Data = await fileToBase64(uploadedFile);
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

            if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
                throw new Error('API Key do Gemini não configurada.');
            }

            const ai = new GoogleGenAI({ apiKey });
            const aiPrompt = `Extraia o cronograma deste documento. Procure por colunas como Atividade, Início, Fim, Responsável, etc.
                        Retorne um JSON array de objetos. 
                        Tente identificar a hierarquia (Subatividades).
                        Campos sugeridos (em português): atividade, inicio_previsto, fim_previsto, responsavel, percentual_real, area, subatividade, percentual_planejado, duracao.
                        Mantenha os campos em minúsculo e use snake_case.`;

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [{
                    parts: [
                        { inlineData: { mimeType: uploadedFile.type, data: base64Data } },
                        { text: aiPrompt }
                    ]
                }],
                config: {
                    responseMimeType: "application/json"
                }
            });

            const rawData = JSON.parse(response.text || "[]");
            if (rawData.length > 0) {
                onImport(rawData);
            } else {
                setError('A IA não conseguiu identificar dados neste arquivo.');
                setIsAIProcessing(false);
            }
        } catch (err: any) {
            console.error("Erro no processamento AI:", err);
            setError(err.message || 'Erro ao processar arquivo com IA. Verifique sua chave API.');
            setIsAIProcessing(false);
        } finally {
            setAIStatus('');
        }
    };

    const autoMap = (headers: string[]): Record<string, string> => {
        const newMapping: Record<string, string> = {};
        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

        const patterns: Record<string, string[]> = {
            atividade: ['atividade', 'tarefa', 'item', 'descri'],
            inicio_previsto: ['inicio', 'data inicio', 'start', 'comeco'],
            fim_previsto: ['fim', 'termino', 'finish', 'conclusao'],
            percentual_real: ['% real', 'realizado', 'progresso'],
            responsavel: ['responsavel', 'executor', 'quem'],
            area: ['area', 'disciplina', 'setor'],
            subatividade: ['subatividade', 'subtarefa'],
            percentual_planejado: ['% planejado', 'planejado'],
            duracao: ['duracao', 'horas', 'tempo']
        };

        headers.forEach((h) => {
            const normalizedHeader = normalize(h);
            for (const [field, variations] of Object.entries(patterns)) {
                if (variations.some(v => normalizedHeader.includes(v))) {
                    newMapping[field] = h;
                    break;
                }
            }
        });

        return newMapping;
    };

    return (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-w-2xl w-full mx-auto animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl">
                        <Upload className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Auto-Importação</h2>
                        <p className="text-xs text-slate-500">Envie seu arquivo e o sistema fará o resto</p>
                    </div>
                </div>
                {!isAIProcessing && (
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
                        Cancelar
                    </button>
                )}
            </div>

            <div className="p-10">
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 transition-all ${isAIProcessing ? 'border-blue-200 bg-blue-50/50 cursor-wait' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer group'
                    }`}>
                    {isAIProcessing ? (
                        <div className="flex flex-col items-center">
                            <div className="bg-blue-600 p-5 rounded-[32px] shadow-2xl shadow-blue-500/30 mb-6 relative">
                                <BrainCircuit className="w-12 h-12 text-white animate-pulse" />
                                <div className="absolute inset-0 bg-white/20 rounded-[32px] animate-ping" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Processando Cronograma</h3>
                            <p className="text-blue-600 font-bold text-sm animate-pulse">{aiStatus || 'Analisando dados...'}</p>
                            <div className="mt-8 flex gap-1">
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-slate-100 p-5 rounded-3xl group-hover:bg-blue-100 transition-colors">
                                <FileText className="w-10 h-10 text-slate-400 group-hover:text-blue-600" />
                            </div>
                            <div className="mt-6 text-center">
                                <p className="text-lg font-bold text-slate-700">Arraste ou clique para importar</p>
                                <p className="text-sm text-slate-400 mt-1">Excel, CSV ou PDF (Cronograma Original)</p>
                            </div>
                            <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-200">
                                <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                IA ATIVA PARA PDFS E IMAGENS
                            </div>
                            <input type="file" className="hidden" accept=".xlsx,.xls,.csv,.pdf,image/*" onChange={handleFileUpload} />
                        </>
                    )}
                </label>

                {error && (
                    <div className="mt-8 flex items-start gap-3 text-red-600 bg-red-50 p-5 rounded-2xl border border-red-100">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-black uppercase tracking-tight mb-1">Erro na Importação</p>
                            <p className="text-sm font-medium leading-relaxed">{error}</p>
                            {error.includes('API Key') && (
                                <p className="mt-2 text-xs font-bold bg-white/50 p-2 rounded-lg border border-red-200">
                                    Dica: Verifique se o arquivo `.env.local` contém uma chave Gemini Pro válida.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Processamento direto e seguro via PCM Engine
                </p>
            </div>
        </div>
    );
};

export default SmartImport;
