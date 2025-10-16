import nodemailer from "nodemailer";
export function createTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}
export async function sendResetCodeEmail(to, code, ttlMin) {
    const from = process.env.EMAIL_FROM || "no-reply@example.com";
    const transport = createTransport();
    const html = `
    <div style="font-family:system-ui,Segoe UI,Arial">
      <h2>Tu código para restablecer la contraseña</h2>
      <p>Introduce este código en la app para verificar tu correo:</p>
      <p style="font-size:24px;font-weight:700;letter-spacing:2px;">${code}</p>
      <p>Caduca en ${ttlMin} minutos.</p>
      <p>Si no fuiste tú, ignora este mensaje.</p>
    </div>`;
    await transport.sendMail({ from, to, subject: "Código de verificación", html, text: `Código: ${code}` });
}
