const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const apiRoutes = require('./api');

const app = express();
const port = 8080;

// Middleware para habilitar CORS
app.use(cors());

// Middleware para verificar el token JWT y proteger los endpoints
app.use((req, res, next) => {
  const token = req.headers['authorization'];
  if (token) {
    jwt.verify(token, 'your-secret-key', (err, decoded) => {
      if (!err) {
        req.user = decoded;
      }
    });
  }
  next();
});

// Montar los endpoints de la API
app.use('/api', apiRoutes);

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
