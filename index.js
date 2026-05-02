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
    if (err) {
      console.log("ERROR REGISTER:", err);
      return res.status(500).json(err);
    }

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
    if (err) {
      console.log("ERROR LOGIN:", err);
      return res.status(500).json(err);
    }

    if (result.length > 0) {
      res.json(result[0]);
    } else {
      res.status(401).json("Correo o contraseña incorrectos");
    }
  });
});

app.get("/feed/:id", (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT * FROM usuarios
    WHERE id != ?
    AND id NOT IN (
      SELECT para_usuario FROM likes WHERE de_usuario = ?
    )
    AND id NOT IN (
      SELECT para_usuario FROM dislikes WHERE de_usuario = ?
    )
    LIMIT 20
  `;

  db.query(sql, [id, id, id], (err, result) => {
    if (err) {
      console.log("ERROR FEED:", err);
      return res.status(500).json(err);
    }

    res.json(result);
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Servidor corriendo puerto " + PORT);
});