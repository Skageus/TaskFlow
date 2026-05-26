
export interface Todo {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  important: boolean;
  dueDate?: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  requiresVerification: boolean;
  isLoading: boolean;
}
