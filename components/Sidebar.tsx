
import React from 'react';
import {
  LayoutDashboard,
  GanttChartSquare,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schedule', label: 'Cronograma', icon: GanttChartSquare },
  ];

  return (
    <div className={`
      fixed left-0 top-0 h-screen bg-slate-900 text-white flex flex-col 
      transition-all duration-300 z-50 shadow-2xl
      ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}
    `}>
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 shrink-0">
        <div className="bg-blue-600 p-1.5 rounded-lg">
          <GanttChartSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight">ISM System</h1>
          <p className="text-[9px] text-slate-400 uppercase tracking-widest">Shutdown Manager</p>
        </div>
      </div>

      <nav className="flex-1 mt-6 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl mb-4">
          <img src="https://picsum.photos/seed/user1/100" className="w-9 h-9 rounded-full border-2 border-slate-700" alt="Avatar" />
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">Roberto Plan</p>
            <p className="text-[10px] text-slate-400">Plan. Senior</p>
          </div>
        </div>
        <button className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors px-4 py-2 w-full text-sm font-medium">
          <LogOut className="w-4 h-4" />
          Sair do Sistema
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
