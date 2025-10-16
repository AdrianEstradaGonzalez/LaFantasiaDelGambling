import nodemailer from "nodemailer";
function transporter() {
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
}
export async function sendResetCodeEmail(to, code, ttlMin) {
    const from = process.env.EMAIL_FROM || "no-reply@example.com";
    const html = `<h2>Código</h2><p>Tu código: <b style="font-size:20px">${code}</b> (caduca en ${ttlMin} min)</p>`;
    await transporter().sendMail({ from, to, subject: "Código de verificación", html, text: `Código: ${code}` });
}
