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

app.post("/like", (req, res) => {
  const { de_usuario, para_usuario } = req.body;

  const sql = `
    INSERT INTO likes (de_usuario, para_usuario)
    VALUES (?, ?)
  `;

  db.query(sql, [de_usuario, para_usuario], (err) => {
    if (err) return res.status(500).json(err);

    const matchSql = `
      SELECT * FROM likes
      WHERE de_usuario = ?
      AND para_usuario = ?
    `;

    db.query(matchSql, [para_usuario, de_usuario], (err, result) => {
      if (result.length > 0) {
        res.json({ match: true });
      } else {
        res.json({ match: false });
      }
    });
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

  // 1. Usamos INSERT IGNORE para que si ya existe, no lance error
  const sql = "INSERT IGNORE INTO likes (de_usuario, para_usuario) VALUES (?, ?)";

  db.query(sql, [de_usuario, para_usuario], (err) => {
    if (err) {
      console.error("Error en INSERT:", err); // Esto saldrá en los logs de Railway
      return res.status(500).json({ mensaje: "Error al guardar el like", detalle: err });
    }

    // 2. Consulta de Match con manejo de error explícito
    const matchSql = "SELECT * FROM likes WHERE de_usuario = ? AND para_usuario = ?";

    db.query(matchSql, [para_usuario, de_usuario], (errMatch, resultMatch) => {
      if (errMatch) {
        console.error("Error en Match Query:", errMatch);
        return res.status(500).json({ mensaje: "Error al buscar match" });
      }

      // Verificamos que resultMatch sea un array antes de leer .length
      const esMatch = resultMatch && resultMatch.length > 0;
      res.json({ match: esMatch });
    });
  });
});
app.put("/perfil/:id", (req, res) => {
  const id = req.params.id;

  const {
    nombre,
    apellido,
    foto,
    hobbies,
    intereses,
    ocupacion,
    buscando,
    bio
  } = req.body;

  const sql = `
    UPDATE usuarios
    SET nombre = ?,
        apellido = ?,
        foto = ?,
        hobbies = ?,
        intereses = ?,
        ocupacion = ?,
        buscando = ?,
        bio = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      nombre,
      apellido,
      foto,
      hobbies,
      intereses,
      ocupacion,
      buscando,
      bio,
      id
    ],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json("Perfil actualizado");
    }
  );
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Servidor corriendo puerto " + PORT);
});