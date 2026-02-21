import { supabase } from '../lib/supabase';
import { Atividade, Evento, Area, ShutdownStats, SCurveData } from '../types/shutdown';

export const shutdownService = {
    async getEventos() {
        const { data, error } = await supabase
            .from('eventos')
            .select('*')
            .order('criado_em', { ascending: false });
        if (error) throw error;
        return data as Evento[];
    },

    async getAreas(eventoId: string) {
        const { data, error } = await supabase
            .from('areas')
            .select('*')
            .eq('evento_id', eventoId);
        if (error) throw error;
        return data as Area[];
    },

    async getAtividades(eventoId: string) {
        const { data, error } = await supabase
            .from('cronograma_dados')
            .select('*')
            .eq('evento_id', eventoId)
            .order('inicio_previsto', { ascending: true });

        if (error) throw error;

        // Build hierarchy for TaskGrid display
        const atividades = data as any[];
        const map = new Map<string, any>();
        const roots: any[] = [];

        atividades.forEach(a => {
            a.subatividades = [];
            a.nome = a.atividade; // UI Compatibility alias
            map.set(a.id, a);
        });

        atividades.forEach(a => {
            // For cronograma_dados, we might use a simple nesting if subatividade is present
            // or if we have a parent_id (though it's not in the new schema yet, 
            // let's assume it's flat for now or nested by name)
            roots.push(a);
        });

        return roots;
    },

    async updateAtividadeProgress(id: string, progress: number) {
        const { error } = await supabase
            .from('cronograma_dados')
            .update({
                percentual_real: progress,
                status: progress === 100 ? 'Concluída' : (progress > 0 ? 'Em Andamento' : 'Planejada'),
                atualizado_em: new Date().toISOString()
            })
            .eq('id', id);
        if (error) throw error;
    },

    calculateStats(atividades: Atividade[], evento: Evento): ShutdownStats {
        let totalDuracao = 0;
        let weightedReal = 0;
        let weightedPlanned = 0;

        const flatten = (list: Atividade[]) => {
            list.forEach(a => {
                totalDuracao += a.duracao;
                weightedReal += (a.percentual_real / 100) * a.duracao;
                weightedPlanned += (a.percentual_planejado / 100) * a.duracao;
                if (a.subatividades) flatten(a.subatividades);
            });
        };

        flatten(atividades);

        const progresso_real = totalDuracao > 0 ? (weightedReal / totalDuracao) * 100 : 0;
        const progresso_planejado = totalDuracao > 0 ? (weightedPlanned / totalDuracao) * 100 : 0;
        const spi = progresso_planejado > 0 ? progresso_real / progresso_planejado : 1;

        return {
            progresso_real,
            progresso_planejado,
            spi,
            desvio: progresso_real - progresso_planejado
        };
    },

    generateSCurve(atividades: Atividade[], evento: Evento): SCurveData[] {
        const start = new Date(evento.data_inicio);
        const end = new Date(evento.data_fim);
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        const points: SCurveData[] = [];

        // Simple S-Curve generation for 24h period
        for (let i = 0; i <= Math.ceil(durationHours); i++) {
            const currentTime = new Date(start.getTime() + i * 60 * 60 * 1000);

            let weightedPlanned = 0;
            let weightedReal = 0;
            let totalDuracao = 0;

            const processList = (list: Atividade[]) => {
                list.forEach(a => {
                    totalDuracao += a.duracao;
                    const actStart = new Date(a.inicio_previsto);
                    const actEnd = new Date(a.fim_previsto);

                    // Planned calculation at this point in time
                    if (currentTime >= actEnd) {
                        weightedPlanned += a.duracao;
                    } else if (currentTime > actStart) {
                        const elapsed = (currentTime.getTime() - actStart.getTime()) / (actEnd.getTime() - actStart.getTime());
                        weightedPlanned += elapsed * a.duracao;
                    }

                    // Real progress (simplification: assume constant speed based on current real progress if we were doing time-phased tracking)
                    // For a 24h shutdown, we usually just show the cumulative real progress reported so far against the planned curve
                    // But to make it look like a curve, we'd need history. 
                    // Since we don't have history here, we'll just return projected planned for now.

                    if (a.subatividades) processList(a.subatividades);
                });
            };

            processList(atividades);

            points.push({
                hora: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                planejado: totalDuracao > 0 ? (weightedPlanned / totalDuracao) * 100 : 0,
                real: 0, // History needed for actual curve
                desvio: 0
            });
        }

        return points;
    },

    async importFromData(eventoId: string, rows: any[]) {
        try {
            // 1. Clear existing data for this event to avoid duplicates
            await supabase
                .from('cronograma_dados')
                .delete()
                .eq('evento_id', eventoId);

            // 2. Insert new rows
            const dbRows = rows.map(row => ({
                evento_id: eventoId,
                atividade: row.atividade || row.nome || 'Sem Título',
                inicio_previsto: row.inicio_previsto || row.start_date || new Date().toISOString(),
                fim_previsto: row.fim_previsto || row.end_date || new Date().toISOString(),
                duracao: row.duracao || 1,
                percentual_planejado: row.percentual_planejado || 100,
                percentual_real: row.percentual_real || 0,
                responsavel: row.responsavel || row.responsible || '',
                area: row.area || row.disciplina || 'Geral',
                subatividade: row.subatividade || '',
                status: 'Planejada'
            }));

            const { error } = await supabase
                .from('cronograma_dados')
                .insert(dbRows);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }
};
