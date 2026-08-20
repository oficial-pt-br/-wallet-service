# Wallet Service

Microserviço de carteira digital (wallet) com garantias ACID, modelo de ledger e
proteção contra race conditions / double spending via lock pessimista
(`SELECT ... FOR UPDATE`).

## Stack

- Node.js 20 + Express
- PostgreSQL 15 + Prisma ORM
- k6 para testes de estresse/concorrência
- GitHub Actions para CI

## Rodando localmente com Docker

```bash
docker compose up --build
```

A API sobe em `http://localhost:3000`. As migrations rodam automaticamente
no start do container (`prisma migrate deploy`).

## Rodando localmente sem Docker

```bash
cp .env.example .env
# ajuste o DATABASE_URL se necessário

npm install
npm run db:generate
npm run db:migrate:dev
npm run db:seed -- --balance=100.00
npm run dev
```

## Endpoints

| Método | Rota                        | Body                                              |
|--------|------------------------------|----------------------------------------------------|
| GET    | `/wallets/:userId`           | –                                                    |
| POST   | `/wallets/:userId/deposit`   | `{ "amount": 50.00 }`                               |
| POST   | `/wallets/:userId/withdraw`  | `{ "amount": 20.00 }`                               |
| POST   | `/wallets/transfer`          | `{ "sourceUserId", "targetUserId", "amount" }`      |

## Testes de concorrência

```bash
npm run db:seed -- --balance=100.00
npm start &
BASE_URL=http://localhost:3000 npm run test:stress
npm run test:verify
```

O script `verify-balances.js` falha o processo (exit code 1) se o saldo
final ficar negativo ou não bater com o valor esperado, garantindo que o
pipeline de CI quebre em caso de regressão na proteção contra double spending.

## Estrutura

```
wallet-service/
├── docker-compose.yml
├── Dockerfile
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── index.js
│   ├── routes/wallet.routes.js
│   ├── services/wallet.service.js
│   └── tests/
│       ├── stress.js
│       └── verify-balances.js
└── .github/workflows/stress-test.yml
```
