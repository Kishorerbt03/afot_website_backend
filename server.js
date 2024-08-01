const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT1 || 5000;

// Create a PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER1,
  host: process.env.DB_HOST1,
  database: process.env.DB_NAME1,
  password: process.env.DB_PASSWORD1,
  port: process.env.DB_PORT1,
});

app.use(helmet());
app.use(bodyParser.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Helper function to convert empty strings to null
const convertEmptyStringsToNull = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, value === '' ? null : value])
  );
};

// Utility function for user authentication
const authenticateUser = async (username, password) => {
  const userQuery = 'SELECT * FROM users WHERE username = $1 AND password = $2';
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

// Endpoint for handling freelance project submissions with authentication
app.post('/api/submit-freelance', upload.fields([{ name: 'zipFile', maxCount: 1 }, { name: 'images', maxCount: 10 }]), async (req, res) => {
  const { title, sellerName, domainName, minPrice, maxPrice, projectDetail } = req.body;
  const zipFile = req.files.zipFile ? req.files.zipFile[0].filename : null;
  const images = req.files.images ? req.files.images.map(file => file.filename) : [];

  try {
    const insertQuery = `
      INSERT INTO freelance (title, seller_name, domain_name, min_price, max_price, zip_file, images, project_detail)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [title, sellerName, domainName, minPrice, maxPrice, zipFile, images, projectDetail]);

    res.status(201).json({ message: 'Project added successfully', project: result.rows[0] });
  } catch (error) {
    console.error('Error adding project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to handle form submission from Selling.js
app.post('/submit-selling-form', upload.fields([{ name: 'zipFiles', maxCount: 10 }, { name: 'imageFiles', maxCount: 10 }]), async (req, res) => {
  const formData = req.body;
  const zipFiles = req.files['zipFiles'] || [];
  const imageFiles = req.files['imageFiles'] || [];

  try {
    const query = `
      INSERT INTO selling_projects (name, project_name, mobile_number, email, min_price, max_price, message, zip_files, image_files)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    const values = [
      formData.Name,
      formData.projectname,
      formData.mobileNumber,
      formData.gmail,
      formData.minPrice,
      formData.maxPrice,
      formData.message,
      JSON.stringify(zipFiles.map(file => file.filename)),
      JSON.stringify(imageFiles.map(file => file.filename)),
    ];
    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting selling form', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Endpoint to handle form submission from College.js
app.post('/submit-college-form', async (req, res) => {
  const formData = req.body;

  try {
    const query = `
      INSERT INTO college_projects (collegename, projectname, number, email, preference, what)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [
      formData.collegename,
      formData.projectname,
      formData.number,
      formData.email,
      formData.preference,
      formData.what,
    ];
    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting college form', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Endpoint to handle form submission from School.js
app.post('/submit-school-form', async (req, res) => {
  const formData = req.body;

  try {
    const query = `
      INSERT INTO school_projects (schoolname, projectname, number, email, preference, what)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [
      formData.schoolname,
      formData.projectname,
      formData.number,
      formData.email,
      formData.preference,
      formData.what,
    ];
    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting school form', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//form handling for office.js
app.post('/submit-office-form', async (req, res) => {
  const formData = req.body;

  try {
    const query = `
      INSERT INTO office_projects (officename, projectname, number, email, preference, what)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [
      formData.officename,
      formData.projectname,
      formData.number,
      formData.email,
      formData.preference,
      formData.what,
    ];
    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting office form', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Endpoint to handle form submission from hospital.js
app.post('/submit-hospital-form', async (req, res) => {
  const formData = req.body;

  try {
    const query = `
      INSERT INTO hospital_projects (hospitelname, projectname, number, email, preference, whatshoulddo)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [
      formData.hospitelname,
      formData.projectname,
      formData.number,
      formData.email,
      formData.preference,
      formData.whatshoulddo,
    ];
    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting hospital form', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//  form submission from the first React form
app.post('/submit-form1', async (req, res) => {
  const formData = req.body;

  try {
    // Insert form data into the first PostgreSQL table
    const query = `
      INSERT INTO project (team_name, leader_name, projects, mobile_number, gmail, college, project_title, group_or_solo, solution_statement, what_to_do)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    const values = [
      formData.teamName,
      formData.leaderName,
      formData.project,
      formData.mobileNumber,
      formData.gmail,
      formData.college,
      formData.projectTitle,
      formData.groupOrSolo,
      formData.solutionStatement,
      formData.whatToDo,
    ];
    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting form 2', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//  form submission from the second React form
app.post('/submit-form2', async (req, res) => {
  const formData = req.body;

  try {
    // Insert form data into the second PostgreSQL table
    const query = `
      INSERT INTO paper_work (team_name, leader_name, paper_name, mobile_number, gmail, group_or_solo, solution_statement, what_to_do)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    const values = [
      formData.teamName,
      formData.leaderName,
      formData.paperName,
      formData.mobileNumber,
      formData.gmail,
      formData.groupOrSolo,
      formData.solutionStatement,
      formData.whatToDo,
    ];
    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting form 1', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//form submission for third form
app.post('/submit-form3', async (req, res) => {
  const formData = req.body;

  try {
    // Insert form data into the PostgreSQL table
    const query = `
      INSERT INTO hackathon (team_name, leader_name, project_title, hackathon_date, hackathon, mobile_number, gmail, college, group_or_solo, solution_statement, what_to_do)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
    const values = [
      formData.teamName,
      formData.leaderName,
      formData.projectTitle,
      formData.hackathondate,
      formData.hackathon,
      formData.mobileNumber,
      formData.gmail,
      formData.college,
      formData.groupOrSolo,
      formData.solutionStatement,
      formData.whatToDo,
    ];
    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting form', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

//from submisson for 4th form
app.post('/submit-form4', async (req, res) => {
  const formData = req.body;

  try {
    // Insert form data into the PostgreSQL table
    const query = `
      INSERT INTO hardware_modification (name, project_title, mobile_number, gmail, preferences, solution_statement)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [
      formData.Name,
      formData.projectname,
      formData.mobileNumber,
      formData.gmail,
      formData.preference,
      formData.solutionStatement,
    ];
    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting form', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// form submit on 4.5th form
app.post('/submit-form5', async (req, res) => {
  const formData = req.body;

  try {
    // Insert form data into the PostgreSQL table
    const query = `
      INSERT INTO software_modification (name, project_title, mobile_number, gmail, preferences, solution_statement)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [
      formData.Name,
      formData.projectname,
      formData.mobileNumber,
      formData.gmail,
      formData.preference,
      formData.solutionStatement,
    ];
    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting form', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Form submission for the hardwarebases project proposal form
app.post('/submit-form6', async (req, res) => {
  const formData = req.body;

  try {
    // Insert form data into the PostgreSQL table
    const query = `
      INSERT INTO hardware_Bases (name, project_name, gmail, mobile_number, choose, components, group_or_solo, solution_statement, what_to_do)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    const values = [
      formData.Name,
      formData.projectName,
      formData.gmail,
      formData.mobileNumber,
      formData.choose,
      formData.components,
      formData.groupOrSolo,
      formData.solutionStatement,
      formData.whatToDo,
    ];
    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting hardware project proposal form', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Contact form submission
app.post('/submit-contact', async (req, res) => {
  const formData = req.body;

  try {
    // Insert form data into the PostgreSQL table
    const query = `
      INSERT INTO contact_submissions (name, email, subject, message)
      VALUES ($1, $2, $3, $4)
    `;
    const values = [
      formData.name,
      formData.email,
      formData.subject,
      formData.message,
    ];
    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting contact form', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


// Endpoint to handle form submissions for company projects
app.post('/submit-form', async (req, res) => {
  const formData = convertEmptyStringsToNull(req.body);

  try {
    const query = `
      INSERT INTO company_projects (
        company_name, mail_id, mobile_number, project_detail, what_to_do, select_value2,
        team_details, how_many_member, start_date, end_date, meeting_arrangement, preferences,
        what_time, message, frontend, backend, fullstack, machinelearning, other
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `;
    const values = [
      formData.companyName,
      formData.mailId,
      formData.mobileNumber,
      formData.projectDetail,
      formData.what,
      formData.selectValue,
      formData.teamdetials,
      formData.howManyMember ? parseInt(formData.howManyMember, 10) : null,
      formData.startDate,
      formData.endDate,
      formData.meetingArrangement,
      formData.preference,
      formData.whatTime,
      formData.message,
      formData.frontend,
      formData.backend,
      formData.fullstack,
      formData.machinelearning,
      formData.other,
    ];

    await pool.query(query, values);

    res.status(200).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});