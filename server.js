const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const archiver = require('archiver');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json()); // Middleware per leggere i body JSON
app.use(cors());

const port = process.env.PORT || 3000;

// Configurazione di AWS S3 (V3 SDK)
const bucketName = process.env.S3_BUCKET_NAME;
const region = process.env.AWS_REGION;

console.log('AWS Bucket Name:', bucketName);

const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// Rotta per servire i diagrammi degli accordi
app.use('/chord-diagrams', express.static(path.join(__dirname, 'public/chord-diagrams')));

// Configurazione di Multer per l'upload su S3
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: bucketName,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            cb(null, 'canti_liturgici/' + file.originalname);
        }
    })
});

// Array fittizio per le playlist salvate (simulazione di un database)
let savedPlaylists = [];

// Funzione per ordinare le playlist per data
const sortPlaylistsByDate = (playlists) => {
    return playlists.sort((a, b) => {
        return new Date(b.creationDate) - new Date(a.creationDate);
    });
};

// **NUOVA ROTTA PER RECUPERARE LA LISTA DEI FILE**
app.get('/files', async (req, res) => {
    try {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: 'canti_liturgici/'
        });
        const response = await s3Client.send(command);
        const files = response.Contents
            .filter(obj => obj.Key !== 'canti_liturgici/')
            .map(obj => path.basename(obj.Key))
            .filter(filename => filename.toLowerCase().endsWith('.pdf')); // <--- QUI IL FILTRO PER I PDF
        res.json(files);
    } catch (error) {
        console.error('Errore nel recupero della lista dei file da S3:', error);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});

// Rotta per salvare una playlist
app.post('/save-playlist', (req, res) => {
    const { name, files } = req.body;
    const playlistId = Date.now().toString();
    const creationDate = new Date().toISOString();

    if (!name || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ success: false, message: 'Dati playlist non validi.' });
    }

    const newPlaylist = {
        id: playlistId,
        name: name,
        files: files,
        creationDate: creationDate
    };

    savedPlaylists.push(newPlaylist);
    savedPlaylists = sortPlaylistsByDate(savedPlaylists);

    res.json({ success: true, message: 'Playlist salvata.', playlist: newPlaylist });
});

// Rotta per recuperare tutte le playlist salvate
app.get('/playlists', (req, res) => {
    res.json(savedPlaylists);
});

// Rotta per recuperare una singola playlist per l'anteprima
app.get('/playlists/:name', (req, res) => {
    const playlistName = req.params.name;
    const playlist = savedPlaylists.find(p => p.name === playlistName);

    if (playlist) {
        res.json({ success: true, playlist });
    } else {
        res.status(404).json({ success: false, message: 'Playlist non trovata.' });
    }
});

// Rotta per servire i file PDF dal bucket S3
app.get('/canti_liturgici/:filename', async (req, res) => {
    const filename = req.params.filename;
    const key = `canti_liturgici/${filename}`;

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        const response = await s3Client.send(command);

        res.setHeader('Content-Type', response.ContentType);
        res.setHeader('Content-Length', response.ContentLength);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

        response.Body.pipe(res);
    } catch (error) {
        if (error.Code === 'NoSuchKey') {
            res.status(404).send('File non trovato.');
        } else {
            console.error('Errore nel recupero del file da S3:', error);
            res.status(500).send('Errore interno del server.');
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});