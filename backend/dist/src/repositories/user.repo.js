import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export function findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
}
export function findById(id) {
    return prisma.user.findUnique({ where: { id } });
}
export function create(data) {
    return prisma.user.create({
        data: {
            email: data.email,
            password: data.password,
            name: data.name
        }
    });
}
export function updatePassword(id, password, p = prisma) {
    return p.user.update({
        where: { id },
        data: { password }
    });
}
