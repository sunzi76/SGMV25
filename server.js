const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const archiver = require('archiver');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configurazione di AWS S3 (V3 SDK)
const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_REGION;

const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

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

// CORS Configuration
app.use(cors({
    origin: 'https://sgmv25-frontend.onrender.com',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rotta per il caricamento dei file PDF
app.post('/upload', upload.single('pdfFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Nessun file PDF caricato.');
    }
    const fileUrl = req.file.location;
    const fileName = req.file.originalname;
    console.log(`File caricato su S3: ${fileUrl}`);
    res.json({ message: 'File PDF caricato con successo!', url: fileUrl, fileName: fileName });
});

// Rotta per ottenere la lista dei file PDF da S3
app.get('/files', async (req, res) => {
    try {
        const command = new ListObjectsV2Command({ Bucket: bucketName });
        const result = await s3Client.send(command);
        const fileList = result.Contents || [];
        const files = fileList
            .filter(item => item.Key.startsWith('canti_liturgici/') && item.Key !== 'playlists/playlists.json')
            .map(item => ({
                name: item.Key.substring('canti_liturgici/'.length),
                url: `https://${bucketName}.s3.${region}.amazonaws.com/${item.Key}`
            }));
        res.json(files);
    } catch (error) {
        console.error('Errore nel recupero dei file da S3:', error);
        res.status(500).send('Errore interno del server.');
    }
});

// Rotta per salvare una playlist su S3
app.post('/playlists', async (req, res) => {
    const { name, files } = req.body;
    try {
        let existingPlaylists = [];
        try {
            const command = new GetObjectCommand({ Bucket: bucketName, Key: 'playlists/playlists.json' });
            const { Body } = await s3Client.send(command);
            existingPlaylists = JSON.parse(await Body.transformToString());
        } catch (error) {
            if (error.name !== 'NoSuchKey') {
                throw error;
            }
        }
        const newPlaylist = {
            id: `playlist-${Date.now()}`,
            name,
            files
        };
        existingPlaylists.push(newPlaylist);
        const putCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: 'playlists/playlists.json',
            Body: JSON.stringify(existingPlaylists, null, 2),
            ContentType: 'application/json',
        });
        await s3Client.send(putCommand);
        res.status(201).json({ success: true, message: 'Playlist salvata con successo!', playlist: newPlaylist });
    } catch (error) {
        console.error('Errore nel salvataggio della playlist su S3:', error);
        res.status(500).json({ success: false, message: 'Errore interno del server.' });
    }
});

// Rotta per ottenere la lista delle playlist salvate da S3
app.get('/playlists', async (req, res) => {
    try {
        const command = new GetObjectCommand({ Bucket: bucketName, Key: 'playlists/playlists.json' });
        const { Body } = await s3Client.send(command);
        const playlists = JSON.parse(await Body.transformToString());
        res.json({ success: true, playlists });
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return res.json({ success: true, playlists: [] });
        }
        console.error('Errore nel recupero delle playlist da S3:', error);
        res.status(500).json({ success: false, message: 'Errore interno del server.' });
    }
});

// Rotta per eliminare una playlist da S3
app.delete('/playlists/:id', async (req, res) => {
    const playlistId = req.params.id;
    try {
        const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: 'playlists/playlists.json' });
        const { Body } = await s3Client.send(getCommand);
        let playlists = JSON.parse(await Body.transformToString());
        const initialLength = playlists.length;
        playlists = playlists.filter(pl => pl.id !== playlistId);

        if (playlists.length < initialLength) {
            const putCommand = new PutObjectCommand({
                Bucket: bucketName,
                Key: 'playlists/playlists.json',
                Body: JSON.stringify(playlists, null, 2),
                ContentType: 'application/json',
            });
            await s3Client.send(putCommand);
            res.json({ success: true, message: 'Playlist eliminata con successo!' });
        } else {
            res.status(404).json({ success: false, message: 'Playlist non trovata.' });
        }
    } catch (error) {
        console.error('Errore nell\'eliminazione della playlist da S3:', error);
        res.status(500).json({ success: false, message: 'Errore interno del server durante l\'eliminazione della playlist.' });
    }
});

// Rotta per ottenere i dettagli di una singola playlist da S3
app.get('/playlists/:id', async (req, res) => {
    const playlistId = req.params.id;
    try {
        const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: 'playlists/playlists.json' });
        const { Body } = await s3Client.send(getCommand);
        const playlists = JSON.parse(await Body.transformToString());
        const playlist = playlists.find(pl => pl.id === playlistId);
        if (playlist) {
            res.json({ success: true, playlist: playlist });
        } else {
            res.status(404).json({ success: false, message: 'Playlist non trovata.' });
        }
    } catch (error) {
        console.error('Errore nel recupero della playlist da S3:', error);
        res.status(500).json({ success: false, message: 'Errore interno del server durante il recupero della playlist.' });
    }
});

// Rotta per il download di una playlist
app.get('/playlists/:id/download', async (req, res) => {
    const playlistId = req.params.id;
    try {
        const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: 'playlists/playlists.json' });
        const { Body } = await s3Client.send(getCommand);
        const playlists = JSON.parse(await Body.transformToString());
        const playlist = playlists.find(pl => pl.id === playlistId);

        if (!playlist) {
            return res.status(404).json({ success: false, message: 'Playlist non trovata.' });
        }

        if (!playlist.files || playlist.files.length === 0) {
            return res.status(400).json({ success: false, message: 'La playlist è vuota, nessun file da scaricare.' });
        }

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        res.attachment(`${playlist.name}.zip`);
        archive.pipe(res);

        for (const file of playlist.files) {
            const getFileCommand = new GetObjectCommand({
                Bucket: bucketName,
                Key: `canti_liturgici/${file.name}`
            });
            const fileData = await s3Client.send(getFileCommand);
            archive.append(fileData.Body, { name: file.name });
        }

        await archive.finalize();

    } catch (error) {
        console.error('Errore nel download della playlist:', error);
        res.status(500).json({ success: false, message: 'Errore interno del server durante il download della playlist.' });
    }
});

app.listen(port, () => {
    console.log(`Server Node.js avviato sulla porta ${port}`);
});