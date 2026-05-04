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
  const sql = "SELECT id, nombre, apellido, correo, foto, hobbies, intereses, ocupacion, buscando, bio FROM usuarios WHERE correo = ? AND contrasena = ?";

  db.query(sql, [correo, contrasena], (err, result) => {
    if (err) return res.status(500).json(err);
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
    SELECT id, nombre, foto, bio, ocupacion, hobbies 
    FROM usuarios 
    WHERE id != ? 
    AND id NOT IN (SELECT para_usuario FROM likes WHERE de_usuario = ?)
    AND id NOT IN (SELECT para_usuario FROM dislikes WHERE de_usuario = ?)
    LIMIT 20
  `;

  db.query(sql, [id, id, id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.post("/nope", (req, res) => {
  const { de_usuario, para_usuario } = req.body;

  const sql = `
    INSERT INTO dislikes (de_usuario, para_usuario)
    VALUES (?, ?)
  `;

  db.query(sql, [de_usuario, para_usuario], (err) => {
    if (err) return res.status(500).json(err);

    res.json("Nope guardado");
  });
});

app.post("/like", (req, res) => {
  const { de_usuario, para_usuario } = req.body;
  const sql = "INSERT IGNORE INTO likes (de_usuario, para_usuario) VALUES (?, ?)";

  db.query(sql, [de_usuario, para_usuario], (err) => {
    if (err) {
      console.error("Error en INSERT:", err); 
      return res.status(500).json({ mensaje: "Error al guardar el like", detalle: err });
    }
    const matchSql = "SELECT * FROM likes WHERE de_usuario = ? AND para_usuario = ?";
    db.query(matchSql, [para_usuario, de_usuario], (errMatch, resultMatch) => {
      if (errMatch) {
        console.error("Error en Match Query:", errMatch);
        return res.status(500).json({ mensaje: "Error al buscar match" });
      }
      const esMatch = resultMatch && resultMatch.length > 0;
      res.json({ match: esMatch });
    });
  });
});

app.get("/user/:id", (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT * FROM usuarios WHERE id = ?",
    [id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0]);
    }
  );
});

app.put("/user/:id", (req, res) => {
  const { id } = req.params;
  const { bio, foto } = req.body;

  db.query(
    "UPDATE usuarios SET bio = ?, foto = ? WHERE id = ?",
    [bio, foto, id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json("Actualizado");
    }
  );
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Servidor corriendo puerto " + PORT);
});