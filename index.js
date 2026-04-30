const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/register", (req, res) => {
  const { nombre, apellido, correo, cedula, contrasena } = req.body;

  const sql = `
    INSERT INTO usuarios
    (nombre, apellido, correo, cedula, contrasena)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [nombre, apellido, correo, cedula, contrasena], (err) => {
    if (err) return res.status(500).json(err);

    res.json("Usuario registrado");
  });
});

app.post("/login", (req, res) => {
  const { correo, contrasena } = req.body;

  const sql = `
    SELECT * FROM usuarios
    WHERE correo = ? AND contrasena = ?
  `;

  db.query(sql, [correo, contrasena], (err, result) => {
    if (err) return res.status(500).json("Error servidor");

    if (result.length > 0) {
      res.json("Login correcto");
    } else {
      res.status(401).json("Correo o contraseña incorrectos");
    }
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Servidor corriendo puerto " + PORT);
});