// Se a conta 'user_origem' tinha R$ 100 e recebeu 100 requisições simultâneas
// de transferência de R$ 10, apenas 10 devem ter tido sucesso (saldo insuficiente
// barra as demais). O saldo final esperado é R$ 0,00 (nunca negativo).
// Caso o saldo fique negativo, ou o número de transações não bata com o esperado,
// o script encerra com código de erro e quebra o pipeline.

const { Client } = require('pg');

const INITIAL_BALANCE = 100.0;
const TRANSFER_AMOUNT = 10.0;
const EXPECTED_SUCCESSFUL_TRANSFERS = Math.floor(INITIAL_BALANCE / TRANSFER_AMOUNT);
const EXPECTED_FINAL_BALANCE = INITIAL_BALANCE - EXPECTED_SUCCESSFUL_TRANSFERS * TRANSFER_AMOUNT;

async function verify() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const res = await client.query(
      "SELECT balance FROM wallets WHERE user_id = 'user_origem'"
    );

    if (res.rows.length === 0) {
      console.error('🚨 Carteira user_origem não encontrada.');
      process.exit(1);
    }

    const finalBalance = parseFloat(res.rows[0].balance);

    if (finalBalance < 0) {
      console.error(`🚨 Falha catastrófica: saldo negativo detectado: ${finalBalance}`);
      process.exit(1);
    }

    const txRes = await client.query(
      "SELECT COUNT(*) FROM transactions WHERE type = 'TRANSFER'"
    );
    const txCount = parseInt(txRes.rows[0].count, 10);

    let hasError = false;

    if (txCount !== EXPECTED_SUCCESSFUL_TRANSFERS) {
      console.error(
        `🚨 Número de transações inesperado. Esperado: ${EXPECTED_SUCCESSFUL_TRANSFERS}, obtido: ${txCount}`
      );
      hasError = true;
    }

    if (Math.abs(finalBalance - EXPECTED_FINAL_BALANCE) > 0.0001) {
      console.error(
        `🚨 Saldo final inesperado. Esperado: ${EXPECTED_FINAL_BALANCE}, obtido: ${finalBalance}`
      );
      hasError = true;
    }

    if (hasError) {
      process.exit(1);
    }

    console.log(
      `✅ Sucesso! Transações processadas: ${txCount}. Saldo final: ${finalBalance}`
    );
  } finally {
    await client.end();
  }
}

verify().catch((err) => {
  console.error('🚨 Erro ao verificar integridade:', err);
  process.exit(1);
});
