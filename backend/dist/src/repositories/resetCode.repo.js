import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export function create(data) {
    return prisma.passwordResetCode.create({ data });
}
export function findActiveByEmail(email) {
    return prisma.passwordResetCode.findFirst({ where: { email, used: false, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
}
export function findById(id) { return prisma.passwordResetCode.findUnique({ where: { id } }); }
export function invalidateActive(email) {
    return prisma.passwordResetCode.updateMany({ where: { email, used: false, expiresAt: { gt: new Date() } }, data: { used: true } });
}
export function bumpAttempts(id) {
    return prisma.passwordResetCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
}
export function markVerified(id) { return prisma.passwordResetCode.update({ where: { id }, data: { verified: true } }); }
export function use(id, p = prisma) { return p.passwordResetCode.update({ where: { id }, data: { used: true } }); }
export function invalidateOthers(email, keepId, p = prisma) {
    return p.passwordResetCode.updateMany({ where: { email, used: false, id: { not: keepId } }, data: { used: true } });
}
