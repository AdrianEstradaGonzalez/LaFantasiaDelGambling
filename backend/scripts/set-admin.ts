import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setAdminUser() {
  try {
    const adminEmail = 'adrian.estrada2001@gmail.com';
    
    console.log(`🔍 Buscando usuario con email: ${adminEmail}`);
    
    const user = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!user) {
      console.error(`❌ No se encontró usuario con email: ${adminEmail}`);
      console.log('Por favor verifica que el usuario existe en la base de datos.');
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.name || user.email} (ID: ${user.id})`);

    const updatedUser = await prisma.user.update({
      where: { email: adminEmail },
      data: { isAdmin: true }
    });

    console.log(`✅ Usuario actualizado como administrador`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Nombre: ${updatedUser.name || 'Sin nombre'}`);
    console.log(`   isAdmin: ${updatedUser.isAdmin}`);

  } catch (error) {
    console.error('❌ Error al actualizar usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminUser();
