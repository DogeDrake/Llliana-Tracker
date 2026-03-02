import axios from "axios";

const CONFIG = {
  //Alvaro
  jugador1: import.meta.env.VITE_SHEET_URL_Alvaro,
  //Hector
  jugador2: import.meta.env.VITE_SHEET_URL_Hector,
};
export async function leerSheet(jugador) {
  console.log(
    `%c[API] Iniciando descarga para: ${jugador}`,
    "color: #3182ce; font-weight: bold;"
  );

  if (!CONFIG[jugador]) {
    console.error(
      `%c[Error] No hay URL configurada para ${jugador}`,
      "color: red;"
    );
    return [];
  }

  try {
    const res = await axios.get(CONFIG[jugador]);

    // Log para ver la respuesta cruda (aquí verás si viene el <!doctype si falla)
    console.log(`[API] Respuesta cruda de ${jugador}:`, res.data);

    let data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;

    if (Array.isArray(data)) {
      console.log(
        `%c[API] ✅ ${data.length} filas descargadas para ${jugador}`,
        "color: #48bb78; font-weight: bold;"
      );

      // Esto sacará una tabla preciosa en la consola
      if (data.length > 0) {
        console.table(data.slice(0, 5)); // Muestra solo las primeras 5 para no saturar
      }
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(
      `%c[API] ❌ Error descargando ${jugador}:`,
      "color: red; font-weight: bold;",
      err.message
    );
    return [];
  }
}

export async function escribirPartida(jugador, datos) {
  console.log(
    `%c[API] Enviando datos a ${jugador}...`,
    "color: #805ad5; font-weight: bold;",
    datos
  );

  try {
    await fetch(CONFIG[jugador], {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(datos),
    });

    console.log(
      `%c[API] ✅ Envío completado (no-cors) para ${jugador}`,
      "color: #48bb78;"
    );
    return { success: true };
  } catch (err) {
    console.error(`[API] ❌ Error al escribir:`, err);
    return { success: false };
  }
}
