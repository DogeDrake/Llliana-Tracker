import { createApp } from "vue";
import App from "./App.vue";
import router from "./routers"; // Asegúrate de que la ruta sea correcta
import "./assets/main.css";

const app = createApp(App);

app.use(router); // <--- ESTO DEBE IR ANTES DEL MOUNT
app.mount("#app");
