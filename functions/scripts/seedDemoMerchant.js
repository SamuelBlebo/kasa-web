#!/usr/bin/env node
/**
 * Seeds a realistic demo merchant — account, products, customers and order
 * history — so the platform can be shown to prospects without a live
 * WhatsApp connection. Safe to re-run: it wipes and rebuilds the demo
 * organization each time rather than accumulating duplicate data.
 *
 * This creates Firestore data ONLY. It does not touch Meta or WhatsApp —
 * see README.md "Demo merchant data" for how to connect a real WhatsApp
 * number to this org afterward, which is a manual, one-time step done from
 * the app's own Settings page like any other merchant.
 *
 * Usage:
 *   cd functions
 *   npm install
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json node scripts/seedDemoMerchant.js
 *
 * Against the emulator suite instead of a real project:
 *   firebase emulators:start --only auth,firestore --project demo-orderflow
 *   # in another terminal:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
 *     GCLOUD_PROJECT=demo-orderflow node scripts/seedDemoMerchant.js
 */
const admin = require('firebase-admin');

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@orderflow.app';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'OrderFlowDemo!2026';
const DEMO_FULL_NAME = 'Ama Owusu';
const DEMO_BUSINESS_NAME = "Ama's Kitchen";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });
}
const db = admin.firestore();
const auth = admin.auth();
const { Timestamp, FieldValue } = admin.firestore;

const PRODUCTS = [
  { name: 'Jollof Rice & Chicken', description: 'Smoky jollof rice with grilled chicken.', price: 45, stock: 40, category: 'Rice dishes' },
  { name: 'Jollof Rice & Beef', description: 'Smoky jollof rice with beef stew.', price: 48, stock: 32, category: 'Rice dishes' },
  { name: 'Fried Rice & Chicken', description: 'Vegetable fried rice with grilled chicken.', price: 45, stock: 25, category: 'Rice dishes' },
  { name: 'Waakye Special', description: 'Waakye with gari, egg, fish and beef.', price: 40, stock: 18, category: 'Rice dishes' },
  { name: 'Banku & Tilapia', description: 'Grilled tilapia with banku and pepper sauce.', price: 60, stock: 15, category: 'Grills & swallow' },
  { name: 'Fufu & Light Soup', description: 'Pounded fufu with goat meat light soup.', price: 50, stock: 20, category: 'Grills & swallow' },
  { name: 'Kenkey & Fried Fish', description: 'Ga kenkey with fried fish and shito.', price: 35, stock: 5, category: 'Grills & swallow' },
  { name: 'Grilled Tilapia', description: 'Whole grilled tilapia with a side of banku.', price: 65, stock: 0, category: 'Grills & swallow' },
  { name: 'Chicken Kebab (5pc)', description: 'Skewered grilled chicken with pepper sauce.', price: 30, stock: 28, category: 'Sides & snacks' },
  { name: 'Meat Pie', description: 'Baked pastry filled with seasoned minced meat.', price: 12, stock: 50, category: 'Sides & snacks' },
  { name: 'Sobolo (500ml)', description: 'Chilled hibiscus drink.', price: 15, stock: 60, category: 'Drinks' },
  { name: 'Bottled Water', description: '750ml bottled water.', price: 5, stock: 100, category: 'Drinks' },
];

const CUSTOMERS = [
  { id: '233241234501', name: 'Kwame Mensah', address: 'East Legon, Accra' },
  { id: '233241234502', name: 'Abena Boateng', address: 'Osu, Accra' },
  { id: '233241234503', name: 'Kofi Owusu', address: 'Adenta, Accra' },
  { id: '233241234504', name: 'Efua Asante', address: 'Tema Community 4' },
  { id: '233241234505', name: 'Yaw Darko', address: 'Spintex, Accra' },
  { id: '233241234506', name: 'Akosua Frimpong', address: 'Madina, Accra' },
  { id: '233241234507', name: 'Kwabena Addo', address: 'Dansoman, Accra' },
  { id: '233241234508', name: 'Adjoa Sarpong', address: 'Achimota, Accra' },
];

const ORDER_COUNT = 26;
const RIDERS = [
  { name: 'Kojo Rider', phone: '233209876543' },
  { name: 'Nana Rider', phone: '233209876544' },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function statusForAge(daysOld) {
  if (daysOld === 0) return pick(['pending', 'confirmed', 'preparing']);
  if (daysOld <= 1) return pick(['preparing', 'out_for_delivery', 'delivered']);
  if (daysOld <= 3) return Math.random() < 0.15 ? 'cancelled' : 'delivered';
  return Math.random() < 0.05 ? 'cancelled' : 'delivered';
}

async function getOrCreateDemoUser() {
  try {
    const existing = await auth.getUserByEmail(DEMO_EMAIL);
    await auth.updateUser(existing.uid, { password: DEMO_PASSWORD, displayName: DEMO_FULL_NAME });
    return existing.uid;
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    const created = await auth.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      displayName: DEMO_FULL_NAME,
      emailVerified: true,
    });
    return created.uid;
  }
}

async function wipeExistingDemoOrg(uid) {
  const userSnap = await db.collection('users').doc(uid).get();
  const existingOrgId = userSnap.exists ? userSnap.get('orgId') : null;
  if (existingOrgId) {
    await db.recursiveDelete(db.collection('organizations').doc(existingOrgId));
  }
}

