import { supabase } from "../supabaseClient";

export const deckService = {
  // 1. Crear un mazo nuevo
  async createDeck(deckData) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("decks")
      .insert([
        {
          user_id: user.id,
          nombre_personalizado: deckData.nombre,
          formato: deckData.formato, // 'commander' o 'pauper'
          comandante_nombre: deckData.comandante, // Solo si es commander
          arquetipo_pauper: deckData.arquetipo, // Solo si es pauper
          color_identity: deckData.colores, // Ej: 'WURG'
        },
      ])
      .select();

    if (error) throw error;
    return data;
  },

  // 2. Obtener los mazos del usuario logueado
  async getMyDecks() {
    const { data, error } = await supabase
      .from("decks")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },
};
