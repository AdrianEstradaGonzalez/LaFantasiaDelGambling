import { FastifyPluginAsync } from "fastify";
import adminController from "../controllers/admin.controller.js";

// Admin middleware to check if user is admin
async function adminAuth(req: any, reply: any) {
  // First authenticate the user
  await req.jwtVerify();
  
  // Check if user is admin
  if (!req.user?.isAdmin) {
    return reply.code(403).send({
      code: 'FORBIDDEN',
      message: 'No tienes permisos de administrador',
    });
  }
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Users management
  app.get("/users", { preHandler: adminAuth }, adminController.getAllUsers.bind(adminController));
  app.delete("/users/:userId", { preHandler: adminAuth }, adminController.deleteUser.bind(adminController));

  // Leagues management
  app.get("/leagues", { preHandler: adminAuth }, adminController.getAllLeagues.bind(adminController));
  app.delete("/leagues/:leagueId", { preHandler: adminAuth }, adminController.deleteLeague.bind(adminController));

  // Bet evaluation
  app.post("/leagues/:leagueId/evaluate-bets", { preHandler: adminAuth }, adminController.evaluateBets.bind(adminController));
  app.post("/evaluate-all-bets", { preHandler: adminAuth }, adminController.evaluateAllBets.bind(adminController));

  // Live rankings update (for cron job) - Primera División
  app.get("/update-rankings", async (req, reply) => {
    try {
      console.log('🔄 Endpoint /update-rankings llamado (Primera)');
      
      // Importar y ejecutar el worker
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execPromise = promisify(exec);
      
      const { stdout, stderr } = await execPromise('npm run update-rankings', {
        cwd: process.cwd(),
      });
      
      console.log('✅ Worker ejecutado con éxito');
      if (stdout) console.log('STDOUT:', stdout);
      if (stderr) console.error('STDERR:', stderr);
      
      return reply.send({ 
        success: true, 
        message: 'Rankings actualizados correctamente (Primera)',
        output: stdout 
      });
    } catch (error: any) {
      console.error('❌ Error ejecutando worker:', error);
      return reply.status(500).send({ 
        success: false, 
        error: error.message,
        output: error.stdout,
      });
    }
  });

  // Live rankings update - Segunda División
  app.get("/update-rankings-segunda", async (req, reply) => {
    try {
      console.log('🔄 Endpoint /update-rankings-segunda llamado');
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execPromise = promisify(exec);
      
      const { stdout, stderr } = await execPromise('npx ts-node scripts/update-live-rankings-segunda.ts', {
        cwd: process.cwd(),
      });
      
      console.log('✅ Worker Segunda División ejecutado con éxito');
      if (stdout) console.log('STDOUT:', stdout);
      if (stderr) console.error('STDERR:', stderr);
      
      return reply.send({ 
        success: true, 
        message: 'Rankings actualizados correctamente (Segunda División)',
        output: stdout 
      });
    } catch (error: any) {
      console.error('❌ Error ejecutando worker Segunda:', error);
      return reply.status(500).send({ 
        success: false, 
        error: error.message,
        output: error.stdout,
      });
    }
  });

  // Live rankings update - Premier League
  app.get("/update-rankings-premier", async (req, reply) => {
    try {
      console.log('🔄 Endpoint /update-rankings-premier llamado');
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execPromise = promisify(exec);
      
      const { stdout, stderr } = await execPromise('npx ts-node scripts/update-live-rankings-premier.ts', {
        cwd: process.cwd(),
      });
      
      console.log('✅ Worker Premier League ejecutado con éxito');
      if (stdout) console.log('STDOUT:', stdout);
      if (stderr) console.error('STDERR:', stderr);
      
      return reply.send({ 
        success: true, 
        message: 'Rankings actualizados correctamente (Premier League)',
        output: stdout 
      });
    } catch (error: any) {
      console.error('❌ Error ejecutando worker Premier:', error);
      return reply.status(500).send({ 
        success: false, 
        error: error.message,
        output: error.stdout,
      });
    }
  });

  // Generate daily offers
  app.get("/generate-daily-offers", async (req, reply) => {
    try {
      console.log('🎯 Endpoint /generate-daily-offers llamado');
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execPromise = promisify(exec);
      
      const { stdout, stderr } = await execPromise('npx tsx scripts/generate-daily-offers.ts', {
        cwd: process.cwd(),
      });
      
      console.log('✅ Ofertas diarias generadas con éxito');
      if (stdout) console.log('STDOUT:', stdout);
      if (stderr) console.error('STDERR:', stderr);
      
      return reply.send({ 
        success: true, 
        message: 'Ofertas diarias generadas correctamente',
        output: stdout 
      });
    } catch (error: any) {
      console.error('❌ Error generando ofertas diarias:', error);
      return reply.status(500).send({ 
        success: false, 
        error: error.message,
        output: error.stdout,
      });
    }
  });

};
