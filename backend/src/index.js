import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import multer from 'multer';

const { Pool } = pkg;

const app = express();
const port = process.env.PORT || 3000;

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.options('*', cors());

// JSON body
app.use(express.json({ limit: '2mb' }));

// DB
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function ensureAuthTable() {
  await pool.query(`
    create table if not exists auth_credentials (
      user_id uuid primary key references users(id) on delete cascade,
      password_hash text not null,
      created_at timestamptz default now()
    );
  `);
}

async function ensurePurchasesTable() {
  await pool.query(`
    create table if not exists resource_purchases (
      id uuid primary key default gen_random_uuid(),
      buyer_id uuid not null references users(id) on delete cascade,
      resource_id uuid not null references resources(id) on delete cascade,
      creator_id uuid not null references users(id) on delete cascade,
      amount numeric(10,2) not null,
      currency varchar(10) not null default 'KES',
      platform_share numeric(10,2) not null,
      creator_share numeric(10,2) not null,
      status varchar(20) not null default 'completed',
      transaction_id text,
      created_at timestamptz not null default now(),
      unique(buyer_id, resource_id)
    );
  `);
}

// Health
app.get('/health', async (req, res) => {
  try {
    await pool.query('select 1');
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ status: 'db_error', detail: e.message });
  }
});

// Users
app.post('/users/register', async (req, res) => {
  try {
    const { email, full_name, password, role = 'student', country = 'Kenya', language = 'en' } = req.body || {};
    if (!email || !full_name || !password) {
      return res.status(422).json({ detail: 'email, full_name, password are required' });
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const userResult = await client.query(
        `insert into users (email, full_name, role, country, language)
         values ($1,$2,$3,$4,$5)
         returning id, email, full_name, role, country, language, created_at`,
         [email.toLowerCase(), full_name, role, country, language]
      );
      const user = userResult.rows[0];
      const hash = await bcrypt.hash(password, 10);
      await client.query(
        `insert into auth_credentials (user_id, password_hash) values ($1, $2)`,
        [user.id, hash]
      );
      await client.query('commit');
      res.status(201).json(user);
    } catch (e) {
      await client.query('rollback');
      if (String(e.message).includes('users_email_key')) {
        return res.status(409).json({ detail: 'Email already registered' });
      }
      res.status(500).json({ detail: 'Registration failed', error: e.message });
    } finally {
      client.release();
    }
  } catch (e) {
    res.status(500).json({ detail: 'Unexpected error', error: e.message });
  }
});

app.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(422).json({ detail: 'email and password are required' });
    }
    const result = await pool.query(
      `select u.id, u.email, u.full_name, u.role, u.country, u.language, ac.password_hash
       from users u
       join auth_credentials ac on ac.user_id = u.id
       where u.email = $1`,
      [email.toLowerCase()]
    );
    if (result.rowCount === 0) return res.status(401).json({ detail: 'Invalid credentials' });
    const row = result.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ detail: 'Invalid credentials' });
    const { password_hash, ...user } = row;
    res.json(user);
  } catch (e) {
    res.status(500).json({ detail: 'Login failed', error: e.message });
  }
});

app.get('/users/:id/dashboard', async (req, res) => {
  try {
    const userId = req.params.id;
    const [resourceCount, languageCount, studentCount, recommended] = await Promise.all([
      pool.query('select count(*)::int as c from resources where teacher_id = $1', [userId]),
      pool.query('select count(distinct language)::int as c from resources'),
      pool.query('select count(*)::int as c from users where role = \u0027student\u0027'),
      pool.query(
        `select id, title, description, subject, grade as grade_level, 1.00::numeric as price
         from resources
         order by created_at desc
         limit 6`
      )
    ]);
    res.json({
      resource_count: resourceCount.rows[0].c,
      language_count: languageCount.rows[0].c,
      student_count: studentCount.rows[0].c,
      recommended_resources: recommended.rows
    });
  } catch (e) {
    res.status(500).json({ detail: 'Dashboard failed', error: e.message });
  }
});

