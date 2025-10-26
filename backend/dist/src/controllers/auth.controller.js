import { registerDTO, loginDTO, changePwdDTO, requestCodeDTO, verifyCodeDTO, setNewPwdDTO } from "../schemas/auth.schema.js";
import * as AuthService from "../services/auth.service.js";
export async function register(req, reply) {
    try {
        const input = registerDTO.parse(req.body);
        const data = await AuthService.register(input);
        reply.send(data);
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        reply.code(statusCode).send({
            error: error.message || 'Error al registrarse',
            message: error.message || 'Error al registrarse'
        });
    }
}
export async function login(req, reply) {
    try {
        const input = loginDTO.parse(req.body);
        const data = await AuthService.login(input);
        reply.send(data);
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        reply.code(statusCode).send({
            error: error.message || 'Error al iniciar sesión',
            message: error.message || 'Error al iniciar sesión'
        });
    }
}
export async function refresh(req, reply) {
    const token = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
    const data = await AuthService.refresh(token);
    if (!data)
        return reply.code(401).send({ error: "invalid_token" });
    reply.send(data);
}
export async function me(req) {
    return AuthService.me(req.user.sub);
}
export async function changePassword(req, reply) {
    try {
        const input = changePwdDTO.parse(req.body);
        const sub = req.user.sub;
        await AuthService.changePassword(sub, input);
        const tokens = await AuthService.issueTokens(sub);
        reply.send({ ok: true, ...tokens });
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        reply.code(statusCode).send({
            error: error.message || 'Error al cambiar contraseña',
            message: error.message || 'Error al cambiar contraseña'
        });
    }
}
// Reset por código
export async function requestResetCode(req, reply) {
    const { email } = requestCodeDTO.parse(req.body);
    await AuthService.requestResetCode(email);
    reply.code(202).send({ ok: true });
}
export async function verifyResetCode(req, reply) {
    const { email, code } = verifyCodeDTO.parse(req.body);
    const resetToken = await AuthService.verifyResetCode(email, code);
    if (!resetToken)
        return reply.code(400).send({ error: "invalid_or_expired" });
    reply.send({ ok: true, resetToken });
}
export async function setNewPassword(req, reply) {
    const { resetToken, newPassword } = setNewPwdDTO.parse(req.body);
    const tokens = await AuthService.setNewPassword(resetToken, newPassword);
    if (!tokens)
        return reply.code(400).send({ error: "invalid_or_expired" });
    reply.send({ ok: true, ...tokens });
}
