
import { Task, Discipline, TaskStatus, User } from './types';

export const AREAS = [
  'Área 100 - Caldeira', 
  'Área 200 - Turbinas', 
  'Área 300 - Tratamento Água', 
  'Área 400 - Subestação',
  'Área 500 - Utilidades',
  'Área 600 - Pátio de Cavacos'
];

export const RESPONSIBLES = [
  'João Silva', 
  'Maria Santos', 
  'Carlos Pereira', 
  'Ana Oliveira', 
  'Ricardo Lima',
  'Fernanda Souza',
  'Paulo Mendes'
];

export const MOCK_USERS: User[] = [
  { id: '1', name: 'Eng. Roberto Plan', role: 'ADMIN', avatar: 'https://picsum.photos/seed/roberto/100' },
  { id: '2', name: 'Insp. Carlos Exec', role: 'EXECUTOR', avatar: 'https://picsum.photos/seed/carlos/100' }
];

/**
 * O cronograma inicia vazio para que o usuário possa importar 
 * o arquivo de parada real (.MPP, .XML, .XLSX ou .PDF).
 */
export const INITIAL_TASKS: Task[] = [];