async function seed() {
  const uid = await getOrCreateDemoUser();
  await wipeExistingDemoOrg(uid);

  const orgRef = db.collection('organizations').doc();
  const now = FieldValue.serverTimestamp();

  await orgRef.set({
    name: DEMO_BUSINESS_NAME,
    slug: 'amas-kitchen',
    phone: '233241234500',
    category: 'food',
    currency: 'GHS',
    deliveryFee: 10,
    ownerUid: uid,
    memberUids: [uid],
    subscription: {
      plan: 'growth',
      status: 'active',
      renewsAt: null,
      currentPeriodStart: new Date().toISOString().slice(0, 7),
      ordersUsedThisPeriod: 0, // corrected below once order dates are known
      paymentProvider: null,
      externalCustomerId: null,
      externalSubscriptionId: null,
    },
    whatsapp: {
      connected: false,
      displayPhoneNumber: null,
      phoneNumberId: null,
      wabaId: null,
      verifiedName: null,
      greeting: `Hi! Welcome to ${DEMO_BUSINESS_NAME}. Reply MENU to see what we have.`,
      connectedAt: null,
    },
    suspended: false,
    suspendedReason: null,
    suspendedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await db.collection('users').doc(uid).set({
    uid,
    email: DEMO_EMAIL,
    fullName: DEMO_FULL_NAME,
    photoURL: null,
    orgId: orgRef.id,
    role: 'owner',
    createdAt: now,
    updatedAt: now,
  });

  const productBatch = db.batch();
  const productRefs = PRODUCTS.map((p) => {
    const ref = orgRef.collection('products').doc();
    productBatch.set(ref, {
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      category: p.category,
      imageUrl: null,
      imagePath: null,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    return { id: ref.id, ...p };
  });
  await productBatch.commit();

  // Orders are generated first so each customer's aggregates (orderCount,
  // totalSpent, lastOrderAt) can be computed from what was actually seeded,
  // the same way the real bot keeps them in step order by order.
  // The last few orders get a fixed recent day + a guaranteed non-terminal
  // status, so the dashboard's "Pending Orders" card and delivery tracking
  // always have something to show — left to pure randomness, an unlucky run
  // could seed 26 orders that are all already delivered.
  const FORCED_RECENT = [
    { daysOld: 0, status: 'pending' },
    { daysOld: 0, status: 'confirmed' },
    { daysOld: 1, status: 'preparing' },
    { daysOld: 2, status: 'out_for_delivery' },
  ];

  const orders = [];
  for (let i = 0; i < ORDER_COUNT; i++) {
    const forced = i >= ORDER_COUNT - FORCED_RECENT.length ? FORCED_RECENT[i - (ORDER_COUNT - FORCED_RECENT.length)] : null;
    const daysOld = forced ? forced.daysOld : Math.floor(Math.random() * 45);
    const createdAtDate = daysAgo(daysOld);
    createdAtDate.setHours(9 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60));
    const customer = pick(CUSTOMERS);
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const chosenProducts = new Set();
    while (chosenProducts.size < itemCount) chosenProducts.add(pick(productRefs));
    const items = [...chosenProducts].map((p) => ({
      productId: p.id,
      name: p.name,
      price: p.price,
      quantity: 1 + Math.floor(Math.random() * 3),
    }));
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = 10;
    const status = forced ? forced.status : statusForAge(daysOld);
    const isFulfilled = status === 'delivered' || status === 'out_for_delivery';
    const rider = isFulfilled ? pick(RIDERS) : null;
    const updatedAtDate = new Date(createdAtDate.getTime() + (30 + Math.random() * 90) * 60 * 1000);

    orders.push({
      number: i + 1,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.id,
      deliveryAddress: customer.address,
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      currency: 'GHS',
      status,
      channel: 'whatsapp',
      note: null,
      riderName: rider ? rider.name : null,
      riderPhone: rider ? rider.phone : null,
      estimatedDeliveryAt: isFulfilled
        ? Timestamp.fromDate(new Date(createdAtDate.getTime() + 45 * 60 * 1000))
        : null,
      createdAtDate,
      updatedAtDate,
    });
  }
  orders.sort((a, b) => a.createdAtDate - b.createdAtDate);
  orders.forEach((o, i) => (o.number = i + 1));

  const orderBatch = db.batch();
  for (const o of orders) {
    const ref = orgRef.collection('orders').doc();
    const { createdAtDate, updatedAtDate, ...rest } = o;
    orderBatch.set(ref, {
      ...rest,
      createdAt: Timestamp.fromDate(createdAtDate),
      updatedAt: Timestamp.fromDate(updatedAtDate),
    });
  }
  await orderBatch.commit();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const ordersThisMonth = orders.filter((o) => o.createdAtDate.toISOString().slice(0, 7) === currentMonth).length;
  await orgRef.update({ 'subscription.ordersUsedThisPeriod': ordersThisMonth });

  const customerBatch = db.batch();
  for (const c of CUSTOMERS) {
    const theirOrders = orders.filter((o) => o.customerId === c.id);
    const totalSpent = theirOrders.reduce((sum, o) => sum + o.total, 0);
    const lastOrder = theirOrders.reduce(
      (latest, o) => (!latest || o.createdAtDate > latest.createdAtDate ? o : latest),
      null,
    );
    customerBatch.set(orgRef.collection('customers').doc(c.id), {
      name: c.name,
      phone: c.id,
      address: c.address,
      orderCount: theirOrders.length,
      totalSpent,
      lastOrderAt: lastOrder ? Timestamp.fromDate(lastOrder.createdAtDate) : null,
      note: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  await customerBatch.commit();

  console.log('Demo merchant seeded.');
  console.log(`  Organization: ${DEMO_BUSINESS_NAME} (${orgRef.id})`);
  console.log(`  Login:        ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Products:     ${PRODUCTS.length}`);
  console.log(`  Customers:    ${CUSTOMERS.length}`);
  console.log(`  Orders:       ${orders.length} (spanning the last 45 days)`);
  console.log('  WhatsApp:     not connected — see README.md "Demo merchant data" to connect a real number.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
