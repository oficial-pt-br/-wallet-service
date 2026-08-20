async function transfer(sourceUserId, targetUserId, amount) {
  return await prisma.$transaction(async (tx) => {
    // ⚠️ Evita Deadlocks ordenando o bloqueio pelo ID dos registros
    const ids = [sourceUserId, targetUserId].sort();
    
    // Bloqueia as linhas no banco de dados para leitura/escrita
    const [userA, userB] = await tx.$queryRaw`
      SELECT id, balance FROM wallets 
      WHERE user_id IN (${ids[0]}, ${ids[1]}) 
      FOR UPDATE
    `;

    const sourceWallet = userA.user_id === sourceUserId ? userA : userB;
    const targetWallet = userA.user_id === targetUserId ? userA : userB;

    // Validação estrita de saldo antes de qualquer alteração
    if (sourceWallet.balance < amount) {
      throw new Error("Saldo insuficiente para a transação.");
    }

    // Executa as atualizações de saldo
    await tx.wallets.update({
      where: { user_id: sourceUserId },
      data: { balance: { decrement: amount } }
    });

    await tx.wallets.update({
      where: { user_id: targetUserId },
      data: { balance: { increment: amount } }
    });

    // Registra a transação no Ledger
    await tx.transactions.create({
      data: {
        source_wallet_id: sourceWallet.id,
        target_wallet_id: targetWallet.id,
        type: 'TRANSFER',
        amount
      }
    });
  });
}
