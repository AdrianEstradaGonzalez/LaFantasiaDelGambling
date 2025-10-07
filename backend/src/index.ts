import { buildApp } from "./app.js";
import { env } from "./config/env.js";

async function main() {
  try {
    const app = await buildApp();
    
    await app.listen({ 
      port: env.PORT, 
      host: "0.0.0.0" 
    });

    app.log.info(`Servidor corriendo en http://localhost:${env.PORT}`);
    app.log.info(`Documentación disponible en http://localhost:${env.PORT}/docs`);
    
  } catch (err) {
    console.error('Error al iniciar el servidor:', err);
    process.exit(1);
  }
}

main();
