require('dotenv').config();
const express = require('express');
const walletRoutes = require('./routes/wallet.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/wallets', walletRoutes);

// Handler de erro genérico
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`💰 Wallet service rodando na porta ${PORT}`);
});

module.exports = app;
