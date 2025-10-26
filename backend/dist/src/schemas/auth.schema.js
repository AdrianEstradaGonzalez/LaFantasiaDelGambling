import { z } from "zod";
export const registerDTO = z.object({
    email: z.string({ required_error: "El correo es obligatorio" })
        .email({ message: "Correo electrónico inválido" }),
    password: z.string({ required_error: "La contraseña es obligatoria" })
        .min(8, { message: "La contraseña debe tener al menos 8 caracteres" }),
    name: z.string().optional(),
});
export const loginDTO = z.object({
    email: z.string({ required_error: "El correo es obligatorio" })
        .email({ message: "Correo electrónico inválido" }),
    password: z.string({ required_error: "La contraseña es obligatoria" }),
});
export const changePwdDTO = z.object({
    currentPassword: z.string({ required_error: "La contraseña actual es obligatoria" })
        .min(1, { message: "La contraseña actual es obligatoria" }),
    newPassword: z.string({ required_error: "La nueva contraseña es obligatoria" })
        .min(8, { message: "La nueva contraseña debe tener al menos 8 caracteres" }),
});
export const requestCodeDTO = z.object({ email: z.string().email() });
export const verifyCodeDTO = z.object({ email: z.string().email(), code: z.string().min(4).max(10) });
export const setNewPwdDTO = z.object({ resetToken: z.string().min(10), newPassword: z.string().min(8) });
