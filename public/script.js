document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://sgmv25-backend.onrender.com';
    let allFiles = [];
    let currentPage = 1;
    const filesPerPage = 10;

    // Funzione per recuperare i file dal backend
    async function fetchFiles() {
        const fileList = document.getElementById('file-list');
        const pagination = document.getElementById('pagination');
        const searchInput = document.getElementById('search-input');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        const diagramsModal = document.getElementById('diagrams-modal');
        const diagramsContainer = document.getElementById('diagrams-container');
        const diagramsFilename = document.getElementById('diagrams-filename');
        const closeBtn = document.querySelector('.close-btn');

        let data;

        try {
            const response = await fetch(`${API_BASE_URL}/files`);
            if (!response.ok) {
                throw new Error('Errore nel recupero della lista dei file.');
            }
            data = await response.json();
            
            if (Array.isArray(data)) {
                allFiles = data;
                displayFiles(allFiles, currentPage, fileList, pagination);
            } else {
                throw new Error('Formato dati non valido ricevuto dal server.');
            }
        } catch (error) {
            console.error('Errore nel recupero dei file:', error);
            if (fileList) {
                fileList.innerHTML = '<p>Errore nel caricamento dei file. Riprova più tardi.</p>';
            }
        }
    }

    // Funzione per visualizzare i file in base alla paginazione
    function displayFiles(files, page, fileList, pagination) {
        if (!fileList || !pagination) return;
        
        fileList.innerHTML = '';
        const start = (page - 1) * filesPerPage;
        const end = start + filesPerPage;
        const paginatedFiles = files.slice(start, end);

        if (paginatedFiles.length === 0) {
            fileList.innerHTML = '<p>Nessun file trovato.</p>';
            pagination.innerHTML = '';
            return;
        }

        paginatedFiles.forEach(file => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="file-name">${file}</span>
                <div class="button-container">
                    <button class="show-diagrams-btn" data-filename="${file}">Diagrammi Accordi</button>
                    <a href="${API_BASE_URL}/canti_liturgici/${file}" class="button-link" target="_blank">
                        Apri PDF
                    </a>
                    <button class="add-to-playlist-btn" data-filename="${file}">Aggiungi a Playlist</button>
                </div>
            `;
            fileList.appendChild(li);
        });

        setupPagination(files.length, page, pagination);
    }

    // Funzione per impostare la paginazione
    function setupPagination(totalFiles, currentPage, pagination) {
        if (!pagination) return;
        
        const totalPages = Math.ceil(totalFiles / filesPerPage);
        pagination.innerHTML = '';

        if (totalPages > 1) {
            for (let i = 1; i <= totalPages; i++) {
                const pageBtn = document.createElement('span');
                pageBtn.textContent = i;
                pageBtn.classList.add('page-number');
                if (i === currentPage) {
                    pageBtn.classList.add('active');
                }
                pageBtn.addEventListener('click', () => {
                    currentPage = i;
                    displayFiles(allFiles, currentPage, document.getElementById('file-list'), document.getElementById('pagination'));
                });
                pagination.appendChild(pageBtn);
            }
        }
    }

    // Funzione per mostrare i diagrammi degli accordi
    async function showChordDiagrams(filename) {
        const diagramsModal = document.getElementById('diagrams-modal');
        const diagramsContainer = document.getElementById('diagrams-container');
        const diagramsFilename = document.getElementById('diagrams-filename');
        if (!diagramsModal || !diagramsContainer || !diagramsFilename) return;

        diagramsModal.classList.remove('hidden');
        diagramsModal.classList.add('visible');
        diagramsFilename.textContent = filename;
        diagramsContainer.innerHTML = 'Caricamento diagrammi...';

        try {
            const response = await fetch(`${API_BASE_URL}/diagrams/${filename}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Nessuna nota musicale trovata per questo file.');
            }

            const chords = data.notes;
            diagramsContainer.innerHTML = '';

            if (chords.length === 0) {
                diagramsContainer.innerHTML = '<p>Nessuna nota musicale trovata in questo file.</p>';
                return;
            }
            
            for (const chord of chords) {
                const chordKey = chord.trim().replace(/#/, '-sharp-').replace(/-/g, 'min').toLowerCase();
                const diagramImage = `/chord-diagrams/${chordKey}.jpg`; 
                const diagramItem = document.createElement('div');
                diagramItem.classList.add('chord-diagram-item');
                diagramItem.innerHTML = `<h4>${chord}</h4>`;

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

    // Funzione per recuperare e visualizzare le playlist salvate
    async function fetchSavedPlaylists() {
        const savedPlaylistsList = document.getElementById('saved-playlists-list');
        if (!savedPlaylistsList) return;

        try {
            const response = await fetch(`${API_BASE_URL}/playlists`);
            if (!response.ok) {
                throw new Error('Errore nel recupero delle playlist salvate.');
            }
            const playlists = await response.json();
            
            savedPlaylistsList.innerHTML = ''; // Svuota la lista prima di riempirla
            
            if (playlists.length === 0) {
                savedPlaylistsList.innerHTML = '<p>Nessuna playlist salvata.</p>';
                return;
            }
            
            // Ordina per data (il backend lo fa già, ma questo è un controllo di sicurezza)
            playlists.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));

            playlists.forEach(playlist => {
                const li = document.createElement('li');
                const creationDate = new Date(playlist.creationDate);
                const year = creationDate.getFullYear();
                const month = (creationDate.getMonth() + 1).toString().padStart(2, '0');
                const formattedDate = `${year}-${month}`;

                li.innerHTML = `
                    <span class="playlist-date">${formattedDate}</span>
                    <span class="playlist-name">${playlist.name}</span>
                    <div class="saved-playlist-actions">
                        <button class="preview-playlist-btn" data-playlist-name="${playlist.name}">
                            🔍
                        </button>
                        <a href="${API_BASE_URL}/download-playlist/${playlist.name}" class="download-playlist-btn">
                            ⬇️
                        </a>
                        <button class="delete-playlist-btn" data-playlist-id="${playlist.id}">
                            🗑️
                        </button>
                    </div>
                `;
                li.classList.add('saved-playlist-item');
                savedPlaylistsList.appendChild(li);
            });
            
        } catch (error) {
            console.error('Errore nel recupero delle playlist:', error);
            savedPlaylistsList.innerHTML = '<p>Impossibile caricare le playlist.</p>';
        }
    }

    // Funzione per mostrare l'anteprima di una playlist
    async function showPlaylistPreview(playlistName) {
        const previewModal = document.getElementById('clicked-playlist-preview');
        const previewTitle = document.getElementById('preview-playlist-name');
        const previewList = document.getElementById('clicked-preview-file-list');

        if (!previewModal || !previewTitle || !previewList) return;

        previewTitle.textContent = playlistName;
        previewList.innerHTML = 'Caricamento...';
        previewModal.classList.remove('hidden');

        try {
            const response = await fetch(`${API_BASE_URL}/playlists/${playlistName}`);
            const data = await response.json();

            if (data.success && data.playlist) {
                previewList.innerHTML = '';
                if (data.playlist.files.length === 0) {
                    previewList.innerHTML = '<p>La playlist è vuota.</p>';
                    return;
                }
                data.playlist.files.forEach(file => {
                    const li = document.createElement('li');
                    li.textContent = file;
                    previewList.appendChild(li);
                });
            } else {
                previewList.innerHTML = `<p>${data.message || 'Errore nel recupero dei file della playlist.'}</p>`;
            }
        } catch (error) {
            console.error('Errore nel recupero della playlist:', error);
            previewList.innerHTML = '<p>Errore di rete o del server.</p>';
        }
    }


    // Gestione della ricerca
    document.addEventListener('input', (event) => {
        if (event.target.id === 'search-input') {
            const searchInput = event.target;
            const clearSearchBtn = document.getElementById('clear-search-btn');
            const query = searchInput.value.toLowerCase();
            
            if (query.length > 0) {
                clearSearchBtn.classList.add('visible');
            } else {
                clearSearchBtn.classList.remove('visible');
            }

            const filteredFiles = allFiles.filter(file => typeof file === 'string' && file.toLowerCase().includes(query));
            currentPage = 1; 
            const fileList = document.getElementById('file-list');
            const pagination = document.getElementById('pagination');
            displayFiles(filteredFiles, currentPage, fileList, pagination);
        }
    });

    document.addEventListener('click', async (event) => {
        if (event.target.id === 'clear-search-btn') {
            const searchInput = document.getElementById('search-input');
            const clearSearchBtn = event.target;
            searchInput.value = '';
            clearSearchBtn.classList.remove('visible');
            const fileList = document.getElementById('file-list');
            const pagination = document.getElementById('pagination');
            displayFiles(allFiles, 1, fileList, pagination);
        }

        // Handle delete playlist button
        if (event.target.classList.contains('delete-playlist-btn')) {
            const playlistId = event.target.dataset.playlistId;
            const confirmed = confirm("Sei sicuro di voler eliminare questa playlist?");
            if (confirmed) {
                try {
                    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
                        method: 'DELETE',
                    });
                    if (response.ok) {
                        alert('Playlist eliminata con successo!');
                        fetchSavedPlaylists(); // Refresh the list
                    } else {
                        alert('Errore nell\'eliminazione della playlist.');
                    }
                } catch (error) {
                    console.error('Errore durante l\'eliminazione della playlist:', error);
                }
            }
        }


    });

    // Gestione del pop-up, dell'aggiunta alla playlist e del drag and drop
    document.addEventListener('click', function(event) {
        // Gestione dell'apertura del modale dei diagrammi
        if (event.target.classList.contains('show-diagrams-btn')) {
            const filename = event.target.dataset.filename;
            showChordDiagrams(filename);
        }

        // Gestione dell'aggiunta a playlist
        if (event.target.classList.contains('add-to-playlist-btn')) {
            const filename = event.target.dataset.filename;
            const playlist = document.getElementById('playlist');

            // Controllo per evitare duplicati
            let isDuplicate = false;
            for (const item of playlist.children) {
                if (item.dataset.filename === filename) {
                    isDuplicate = true;
                    break;
                }
            }

            if (isDuplicate) {
                alert('Questo brano è già presente nella playlist.');
                return;
            }
            
            // Controlla il limite di 15 brani
            if (playlist.children.length >= 15) {
                alert('Hai raggiunto il limite massimo di 15 brani per la playlist.');
                return;
            }

            // Aggiunge il brano alla playlist
            const li = document.createElement('li');
            li.textContent = filename;
            li.dataset.filename = filename; // Per riferimenti futuri
            li.draggable = true; // Rende l'elemento trascinabile

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Rimuovi';
            removeBtn.classList.add('remove-from-playlist-btn');
            li.appendChild(removeBtn);
            
            playlist.appendChild(li);
        }
        
        // Gestione della rimozione dalla playlist
        if (event.target.classList.contains('remove-from-playlist-btn')) {
            const li = event.target.parentElement;
            li.remove();
        }

        // Gestione della chiusura del modale dei diagrammi
        if (event.target.classList.contains('close-btn')) {
            const diagramsModal = document.getElementById('diagrams-modal');
            if (diagramsModal) {
                diagramsModal.classList.remove('visible');
                diagramsModal.classList.add('hidden');
            }
        }
        
        // Gestione del pulsante "Svuota Playlist"
        if (event.target.id === 'clear-playlist-btn') {
            const playlist = document.getElementById('playlist');
            if (playlist.children.length > 0) {
                const confirmed = confirm("Sei sicuro di voler svuotare la playlist?");
                if (confirmed) {
                    playlist.innerHTML = '';
                }
            }
        }

        // Gestione del pulsante "Salva Playlist"
        if (event.target.id === 'save-playlist-btn') {
            const playlistName = document.getElementById('playlist-name-input').value.trim();
            const playlistItems = document.getElementById('playlist').children;
            const files = [];
            for (const item of playlistItems) {
                files.push(item.dataset.filename);
            }

            const messageDiv = document.getElementById('playlist-save-message');
            
            if (!playlistName) {
                messageDiv.textContent = 'Per favore, inserisci un nome per la playlist.';
                messageDiv.style.color = 'red';
                return;
            }

            if (files.length === 0) {
                messageDiv.textContent = 'La playlist è vuota, aggiungi dei brani prima di salvare.';
                messageDiv.style.color = 'red';
                return;
            }

            // Qui invii i dati al server per il salvataggio
            // Questo è solo un esempio della chiamata API
            (async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/save-playlist`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name: playlistName, files: files }),
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        messageDiv.textContent = `Playlist "${playlistName}" salvata con successo!`;
                        messageDiv.style.color = 'green';
                        document.getElementById('playlist-name-input').value = '';
                        document.getElementById('playlist').innerHTML = '';
                        fetchSavedPlaylists(); // Ricarica la lista delle playlist salvate
                    } else {
                        messageDiv.textContent = result.message || 'Errore nel salvataggio della playlist.';
                        messageDiv.style.color = 'red';
                    }
                } catch (error) {
                    console.error('Errore nel salvataggio della playlist:', error);
                    messageDiv.textContent = 'Errore di rete o del server.';
                    messageDiv.style.color = 'red';
                }
            })();
        }

        // Gestione del click per l'anteprima delle playlist salvate
        if (event.target.classList.contains('saved-playlist-item')) {
            const playlistName = event.target.dataset.playlistName;
            showPlaylistPreview(playlistName);
        }
        // Gestione della chiusura dell'anteprima
        if (event.target.id === 'close-preview-btn') {
            document.getElementById('clicked-playlist-preview').classList.add('hidden');
        }

    });

    // Logica per il Drag and Drop
    const playlist = document.getElementById('playlist');
    let draggedItem = null;

    if (playlist) {
        playlist.addEventListener('dragstart', (e) => {
            draggedItem = e.target;
            setTimeout(() => {
                draggedItem.classList.add('dragging');
            }, 0);
        });

        playlist.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
        });

        playlist.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(playlist, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (afterElement == null) {
                playlist.appendChild(draggable);
            } else {
                playlist.insertBefore(draggable, afterElement);
            }
        });
    }


    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Caricamento iniziale dei file
    fetchFiles();
    fetchSavedPlaylists();
});