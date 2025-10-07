import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export function create(data: { email: string; userId: string|null; codeHash: string; expiresAt: Date }) {
  return prisma.passwordResetCode.create({ data });
}
export function findActiveByEmail(email: string) {
  return prisma.passwordResetCode.findFirst({ where: { email, used: false, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
}
export function findById(id: string) { return prisma.passwordResetCode.findUnique({ where: { id } }); }
export function invalidateActive(email: string) {
  return prisma.passwordResetCode.updateMany({ where: { email, used: false, expiresAt: { gt: new Date() } }, data: { used: true } });
}
export function bumpAttempts(id: string) {
  return prisma.passwordResetCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
}
export function markVerified(id: string) { return prisma.passwordResetCode.update({ where: { id }, data: { verified: true } }); }
export function use(id: string, p = prisma) { return p.passwordResetCode.update({ where: { id }, data: { used: true } }); }
export function invalidateOthers(email: string, keepId: string, p = prisma) {
  return p.passwordResetCode.updateMany({ where: { email, used: false, id: { not: keepId } }, data: { used: true } });
}
