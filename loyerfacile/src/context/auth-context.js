// Le contexte et son hook sont dans un fichier à part du composant
// AuthProvider : c'est ce que demande le "Fast Refresh" de Vite.
import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}
