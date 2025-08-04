const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const archiver = require('archiver');
/* AWS Costanti*/
// NUOVE IMPORTAZIONI PER AWS SDK V3
const { S3Client } = require('@aws-sdk/client-s3'); // Importa S3Client
const { PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3'); // Importa i comandi specifici se li usi direttamente
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

// Configura AWS SDK
// Queste credenziali verranno lette dalle variabili d'ambiente su Render
AWS.config.update({
    accessKeyId: process.env.AKIAY6FCCFJLLA4ONW73,
    secretAccessKey: process.env.gUJVQONuYrgLQhNyCddkAam, //nq40LLnfdSphV6gX,
    region: process.env.AWS_REGION // Es: 'eu-central-1' o la tua regione
});

const s3 = new AWS.S3();

// Il nome del tuo bucket S3, letto dalla variabile d'ambiente
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

/* FINE AWS Costanti*/

const app = express();
const PORT = 3000;
const port = process.env.PORT || 3000;

// Configura AWS SDK V3
// Le credenziali verranno lette dalle variabili d'ambiente di Render
// (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
const s3Client = new S3Client({
    region: process.env.AWS_REGION, // Assicurati che AWS_REGION sia definita su Render (es. 'eu-central-1')
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY    ,
    }
});


app.use(cors({
    origin: 'https://sgmv25-frontend.onrender.com', // Sostituisci con l'URL esatto del tuo frontend su Render
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
// Riga commentata per preparazione web service su Render
//app.use(express.static(path.join(__dirname, 'public')));
app.use('/canti_liturgici', express.static(path.join(__dirname, 'canti_liturgici')));

const UPLOAD_DIR = path.join(__dirname, 'canti_liturgici');
const PLAYLISTS_FILE = path.join(__dirname, 'playlists.json');




if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

if (!fs.existsSync(PLAYLISTS_FILE)) {
    fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify([]), 'utf8');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

// Configura Multer per caricare i file su S3
const upload = multer({
    storage: multerS3({
        s3: s3Client, // <--- CAMBIO CRUCIALE QUI! Usa l'istanza S3Client
        bucket: S3_BUCKET_NAME,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = 'canti_liturgici/' + uniqueSuffix + '-' + file.originalname;
            cb(null, filename);
        }
    })
});


/*const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.pdf') {
            req.fileValidationError = 'Estensione non valida. Sono consentiti solo file PDF.';
            return cb(null, false);
        }

        const filePath = path.join(UPLOAD_DIR, file.originalname);
        if (fs.existsSync(filePath)) {
            req.fileValidationError = `Il file "${file.originalname}" esiste già.`;
            return cb(null, false);
        }

        cb(null, true);
    }
}).single('pdfFile');*/

// Rotta per il caricamento dei file PDF
app.post('/upload', upload.single('pdfFile'), (req, res) => {
    // 'pdfFile' qui deve corrispondere al 'name' dell'input file nel tuo form HTML
    // es: <input type="file" name="pdfFile">

    if (!req.file) {
        return res.status(400).send('Nessun file PDF caricato.');
    }

    // req.file.location conterrà l'URL pubblico del file su S3
    const fileUrl = req.file.location;
    const fileName = req.file.originalname; // Nome originale del file caricato

    console.log(`File caricato su S3: ${fileUrl}`);
    res.json({ message: 'File PDF caricato con successo!', url: fileUrl, fileName: fileName });
});

/*app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (req.fileValidationError) {
            return res.status(400).json({ success: false, message: req.fileValidationError });
        }
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ success: false, message: 'Errore di caricamento (Multer): ' + err.message });
        } else if (err) {
            return res.status(500).json({ success: false, message: 'Errore generico di caricamento: ' + err.message });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Nessun file selezionato.' });
        }
        res.json({ success: true, message: `"${req.file.originalname}" caricato con successo.`, file: { id: req.file.originalname, name: req.file.originalname } });
    });
}); */

// Rotta per ottenere la lista dei file PDF da S3
app.get('/files', async (req, res) => {
    let data = null; // Dichiarazione di 'data' fuori dal try-catch
    try {
        const params = { Bucket: S3_BUCKET_NAME, Prefix: 'canti_liturgici/' };
        const command = new ListObjectsV2Command(params); // Per SDK v3
        data = await s3Client.send(command); // Assegnazione del valore qui

        // QUESTA È LA MODIFICA CRUCIALE:
        // Controlla se 'data.Contents' esiste e se è un array
        const files = (data && data.Contents && Array.isArray(data.Contents))
            ? data.Contents.map(file => ({
                name: path.basename(file.Key),
                url: `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`
            }))
            : []; // Se non ci sono file, restituisci un array vuoto

        res.status(200).json(files);

    } catch (error) {
        console.error('Errore nel recupero dei file da S3:', error);
        res.status(500).send('Errore nel recupero dei file da S3.');
    }
});


/*app.get('/files', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const searchTerm = req.query.search || '';

    fs.readdir(UPLOAD_DIR, (err, files) => {
        if (err) {
            console.error('Errore nella lettura della directory:', err);
            return res.status(500).json({ success: false, message: 'Impossibile leggere i file dal repository.' });
        }

        let pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf')
                            .map(file => ({ id: file, name: file }));

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            pdfFiles = pdfFiles.filter(file => file.name.toLowerCase().includes(lowerCaseSearchTerm));
        }

        const totalFiles = pdfFiles.length;
        const totalPages = Math.ceil(totalFiles / limit);

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedFiles = pdfFiles.slice(startIndex, endIndex);

        res.json({
            success: true,
            files: paginatedFiles,
            currentPage: page,
            totalPages: totalPages,
            totalFiles: totalFiles,
            limit: limit
        });
    });
}); */

app.delete('/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(UPLOAD_DIR, filename);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(`Errore durante l'eliminazione del file ${filename}:`, err);
            return res.status(500).json({ success: false, message: `Impossibile eliminare il file "${filename}".` });
        }
        res.json({ success: true, message: `File "${filename}" eliminato con successo.` });
    });
});

app.post('/playlists', (req, res) => {
    const { name, files } = req.body;

    if (!name || !Array.isArray(files)) {
        return res.status(400).json({ success: false, message: 'Nome playlist e file sono richiesti.' });
    }

    try {
        let playlists = JSON.parse(fs.readFileSync(PLAYLISTS_FILE, 'utf8'));

        const existingPlaylistIndex = playlists.findIndex(pl => pl.name.toLowerCase() === name.toLowerCase());

        const now = new Date();
        const newPlaylist = {
            id: existingPlaylistIndex !== -1 ? playlists[existingPlaylistIndex].id : `playlist-${Date.now()}`,
            name: name,
            files: files.map(f => ({ id: f.id, name: f.name })),
            createdAt: existingPlaylistIndex !== -1 ? playlists[existingPlaylistIndex].createdAt : now.toISOString(),
            updatedAt: now.toISOString()
        };

        if (existingPlaylistIndex !== -1) {
            playlists[existingPlaylistIndex] = newPlaylist;
        } else {
            playlists.push(newPlaylist);
        }

        fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2), 'utf8');
        res.json({ success: true, message: 'Playlist salvata con successo!', playlist: newPlaylist });
    } catch (error) {
        console.error('Errore nel salvataggio della playlist:', error);
        res.status(500).json({ success: false, message: 'Errore interno del server durante il salvataggio della playlist.' });
    }
});

app.get('/playlists', (req, res) => {
    try {
        const playlists = JSON.parse(fs.readFileSync(PLAYLISTS_FILE, 'utf8'));
        // *** MODIFICA QUI: Restituisci l'intera playlist, non solo un sottoinsieme ***
        res.json({ success: true, playlists: playlists });
    } catch (error) {
        console.error('Errore nel recupero delle playlist:', error);
        res.status(500).json({ success: false, message: 'Errore interno del server durante il recupero delle playlist.' });
    }
});

app.get('/playlists/:id', (req, res) => {
    const playlistId = req.params.id;
    try {
        const playlists = JSON.parse(fs.readFileSync(PLAYLISTS_FILE, 'utf8'));
        const playlist = playlists.find(pl => pl.id === playlistId);

        if (playlist) {
            res.json({ success: true, playlist: playlist });
        } else {
            res.status(404).json({ success: false, message: 'Playlist non trovata.' });
        }
    } catch (error) {
        console.error('Errore nel recupero della playlist:', error);
        res.status(500).json({ success: false, message: 'Errore interno del server durante il recupero della playlist.' });
    }
});

app.delete('/playlists/:id', (req, res) => {
    const playlistId = req.params.id;
    try {
        let playlists = JSON.parse(fs.readFileSync(PLAYLISTS_FILE, 'utf8'));
        const initialLength = playlists.length;
        playlists = playlists.filter(pl => pl.id !== playlistId);

        if (playlists.length < initialLength) {
            fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2), 'utf8');
            res.json({ success: true, message: 'Playlist eliminata con successo!' });
        } else {
            res.status(404).json({ success: false, message: 'Playlist non trovata.' });
        }
    } catch (error) {
            console.error('Errore nell\'eliminazione della playlist:', error);
        res.status(500).json({ success: false, message: 'Errore interno del server durante l\'eliminazione della playlist.' });
    }
});

app.get('/playlists/:id/download', async (req, res) => {
    const playlistId = req.params.id;
    try {
        const playlists = JSON.parse(fs.readFileSync(PLAYLISTS_FILE, 'utf8'));
        const playlist = playlists.find(pl => pl.id === playlistId);

        if (!playlist) {
            return res.status(404).json({ success: false, message: 'Playlist non trovata.' });
        }

        if (playlist.files.length === 0) {
            return res.status(400).json({ success: false, message: 'La playlist è vuota, nessun file da scaricare.' });
        }

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        res.attachment(`${playlist.name}.zip`);
        archive.pipe(res);

        let filesAdded = 0;
        for (const file of playlist.files) {
            const filePath = path.join(UPLOAD_DIR, file.name);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: file.name });
                filesAdded++;
            } else {
                console.warn(`File non trovato per l'archiviazione: ${file.name}`);
            }
        }

        if (filesAdded === 0) {
            return res.status(404).json({ success: false, message: 'Nessun file valido trovato nella playlist per la creazione dello ZIP.' });
        }

        archive.finalize();

        archive.on('error', (err) => {
            console.error('Errore durante la creazione dello ZIP:', err);
            res.status(500).send('Errore interno del server durante la creazione dello ZIP.');
        });

    } catch (error) {
        console.error('Errore nel download della playlist:', error);
        res.status(500).json({ success: false, message: 'Errore interno del server durante il download della playlist.' });
    }
});


app.listen(process.env.PORT || 3000, () => {
    console.log(`Server Node.js avviato su porta ${process.env.PORT || 3000}`);
    // ... altri console.log ...
    console.log(`Server avviato su http://localhost:${PORT}`);
    console.log(`Repository PDF in: ${UPLOAD_DIR}`);
    console.log(`Playlist salvate in: ${PLAYLISTS_FILE}`);
});

/*
app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
    console.log(`Repository PDF in: ${UPLOAD_DIR}`);
    console.log(`Playlist salvate in: ${PLAYLISTS_FILE}`);
}); */