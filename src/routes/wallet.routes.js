const express = require('express');
const router = express.Router();
const walletService = require('../services/wallet.service');

// GET /wallets/:userId -> consulta saldo
router.get('/:userId', async (req, res) => {
  try {
    const wallet = await walletService.getBalance(req.params.userId);
    res.json(wallet);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /wallets/:userId/deposit  { amount }
router.post('/:userId/deposit', async (req, res) => {
  try {
    const { amount } = req.body;
    const wallet = await walletService.deposit(req.params.userId, amount);
    res.status(201).json(wallet);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /wallets/:userId/withdraw  { amount }
router.post('/:userId/withdraw', async (req, res) => {
  try {
    const { amount } = req.body;
    const wallet = await walletService.withdraw(req.params.userId, amount);
    res.status(200).json(wallet);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /wallets/transfer  { sourceUserId, targetUserId, amount }
router.post('/transfer', async (req, res) => {
  try {
    const { sourceUserId, targetUserId, amount } = req.body;
    const transaction = await walletService.transfer(sourceUserId, targetUserId, amount);
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
