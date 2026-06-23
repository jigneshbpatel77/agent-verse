import { create } from 'zustand';

interface SessionState {
  token?: string;
  setToken: (token?: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  token: undefined,
  setToken: (token) => set({ token }),
}));
