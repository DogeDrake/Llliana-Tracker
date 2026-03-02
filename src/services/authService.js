import { supabase } from "../supabaseClient";

export const authService = {
  // REGISTRO DE NUEVOS DUELISTAS
  async signUp(email, password, username, displayName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Esta "data" es la que el Trigger de Supabase lee para crear el perfil
        data: {
          username: username,
          display_name: displayName,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  // LOGIN
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // LOGOUT (Limpieza de sesión)
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
