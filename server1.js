const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const Razorpay = require('razorpay');
const multer = require('multer');
const path = require('path');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});
const port = process.env.PORT || 5001;

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:5001/uploads1"],
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Static files
app.use('/uploads1', express.static(path.join(__dirname, 'uploads1')));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads1/');
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Routes
app.post('/api/freelance', upload.fields([
  { name: 'zipFile', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), async (req, res) => {
  const { title, sellerName, domainName, minPrice, maxPrice, projectDetail } = req.body;  
  const zipFile = req.files['zipFile'] ? req.files['zipFile'][0].path : null;
  const images = req.files['images'] ? req.files['images'].map(file => file.path) : [];

  try {
    const client = await pool.connect();
    const queryText = `
      INSERT INTO freelance (title, sellerName, domainName, minPrice, maxPrice, zipfile, images, projectdetail, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    const values = [title, sellerName, domainName, minPrice, maxPrice, zipFile, images, projectDetail, new Date()];

    const result = await client.query(queryText, values);
    const insertedId = result.rows[0].id;

    res.status(201).json({ id: insertedId });
    client.release();
  } catch (err) {
    res.status(500).json({ error: 'Error adding project' });
  }
});

app.get('/api/freelance/search', async (req, res) => {
  const searchTerm = req.query.searchTerm;

  if (!searchTerm) {
    return res.status(400).json({ error: 'Search term is required' });
  }

  try {
    const client = await pool.connect();
    const queryText = `
      SELECT * FROM freelance
      WHERE title ILIKE $1 OR domainName ILIKE $2 OR projectdetail ILIKE $3
    `;
    const values = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

    const result = await client.query(queryText, values);
    const projects = result.rows;

    res.status(200).json({ projects });
    client.release();
  } catch (err) {
    res.status(500).json({ error: 'Error searching projects' });
  }
});

app.get('/api/freelance/projects', async (req, res) => {
  try {
    const client = await pool.connect();
    const queryText = 'SELECT * FROM freelance';
    const result = await client.query(queryText);
    const projects = result.rows;

    res.status(200).json({ projects });
    client.release();
  } catch (err) {
    res.status(500).json({ error: 'Error fetching projects' });
  }
});

app.get('/api/viewdetail/:title', async (req, res) => {
  const { title } = req.params;
  try {
    const result = await pool.query('SELECT * FROM freelance WHERE title = $1', [title]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ project: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//payment with razorpay

app.post('/api/freelance/payment/order', async (req, res) => {
  const options = {
    amount: req.body.amount * 100, 
    currency: 'INR',
    receipt: 'order_rcptid_11'
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).send(error);
  }
});


// Utility function for user authentication
const authenticateUser = async (username, password) => {
  const userQuery = 'SELECT * FROM freeauth WHERE username = $1 AND password = $2';
  const userResult = await pool.query(userQuery, [username, password]);
  return userResult.rows.length > 0;
};

// Endpoint for handling login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const isAuthenticated = await authenticateUser(username, password);
    if (!isAuthenticated) {
      console.log('Invalid username or password');
      return res.status(401).json({ isAuthenticated: false, message: 'Invalid username or password' });
    }

    console.log('Login successful');
    res.status(200).json({ isAuthenticated: true, message: 'Login successful' });
  } catch (error) {
    console.error('Error during login', error);
    res.status(500).json({ isAuthenticated: false, message: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
