document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'https://sgmv25-backend.onrender.com';
    const uploadForm = document.getElementById('uploadPdfForm');
    const pdfFileInput = document.getElementById('pdfFileInput');
    const uploadMessage = document.getElementById('upload-message');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchPagination = document.getElementById('search-pagination');
    const playlistElement = document.getElementById('playlist');
    const playlistMessage = document.getElementById('playlist-message');
    const playlistNameInput = document.getElementById('playlist-name-input');
    const savePlaylistBtn = document.getElementById('save-playlist-btn');
    const clearPlaylistBtn = document.getElementById('clear-playlist-btn');
    const playlistSaveMessage = document.getElementById('playlist-save-message');
    const savedPlaylistsContainer = document.getElementById('saved-playlists-list');
    const savedPlaylistsMessage = document.getElementById('saved-playlists-message');
    const clickedPlaylistPreview = document.getElementById('clicked-playlist-preview');
    const previewPlaylistName = document.getElementById('preview-playlist-name');
    const clickedPreviewFileList = document.getElementById('clicked-preview-file-list');
    const closePreviewBtn = document.getElementById('close-preview-btn');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    /* Gestione diagrammi Tablatura */
    const diagramsModal = document.getElementById('diagrams-modal');
    const closeDiagramsBtn = diagramsModal.querySelector('.close-btn');
    const diagramsFilename = document.getElementById('diagrams-filename');
    const diagramsContainer = document.getElementById('diagrams-container');


    const MAX_PLAYLIST_ITEMS = 15;
    const API_BASE_URL = 'https://sgmv25-backend.onrender.com';
    let allFiles = [];
    let currentPage = 1;
    const itemsPerPage = 6;
    let currentPlaylist = JSON.parse(localStorage.getItem('currentPlaylist')) || [];
    let playlistsCache = {};
    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

    function savePlaylistStateLocal() {
        localStorage.setItem('currentPlaylist', JSON.stringify(currentPlaylist));
    }

    async function fetchAvailableFiles() {
        try {
            const response = await fetch(`${API_BASE_URL}/files`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore HTTP nel caricamento dei file: ${response.status} - ${errorText}`);
            }
            const files = await response.json();
            allFiles = files;
            renderFilesAndPagination();
        } catch (error) {
            console.error('Errore nel recupero dei file disponibili:', error);
            searchResults.innerHTML = '<li>Errore nel caricamento dei file.</li>';
        }
    }

    function renderFilesAndPagination() {
        const searchTerm = searchInput.value.toLowerCase();
        let filesToProcess = allFiles.filter(file => file.name.toLowerCase().includes(searchTerm));
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const filesToDisplay = filesToProcess.slice(startIndex, endIndex);
        const totalPages = Math.ceil(filesToProcess.length / itemsPerPage);

        searchResults.innerHTML = '';
        if (filesToDisplay.length > 0) {
            filesToDisplay.forEach(file => {
                const li = document.createElement('li');
                li.classList.add('file-item');
                li.innerHTML = `
                    <span class="file-name">${file.name}</span>
                    <div class="button-container">
                        <button class="show-diagrams-btn">Diagrammi</button>
                        <a href="${file.url}" target="_blank" class="button-link">Visualizza</a>
                        <button class="add-to-playlist-btn">Aggiungi a Playlist</button>
                    </div>
                `;
                li.querySelector('.show-diagrams-btn').addEventListener('click', () => {
                    showChordDiagrams(file.name);
                });
            });
        } else {
            searchResults.innerHTML = '<li>Nessun file trovato.</li>';
        }

        searchPagination.innerHTML = '';
        if (totalPages > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Precedente';
            prevButton.disabled = currentPage === 1;
            prevButton.addEventListener('click', () => { currentPage--; renderFilesAndPagination(); });
            searchPagination.appendChild(prevButton);

            const pageInfo = document.createElement('span');
            pageInfo.textContent = ` Pagina ${currentPage} di ${totalPages} `;
            searchPagination.appendChild(pageInfo);

            const nextButton = document.createElement('button');
            nextButton.textContent = 'Successivo';
            nextButton.disabled = currentPage === totalPages;
            nextButton.addEventListener('click', () => { currentPage++; renderFilesAndPagination(); });
            searchPagination.appendChild(nextButton);
        }

        filesToDisplay.forEach(file => {
            const li = document.createElement('li');
            li.classList.add('file-item');
            li.innerHTML = `
                <span class="file-name">${file.name}</span>
                <div class="button-container">
                    <button class="show-diagrams-btn">Diagrammi</button>
                    <a href="${file.url}" target="_blank" class="button-link">Visualizza</a>
                    <button class="add-to-playlist-btn">Aggiungi a Playlist</button>
                </div>
            `;
            
            // Aggiungi questo nuovo gestore di eventi
            li.querySelector('.show-diagrams-btn').addEventListener('click', () => {
                showChordDiagrams(file.name);
            });

            li.querySelector('.add-to-playlist-btn').addEventListener('click', () => addToPlaylist(file));
            searchResults.appendChild(li);
        });

    }

    function addToPlaylist(file) {
        if (currentPlaylist.length < MAX_PLAYLIST_ITEMS) {
            if (!currentPlaylist.some(item => item.name === file.name)) {
                currentPlaylist.push(file);
                savePlaylistStateLocal();
                renderPlaylist();
            } else {
                alert('Questo file è già nella playlist!');
            }
        } else {
            alert(`La playlist non può contenere più di ${MAX_PLAYLIST_ITEMS} file.`);
        }
    }

    function removeFromPlaylist(fileName) {
        currentPlaylist = currentPlaylist.filter(file => file.name !== fileName);
        savePlaylistStateLocal();
        renderPlaylist();
    }

    function renderPlaylist() {
        playlistElement.innerHTML = '';
        currentPlaylist.forEach((file, index) => {
            const li = document.createElement('li');
            li.setAttribute('data-name', file.name);
            li.classList.add('draggable');
            li.setAttribute('draggable', 'true');
            li.innerHTML = `
                <span>${file.name}</span>
                <div class="button-container">
                    <button class="remove-btn">Rimuovi</button>
                </div>
            `;
            li.querySelector('.remove-btn').addEventListener('click', () => removeFromPlaylist(file.name));
            playlistElement.appendChild(li);
        });
        updatePlaylistMessage();
    }

    function updatePlaylistMessage() {
        if (currentPlaylist.length === MAX_PLAYLIST_ITEMS) {
            playlistMessage.textContent = `La playlist ha raggiunto il limite massimo di ${MAX_PLAYLIST_ITEMS} file.`;
            playlistMessage.style.color = 'orange';
        } else {
            playlistMessage.textContent = `File nella playlist: ${currentPlaylist.length}/${MAX_PLAYLIST_ITEMS}`;
            playlistMessage.style.color = 'inherit';
        }
    }

    clearPlaylistBtn.addEventListener('click', () => {
        if (currentPlaylist.length === 0) {
            alert('La playlist è già vuota.');
            return;
        }
        if (confirm('Sei sicuro di voler svuotare la playlist corrente?')) {
            currentPlaylist = [];
            savePlaylistStateLocal();
            renderPlaylist();
            alert('La playlist è stata svuotata.');
        }
    });

    savePlaylistBtn.addEventListener('click', async () => {
        const playlistName = playlistNameInput.value.trim();
        if (!playlistName) {
            playlistSaveMessage.textContent = 'Inserisci un nome per la playlist.';
            playlistSaveMessage.style.color = 'red';
            return;
        }
        if (currentPlaylist.length === 0) {
            playlistSaveMessage.textContent = 'La playlist è vuota. Aggiungi dei file prima di salvarla.';
            playlistSaveMessage.style.color = 'orange';
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/playlists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: playlistName, files: currentPlaylist })
            });
            const data = await response.json();
            if (data.success) {
                playlistSaveMessage.textContent = data.message;
                playlistSaveMessage.style.color = 'green';
                playlistNameInput.value = '';
                fetchSavedPlaylists();
            } else {
                playlistSaveMessage.textContent = data.message;
                playlistSaveMessage.style.color = 'red';
            }
        } catch (error) {
            console.error('Errore nel salvataggio della playlist:', error);
            playlistSaveMessage.textContent = 'Errore durante il salvataggio della playlist.';
            playlistSaveMessage.style.color = 'red';
        }
    });

    async function fetchSavedPlaylists() {
        try {
            const response = await fetch(`${API_BASE_URL}/playlists`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore nel caricamento delle playlist salvate: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            displayPlaylists(data.playlists);
        } catch (error) {
            console.error('Errore nel recupero delle playlist:', error);
            savedPlaylistsContainer.innerHTML = '<li>Errore nel caricamento delle playlist.</li>';
        }
    }
    
    function displayPlaylists(playlists) {
        if (!savedPlaylistsContainer) {
            console.error("Errore: Elemento HTML con ID 'saved-playlists-list' non trovato.");
            return;
        }
        savedPlaylistsContainer.innerHTML = '';
        if (playlists.length === 0) {
            savedPlaylistsMessage.textContent = 'Nessuna playlist salvata.';
            return;
        }
        savedPlaylistsMessage.textContent = '';
        const groupedPlaylists = playlists.reduce((acc, playlist) => {
            let year, month;
            try {
                const timestampMatch = playlist.id.match(/(\d+)$/);
                if (timestampMatch) {
                    const timestamp = parseInt(timestampMatch[1], 10);
                    const date = new Date(timestamp);
                    year = date.getFullYear();
                    month = date.getMonth();
                } else {
                    year = 'Senza Anno';
                    month = 'Senza Mese';
                }
            } catch (e) {
                console.error("Errore nel parsing dell'ID della playlist:", e);
                year = 'Senza Anno';
                month = 'Senza Mese';
            }
            if (!acc[year]) acc[year] = {};
            if (!acc[year][month]) acc[year][month] = [];
            acc[year][month].push(playlist);
            return acc;
        }, {});
        for (const year in groupedPlaylists) {
            const yearHeading = document.createElement('h3');
            yearHeading.textContent = (year === 'Senza Anno') ? 'Senza Data' : `Anno: ${year}`;
            yearHeading.classList.add('collapsible');
            savedPlaylistsContainer.appendChild(yearHeading);
            for (const month in groupedPlaylists[year]) {
                const monthName = (month === 'Senza Mese') ? '' : monthNames[month];
                if (monthName) {
                    const monthHeading = document.createElement('h4');
                    monthHeading.textContent = `Mese: ${monthName}`;
                    monthHeading.classList.add('collapsible');
                    savedPlaylistsContainer.appendChild(monthHeading);
                    const ul = document.createElement('ul');
                    ul.classList.add('content');
                    groupedPlaylists[year][month].forEach(playlist => {
                        const li = document.createElement('li');
                        li.innerHTML = `
                            <span class="playlist-name-wrapper" data-id="${playlist.id}">
                                <span class="preview-icon">🔍</span><span>${playlist.name}</span>
                            </span>
                            <div class="button-container">
                                <button class="load-playlist-btn">Carica</button>
                                <button class="download-playlist-btn">Download ZIP</button>
                                <button class="delete-playlist-btn">Elimina</button>
                            </div>
                        `;
                        li.querySelector('.playlist-name-wrapper').addEventListener('click', () => showClickedPlaylistPreview(playlist.id));
                        li.querySelector('.load-playlist-btn').addEventListener('click', () => loadPlaylist(playlist.id));
                        li.querySelector('.download-playlist-btn').addEventListener('click', () => downloadPlaylist(playlist.id));
                        li.querySelector('.delete-playlist-btn').addEventListener('click', () => deletePlaylist(playlist.id));
                        ul.appendChild(li);
                    });
                    savedPlaylistsContainer.appendChild(ul);
                }
            }
        }
        const collapsibles = savedPlaylistsContainer.querySelectorAll('.collapsible');
        collapsibles.forEach(collapsible => {
            collapsible.addEventListener('click', function() {
                const isYearHeading = this.tagName.toLowerCase() === 'h3';
                if (isYearHeading) {
                    let nextElement = this.nextElementSibling;
                    while (nextElement && nextElement.tagName.toLowerCase() !== 'h3') {
                        if (nextElement.classList.contains('collapsible')) {
                            nextElement.classList.remove('active');
                            const contentToHide = nextElement.nextElementSibling;
                            if (contentToHide) {
                                contentToHide.style.display = "none";
                            }
                        }
                        nextElement = nextElement.nextElementSibling;
                    }
                }
                this.classList.toggle('active');
                const content = this.nextElementSibling;
                if (content) {
                    if (content.style.display === "block") {
                        content.style.display = "none";
                    } else {
                        content.style.display = "block";
                    }
                }
            });
        });
    }

    async function loadPlaylist(playlistId) {
        if (!confirm('Sei sicuro di voler caricare questa playlist? La playlist corrente non salvata verrà persa.')) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`);
            if (!response.ok) {
                throw new Error('Errore nel caricamento della playlist.');
            }
            const data = await response.json();
            const playlistDetails = data.playlist;
            currentPlaylist = playlistDetails.files;
            savePlaylistStateLocal();
            renderPlaylist();
            fetchAvailableFiles();
            alert(`Playlist "${playlistDetails.name}" caricata con successo!`);
        } catch (error) {
            console.error('Errore nel caricamento della playlist:', error);
            alert(`Impossibile caricare la playlist: ${error.message}`);
        }
    }

    async function deletePlaylist(playlistId) {
        if (!confirm('Sei sicuro di voler eliminare questa playlist?')) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (response.ok) {
                console.log('Playlist eliminata:', data.message);
                fetchSavedPlaylists();
                alert(data.message);
            } else {
                throw new Error(data.message || 'Errore sconosciuto.');
            }
        } catch (error) {
            console.error('Errore nell\'eliminazione della playlist:', error);
            alert(`Impossibile eliminare la playlist: ${error.message}`);
        }
    }

    async function downloadPlaylist(playlistId) {
        try {
            const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/download`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = 'playlist.zip';
                if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
                    filename = contentDisposition.split('filename=')[1].trim().replace(/"/g, '');
                }
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                alert(`Download di "${filename}" avviato.`);
            } else {
                const errorData = await response.json();
                alert(`Errore durante il download della playlist: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Errore nel download della playlist:', error);
            alert('Si è verificato un errore durante l\'avvio del download.');
        }
    }

    async function showClickedPlaylistPreview(playlistId) {
        let playlistDetails = playlistsCache[playlistId];
        if (!playlistDetails) {
            try {
                const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`);
                if (!response.ok) {
                    throw new Error('Errore nel caricamento dei dettagli della playlist.');
                }
                const data = await response.json();
                playlistDetails = data.playlist;
                playlistsCache[playlistId] = playlistDetails;
            } catch (error) {
                console.error('Errore nel recupero dettagli playlist per anteprima:', error);
                alert('Impossibile caricare l\'anteprima della playlist.');
                return;
            }
        }
        previewPlaylistName.textContent = playlistDetails.name;
        clickedPreviewFileList.innerHTML = '';
        if (playlistDetails.files && playlistDetails.files.length > 0) {
            playlistDetails.files.forEach((file, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="file-number">${index + 1}.</span> ${file.name}`;
                clickedPreviewFileList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'Nessun file in questa playlist.';
            clickedPreviewFileList.appendChild(li);
        }
        clickedPlaylistPreview.classList.remove('hidden');
    }

    // Funzione per mostrare i diagrammi
    async function showChordDiagrams(filename) {
        diagramsFilename.textContent = filename;
        diagramsContainer.innerHTML = 'Caricamento diagrammi...';
        diagramsModal.classList.remove('hidden');

        try {
            const response = await fetch(`${API_BASE_URL}/diagrams/${filename}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Nessuna nota musicale trovata per questo file.');
            }
            const data = await response.json();
            const chords = data.notes;

            if (chords.length === 0) {
                diagramsContainer.innerHTML = '<p>Nessuna nota musicale trovata in questo file.</p>';
                return;
            }

            diagramsContainer.innerHTML = ''; // Svuota il contenitore prima di riempirlo

            for (const chord of chords) {
                const diagramImage = generateChordDiagram(chord);
                
                const diagramItem = document.createElement('div');
                diagramItem.classList.add('chord-diagram-item');
                diagramItem.innerHTML = `<h4>Accordo di ${chord}</h4>`;

                const img = new Image();
                img.src = diagramImage;
                img.alt = `Diagramma accordo di ${chord}`;
                
                img.onload = () => {
                    diagramItem.appendChild(img);
                    diagramsContainer.appendChild(diagramItem);
                };

                img.onerror = () => {
                    const errorMessage = document.createElement('p');
                    errorMessage.textContent = 'Diagramma non disponibile';
                    diagramItem.appendChild(errorMessage);
                    diagramsContainer.appendChild(diagramItem);
                };
            }

        } catch (error) {
            console.error('Errore nel recupero dei diagrammi:', error);
            diagramsContainer.innerHTML = `<p>${error.message}</p>`;
        }
    }

    // NUOVA FUNZIONE: Controlla se l'immagine esiste
    async function checkImageExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }


    // Funzione per generare l'URL dell'immagine del diagramma sgmv25-canti-liturgici eu-north-1
    // Modifica la funzione generateChordDiagram per gestire i nomi dei file in modo più robusto
    function generateChordDiagram(chord) {
        // 1. Rimuove spazi e converte tutto in minuscolo
        let fileName = chord.replace(/ /g, '').toLowerCase();

        // 2. Mappa le note con trattino a nomi standard, ad esempio Si- diventa simin
        if (fileName.includes('-')) {
            fileName = fileName.replace('-', 'min');
        }
        // Aggiungi qui altre mappature se necessario, ad esempio "Mi-" -> "mimin", "Fa#" -> "fasdiesis"
        
        // 3. Converte la prima lettera del nome del file in maiuscolo
        fileName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
        
        // Assicurati che questi valori corrispondano a quelli del tuo progetto
        const bucketName = 'sgmv25-canti-liturgici'; // **SOSTITUISCI CON IL TUO NOME BUCKET**
        const region = 'eu-north-1';      // **SOSTITUISCI CON LA TUA REGIONE AWS**
        
        // Costruisce l'URL dinamico dell'immagine su S3 con l'estensione corretta
        const imageUrl = `https://${bucketName}.s3.${region}.amazonaws.com/chord-diagrams/${fileName}.jpg`;
        
        return imageUrl;
    }

    closeDiagramsBtn.addEventListener('click', () => {
        diagramsModal.classList.add('hidden');
    });

    window.addEventListener('click', (event) => {
        if (event.target === diagramsModal) {
            diagramsModal.classList.add('hidden');
        }
    });

// Gestore di eventi per chiudere la modale
closeDiagramsBtn.addEventListener('click', () => {
    diagramsModal.classList.add('hidden');
});

// Gestore di eventi per chiudere la modale cliccando fuori
window.addEventListener('click', (event) => {
    if (event.target === diagramsModal) {
        diagramsModal.classList.add('hidden');
    }
});



    function hideClickedPlaylistPreview() {
        clickedPlaylistPreview.classList.add('hidden');
    }

    closePreviewBtn.addEventListener('click', hideClickedPlaylistPreview);

    let draggedItem = null;
    playlistElement.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('draggable')) {
            draggedItem = e.target;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', e.target.dataset.name);
            setTimeout(() => { e.target.classList.add('dragging'); }, 0);
        }
    });

    playlistElement.addEventListener('dragend', (e) => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    playlistElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetItem = e.target.closest('li');
        if (draggedItem && draggedItem !== targetItem && targetItem && targetItem.classList.contains('draggable')) {
            const rect = targetItem.getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            if (offsetY < rect.height / 2) {
                playlistElement.insertBefore(draggedItem, targetItem);
            } else {
                playlistElement.insertBefore(draggedItem, targetItem.nextSibling);
            }
        }
    });

    playlistElement.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedItem) {
            const newOrderNames = Array.from(playlistElement.children).map(li => li.dataset.name);
            currentPlaylist.sort((a, b) => newOrderNames.indexOf(a.name) - newOrderNames.indexOf(b.name));
            savePlaylistStateLocal();
        }
    });

    searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderFilesAndPagination();
        if (searchInput.value.length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        currentPage = 1;
        renderFilesAndPagination();
    });

    



    renderPlaylist();
    fetchAvailableFiles();
    fetchSavedPlaylists();
});