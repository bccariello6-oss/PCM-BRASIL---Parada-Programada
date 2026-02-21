
export type ShutdownStatus = 'Planejada' | 'Em Andamento' | 'Concluída' | 'Atrasada';

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

export interface Atividade {
    id: string;
    evento_id: string;
    area_id: string;
    atividade_pai_id?: string;
    nome: string;
    responsavel?: string;
    inicio_previsto: string;
    fim_previsto: string;
    inicio_real?: string;
    fim_real?: string;
    duracao: number;
    percentual_planejado: number;
    percentual_real: number;
    status: ShutdownStatus;
    criticidade?: string;
    atualizado_em: string;
    subatividades?: Atividade[];
}

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
