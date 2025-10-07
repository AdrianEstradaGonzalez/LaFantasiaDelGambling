import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function create(data: { email: string; password: string; name?: string }) {
  return prisma.user.create({ 
    data: {
      email: data.email,
      password: data.password,
      name: data.name
    } 
  });
}

export function updatePassword(id: string, password: string, p = prisma) {
  return p.user.update({
    where: { id },
    data: { password }
  });
}