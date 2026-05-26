
import React, { useState, useEffect } from "react";
import { useSync } from "../hooks/useSync";
import { useAuth } from "../context/AuthContext";
import { 
  Plus, Wifi, WifiOff, LogOut, Trash2, CheckCircle2, Circle, 
  RefreshCcw, Inbox, Calendar, Star, Search, Settings, 
  CheckCircle, AlertCircle, Menu, X, Bell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type View = "Inbox" | "Today" | "Important";

export function TodoList() {
  const { todos, addTodo, toggleTodo, toggleStar, updateDueDate, deleteTodo, isOnline, isSyncing } = useSync();
  const { user, logout } = useAuth();
  const [newText, setNewText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>("Inbox");

  // Notifications Request
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Reminder Check
  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toISOString().split("T")[0];
      todos.forEach(todo => {
        if (!todo.completed && todo.dueDate === today) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Task Reminder", {
              body: `"${todo.text}" is due today!`,
              icon: "/favicon.ico"
            });
          }
        }
      });
    }, 1000 * 60 * 60);

    return () => clearInterval(interval);
  }, [todos]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    addTodo(newText.trim());
    setNewText("");
  };

  const filteredTodos = todos.filter(t => {
    const matchesSearch = t.text.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (currentView === "Important") return t.important;
    if (currentView === "Today") {
      const today = new Date().toISOString().split("T")[0];
      return t.dueDate === today;
    }
    return true; 
  }).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">T</div>
          <h1 className="font-bold text-xl tracking-tight">SyncDo</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 font-bold">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <button 
          className={`w-full sidebar-link ${currentView === "Inbox" ? "sidebar-link-active" : "sidebar-link-inactive"}`} 
          onClick={() => { setCurrentView("Inbox"); setIsSidebarOpen(false); }}
        >
          <Inbox className="w-4 h-4" /> 
          <span>Inbox</span> 
          <span className="ml-auto bg-blue-100 px-2 py-0.5 rounded text-xs text-blue-700 font-bold">
            {todos.filter(t => !t.completed).length}
          </span>
        </button>
        <button 
          className={`w-full sidebar-link ${currentView === "Today" ? "sidebar-link-active" : "sidebar-link-inactive"}`}
          onClick={() => { setCurrentView("Today"); setIsSidebarOpen(false); }}
        >
          <Calendar className="w-4 h-4" /> 
          <span>Today</span>
          <span className="ml-auto opacity-50 text-[10px] font-bold">
            {todos.filter(t => !t.completed && t.dueDate === new Date().toISOString().split("T")[0]).length}
          </span>
        </button>
        <button 
          className={`w-full sidebar-link ${currentView === "Important" ? "sidebar-link-active" : "sidebar-link-inactive"}`}
          onClick={() => { setCurrentView("Important"); setIsSidebarOpen(false); }}
        >
          <Star className="w-4 h-4" /> 
          <span>Important</span>
          <span className="ml-auto opacity-50 text-[10px] font-bold">
            {todos.filter(t => !t.completed && t.important).length}
          </span>
        </button>
        
        <div className="pt-6 pb-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-3">
          Status
        </div>
        <div className="px-3 py-2 text-[11px] flex flex-col gap-2 font-medium">
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600">Sync Active</span>
            </div>
            {isSyncing && (
                <div className="flex items-center gap-2">
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    <span className="text-blue-600">Cloud Push</span>
                </div>
            )}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white overflow-hidden">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || user?.email}`} 
              alt="Avatar" 
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-slate-900">{user?.displayName || user?.email}</p>
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}></span> 
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex w-full h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 bottom-0 left-0 w-72 bg-white flex flex-col shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 flex-shrink-0">
          <div className="flex items-center gap-3 lg:gap-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative w-full max-w-96">
              <input 
                type="text" 
                placeholder="Find tasks..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-6 ml-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              {isSyncing ? (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded">
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden md:inline">Syncing</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-500">
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden md:inline font-bold">Synced</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="flex-1 p-4 lg:p-8 flex flex-col gap-6 overflow-y-auto scroll-hide">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight">{currentView}</h2>
              <p className="text-xs lg:text-sm text-slate-500 font-medium">
                {currentView === "Inbox" ? "Manage your daily tasks and flow" : 
                 currentView === "Today" ? "Tasks due for completion today" : 
                 "Your most important flagged tasks"}
              </p>
            </div>
          </div>

          <div className="bg-white p-3 lg:p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-blue-300">
            <form onSubmit={handleAdd} className="flex items-center gap-3">
              <div className="hidden sm:flex w-5 h-5 bg-blue-100 rounded-full items-center justify-center">
                <Plus className="w-3 h-3 text-blue-600" />
              </div>
              <input
                type="text"
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:text-slate-400"
                placeholder="What's next? Press enter"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
              <button 
                type="submit" 
                className={`bg-blue-600 text-white px-4 lg:px-5 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all ${!newText.trim() ? "opacity-30 pointer-events-none" : "active:scale-95"}`}
              >
                Add Task
              </button>
            </form>
          </div>

          {!isOnline && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 lg:p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex-shrink-0 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-xs lg:text-sm font-bold text-amber-900">Offline Mode</h4>
                  <p className="text-[10px] lg:text-xs text-amber-700 font-medium">Tasks will sync when connection is restored.</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 pb-8">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredTodos.map((todo) => (
                <motion.div
                  layout
                  key={todo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0.5, scale: 0.98 }}
                  className={`group bg-white p-3 lg:p-4 rounded-xl border shadow-sm flex items-center gap-3 lg:gap-4 transition-all hover:border-blue-300 ${todo.completed ? "border-slate-100 opacity-60 bg-slate-50/50" : "border-slate-200"}`}
                >
                  <button 
                    onClick={() => toggleTodo(todo.id)}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${todo.completed ? "bg-blue-500 border-blue-500" : "border-slate-300 hover:border-blue-400"}`}
                  >
                    {todo.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                    {todo.id.startsWith("temp-") && <div className="w-2 h-2 bg-blue-500 rounded-full sync-pulse" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-bold truncate transition-all ${todo.completed ? "text-slate-400 line-through" : "text-slate-900"}`}>
                        {todo.text}
                        </h3>
                        {todo.important && <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0 animate-in zoom-in" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>{new Date(todo.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {todo.dueDate && (
                          <span className={`flex items-center gap-1.5 ${todo.dueDate === new Date().toISOString().split("T")[0] ? "text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded" : "bg-slate-100 px-1.5 py-0.5 rounded"}`}>
                              <Calendar className="w-2.5 h-2.5" />
                              {todo.dueDate}
                          </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 lg:gap-3">
                    <button 
                        onClick={() => toggleStar(todo.id)}
                        className={`p-2 rounded-lg transition-all ${todo.important ? "text-amber-500 bg-amber-50 border border-amber-100" : "text-slate-300 hover:text-amber-500 hover:bg-amber-50"}`}
                        title="Star task"
                    >
                        <Star className={`w-4 h-4 ${todo.important ? "fill-current" : ""}`} />
                    </button>

                    <div className="relative group/due">
                        <input 
                            type="date"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            value={todo.dueDate || ""}
                            onChange={(e) => updateDueDate(todo.id, e.target.value || undefined)}
                        />
                        <button className={`p-2 rounded-lg transition-all ${todo.dueDate ? "text-blue-500 bg-blue-50 border border-blue-100" : "text-slate-300 hover:text-blue-500 hover:bg-blue-50"}`} title="Set due date">
                            <Calendar className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <button 
                      onClick={() => deleteTodo(todo.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredTodos.length === 0 && (
              <div className="text-center py-16 lg:py-24 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
                   <Inbox className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-bold tracking-tight">Focus complete</h3>
                <p className="text-slate-500 text-xs lg:text-sm mt-1.5 px-6 font-medium">
                    {currentView === "Important" ? "Focus on your goals by starring key tasks." : 
                     currentView === "Today" ? "Your schedule is clear for today." : 
                     "Every task finished brings you closer to your goals."}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
