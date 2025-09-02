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
        `select id, title, description, subject, grade as grade_level, 0 as price
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
    const sql = `select id, title, description, subject, grade as grade_level, 0 as price from resources ${where} order by created_at desc limit 50`;
    const rs = await pool.query(sql, params);
    res.json(rs.rows);
  } catch (e) {
    res.status(500).json({ detail: 'Search failed', error: e.message });
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
  console.log(`Backend listening on :${port}`);
});


