import { z } from "zod";
export const registerDTO = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional(),
});
export const loginDTO = z.object({
    email: z.string().email(),
    password: z.string(),
});
export const changePwdDTO = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
});
export const requestCodeDTO = z.object({ email: z.string().email() });
export const verifyCodeDTO = z.object({ email: z.string().email(), code: z.string().min(4).max(10) });
export const setNewPwdDTO = z.object({ resetToken: z.string().min(10), newPassword: z.string().min(8) });
