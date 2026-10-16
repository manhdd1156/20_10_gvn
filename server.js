const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: 'gvn2010secretkey',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Create uploads dir if not exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// Routes
app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dynamic personal link endpoint for each user (e.g. /dlphuong1, /ntdung36)
app.get('/:ldap', (req, res, next) => {
  const ldap = (req.params.ldap || '').trim().toLowerCase();
  if (['admin', 'api', 'uploads', 'favicon.ico'].includes(ldap)) {
    return next();
  }
  const user = db.getUserByLdap(ldap);
  if (user) {
    req.session.ldap = user.ldap;
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized Global Exception Handling
app.use((err, req, res, next) => {
  console.error('🔥 [Unhandled Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.'
  });
});

app.listen(PORT, () => {
  console.log(`🌸 GVN 20/10 Server running on http://localhost:${PORT}`);
  console.log(`🔧 Admin panel: http://localhost:${PORT}/admin`);
});