// Payments (demo initializer)
app.post('/payments/initialize', async (req, res) => {
  try {
    const { user_id, plan_name = 'basic', amount = 5.00, currency = 'KES' } = req.body || {};
    if (!user_id) return res.status(422).json({ detail: 'user_id is required' });
    const secret = process.env.FLW_SECRET_KEY;
    const publicKey = process.env.FLW_PUBLIC_KEY;
    if (!secret || !publicKey) {
      return res.status(500).json({ detail: 'Flutterwave keys not configured' });
    }

    const redirectUrl = process.env.APP_BASE_URL
      ? `${process.env.APP_BASE_URL}/payment-complete.html`
      : 'https://example.com';

    const flwResp = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tx_ref: `TL-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        amount: Number(amount),
        currency,
        redirect_url: redirectUrl,
        meta: { user_id, plan_name },
        customer: { email: 'customer@example.com' },
        customizations: { title: 'TransLearn Subscription', description: `${plan_name} plan` }
      })
    });

    const data = await flwResp.json();
    if (!flwResp.ok || !data?.data?.link) {
      return res.status(502).json({ detail: 'Failed to initialize payment', provider: data });
    }

    res.json({
      provider: 'flutterwave',
      checkout_url: data.data.link,
      plan_name,
      amount,
      currency
    });
  } catch (e) {
    res.status(500).json({ detail: 'Initialize payment failed', error: e.message });
  }
});

// Payments (demo completion) — activates plan without external provider
app.post('/payments/demo-complete', async (req, res) => {
  try {
    const { user_id, plan_name = 'basic', amount = 5.00, currency = 'KES', months = 1 } = req.body || {};
    if (!user_id) return res.status(422).json({ detail: 'user_id is required' });

    const client = await pool.connect();
    try {
      await client.query('begin');
      const tx = await client.query(
        `insert into payment_transactions (user_id, transaction_id, amount, currency, payment_method, payment_provider, status, metadata)
         values ($1, gen_random_uuid()::text, $2, $3, 'demo', 'demo', 'completed', '{"source":"demo"}'::jsonb)
         returning id`,
        [user_id, amount, currency]
      );

      const expiresAt = { months };
      const plan = await client.query(
        `insert into subscription_plans (user_id, plan_name, plan_type, amount, currency, status, starts_at, expires_at, payment_transaction_id)
         values ($1, $2, 'monthly', $3, $4, 'active', now(), now() + ($5 || ' month')::interval, $6)
         returning id, plan_name, status, starts_at, expires_at`,
        [user_id, plan_name, amount, currency, String(months), tx.rows[0].id]
      );
      await client.query('commit');
      res.json({ status: 'activated', plan: plan.rows[0] });
    } catch (e) {
      await client.query('rollback');
      res.status(500).json({ detail: 'Demo complete failed', error: e.message });
    } finally {
      client.release();
    }
  } catch (e) {
    res.status(500).json({ detail: 'Unexpected error', error: e.message });
  }
});

// Payments (webhook placeholder for Flutterwave/Stripe)
app.post('/payments/webhook', async (req, res) => {
  try {
    // Verify Flutterwave signature
    const signature = req.headers['verif-hash'];
    const expected = process.env.FLW_WEBHOOK_SECRET || process.env.FLW_SECRET_KEY;
    if (!expected || signature !== expected) {
      return res.status(401).json({ detail: 'Invalid webhook signature' });
    }

    const event = req.body || {};
    const status = event?.data?.status || event?.status;
    const transaction_id = event?.data?.id?.toString() || event?.data?.tx_ref || event?.tx_ref;
    const amount = Number(event?.data?.amount || event?.amount || 0);
    const currency = event?.data?.currency || event?.currency || 'KES';
    const plan_name = event?.data?.meta?.plan_name || 'basic';
    const user_id = event?.data?.meta?.user_id;
    const purchase_type = event?.data?.meta?.purchase_type;
    const resource_id = event?.data?.meta?.resource_id;
    const creator_id = event?.data?.meta?.creator_id;
    const months = 1;

    if (!user_id || !transaction_id) return res.status(422).json({ detail: 'user_id and transaction_id are required' });

    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(
        `insert into payment_transactions (user_id, transaction_id, amount, currency, payment_provider, status, metadata)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb)
         on conflict (transaction_id) do update set status = excluded.status, updated_at = now()`,
        [user_id, transaction_id, amount, currency, 'flutterwave', status, JSON.stringify(event)]
      );

      if (String(status).toLowerCase() === 'successful' || String(status).toLowerCase() === 'completed') {
        const txId = await client.query('select id from payment_transactions where transaction_id = $1', [transaction_id]);
        if (purchase_type === 'resource' && resource_id && creator_id && user_id) {
          const creatorShare = Math.round(amount * 0.65 * 100) / 100;
          const platformShare = Math.round((amount - creatorShare) * 100) / 100;
          await client.query(
            `insert into resource_purchases (buyer_id, resource_id, creator_id, amount, currency, platform_share, creator_share, status, transaction_id)
             values ($1,$2,$3,$4,$5,$6,$7,'completed',$8)
             on conflict (buyer_id, resource_id) do nothing`,
            [user_id, resource_id, creator_id, amount, currency, platformShare, creatorShare, transaction_id]
          );
        } else {
          await client.query(
            `insert into subscription_plans (user_id, plan_name, plan_type, amount, currency, status, starts_at, expires_at, payment_transaction_id)
             values ($1, $2, 'monthly', $3, $4, 'active', now(), now() + ($5 || ' month')::interval, $6)
             on conflict do nothing`,
            [user_id, plan_name, amount, currency, String(months), txId.rows[0].id]
          );
        }
      }
      await client.query('commit');
      res.json({ ok: true });
    } catch (e) {
      await client.query('rollback');
      res.status(500).json({ detail: 'Webhook processing failed', error: e.message });
    } finally {
      client.release();
    }
  } catch (e) {
    res.status(500).json({ detail: 'Unexpected error', error: e.message });
  }
});

// Resources search
app.get('/resources', async (req, res) => {
  try {
    const { query, subject, grade } = req.query;
    const clauses = [];
    const params = [];
    if (query) { params.push(`%${query}%`); clauses.push(`(title ilike $${params.length} or description ilike $${params.length})`); }
    if (subject) { params.push(subject); clauses.push(`subject = $${params.length}`); }
    if (grade) { params.push(grade); clauses.push(`grade = $${params.length}`); }
    const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
    const sql = `select id, teacher_id, title, description, subject, grade as grade_level, 1.00::numeric as price from resources ${where} order by created_at desc limit 50`;
    const rs = await pool.query(sql, params);
    res.json(rs.rows);
  } catch (e) {
    res.status(500).json({ detail: 'Search failed', error: e.message });
  }
});

// Initialize purchase for a resource
app.post('/resources/:id/purchase-initialize', async (req, res) => {
  try {
    const resourceId = req.params.id;
    const { buyer_id, amount = 1.00, currency = 'KES', creator_id } = req.body || {};
    if (!buyer_id) return res.status(422).json({ detail: 'buyer_id is required' });

    let creatorId = creator_id;
    if (!creatorId) {
      const r = await pool.query('select teacher_id from resources where id = $1', [resourceId]);
      if (r.rowCount === 0) return res.status(404).json({ detail: 'Resource not found' });
      creatorId = r.rows[0].teacher_id;
    }

    const secret = process.env.FLW_SECRET_KEY;
    if (!secret) return res.status(500).json({ detail: 'Flutterwave keys not configured' });

    const redirectUrl = process.env.APP_BASE_URL
      ? `${process.env.APP_BASE_URL}/payment-complete.html`
      : 'https://example.com';

    const txRef = `TL-RSRC-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const flwResp = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: Number(amount),
        currency,
        redirect_url: redirectUrl,
        meta: { buyer_id, resource_id: resourceId, creator_id: creatorId, purchase_type: 'resource' },
        customer: { email: 'customer@example.com' },
        customizations: { title: 'TransLearn Resource Purchase', description: `Resource ${resourceId}` }
      })
    });

    const data = await flwResp.json();
    if (!flwResp.ok || !data?.data?.link) {
      return res.status(502).json({ detail: 'Failed to initialize purchase', provider: data });
    }
    res.json({ checkout_url: data.data.link });
  } catch (e) {
    res.status(500).json({ detail: 'Purchase init failed', error: e.message });
  }
});

