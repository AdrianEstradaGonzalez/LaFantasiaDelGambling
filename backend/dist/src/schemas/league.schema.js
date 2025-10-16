import { z } from "zod";
export const createLeagueBody = z.object({
    name: z.string()
        .min(3, "El nombre de la liga debe tener al menos 3 caracteres")
        .max(50, "El nombre de la liga no puede exceder 50 caracteres")
        .regex(/^[a-zA-Z0-9\s\-_áéíóúüñÁÉÍÓÚÜÑ]+$/, "El nombre solo puede contener letras, números, espacios y guiones"),
});
export const deleteLeagueParams = z.object({
    leagueId: z.string().cuid(),
});
export const addMemberParams = z.object({
    leagueId: z.string().cuid(),
});
export const addMemberBody = z.object({
    userId: z.string().cuid(),
});
export const removeMemberParams = z.object({
    leagueId: z.string().cuid(),
    userId: z.string().cuid(),
});
