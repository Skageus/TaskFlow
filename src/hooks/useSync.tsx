
import { useState, useEffect, useCallback, useRef } from "react";
import { Todo } from "../types";
import { useAuth } from "../context/AuthContext";

export function useSync() {
  const { token, isAuthenticated } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const pendingQueue = useRef<(() => Promise<void>)[]>([]);

  // Initialize from LocalStorage for offline first
  useEffect(() => {
    const saved = localStorage.getItem("sync_do_todos");
    if (saved) setTodos(JSON.parse(saved));
  }, []);

  // Save to LocalStorage whenever todos change
  useEffect(() => {
    localStorage.setItem("sync_do_todos", JSON.stringify(todos));
  }, [todos]);

  // Fetch initial state from server
  const fetchTodos = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/todos", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodos(data);
      }
    } catch (e) {
      console.error("Failed to fetch todos", e);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) fetchTodos();
  }, [isAuthenticated, fetchTodos]);

  // WebSocket for Real-time
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    ws.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "AUTH", token }));
      setIsOnline(true);
      // Process pending queue on reconnect
      processQueue();
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "TODO_CREATED") {
        setTodos(prev => [...prev.filter(t => t.id !== data.payload.id), data.payload]);
      } else if (data.type === "TODO_UPDATED") {
        setTodos(prev => prev.map(t => t.id === data.payload.id ? data.payload : t));
      } else if (data.type === "TODO_DELETED") {
        setTodos(prev => prev.filter(t => t.id !== data.payload.id));
      }
    };

    socket.onclose = () => {
      setIsOnline(false);
      // Attempt reconnect after delay
      setTimeout(() => {
        if (isAuthenticated) setIsOnline(navigator.onLine);
      }, 5000);
    };

    return () => socket.close();
  }, [isAuthenticated, token]);

  const processQueue = async () => {
    if (pendingQueue.current.length === 0) return;
    setIsSyncing(true);
    while (pendingQueue.current.length > 0) {
      const task = pendingQueue.current.shift();
      if (task) await task();
    }
    setIsSyncing(false);
  };

  const addTodo = async (text: string) => {
    const tempId = `temp-${window.crypto.randomUUID()}`;
    const newTodo: Todo = {
      id: tempId,
      userId: "", // Filled by server
      text,
      completed: false,
      important: false,
      updatedAt: new Date().toISOString()
    };

    // Optimistic Update
    setTodos(prev => [...prev, newTodo]);

    const task = async () => {
       try {
         const res = await fetch("/api/todos", {
           method: "POST",
           headers: { 
             "Content-Type": "application/json",
             Authorization: `Bearer ${token}` 
           },
           body: JSON.stringify({ text, completed: false })
         });
         if (res.ok) {
           const saved = await res.json();
           setTodos(prev => {
             const exists = prev.some(t => t.id === saved.id);
             if (exists) return prev.filter(t => t.id !== tempId);
             return prev.map(t => t.id === tempId ? saved : t);
           });
         }
       } catch (e) {
         console.error("Failed to sync new todo", e);
       }
    };

    if (isOnline) {
      await task();
    } else {
      pendingQueue.current.push(task);
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const updated = { ...todo, completed: !todo.completed };
    
    // Optimistic Update
    setTodos(prev => prev.map(t => t.id === id ? updated : t));

    const task = async () => {
      try {
        await fetch(`/api/todos/${id}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ completed: updated.completed })
        });
      } catch (e) {
        console.error("Failed to sync toggle", e);
      }
    };

    if (isOnline) {
      await task();
    } else {
      pendingQueue.current.push(task);
    }
  };

  const toggleStar = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const updated = { ...todo, important: !todo.important };
    
    // Optimistic Update
    setTodos(prev => prev.map(t => t.id === id ? updated : t));

    const task = async () => {
      try {
        await fetch(`/api/todos/${id}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ important: updated.important })
        });
      } catch (e) {
        console.error("Failed to sync star toggle", e);
      }
    };

    if (isOnline) {
      await task();
    } else {
      pendingQueue.current.push(task);
    }
  };

  const updateDueDate = async (id: string, dueDate: string | undefined) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const updated = { ...todo, dueDate };
    
    // Optimistic Update
    setTodos(prev => prev.map(t => t.id === id ? updated : t));

    const task = async () => {
      try {
        await fetch(`/api/todos/${id}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ dueDate })
        });
      } catch (e) {
        console.error("Failed to sync due date update", e);
      }
    };

    if (isOnline) {
      await task();
    } else {
      pendingQueue.current.push(task);
    }
  };

  const deleteTodo = async (id: string) => {
    // Optimistic Update
    setTodos(prev => prev.filter(t => t.id !== id));

    const task = async () => {
      try {
        await fetch(`/api/todos/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error("Failed to sync delete", e);
      }
    };

    if (isOnline) {
      await task();
    } else {
      pendingQueue.current.push(task);
    }
  };

  return { todos, addTodo, toggleTodo, toggleStar, updateDueDate, deleteTodo, isOnline, isSyncing };
}
