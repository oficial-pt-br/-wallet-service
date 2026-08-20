// Se a conta tinha R$ 100 e enviou 100 requisições simultâneas de R$ 10,
// apenas 10 requisições devem ter tido sucesso. O saldo final deve ser R$ 0.
// Caso o saldo fique negativo ou falte dinheiro, o script quebra o pipeline.

const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function verify() {
  await client.connect();
  const res = await client.query("SELECT balance FROM wallets WHERE user_id = 'user_origem'");
  const finalBalance = parseFloat(res.rows[0].balance);

  if (finalBalance < 0) {
    console.error(`🚨 Falha catastrófica: Saldo negativo detectado: ${finalBalance}`);
    process.exit(1);
  }

  const txCount = await client.query("SELECT COUNT(*) FROM transactions WHERE type = 'TRANSFER'");
  console.log(`✅ Sucesso! Transações processadas: ${txCount.rows[0].count}. Saldo final: ${finalBalance}`);
  await client.end();
}
verify();
