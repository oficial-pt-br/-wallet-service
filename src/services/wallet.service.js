const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Transfere um valor de uma wallet para outra de forma atômica.
 * Usa SELECT ... FOR UPDATE ordenado por user_id para evitar deadlocks
 * e impedir double spending sob concorrência.
 */
async function transfer(sourceUserId, targetUserId, amount) {
  if (amount <= 0) {
    throw new Error('O valor da transferência deve ser positivo.');
  }
  if (sourceUserId === targetUserId) {
    throw new Error('Origem e destino não podem ser a mesma conta.');
  }

  return prisma.$transaction(async (tx) => {
    // Ordena os IDs para sempre bloquear as linhas na mesma ordem,
    // evitando deadlocks entre transações concorrentes.
    const ids = [sourceUserId, targetUserId].sort();

    // Bloqueia as linhas para leitura/escrita.
    // IMPORTANTE: user_id precisa estar no SELECT, senão a comparação abaixo falha.
    const rows = await tx.$queryRaw`
      SELECT id, user_id, balance FROM wallets
      WHERE user_id IN (${ids[0]}, ${ids[1]})
      ORDER BY user_id
      FOR UPDATE
    `;

    if (rows.length !== 2) {
      throw new Error('Uma ou ambas as carteiras não foram encontradas.');
    }

    const sourceWallet = rows.find((r) => r.user_id === sourceUserId);
    const targetWallet = rows.find((r) => r.user_id === targetUserId);

    if (!sourceWallet || !targetWallet) {
      throw new Error('Falha ao resolver as carteiras de origem/destino.');
    }

    if (Number(sourceWallet.balance) < Number(amount)) {
      throw new Error('Saldo insuficiente para a transação.');
    }

    await tx.wallet.update({
      where: { userId: sourceUserId },
      data: { balance: { decrement: amount } }
    });

    await tx.wallet.update({
      where: { userId: targetUserId },
      data: { balance: { increment: amount } }
    });

    const transaction = await tx.transaction.create({
      data: {
        sourceWalletId: sourceWallet.id,
        targetWalletId: targetWallet.id,
        type: 'TRANSFER',
        amount
      }
    });

    return transaction;
  });
}

/** Deposita um valor na wallet do usuário (cria a wallet se não existir). */
async function deposit(userId, amount) {
  if (amount <= 0) {
    throw new Error('O valor do depósito deve ser positivo.');
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 0 }
    });

    const updated = await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } }
    });

    await tx.transaction.create({
      data: {
        targetWalletId: wallet.id,
        type: 'DEPOSIT',
        amount
      }
    });

    return updated;
  });
}

/** Saca um valor da wallet do usuário, validando saldo sob lock. */
async function withdraw(userId, amount) {
  if (amount <= 0) {
    throw new Error('O valor do saque deve ser positivo.');
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id, balance FROM wallets WHERE user_id = ${userId} FOR UPDATE
    `;

    if (rows.length === 0) {
      throw new Error('Carteira não encontrada.');
    }

    const wallet = rows[0];

    if (Number(wallet.balance) < Number(amount)) {
      throw new Error('Saldo insuficiente para o saque.');
    }

    const updated = await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount } }
    });

    await tx.transaction.create({
      data: {
        sourceWalletId: wallet.id,
        type: 'WITHDRAWAL',
        amount
      }
    });

    return updated;
  });
}

async function getBalance(userId) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw new Error('Carteira não encontrada.');
  }
  return wallet;
}

module.exports = { transfer, deposit, withdraw, getBalance };
