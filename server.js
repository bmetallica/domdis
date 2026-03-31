const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const proxyRouter = require('./routes/proxy');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API routes
app.use('/api/domoticz', proxyRouter);
app.use('/api', settingsRouter);

// Compat mode routing
app.get('/', (req, res) => {
  if (req.query.compat === '1') {
    return res.redirect('/compat');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/compat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'compat.html'));
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Domdis Dashboard running on http://localhost:${PORT}`);
  console.log(`Compat mode: http://localhost:${PORT}/compat`);
});
