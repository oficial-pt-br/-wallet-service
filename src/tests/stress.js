import http from 'k6/http';
import { check } from 'k6';

// 100 requisições concorrentes de R$10, contra uma conta que começa com R$100.
// Espera-se que apenas 10 tenham sucesso; as demais devem ser barradas por saldo insuficiente.
export const options = {
  scenarios: {
    concurrent_transfers: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 100,
      maxDuration: '30s'
    }
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    sourceUserId: 'user_origem',
    targetUserId: 'user_destino',
    amount: 10.0
  });

  const params = {
    headers: { 'Content-Type': 'application/json' }
  };

  const res = http.post(`${BASE_URL}/wallets/transfer`, payload, params);

  check(res, {
    'status é 201 ou 400 (nunca erro de servidor)': (r) => r.status === 201 || r.status === 400
  });
}
