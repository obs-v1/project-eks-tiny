// RoboShop end-to-end traffic injector (k6).
//
// Each virtual user walks the full shopper journey so the observability stack lights up with
// DISTRIBUTED traces, RED metrics and correlated logs across every service:
//
//   browse      GET  /api/catalogue/products,/categories,/products/:id ; /api/ratings/product/:id
//   register    POST /api/user/register           -> returns the Mongo user id
//   login       POST /api/user/login
//   cart        POST /api/cart/:id/add            -> cart calls CATALOGUE  (cart -> catalogue span)
//   checkout    POST /api/payment/process         -> payment validates USER + reads CART, then
//                                                    publishes to RABBITMQ -> ORDERS consumes ->
//                                                    ORDERS calls SHIPPING + NOTIFICATION
//   history     GET  /api/orders/user/:id
//
// The checkout request is the "money trace": payment -> user, payment -> cart, and (across the
// RabbitMQ hop) orders -> shipping, orders -> notification, all under one trace id.
//
// Tunables (env): BASE_URL (default in-cluster frontend), VUS (default 5), DURATION (default 24h).
import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE = __ENV.BASE_URL || 'http://frontend.roboshop.svc.cluster.local';
const VUS = parseInt(__ENV.VUS || '5', 10);
const DURATION = __ENV.DURATION || '24h';
const H = { headers: { 'Content-Type': 'application/json' } };

export const options = {
  scenarios: {
    shoppers: { executor: 'constant-vus', vus: VUS, duration: DURATION },
  },
  thresholds: {
    // keep the run green unless something is badly broken
    checks: ['rate>0.5'],
  },
};

function rnd(n) { return Math.floor(Math.random() * n) + 1; }

export default function () {
  const pid = rnd(12);

  group('browse', () => {
    http.get(`${BASE}/api/catalogue/products`);
    http.get(`${BASE}/api/catalogue/categories`);
    http.get(`${BASE}/api/catalogue/products/${pid}`);
    http.get(`${BASE}/api/ratings/product/${pid}`);
  });
  sleep(Math.random() + 0.5);

  // register + login (unique username each iteration so register always creates a fresh user)
  const uname = `shopper_${__VU}_${__ITER}_${Date.now()}`;
  let userId;
  group('register_login', () => {
    const reg = http.post(`${BASE}/api/user/register`, JSON.stringify({
      username: uname, email: `${uname}@demo.io`, password: 'Pass@123',
      firstName: 'Load', lastName: 'Shopper', phone: '5551234',
    }), H);
    check(reg, { 'register 201': (r) => r.status === 201 });
    try { userId = reg.json('id'); } catch (e) { /* ignore */ }
    http.post(`${BASE}/api/user/login`, JSON.stringify({ username: uname, password: 'Pass@123' }), H);
  });
  if (!userId) { sleep(1); return; }

  group('cart', () => {
    http.post(`${BASE}/api/cart/${userId}/add`, JSON.stringify({ productId: pid, quantity: rnd(3) }), H);
    http.post(`${BASE}/api/cart/${userId}/add`, JSON.stringify({ productId: (pid % 12) + 1, quantity: 1 }), H);
    http.get(`${BASE}/api/cart/${userId}`);
  });
  sleep(Math.random() + 0.5);

  group('checkout', () => {
    http.get(`${BASE}/api/shipping/cities`);
    const pay = http.post(`${BASE}/api/payment/process`,
      JSON.stringify({ userId: userId, cityId: rnd(5) }), H);
    check(pay, { 'payment 200': (r) => r.status === 200 });
    sleep(1); // let orders consume off the queue
    http.get(`${BASE}/api/orders/user/${userId}`);
  });
  sleep(Math.random() * 2 + 1);
}