// Upload stub (no file storage here, just DB insert)
const upload = multer();
app.post('/resources/upload', upload.none(), async (req, res) => {
  try {
    const { teacher_id, title, description = '', subject, grade, country = 'Kenya', language = 'en', tags = '{}' } = req.body || {};
    if (!teacher_id || !title || !subject || !grade) {
      return res.status(422).json({ detail: 'teacher_id, title, subject, grade are required' });
    }
    // Enforce: more than 5 uploads require active subscription
    const countRs = await pool.query('select count(*)::int as c from resources where teacher_id = $1', [teacher_id]);
    const activePlan = await pool.query(
      `select 1 from subscription_plans
       where user_id = $1 and status = 'active' and (expires_at is null or expires_at > now())
       limit 1`,
      [teacher_id]
    );
    if (countRs.rows[0].c >= 5 && activePlan.rowCount === 0) {
      return res.status(402).json({ detail: 'Upload limit reached. Please upgrade your plan.' });
    }
    const rs = await pool.query(
      `insert into resources (teacher_id, title, description, subject, grade, country, language, tags)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       returning id, title, description, subject, grade as grade_level, country, language, tags`,
      [teacher_id, title, description, subject, grade, country, language, tags]
    );
    res.status(201).json(rs.rows[0]);
  } catch (e) {
    res.status(500).json({ detail: 'Upload failed', error: e.message });
  }
});

// Root
app.get('/', (req, res) => {
  res.json({ name: 'TransLearn Backend', status: 'ok' });
});

app.listen(port, async () => {
  await ensureAuthTable();
  await ensurePurchasesTable();
  console.log(`Backend listening on :${port}`);
});


