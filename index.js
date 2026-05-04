const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   🔹 REGISTER
========================= */
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

/* =========================
   🔹 LOGIN
========================= */
app.post("/login", (req, res) => {
  const { correo, contrasena } = req.body;

  const sql = `
    SELECT id, nombre, apellido, correo, foto, hobbies, intereses, ocupacion, buscando, bio
    FROM usuarios
    WHERE correo = ? AND contrasena = ?
  `;

  db.query(sql, [correo, contrasena], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length > 0) {
      res.json(result[0]);
    } else {
      res.status(401).json("Correo o contraseña incorrectos");
    }
  });
});

/* =========================
   🔹 FEED
========================= */
app.get("/feed/:id", (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT id, nombre, foto, bio, ocupacion, hobbies 
    FROM usuarios 
    WHERE id != ?
    LIMIT 20
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);

    res.json(result);
  });
});

/* =========================
   🔹 LIKE
========================= */
app.post("/like", (req, res) => {
  const { de_usuario, para_usuario } = req.body;

  const sql = `
    INSERT IGNORE INTO likes (de_usuario, para_usuario)
    VALUES (?, ?)
  `;

  db.query(sql, [de_usuario, para_usuario], (err) => {
    if (err) return res.status(500).json(err);

    const matchSql = `
      SELECT * FROM likes 
      WHERE de_usuario = ? AND para_usuario = ?
    `;

    db.query(matchSql, [para_usuario, de_usuario], (err2, result2) => {
      if (err2) return res.status(500).json(err2);

      const match = result2.length > 0;

      res.json({ match });
    });
  });
});

/* =========================
   🔹 NOPE
========================= */
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

/* =========================
   🔹 OBTENER PERFIL
========================= */
app.get("/user/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT id, nombre, apellido, correo, foto, hobbies, intereses, ocupacion, buscando, bio
    FROM usuarios
    WHERE id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);

    res.json(result[0]);
  });
});

/* =========================
   🔹 ACTUALIZAR PERFIL
========================= */
app.put("/user/:id", (req, res) => {
  const { id } = req.params;
  const { foto, bio, hobbies, intereses, ocupacion, buscando } = req.body;

  const sql = `
    UPDATE usuarios 
    SET foto = ?, bio = ?, hobbies = ?, intereses = ?, ocupacion = ?, buscando = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [foto, bio, hobbies, intereses, ocupacion, buscando, id],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json("Perfil actualizado");
    }
  );
});

/* =========================
   🔹 OBTENER FOTOS
========================= */
app.get("/fotos/:user_id", (req, res) => {
  const { user_id } = req.params;

  const sql = `
    SELECT * FROM fotos WHERE user_id = ?
  `;

  db.query(sql, [user_id], (err, result) => {
    if (err) return res.status(500).json(err);

    res.json(result);
  });
});

/* =========================
   🔹 AGREGAR FOTO (🔥 CLAVE)
========================= */
app.post("/fotos", (req, res) => {
  const { user_id, url } = req.body;

  if (!user_id || !url) {
    return res.status(400).json("Faltan datos");
  }

  // 🔥 limitar a 4 fotos
  db.query(
    "SELECT COUNT(*) AS total FROM fotos WHERE user_id = ?",
    [user_id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      if (result[0].total >= 4) {
        return res.status(400).json("Máximo 4 fotos");
      }

      db.query(
        "INSERT INTO fotos (user_id, url) VALUES (?, ?)",
        [user_id, url],
        (err2) => {
          if (err2) {
            console.log("Error insertando foto:", err2);
            return res.status(500).json(err2);
          }

          res.json("Foto agregada");
        }
      );
    }
  );
});

/* =========================
   🔹 SERVER
========================= */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});