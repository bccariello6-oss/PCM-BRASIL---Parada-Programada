import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, ChevronRight, Loader2, Zap, BrainCircuit } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from "@google/genai";

interface SmartImportProps {
    onImport: (data: any[]) => void;
    onCancel: () => void;
}

const SmartImport: React.FC<SmartImportProps> = ({ onImport, onCancel }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [isAIProcessing, setIsAIProcessing] = useState(false);
    const [aiStatus, setAIStatus] = useState('');
    const [aiResult, setAiResult] = useState<any[]>([]);

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

        setFile(uploadedFile);
        setError(null);

        if (uploadedFile.type === 'application/pdf' || uploadedFile.type.startsWith('image/')) {
            await handleAIParsing(uploadedFile);
        } else {
            handleExcelParsing(uploadedFile);
        }
    };

    const handleExcelParsing = (uploadedFile: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const bstr = event.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            if (data.length > 0) {
                const headers = data[0] as string[];
                setPreview(data.slice(1, 6)); // Preview 5 rows
                autoMap(headers);
            }
        };
        reader.readAsBinaryString(uploadedFile);
    };

    const handleAIParsing = async (uploadedFile: File) => {
        setIsAIProcessing(true);
        setAIStatus('Iniciando OCR Inteligente...');

        try {
            const base64Data = await fileToBase64(uploadedFile);
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

            setAIStatus('Processando estrutura do cronograma via IA Pro...');

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [{
                    parts: [
                        { inlineData: { mimeType: uploadedFile.type, data: base64Data } },
                        {
                            text: `Extraia o cronograma deste documento. Procure por colunas como Atividade, Início, Fim, Responsável, etc.
                        Retorne um JSON array de objetos. 
                        Tente identificar a hierarquia (Subatividades).
                        Campos sugeridos: atividade, inicio_previsto, fim_previsto, responsavel, percentual_real, area, subatividade.` }
                    ]
                }],
                config: {
                    responseMimeType: "application/json"
                }
            });

            const rawData = JSON.parse(response.text || "[]");
            if (rawData.length > 0) {
                setAiResult(rawData);
                setPreview(rawData.slice(0, 5).map((r: any) => Object.values(r)));
                const headers = Object.keys(rawData[0]);
                autoMap(headers);
            } else {
                setError('A IA não conseguiu identificar dados neste arquivo.');
            }
        } catch (err) {
            console.error("Erro no processamento AI:", err);
            setError('Erro ao processar arquivo com IA. Verifique sua chave API.');
        } finally {
            setIsAIProcessing(false);
            setAIStatus('');
        }
    };

    const autoMap = (headers: string[]) => {
        const newMapping: Record<string, string> = {};
        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

        const patterns: Record<string, string[]> = {
            atividade: ['atividade', 'tarefa', 'item'],
            inicio_previsto: ['inicio', 'data inicio', 'start', 'comeco'],
            fim_previsto: ['fim', 'termino', 'finish', 'conclusao'],
            percentual_real: ['% real', 'realizado', 'progresso'],
            responsavel: ['responsavel', 'executor', 'quem'],
            area: ['area', 'disciplina', 'setor'],
            subatividade: ['subatividade', 'subtarefa'],
            percentual_planejado: ['% planejado', 'planejado'],
            duracao: ['duracao', 'horas', 'tempo']
        };

        headers.forEach((h, index) => {
            const normalizedHeader = normalize(h);
            for (const [field, variations] of Object.entries(patterns)) {
                if (variations.some(v => normalizedHeader.includes(v))) {
                    newMapping[field] = h;
                    break;
                }
            }
        });

        setMapping(newMapping);
    };

    const validateAndImport = () => {
        // Validation logic here
        const missing = expectedFields.filter(f => f.required && !mapping[f.key]);
        if (missing.length > 0) {
            setError(`Campos obrigatórios faltando: ${missing.map(m => m.label).join(', ')}`);
            return;
        }

        if (aiResult.length > 0) {
            onImport(aiResult);
        } else {
            // Process Excel data using the mapping
            const reader = new FileReader();
            reader.onload = (event) => {
                const bstr = event.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);

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
            };
            if (file) reader.readAsBinaryString(file);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-w-4xl w-full mx-auto animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl">
                        <Upload className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Importação Inteligente</h2>
                        <p className="text-xs text-slate-500">Transforme seu cronograma em dados operacionais</p>
                    </div>
                </div>
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
                    Cancelar
                </button>
            </div>

            <div className="p-8">
                {!file ? (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-12 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group">
                        {isAIProcessing ? (
                            <div className="flex flex-col items-center animate-pulse">
                                <div className="bg-blue-600 p-4 rounded-[32px] shadow-2xl shadow-blue-500/40 mb-6">
                                    <BrainCircuit className="w-12 h-12 text-white animate-bounce" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">IA Pro Processando</h3>
                                <p className="text-slate-500 font-medium text-sm">{aiStatus}</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-slate-100 p-4 rounded-full group-hover:bg-blue-100 transition-colors">
                                    <FileText className="w-8 h-8 text-slate-400 group-hover:text-blue-600" />
                                </div>
                                <p className="mt-4 font-bold text-slate-700">Clique para fazer upload</p>
                                <p className="text-sm text-slate-400">Excel, CSV ou PDF</p>
                                <input type="file" className="hidden" accept=".xlsx,.xls,.csv,.pdf" onChange={handleFileUpload} />
                            </>
                        )}
                    </label>
                ) : (
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                Mapeamento de Colunas
                            </h3>
                            <div className="space-y-3">
                                {expectedFields.map(f => (
                                    <div key={f.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-sm font-semibold text-slate-600">
                                            {f.label} {f.required && <span className="text-red-500">*</span>}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <ChevronRight className="w-3 h-3 text-slate-300" />
                                            <span className={`text-sm font-bold ${mapping[f.key] ? 'text-blue-600' : 'text-slate-400 italic'}`}>
                                                {mapping[f.key] || 'Não mapeado'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                Preview de Dados (Top 5)
                            </h3>
                            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50">
                                        <tr>{preview[0]?.map((h: any, i: number) => <th key={i} className="px-2 py-2 text-left text-slate-500 border-b">{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {preview.slice(1).map((row: any, i: number) => (
                                            <tr key={i}>{row.map((cell: any, j: number) => <td key={j} className="px-2 py-2 text-slate-700 border-b">{cell}</td>)}</tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}

                {file && (
                    <div className="mt-8 flex justify-end gap-3">
                        <button
                            onClick={() => { setFile(null); setPreview([]); }}
                            className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                        >
                            Trocar Arquivo
                        </button>
                        <button
                            onClick={validateAndImport}
                            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                        >
                            Confirmar Importação
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartImport;
