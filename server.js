const express = require('express');
const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const archiver = require('archiver');
const cors = require('cors');
const path = require('path');
const { Readable } = require('stream');

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3000;

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

let savedPlaylists = [];

const loadPlaylistsFromS3 = async () => {
    console.log('Caricamento delle playlist da S3...');
    try {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: 'playlists/',
        });
        const response = await s3Client.send(command);
        const playlistFiles = response.Contents ? response.Contents.filter(obj => obj.Key.endsWith('.json')) : [];
        
        const playlists = await Promise.all(playlistFiles.map(async (file) => {
            const getCommand = new GetObjectCommand({
                Bucket: bucketName,
                Key: file.Key,
            });
            const s3Response = await s3Client.send(getCommand);
            const data = await s3Response.Body.transformToString();
            return JSON.parse(data);
        }));

        savedPlaylists = playlists;
        console.log(`Caricate ${savedPlaylists.length} playlist da S3.`);
    } catch (error) {
        console.error('Errore nel caricamento delle playlist da S3:', error);
        // Se la cartella non esiste o è vuota, l'errore è normale
        if (error.Code === 'NoSuchKey' || error.Code === 'NotFound') {
            savedPlaylists = [];
            console.log('Nessuna playlist trovata su S3. L\'array in memoria è stato resettato.');
        }
    }
};

const sortPlaylistsByDate = (playlists) => {
    return playlists.sort((a, b) => {
        return new Date(b.creationDate) - new Date(a.creationDate);
    });
};

app.use('/chord-diagrams', express.static(path.join(__dirname, 'public/chord-diagrams')));

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
            .filter(filename => filename.toLowerCase().endsWith('.pdf'));
        res.json(files);
    } catch (error) {
        console.error('Errore nel recupero della lista dei file da S3:', error);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});

app.post('/save-playlist', async (req, res) => {
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

    const key = `playlists/${playlistId}.json`;
    const body = JSON.stringify(newPlaylist);

    try {
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: body,
            ContentType: 'application/json',
        });
        await s3Client.send(command);
        
        // Sincronizza l'array in memoria
        savedPlaylists.push(newPlaylist);
        savedPlaylists = sortPlaylistsByDate(savedPlaylists);

        res.json({ success: true, message: 'Playlist salvata.', playlist: newPlaylist });
    } catch (error) {
        console.error('Errore nel salvataggio della playlist su S3:', error);
        res.status(500).json({ success: false, message: 'Errore interno del server durante il salvataggio.' });
    }
});

app.get('/playlists', (req, res) => {
    res.json(savedPlaylists);
});

app.get('/playlists/:name', (req, res) => {
    const playlistName = req.params.name;
    const playlist = savedPlaylists.find(p => p.name === playlistName);

    if (playlist) {
        res.json({ success: true, playlist });
    } else {
        res.status(404).json({ success: false, message: 'Playlist non trovata.' });
    }
});

app.delete('/playlists/:id', async (req, res) => {
    const playlistId = req.params.id;
    const key = `playlists/${playlistId}.json`;
    
    // Controlla che la chiave non sia 'undefined' per evitare cancellazioni involontarie
    if (playlistId === 'undefined' || !playlistId) {
        return res.status(400).json({ success: false, message: 'ID playlist non valido.' });
    }

    try {
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        await s3Client.send(command);
        
        // Sincronizza l'array in memoria
        savedPlaylists = savedPlaylists.filter(p => p.id !== playlistId);

        res.status(200).json({ success: true, message: 'Playlist eliminata con successo.' });
    } catch (error) {
        if (error.Code === 'NoSuchKey') {
            // Se il file non esiste, è comunque una cancellazione di successo
            savedPlaylists = savedPlaylists.filter(p => p.id !== playlistId);
            res.status(200).json({ success: true, message: 'Playlist non trovata su S3 ma rimossa dalla lista.' });
        } else {
            console.error('Errore nella cancellazione della playlist da S3:', error);
            res.status(500).json({ success: false, message: 'Errore del server durante la cancellazione.' });
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    loadPlaylistsFromS3();
});