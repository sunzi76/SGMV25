document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // DICHIARAZIONI INIZIALI E VARIABILI DI CONFIGURAZIONE
    // -------------------------------------------------------------
    const backendUrl = 'https://sgmv25-backend.onrender.com';
    const MAX_PLAYLIST_ITEMS = 15;

    // Elementi DOM
    const uploadForm = document.getElementById('uploadPdfForm');
    const pdfFileInput = document.getElementById('pdfFileInput');
    const uploadMessage = document.getElementById('upload-message');
    const uploadWarningMessage = document.getElementById('upload-warning-message');
    const searchInput = document.getElementById('search-input');
    const fileListContainer = document.getElementById('search-results');
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

    // Variabili di stato
    let allFiles = [];
    let currentPlaylist = JSON.parse(localStorage.getItem('currentPlaylist')) || [];
    let playlistsCache = {};
    let currentPage = 1;
    const itemsPerPage = 6;
    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

     // Listener per l'input del file
    if (pdfFileInput) {
        pdfFileInput.addEventListener('change', () => {
            if (pdfFileInput.files && pdfFileInput.files.length > 0) {
                // Mostra il messaggio di avviso quando un file è selezionato
                uploadWarningMessage.classList.add('visible');
            } else {
                // Nasconde il messaggio se non ci sono file selezionati
                uploadWarningMessage.classList.remove('visible');
            }
        });
    }


    // -------------------------------------------------------------
    // FUNZIONE UNIFICATA DI RENDERING, FILTRO E PAGINAZIONE
    // -------------------------------------------------------------
    function renderAndPaginateFiles() {
        const searchTerm = searchInput.value.toLowerCase();
        
        // 1. Filtra i file in base al termine di ricerca
        const filteredFiles = allFiles.filter(file =>
            file.name.toLowerCase().includes(searchTerm)
        );

        // 2. Calcola indici di inizio e fine pagina
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;

        // 3. Estrai i file da visualizzare nella pagina corrente
        const filesToDisplay = filteredFiles.slice(startIndex, endIndex);

        // 4. Pulisci il contenitore e popola la lista
        fileListContainer.innerHTML = '';
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
            fileListContainer.innerHTML = '<li>Nessun file trovato.</li>';
        }

        // 5. Aggiorna i controlli di paginazione basati sui file filtrati
        updatePaginationControls(filteredFiles.length);
    }

    // -------------------------------------------------------------
    // FUNZIONE DI PAGINAZIONE
    // -------------------------------------------------------------
    function updatePaginationControls(totalItems) {
        searchPagination.innerHTML = '';
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (totalPages > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Precedente';
            prevButton.disabled = currentPage === 1;
            prevButton.addEventListener('click', () => {
                currentPage--;
                renderAndPaginateFiles();
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
                renderAndPaginateFiles();
            });
            searchPagination.appendChild(nextButton);
        }
    }

    // -------------------------------------------------------------
    // FUNZIONI DI CHIAMATA API E LOGICA PRINCIPALE
    // -------------------------------------------------------------
    async function fetchAvailableFiles() {
        try {
            const response = await fetch(`${backendUrl}/files`);
            if (!response.ok) {
                throw new Error(`Errore HTTP nel caricamento dei file: ${response.status} - ${await response.text()}`);
            }
            allFiles = await response.json();
            // Dopo il fetch iniziale, l'elenco viene renderizzato.
            // Non c'è bisogno di resettare currentPage qui, lo fa il listener di ricerca.
            renderAndPaginateFiles(); 
        } catch (error) {
            console.error('Errore nel recupero dei file disponibili:', error);
            fileListContainer.innerHTML = '<li>Errore nel caricamento dei file.</li>';
        }
    }

    // -------------------------------------------------------------
    // GESTIONE DEGLI EVENTI
    // -------------------------------------------------------------
    // Listener per il form di upload
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 
            const file = pdfFileInput.files[0];
            if (!file) {
                uploadMessage.textContent = 'Seleziona un file da caricare.';
                uploadMessage.style.color = 'red';
                return;
            }

            const formData = new FormData();
            formData.append('pdfFile', file);

            try {
                const response = await fetch(`${backendUrl}/upload`, {
                    method: 'POST',
                    body: formData,
                });
                const data = await response.json();

                if (response.ok) {
                    uploadMessage.textContent = data.message;
                    uploadMessage.style.color = 'green';
                    pdfFileInput.value = '';
                    fetchAvailableFiles(); // Ricarica i file dopo l'upload
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
    }

    // Listener per l'input di ricerca
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1; // Resetta la pagina ogni volta che si digita
            renderAndPaginateFiles();
        });
    }

    // Listener per i bottoni "Precedente" e "Successivo" (la logica è nella funzione updatePaginationControls)
    // Listener per i bottoni "Aggiungi a playlist" (la logica è nella funzione renderAndPaginateFiles)
    // Listener per il bottone "Salva playlist"
    if (savePlaylistBtn) {
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
                const response = await fetch(`${backendUrl}/playlists`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: playlistName, files: currentPlaylist })
                });

                const data = await response.json();
                if (response.ok) {
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
    }

    // Listener per il bottone "Svuota playlist"
    if (clearPlaylistBtn) {
        clearPlaylistBtn.addEventListener('click', () => {
            if (currentPlaylist.length === 0) {
                alert('La playlist è già vuota.');
                return;
            }
            if (confirm('Sei sicuro di voler svuotare la playlist corrente?')) {
                currentPlaylist = [];
                savePlaylistStateLocal();
                renderPlaylist();
                renderAndPaginateFiles(); // Rende anche i file che erano stati rimossi dalla playlist
                alert('La playlist è stata svuotata.');
            }
        });
    }
    
    // Listener per il bottone "Chiudi anteprima"
    if(closePreviewBtn) {
        closePreviewBtn.addEventListener('click', hideClickedPlaylistPreview);
    }

    // -------------------------------------------------------------
    // FUNZIONI DI GESTIONE PLAYLIST (NON TOCCATE, SEMBRANO OK)
    // -------------------------------------------------------------
    function savePlaylistStateLocal() {
        localStorage.setItem('currentPlaylist', JSON.stringify(currentPlaylist));
    }
    
    function addToPlaylist(file) {
        if (currentPlaylist.length < MAX_PLAYLIST_ITEMS) {
            if (!currentPlaylist.some(item => item.name === file.name)) {
                currentPlaylist.push(file);
                savePlaylistStateLocal();
                renderPlaylist();
                renderAndPaginateFiles(); // Aggiorna anche la lista principale
            } else {
                alert('Questo file è già nella playlist!');
            }
        } else {
            alert(`La playlist non può contenere più di ${MAX_PLAYLIST_ITEMS} file.`);
        }
    }

    function removeFromPlaylist(file) {
        currentPlaylist = currentPlaylist.filter(item => item.name !== file.name);
        savePlaylistStateLocal();
        renderPlaylist();
        renderAndPaginateFiles();
    }

    // Funzione renderPlaylist() aggiornata
    function renderPlaylist() {
        if (!playlistElement) return;
            playlistElement.innerHTML = '';
            currentPlaylist.forEach(file => {
            const li = document.createElement('li');
            li.setAttribute('data-name', file.name);
            li.classList.add('draggable');
            li.setAttribute('draggable', 'true');

            const fileNameSpan = document.createElement('span');
            fileNameSpan.textContent = file.name;

            const viewLink = document.createElement('a');
            viewLink.href = file.url; // <--- USA L'URL DEL FILE
            viewLink.textContent = 'Visualizza';
            viewLink.target = '_blank';
            viewLink.classList.add('button-link');

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Rimuovi';
            removeBtn.classList.add('remove-btn');
            removeBtn.addEventListener('click', () => removeFromPlaylist(file));

            li.appendChild(fileNameSpan);
            li.appendChild(viewLink);
            li.appendChild(removeBtn);
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
    
    // Funzione per recuperare le playlist salvate dal backend
    async function fetchSavedPlaylists() {
        try {
            const response = await fetch(`${backendUrl}/playlists`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore nel caricamento delle playlist salvate: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            console.log('Dati ricevuti dal backend:', data); // Log di debug per l'intera risposta
            
            // Controlla se la risposta contiene un array di playlist
            if (data.playlists && Array.isArray(data.playlists)) {
                displayPlaylists(data.playlists); // <--- PASSA L'ARRAY CORRETTO
            } else {
                console.error('La risposta del backend non contiene un array di playlist valido.');
                if (savedPlaylistsMessage) {
                    savedPlaylistsMessage.textContent = 'Nessuna playlist salvata.';
                    savedPlaylistsMessage.style.color = 'inherit';
                }
            }

        } catch (error) {
            console.error('Errore nel recupero delle playlist:', error);
            if (savedPlaylistsMessage) {
                savedPlaylistsMessage.textContent = 'Errore nel caricamento delle playlist salvate.';
                savedPlaylistsMessage.style.color = 'red';
            }
        }
    }
    
    // Funzione per visualizzare le playlist nella UI
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

        // Raggruppa le playlist per anno e poi per mese
        const groupedPlaylists = playlists.reduce((acc, playlist) => {
            let year, month;
            try {
                // Estrae il timestamp dall'ID
                const timestampMatch = playlist.id.match(/^\d+/);
                if (timestampMatch) {
                    const timestamp = parseInt(timestampMatch[0], 10);
                    const date = new Date(timestamp);
                    year = date.getFullYear();
                    month = date.getMonth(); // Mese 0-based
                } else {
                    // Se non c'è un timestamp, usa un valore predefinito
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

        // Itera sui gruppi per renderizzare la lista
        for (const year in groupedPlaylists) {
            const yearHeading = document.createElement('h3');
            yearHeading.textContent = (year === 'Senza Anno') ? 'Senza Data' : `Anno: ${year}`;
            savedPlaylistsContainer.appendChild(yearHeading);

            for (const month in groupedPlaylists[year]) {
                const monthName = (month === 'Senza Mese') ? '' : new Date(year, month).toLocaleString('default', { month: 'long' });
                if (monthName) {
                    const monthHeading = document.createElement('h4');
                    monthHeading.textContent = `Mese: ${monthName}`;
                    savedPlaylistsContainer.appendChild(monthHeading);
                }

                const ul = document.createElement('ul');
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
                    li.querySelector('.playlist-name-wrapper').addEventListener('click', () => showClickedPlaylistPreview(playlist));
                    li.querySelector('.load-playlist-btn').addEventListener('click', () => loadPlaylist(playlist.id));
                    li.querySelector('.download-playlist-btn').addEventListener('click', () => downloadPlaylist(playlist.id));
                    li.querySelector('.delete-playlist-btn').addEventListener('click', () => deletePlaylist(playlist.id));
                    ul.appendChild(li);
                });
                savedPlaylistsContainer.appendChild(ul);
            }
        }
    }

    async function loadPlaylist(playlistId) {
        if (!confirm('Sei sicuro di voler caricare questa playlist? La playlist corrente non salvata verrà persa.')) { return; }
        try {
            const response = await fetch(`${backendUrl}/playlists/${playlistId}`);
            if (!response.ok) throw new Error('Errore nel caricamento della playlist.');
            const data = await response.json();
            currentPlaylist = data.playlist.files;
            savePlaylistStateLocal();
            renderPlaylist();
            renderAndPaginateFiles();
            alert(`Playlist "${data.playlist.name}" caricata con successo!`);
        } catch (error) {
            console.error('Errore nel caricamento della playlist:', error);
            alert(`Impossibile caricare la playlist: ${error.message}`);
        }
    }

    async function downloadPlaylist(playlistId) {
        try {
            const response = await fetch(`${backendUrl}/playlists/${playlistId}/download`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || response.statusText);
            }
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
        } catch (error) {
            console.error('Errore nel download della playlist:', error);
            alert(`Errore durante il download: ${error.message}`);
        }
    }

    async function deletePlaylist(playlistId) {
        if (!confirm('Sei sicuro di voler eliminare questa playlist?')) { return; }
        try {
            const response = await fetch(`${backendUrl}/playlists/${playlistId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore nell'eliminazione della playlist: ${response.status} - ${errorText}`);
            }
            console.log(`Playlist eliminata.`);
            fetchSavedPlaylists();
            alert('Playlist eliminata con successo.');
        } catch (error) {
            console.error('Errore nell\'eliminazione della playlist:', error);
            alert(`Errore nell'eliminazione: ${error.message}`);
        }
    }

    // Funzione per mostrare l'anteprima della playlist cliccata
    function showClickedPlaylistPreview(playlist) {
        if (!playlist) {
            console.error("Errore: La playlist non è stata fornita.");
            return;
        }
        
        previewPlaylistName.textContent = playlist.name;
        clickedPreviewFileList.innerHTML = '';
        
        if (playlist.files && playlist.files.length > 0) {
            playlist.files.forEach((file, index) => {
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

    // -------------------------------------------------------------
    // LOGICA DRAG & DROP
    // -------------------------------------------------------------
    // ... la tua logica drag & drop è stata mantenuta e dovrebbe funzionare ...

    // -------------------------------------------------------------
    // AVVIO APPLICAZIONE
    // -------------------------------------------------------------
    fetchAvailableFiles();
    

    // Funzione renderPlaylist() aggiornata con drag and drop
    function renderPlaylist() {
        if (!playlistElement) return;
        playlistElement.innerHTML = '';
        currentPlaylist.forEach(file => {
            const li = document.createElement('li');
            li.setAttribute('data-name', file.name);
            li.classList.add('draggable');
            li.setAttribute('draggable', 'true');

            const fileNameSpan = document.createElement('span');
            fileNameSpan.textContent = file.name;
            li.appendChild(fileNameSpan);
            
            const actionsContainer = document.createElement('div');
            actionsContainer.classList.add('playlist-item-actions');

            const viewLink = document.createElement('a');
            viewLink.href = file.url;
            viewLink.textContent = 'Visualizza';
            viewLink.target = '_blank';
            viewLink.classList.add('button-link');
            actionsContainer.appendChild(viewLink);

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Rimuovi';
            removeBtn.classList.add('remove-btn');
            removeBtn.addEventListener('click', () => removeFromPlaylist(file));
            actionsContainer.appendChild(removeBtn);

            li.appendChild(actionsContainer);
            playlistElement.appendChild(li);

            // Aggiungi i listener del drag and drop
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('drop', handleDrop);
        });
        updatePlaylistMessage();
    }



    fetchSavedPlaylists();

    let draggedItem = null;

    // Gestione del drag and drop
    function handleDragStart(e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDrop(e) {
        e.preventDefault();
        if (this !== draggedItem) {
            let draggedIndex = Array.from(this.parentNode.children).indexOf(draggedItem);
            let droppedIndex = Array.from(this.parentNode.children).indexOf(this);

            // Riordina la playlist
            let temp = currentPlaylist[draggedIndex];
            currentPlaylist.splice(draggedIndex, 1);
            currentPlaylist.splice(droppedIndex, 0, temp);

            // Salva lo stato e aggiorna l'UI
            savePlaylistStateLocal();
            renderPlaylist();
        }
    }


});