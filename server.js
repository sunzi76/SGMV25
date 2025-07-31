const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const archiver = require('archiver');

const app = express();
const PORT = 3000;

app.use(cors());
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

const upload = multer({
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
}).single('pdfFile');

app.post('/upload', (req, res) => {
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
});

app.get('/files', (req, res) => {
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
});

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