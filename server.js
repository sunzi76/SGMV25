const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const archiver = require('archiver');
// Rimuovi o commenta queste linee se non le stai usando:
// const bcrypt = require('bcrypt');
// const session = require('express-session');

// Rimuovi o commenta la riga per il modulo HTTPS:
// const https = require('https');

const app = express();
// Non definire una PORT fissa qui, Render userà process.env.PORT
// const PORT = 3000;
// const HTTPS_PORT = 3001;

// --- CORS Configuration ---
// Useremo un valore dinamico per l'origine CORS o un wildcard per semplificare
app.use(cors({
    // Questo sarà configurato meglio su Render, per ora mettiamo un placeholder o il tuo localhost
    origin: 'http://localhost:3000', // Renderà il frontend dinamico su Render
    credentials: true
}));
app.use(express.json());

// *** RIMUOVI O COMMENTA QUESTA RIGA: Render servirà il frontend statico a parte ***
// app.use(express.static(path.join(__dirname, 'public')));
app.use('/canti_liturgici', express.static(path.join(__dirname, 'canti_liturgici')));

const UPLOAD_DIR = path.join(__dirname, 'canti_liturgici');
const PLAYLISTS_FILE = path.join(__dirname, 'playlists.json');
// const USERS_FILE = path.join(__dirname, 'users.json'); // Se non usi il login al momento

// ... Il resto del tuo codice per Multer, inizializzazione file, rotte API ...

// Rimuovi anche questa parte se avevi implementato il server HTTPS:
/*
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
};
https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log(`Server HTTPS avviato su https://localhost:${HTTPS_PORT}`);
});
*/

// Il tuo server Node.js deve ascoltare sulla porta fornita da Render
app.listen(process.env.PORT || 3000, () => {
    console.log(`Server Node.js avviato su porta ${process.env.PORT || 3000}`);
    console.log(`Repository PDF in: ${UPLOAD_DIR}`);
    console.log(`Playlist salvate in: ${PLAYLISTS_FILE}`);
    // console.log(`Utenze salvate in: ${USERS_FILE}`); // Se non usi il login
});