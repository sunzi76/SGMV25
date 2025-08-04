document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadPdfForm'); // ID del tuo form
    const pdfFileInput = document.getElementById('pdfFileInput'); // ID del tuo input type="file"
    const uploadMessage = document.getElementById('upload-message');
    const backendUrl = 'https://sgmv25-backend.onrender.com';
    const searchResults = document.getElementById('search-results');
    const searchPagination = document.getElementById('search-pagination');
    const playlistElement = document.getElementById('playlist');
    const playlistMessage = document.getElementById('playlist-message');
    const playlistNameInput = document.getElementById('playlist-name-input');
    const playlistForm = document.getElementById('playlistForm'); // Il form per creare/salvare playlist
    const savePlaylistBtn = document.getElementById('save-playlist-btn');
    const clearPlaylistBtn = document.getElementById('clear-playlist-btn');
    const playlistSaveMessage = document.getElementById('playlist-save-message');
    const savedPlaylistsContainer = document.getElementById('saved-playlists-list');
    const savedPlaylistsMessage = document.getElementById('saved-playlists-message');
    const fileListContainer = document.getElementById('search-results');
    const clickedPlaylistPreview = document.getElementById('clicked-playlist-preview');
    const previewPlaylistName = document.getElementById('preview-playlist-name');
    const clickedPreviewFileList = document.getElementById('clicked-preview-file-list');
    const closePreviewBtn = document.getElementById('close-preview-btn');

    const MAX_PLAYLIST_ITEMS = 15;
    
    const API_BASE_URL = 'https://sgmv25-backend.onrender.com';
    /* Configurazione per file in locale
    const API_BASE_URL = 'http://localhost:3000';
    */
    let allFiles = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    let availableFiles = [];
    let currentPlaylist = JSON.parse(localStorage.getItem('currentPlaylist')) || [];
    let playlistsCache = {};

    let totalPages = 1;

    const monthNames = [
        "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
    ];

    fetchAvailableFiles(); // Chiamata iniziale per caricare i file
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1; // Resetta la paginazione quando si cerca
            renderFilteredFiles(); // Chiama una nuova funzione per filtrare e renderizzare
            updatePaginationControls(); // Aggiorna i controlli di paginazione
        });
    }


    function renderFilteredFiles() {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    let filesToProcess = allFiles;

    if (searchTerm) {
        filesToProcess = allFiles.filter(file =>
            file.name.toLowerCase().includes(searchTerm)
        );
    }

    const fileListContainer = document.getElementById('search-results');
    fileListContainer.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const filesToDisplay = filesToProcess.slice(startIndex, endIndex); // Applica paginazione ai filtrati

    if (filesToDisplay.length > 0) {
        filesToDisplay.forEach(file => {
            const li = document.createElement('li');
            li.classList.add('file-item');

            const fileNameSpan = document.createElement('span');
            fileNameSpan.textContent = file.name;
            fileNameSpan.classList.add('file-name');

            const viewLink = document.createElement('a');
            viewLink.href = file.url;
            viewLink.textContent = 'Visualizza';
            viewLink.target = '_blank';
            viewLink.classList.add('button-link');

            const addToPlaylistButton = document.createElement('button');
            addToPlaylistButton.textContent = 'Aggiungi a Playlist';
            addToPlaylistButton.classList.add('add-to-playlist-btn');
            addToPlaylistButton.addEventListener('click', () => addToPlaylist(file));

            li.appendChild(fileNameSpan);
            li.appendChild(viewLink);
            li.appendChild(addToPlaylistButton);
            fileListContainer.appendChild(li);
        });
    } else {
        fileListContainer.innerHTML = '<li>Nessun file trovato per la ricerca.</li>';
    }

    // Aggiorna i controlli di paginazione per i file filtrati
    updatePaginationControlsForFiltered(filesToProcess);
    }

    function updatePaginationControlsForFiltered(filteredFiles) {
        const searchPagination = document.getElementById('search-pagination');
        searchPagination.innerHTML = '';

        const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);

        if (totalPages > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Precedente';
            prevButton.disabled = currentPage === 1;
            prevButton.addEventListener('click', () => {
                currentPage--;
                renderFilteredFiles(); // Richiama la funzione filtrata
            });
            searchPagination.appendChild(prevButton);

            const pageInfo = document.createElement('span');
            pageInfo.textContent = ` Pagina ${currentPage} di ${totalPages} `;
            searchPagination.appendChild(pageInfo);

            const nextButton = document.createElement('button');
            nextButton.textContent = 'Successivo';
            nextButton.disabled = currentPage === totalPages;
            nextButton.addEventListener('click', () => {
                currentPage++;
                renderFilteredFiles(); // Richiama la funzione filtrata
            });
            searchPagination.appendChild(nextButton);
        }
    }




    if (uploadForm) {
        uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!pdfFileInput || !pdfFileInput.files || pdfFileInput.files.length === 0) {
                console.log('Nessun file selezionato per il caricamento.');
                return;
            }
            const file = pdfFileInput.files[0];
            const formData = new FormData();
            formData.append('pdfFile', file);

            try {
                const response = await fetch(API_BASE_URL + '/upload', {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Errore HTTP nel caricamento: ${response.status} - ${errorText}`);
                }
                const data = await response.json();
                console.log('File caricato con successo su S3:', data);
                // QUI: Aggiorna la UI per mostrare il PDF caricato.
                // Potresti chiamare fetchAvailableFiles() qui per aggiornare la lista dei canti
                fetchAvailableFiles();
            } catch (error) {
                console.error('Errore durante il caricamento del PDF:', error);
            }
        });
    }


    function savePlaylistStateLocal() {
        localStorage.setItem('currentPlaylist', JSON.stringify(currentPlaylist));
    }

    // Esempio di funzione per recuperare i canti/PDF
    async function fetchCanti() {
        try {
            const response = await fetch(API_BASE_URL + '/files'); // Chiamata al backend per listare da S3

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore HTTP nel recupero file: ${response.status} - ${errorText}`);
            }

            const canti = await response.json(); // Il backend dovrebbe inviare una lista di oggetti { name: '...', url: '...' }
            console.log('Lista canti da S3:', canti);

            // QUI devi aggiornare la tua UI per mostrare questi canti
            // I link per aprire i PDF DEVONO usare direttamente il 'url' ricevuto
            // Esempio:
            // const cantiListElement = document.getElementById('cantiList');
            // cantiListElement.innerHTML = ''; // Pulisci la lista esistente
            // canti.forEach(canto => {
            //     const listItem = document.createElement('li');
            //     const link = document.createElement('a');
            //     link.href = canto.url; // Usa direttamente l'URL S3
            //     link.target = '_blank'; // Apri in una nuova scheda
            //     link.textContent = canto.name;
            //     listItem.appendChild(link);
            //     cantiListElement.appendChild(listItem);
            // });

        } catch (error) {
            console.error('Errore nel recupero dei canti:', error);
        }
    }

        // Assicurati che questa funzione venga chiamata al caricamento della pagina
        // o quando è necessario aggiornare la lista (es. fetchCanti(); all'interno di DOMContentLoaded)


    // --- Funzione per Recuperare i File PDF Disponibili da S3 (aggiornata per coerenza) ---
    async function fetchAvailableFiles() {
        
        try {
            const response = await fetch(`${backendUrl}/files`);
            if (!response.ok) {
                throw new Error(`Errore HTTP nel caricamento dei file: ${response.status} - ${await response.text()}`);
            }
            const files = await response.json();
            console.log('File disponibili da S3:', files);

            allFiles = files; // Salva tutti i file recuperati
            renderFiles(); // Chiama una nuova funzione per gestire il rendering e il paging
            updatePaginationControls(); // Aggiorna i controlli di paginazione
        } catch (error) {
            console.error('Errore nel recupero dei file disponibili:', error);
            document.getElementById('search-results').innerHTML = '<li>Errore nel caricamento dei file.</li>';
        }
        
        try {
            const response = await fetch(API_BASE_URL + '/files');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore nel caricamento dei file disponibili: ${response.status} - ${errorText}`);
            }
            const files = await response.json();
            console.log('File disponibili da S3:', files);
            // Ora visualizzali:
            if (fileListContainer) { // Controlla che l'elemento esista
                fileListContainer.innerHTML = ''; // Pulisci prima di aggiungere
                if (files.length > 0) {
                files.forEach(file => {
                    const li = document.createElement('li');
                    li.classList.add('file-item'); // Aggiungi una classe per styling se vuoi

                    const fileNameSpan = document.createElement('span');
                    fileNameSpan.textContent = file.name;
                    fileNameSpan.classList.add('file-name');

                    const viewLink = document.createElement('a');
                    viewLink.href = file.url;
                    viewLink.textContent = 'Visualizza'; // Testo del pulsante/link per aprire il PDF
                    viewLink.target = '_blank';
                    viewLink.classList.add('button-link'); // Considera di stilizzarlo come un pulsante

                    const addToPlaylistButton = document.createElement('button');
                    addToPlaylistButton.textContent = 'Aggiungi a Playlist';
                    addToPlaylistButton.classList.add('add-to-playlist-btn');
                    // Assicurati che la funzione 'addToPlaylist' esista e sia accessibile (di solito definita nello stesso scope o globalmente)
                    addToPlaylistButton.addEventListener('click', () => addToPlaylist(file));

                    li.appendChild(fileNameSpan);
                    li.appendChild(viewLink); // Invece di un semplice link testuale, lo rendiamo più esplicito
                    li.appendChild(addToPlaylistButton);

                    fileListContainer.appendChild(li);
                });
            } else {
                    fileListContainer.innerHTML = '<li>Nessun file disponibile.</li>';
                }
            } else {
                console.error("Errore: Elemento HTML per la lista dei file non trovato.");
            }
            displayAvailableFiles(files); // Funzione da creare per mostrare i file nella UI
        } catch (error) {
            console.error('Errore nel recupero dei file disponibili:', error);
        }
    }

    // Funzione placeholder per mostrare i file disponibili
    function displayAvailableFiles(files) {
        const availableFilesList = document.getElementById('availableFilesList'); // Assicurati di avere questo ID in HTML
        if (!availableFilesList) return;

        availableFilesList.innerHTML = ''; // Pulisci la lista esistente
        files.forEach(file => {
            const listItem = document.createElement('li');
            listItem.textContent = file.name;
            const link = document.createElement('a');
            link.href = file.url;
            link.target = '_blank';
            link.textContent = ' (Apri)';
            listItem.appendChild(link);
            // Aggiungi qui pulsanti per aggiungere il canto a una playlist se necessario
            availableFilesList.appendChild(listItem);
        });
    }


    function renderFiles() {
    const fileListContainer = document.getElementById('search-results');
    fileListContainer.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const filesToDisplay = allFiles.slice(startIndex, endIndex); // Applica il paging qui

    if (filesToDisplay.length > 0) {
        filesToDisplay.forEach(file => {
            const li = document.createElement('li');
            li.classList.add('file-item');

            const fileNameSpan = document.createElement('span');
            fileNameSpan.textContent = file.name;
            fileNameSpan.classList.add('file-name');

            const viewLink = document.createElement('a');
            viewLink.href = file.url;
            viewLink.textContent = 'Visualizza';
            viewLink.target = '_blank';
            viewLink.classList.add('button-link');

            const addToPlaylistButton = document.createElement('button');
            addToPlaylistButton.textContent = 'Aggiungi a Playlist';
            addToPlaylistButton.classList.add('add-to-playlist-btn');
            addToPlaylistButton.addEventListener('click', () => addToPlaylist(file));

            li.appendChild(fileNameSpan);
            li.appendChild(viewLink);
            li.appendChild(addToPlaylistButton);
            fileListContainer.appendChild(li);
        });
    } else {
        fileListContainer.innerHTML = '<li>Nessun file disponibile.</li>';
    }
}

function updatePaginationControls() {
    const searchPagination = document.getElementById('search-pagination');
    searchPagination.innerHTML = '';

    const totalPages = Math.ceil(allFiles.length / itemsPerPage);

    if (totalPages > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Precedente';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            currentPage--;
            renderFiles();
            updatePaginationControls();
        });
        searchPagination.appendChild(prevButton);

        const pageInfo = document.createElement('span');
        pageInfo.textContent = ` Pagina ${currentPage} di ${totalPages} `;
        searchPagination.appendChild(pageInfo);

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Successivo';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            currentPage++;
            renderFiles();
            updatePaginationControls();
        });
        searchPagination.appendChild(nextButton);
    }
}










    function renderFileList(container, files, isPlaylist = false) {
        container.innerHTML = '';
        if (files.length === 0 && !isPlaylist) {
            container.innerHTML = '<p>Nessun file trovato.</p>';
            return;
        }

        files.forEach(file => {
            const li = document.createElement('li');
            li.setAttribute('data-id', file.id);
            li.textContent = file.name;

            const buttonContainer = document.createElement('div');

            const viewPdfBtn = document.createElement('button');
            viewPdfBtn.textContent = 'Visualizza PDF';
            viewPdfBtn.classList.add('view-pdf-btn');
            viewPdfBtn.addEventListener('click', () => {
                window.open(`${API_BASE_URL}/canti_liturgici/${encodeURIComponent(file.name)}`, '_blank');
            });
            buttonContainer.appendChild(viewPdfBtn);

            if (isPlaylist) {
                li.classList.add('draggable');
                li.setAttribute('draggable', 'true');

                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Rimuovi';
                removeBtn.classList.add('remove-btn');
                removeBtn.addEventListener('click', () => removeFromPlaylist(file.id));
                buttonContainer.appendChild(removeBtn);
            } else {
                const addBtn = document.createElement('button');
                addBtn.textContent = 'Aggiungi alla Playlist';
                addBtn.classList.add('add-to-playlist-btn');
                addBtn.addEventListener('click', () => addToPlaylist(file));
                buttonContainer.appendChild(addBtn);
            }
            li.appendChild(buttonContainer);
            container.appendChild(li);
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

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = pdfUploadInput.files[0];

        if (!file) {
            uploadMessage.textContent = 'Seleziona un file da caricare.';
            uploadMessage.style.color = 'red';
            return;
        }

        const formData = new FormData();
        formData.append('pdfFile', file);

        try {
            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                uploadMessage.textContent = data.message;
                uploadMessage.style.color = 'green';
                pdfUploadInput.value = '';
                currentPage = 1;
                await fetchAvailableFiles();
            } else {
                uploadMessage.textContent = data.message;
                uploadMessage.style.color = 'red';
            }
        } catch (error) {
            console.error('Errore durante l\'upload:', error);
            uploadMessage.textContent = 'Si è verificato un errore durante il caricamento del file.';
            uploadMessage.style.color = 'red';
        }
    });

    function renderSearchResults() {
        const filesToShow = availableFiles.filter(file => !currentPlaylist.some(item => item.id === file.id));
        renderFileList(searchResults, filesToShow, false);
    }

    searchInput.addEventListener('input', () => {
        currentPage = 1;
        fetchAvailableFiles();
    });

    function renderPaginationControls() {
        searchPagination.innerHTML = '';

        if (totalPages <= 1) {
            return;
        }

        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Precedente';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                fetchAvailableFiles();
            }
        });
        searchPagination.appendChild(prevBtn);

        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Pagina ${currentPage} di ${totalPages}`;
        searchPagination.appendChild(pageInfo);

        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Successiva';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                fetchAvailableFiles();
            }
        });
        searchPagination.appendChild(nextBtn);
    }

    function addToPlaylist(file) {
        if (currentPlaylist.length < MAX_PLAYLIST_ITEMS) {
            if (!currentPlaylist.some(item => item.id === file.id)) {
                currentPlaylist.push(file);
                savePlaylistStateLocal();
                renderPlaylist();
                renderSearchResults();
            } else {
                alert('Questo file è già nella playlist!');
            }
        } else {
            alert(`La playlist non può contenere più di ${MAX_PLAYLIST_ITEMS} file.`);
        }
    }

    function removeFromPlaylist(fileId) {
        currentPlaylist = currentPlaylist.filter(file => file.id !== fileId);
        savePlaylistStateLocal();
        renderPlaylist();
        fetchAvailableFiles();
    }

    function renderPlaylist() {
        renderFileList(playlistElement, currentPlaylist, true);
        updatePlaylistMessage();
    }

    clearPlaylistBtn.addEventListener('click', () => {
        if (currentPlaylist.length === 0) {
            alert('La playlist è già vuota.');
            return;
        }

        if (confirm('Sei sicuro di voler procedere alla rimozione completa della playlist creata?')) {
            currentPlaylist = [];
            savePlaylistStateLocal();
            renderPlaylist();
            fetchAvailableFiles();
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
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: playlistName,
                    files: currentPlaylist
                })
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

    // 1. Funzione per recuperare tutte le playlist salvate
    async function fetchSavedPlaylists() {
        try {
            const response = await fetch(API_BASE_URL + '/playlists'); // Assicurati che il backend abbia '/playlists'
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore nel caricamento delle playlist salvate: ${response.status} - ${errorText}`);
            }
            const playlists = await response.json();
            console.log('Playlist salvate:', playlists);
            displayPlaylists(playlists); // Funzione per mostrare le playlist nella UI
        } catch (error) {
            console.error('Errore nel recupero delle playlist:', error);
        }
    }

    // 2. Funzione per salvare una nuova playlist o aggiornarne una esistente
    if (playlistForm) {
        playlistForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const playlistName = playlistNameInput.value.trim();
            if (!playlistName) {
                alert('Il nome della playlist non può essere vuoto.');
                return;
            }

            // Assumi che tu abbia un modo per selezionare i canti da includere nella playlist
            // Per esempio, potresti avere un array di canti selezionati:
            const selectedCanti = getSelectedCantiForPlaylist(); // Funzione da implementare
            if (selectedCanti.length === 0) {
                alert('Seleziona almeno un canto per la playlist.');
                return;
            }

            const newPlaylist = {
                name: playlistName,
                canti: selectedCanti // canti dovrebbe essere un array di oggetti { name: string, url: string }
            };

            try {
                const response = await fetch(API_BASE_URL + '/playlists', { // Assicurati che il backend abbia '/playlists'
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(newPlaylist),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Errore nel salvataggio della playlist: ${response.status} - ${errorText}`);
                }

                const result = await response.json();
                console.log('Playlist salvata:', result);
                playlistNameInput.value = ''; // Pulisci l'input
                // Aggiorna la lista delle playlist visualizzate
                fetchSavedPlaylists();
                alert('Playlist salvata con successo!');
            } catch (error) {
                console.error('Errore nel salvataggio della playlist:', error);
                alert(`Errore nel salvataggio: ${error.message}`);
            }
        });
    }



    function renderSavedPlaylistsGrouped(playlists) {
        savedPlaylistsListContainer.innerHTML = '';
        savedPlaylistsMessage.textContent = '';

        if (playlists.length === 0) {
            savedPlaylistsMessage.textContent = 'Nessuna playlist salvata.';
            savedPlaylistsMessage.style.color = 'initial';
            return;
        }

        playlists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const groupedPlaylists = playlists.reduce((acc, playlist) => {
            const date = new Date(playlist.createdAt);
            const year = date.getFullYear();
            const month = date.getMonth();
            const monthName = monthNames[month];

            if (!acc[year]) {
                acc[year] = {};
            }
            if (!acc[year][monthName]) {
                acc[year][monthName] = [];
            }
            playlistsCache[playlist.id] = playlist;
            acc[year][monthName].push(playlist);
            return acc;
        }, {});

        for (const year in groupedPlaylists) {
            const yearFolder = document.createElement('div');
            yearFolder.classList.add('year-folder');
            yearFolder.innerHTML = `<h3>${year}</h3>`;
            const yearContent = document.createElement('div');
            yearContent.classList.add('folder-content');

            yearFolder.querySelector('h3').addEventListener('click', () => {
                yearContent.classList.toggle('hidden');
            });

            for (const monthName in groupedPlaylists[year]) {
                const monthFolder = document.createElement('div');
                monthFolder.classList.add('month-folder');
                monthFolder.innerHTML = `<h4>${monthName}</h4>`;
                const monthContent = document.createElement('ul');
                monthContent.classList.add('folder-content');

                monthFolder.querySelector('h4').addEventListener('click', () => {
                    monthContent.classList.toggle('hidden');
                });

                groupedPlaylists[year][monthName].forEach(playlist => {
                    const li = document.createElement('li');
                    li.setAttribute('data-id', playlist.id);

                    // *** MODIFICA QUI: Aggiungi l'icona al nome della playlist ***
                    const playlistNameWrapper = document.createElement('span');
                    playlistNameWrapper.classList.add('playlist-name-wrapper');
                    playlistNameWrapper.innerHTML = `<span class="preview-icon">🔍</span><span>${playlist.name}</span>`; // Lente di ingrandimento
                    // Oppure per un occhio: `<span class="preview-icon">👁️</span><span>${playlist.name}</span>`;

                    playlistNameWrapper.addEventListener('click', (event) => {
                         event.stopPropagation();
                         showClickedPlaylistPreview(playlist.id);
                    });
                    li.appendChild(playlistNameWrapper); // Aggiungi il wrapper al li

                    const buttonContainer = document.createElement('div');

                    const loadBtn = document.createElement('button');
                    loadBtn.textContent = 'Carica';
                    loadBtn.classList.add('load-playlist-btn');
                    loadBtn.addEventListener('click', (event) => {
                        event.stopPropagation();
                        loadPlaylist(playlist.id);
                        hideClickedPlaylistPreview();
                    });
                    buttonContainer.appendChild(loadBtn);

                    const downloadBtn = document.createElement('button');
                    downloadBtn.textContent = 'Download ZIP';
                    downloadBtn.classList.add('download-playlist-btn');
                    downloadBtn.addEventListener('click', (event) => {
                        event.stopPropagation();
                        downloadPlaylist(playlist.id);
                    });
                    buttonContainer.appendChild(downloadBtn);

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Elimina';
                    deleteBtn.classList.add('delete-playlist-btn');
                    deleteBtn.addEventListener('click', (event) => {
                        event.stopPropagation();
                        deletePlaylist(playlist.id);
                        hideClickedPlaylistPreview();
                    });
                    buttonContainer.appendChild(deleteBtn);

                    li.appendChild(buttonContainer);
                    monthContent.appendChild(li);
                });
                monthFolder.appendChild(monthContent);
                yearContent.appendChild(monthFolder);
            }
            yearFolder.appendChild(yearContent);
            savedPlaylistsListContainer.appendChild(yearFolder);
        }
    }

    async function loadPlaylist(playlistId) {
        if (!confirm('Sei sicuro di voler caricare questa playlist? La playlist corrente non salvata verrà persa.')) {
            return;
        }
        try {
            let playlistDetails = playlistsCache[playlistId];
            if (!playlistDetails) {
                 const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`);
                 if (!response.ok) {
                     throw new Error('Errore nel caricamento della playlist.');
                 }
                 const data = await response.json();
                 playlistDetails = data.playlist;
                 playlistsCache[playlistId] = playlistDetails;
            }

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

    // 3. Funzione per eliminare una playlist
    async function deletePlaylist(playlistName) {
        if (!confirm(`Sei sicuro di voler eliminare la playlist "${playlistName}"?`)) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/playlists/${encodeURIComponent(playlistName)}`, { // Endpoint es: /playlists/NomePlaylist
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore nell'eliminazione della playlist: ${response.status} - ${errorText}`);
            }

            console.log(`Playlist "${playlistName}" eliminata.`);
            fetchSavedPlaylists(); // Aggiorna la lista
            alert(`Playlist "${playlistName}" eliminata con successo.`);
        } catch (error) {
            console.error('Errore nell\'eliminazione della playlist:', error);
            alert(`Errore nell'eliminazione: ${error.message}`);
        }
    }


    // 4. Funzione per mostrare le playlist nella UI
    function displayPlaylists(playlists) {
        if (!savedPlaylistsContainer) {
            console.error("Errore: Elemento HTML con ID 'savedPlaylists' non trovato.");
            return;
        }
        savedPlaylistsContainer.innerHTML = '';
        if (playlists.length === 0) {
            savedPlaylistsContainer.innerHTML = '<p>Nessuna playlist salvata.</p>';
            return;
        }

        playlists.forEach(playlist => {
            const playlistDiv = document.createElement('div');
            playlistDiv.classList.add('playlist-item');
            playlistDiv.innerHTML = `
                <h3>${playlist.name}</h3>
                <button class="view-playlist-btn" data-name="${playlist.name}">Visualizza</button>
                <button class="delete-playlist-btn" data-name="${playlist.name}">Elimina</button>
                <ul>
                    ${playlist.canti.map(canto => `<li><a href="${canto.url}" target="_blank">${canto.name}</a></li>`).join('')}
                </ul>
            `;
            savedPlaylistsContainer.appendChild(playlistDiv);
        });

        // Aggiungi event listener per i pulsanti di eliminazione/visualizzazione
        savedPlaylistsContainer.querySelectorAll('.delete-playlist-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const playlistName = e.target.dataset.name;
                deletePlaylist(playlistName);
            });
        });
        // Aggiungi event listener per visualizzare i dettagli della playlist se hai una logica per quello
        // savedPlaylistsContainer.querySelectorAll('.view-playlist-btn').forEach(...);
    }

    // --- Funzione placeholder per ottenere i canti selezionati (adatta alla tua UI) ---
    function getSelectedCantiForPlaylist() {
        // Questa funzione deve raccogliere gli oggetti canto (con name e url)
        // che l'utente ha selezionato per la playlist.
        // Ad esempio, potresti avere checkbox accanto a ogni canto nella lista displayAvailableFiles
        // e qui leggi quali sono stati spuntati.
        // Per ora, restituisco un array vuoto o un esempio
        console.warn("La funzione getSelectedCantiForPlaylist() deve essere implementata per la tua UI.");
        // Esempio fittizio:
        // return [{ name: "Canto di prova 1", url: "https://esempio.com/canto1.pdf" }];
        return [];
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

    function hideClickedPlaylistPreview() {
        clickedPlaylistPreview.classList.add('hidden');
        previewPlaylistName.textContent = '';
        clickedPreviewFileList.innerHTML = '';
    }

    closePreviewBtn.addEventListener('click', hideClickedPlaylistPreview);

    let draggedItem = null;

    playlistElement.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('draggable')) {
            draggedItem = e.target;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', e.target.dataset.id);
            setTimeout(() => {
                e.target.classList.add('dragging');
            }, 0);
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
        if (e.target.closest('li') && e.target.closest('li').classList.contains('draggable')) {
            e.dataTransfer.dropEffect = 'move';
            const targetItem = e.target.closest('li');
            if (draggedItem && draggedItem !== targetItem) {
                const rect = targetItem.getBoundingClientRect();
                const offsetY = e.clientY - rect.top;

                if (offsetY < rect.height / 2) {
                    playlistElement.insertBefore(draggedItem, targetItem);
                } else {
                    playlistElement.insertBefore(draggedItem, targetItem.nextSibling);
                }
            }
        }
    });

    playlistElement.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedItem) {
            const newOrderIds = Array.from(playlistElement.children).map(li => li.dataset.id);
            const newOrderedPlaylist = newOrderIds.map(id => currentPlaylist.find(file => file.id === id));
            currentPlaylist = newOrderedPlaylist;
            savePlaylistStateLocal();
        }
    });

    fetchAvailableFiles();
    renderPlaylist();
    fetchSavedPlaylists();
});