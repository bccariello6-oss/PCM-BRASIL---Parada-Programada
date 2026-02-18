
export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED'
}

export enum Discipline {
  MECHANICAL = 'Mecânica',
  ELECTRICAL = 'Elétrica',
  CIVIL = 'Civil',
  INSTRUMENTATION = 'Instrumentação',
  SCAFFOLDING = 'Andaime',
  PAINTING = 'Pintura'
}

export interface Comment {
  id: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface Task {
  id: string;
  wbs: string;
  name: string;
  discipline: Discipline;
  area: string;
  responsible: string;
  duration: number; // in hours
  baselineStart: string;
  baselineEnd: string;
  currentStart: string; // Forecasted/Planned start
  currentEnd: string;   // Forecasted/Planned end
  actualStart?: string;
  actualEnd?: string;
  plannedProgress: number; // 0-100
  actualProgress: number; // 0-100
  spi: number;
  isCritical: boolean;
  predecessors: string[];
  parentId?: string;
  comments?: Comment[];
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  delayedTasks: number;
  plannedPhysical: number;
  actualPhysical: number;
  overallSpi: number;
  globalStatus: 'On Track' | 'At Risk' | 'Critical';
}

export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'PLANNER' | 'EXECUTOR' | 'MANAGER';
  avatar: string;
}

export interface UpdateLog {
  id: string;
  taskId: string;
  userName: string;
  timestamp: string;
  oldValue: string | number;
  newValue: string | number;
  field: string;
  comment?: string;
}
