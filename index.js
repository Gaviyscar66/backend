const express = require("express");
const cors = require("cors");
const multer = require("multer"); // 🔥 IMPORTANTE: Importamos multer
const path = require("path");     // 🔥 IMPORTANTE: Importamos path
require("dotenv").config();

const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   🔥 CONFIGURACIÓN MULTIMEDIA
========================= */
// Hacemos pública la carpeta 'uploads' para que el frontend pueda cargar las imágenes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuramos cómo y dónde guardará Multer los archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Todo se guardará en la carpeta 'uploads'
  },
  filename: (req, file, cb) => {
    // Genera un nombre único: timestamp actual + extensión original (.png, .jpg)
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});
const upload = multer({ storage: storage });


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
   🔥 ACTUALIZAR PERFIL
========================= */
// Añadimos el middleware upload.single('foto') para interceptar el archivo
app.put("/user/:id", upload.single('foto'), (req, res) => {
  const { id } = req.params;
  const { bio, hobbies, intereses, ocupacion, buscando } = req.body;

  let fotoUrl = null;

  // Si el frontend envió un archivo, generamos su URL pública
  if (req.file) {
    const baseUrl = req.protocol + '://' + req.get('host'); // Ejemplo: https://backend-production...
    fotoUrl = `${baseUrl}/uploads/${req.file.filename}`;
  }

  // COALESCE(?, foto) asegura que si fotoUrl es null, se mantenga la foto que ya estaba en la DB
  const sql = `
    UPDATE usuarios 
    SET foto = COALESCE(?, foto), bio = ?, hobbies = ?, intereses = ?, ocupacion = ?, buscando = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [fotoUrl, bio, hobbies, intereses, ocupacion, buscando, id],
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
   🔥 AGREGAR FOTO (A LA GALERÍA)
========================= */
// Interceptamos la imagen de la galería
app.post("/fotos", upload.single('foto'), (req, res) => {
  const { user_id } = req.body;

  // Verificamos que envíen el ID y que Multer haya capturado el archivo
  if (!user_id || !req.file) {
    return res.status(400).json("Faltan datos o la imagen no se subió");
  }

  // Construimos la URL pública
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = `${baseUrl}/uploads/${req.file.filename}`;

  // Limitar a 4 fotos
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

app.delete("/fotos/:id/:user_id", (req, res) => {
  const { id, user_id } = req.params;

  const sql = `
    DELETE FROM fotos 
    WHERE id = ? AND user_id = ?
  `;

  db.query(sql, [id, user_id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.affectedRows === 0) {
      return res.status(403).json("No autorizado");
    }
    res.json("Foto eliminada");
  });
});

/* =========================
   💬 SISTEMA DE CHAT
========================= */

// Enviar un mensaje
app.post("/mensajes", (req, res) => {
  const { de_id, para_id, contenido } = req.body;
  const sql = "INSERT INTO mensajes (de_id, para_id, contenido) VALUES (?, ?, ?)";
  db.query(sql, [de_id, para_id, contenido], (err) => {
    if (err) return res.status(500).json(err);
    res.json("Mensaje enviado");
  });
});

// Obtener mensajes entre dos personas
app.get("/mensajes/:user1/:user2", (req, res) => {
  const { user1, user2 } = req.params;
  const sql = `
    SELECT * FROM mensajes 
    WHERE (de_id = ? AND para_id = ?) 
    OR (de_id = ? AND para_id = ?) 
    ORDER BY fecha ASC
  `;
  db.query(sql, [user1, user2, user2, user1], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});
// Obtener lista de personas con las que tengo match (mis chats activos)
app.get("/matches/:id", (req, res) => {
  const { id } = req.params;
  
  // 🔥 AGREGAMOS "DISTINCT" para limpiar duplicados en la consulta
  const sql = `
    SELECT DISTINCT u.id, u.nombre, u.foto 
    FROM usuarios u
    JOIN likes l1 ON l1.para_usuario = u.id
    JOIN likes l2 ON l2.de_usuario = u.id
    WHERE l1.de_usuario = ? AND l2.para_usuario = ?
  `;
  db.query(sql, [id, id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

/* =========================
   🔹 SERVER
========================= */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});