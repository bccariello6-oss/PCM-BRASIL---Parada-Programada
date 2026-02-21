
export type ShutdownStatus = 'Planejada' | 'Em Andamento' | 'Concluída' | 'Atrasada';

export interface CronogramaDado {
    id: string;
    evento_id: string;
    atividade: string; // Matches 'atividade' in DB
    nome?: string;      // Alias for UI templates
    inicio_previsto: string;
    fim_previsto: string;
    duracao: number;
    percentual_planejado: number;
    percentual_real: number;
    responsavel?: string;
    area?: string;
    subatividade?: string;
    status: ShutdownStatus;
    atualizado_em: string;
    subatividades?: CronogramaDado[];
}

export interface Evento {
    id: string;
    nome: string;
    data_inicio: string;
    data_fim: string;
    linha_corte_horas: number;
    status: string;
    criado_em: string;
}

export interface Area {
    id: string;
    evento_id: string;
    nome: string;
}

export interface Atividade extends CronogramaDado { }

export interface ShutdownStats {
    progresso_real: number;
    progresso_planejado: number;
    spi: number;
    desvio: number;
    estimativa_termino?: string;
}

export interface SCurveData {
    hora: string;
    planejado: number;
    real: number;
    desvio: number;
}
