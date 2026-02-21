import React, { useState, useEffect } from 'react';
import { shutdownService } from '../services/shutdownService';
import { Evento } from '../types/shutdown';
import { Calendar, Plus, ChevronDown } from 'lucide-react';

interface EventSelectorProps {
    onSelect: (event: Evento) => void;
    selectedEvent?: Evento;
}

const EventSelector: React.FC<EventSelectorProps> = ({ onSelect, selectedEvent }) => {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        loadEventos();
    }, []);

    const loadEventos = async () => {
        try {
            const data = await shutdownService.getEventos();
            setEventos(data);
            if (data.length > 0 && !selectedEvent) {
                onSelect(data[0]);
            }
        } catch (error) {
            console.error('Error loading events:', error);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all shadow-sm"
            >
                <div className="bg-blue-100 p-1.5 rounded-lg">
                    <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Evento Ativo</p>
                    <div className="flex items-center gap-1">
                        <p className="text-sm font-bold text-slate-700">{selectedEvent?.nome || 'Selecionar Evento'}</p>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                </div>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">Eventos Recentes</span>
                        <button className="p-1 hover:bg-blue-50 text-blue-600 rounded-md transition-colors" title="Novo Evento">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {eventos.map((e) => (
                            <button
                                key={e.id}
                                onClick={() => {
                                    onSelect(e);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-slate-50 flex flex-col gap-0.5 transition-colors ${selectedEvent?.id === e.id ? 'bg-blue-50/50' : ''}`}
                            >
                                <p className={`text-sm font-bold ${selectedEvent?.id === e.id ? 'text-blue-600' : 'text-slate-700'}`}>{e.nome}</p>
                                <p className="text-[10px] text-slate-400">
                                    {new Date(e.data_inicio).toLocaleDateString()} - {new Date(e.data_fim).toLocaleDateString()}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventSelector;
