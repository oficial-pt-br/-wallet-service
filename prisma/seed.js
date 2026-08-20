const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Uso: npm run db:seed -- --balance=100.00
function getArgValue(flag, fallback) {
  const arg = process.argv.find((a) => a.startsWith(`--${flag}=`));
  if (!arg) return fallback;
  return arg.split('=')[1];
}

async function main() {
  const initialBalance = getArgValue('balance', '100.00');

  const origem = await prisma.wallet.upsert({
    where: { userId: 'user_origem' },
    update: { balance: initialBalance },
    create: { userId: 'user_origem', balance: initialBalance }
  });

  const destino = await prisma.wallet.upsert({
    where: { userId: 'user_destino' },
    update: { balance: '0.00' },
    create: { userId: 'user_destino', balance: '0.00' }
  });

  console.log('✅ Seed concluído:');
  console.log(`   user_origem  -> saldo: ${origem.balance}`);
  console.log(`   user_destino -> saldo: ${destino.balance}`);
}

main()
  .catch((err) => {
    console.error('🚨 Falha no seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
