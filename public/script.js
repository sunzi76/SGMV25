document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const pdfUploadInput = document.getElementById('pdf-upload');
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
    const savedPlaylistsListContainer = document.getElementById('saved-playlists-list');
    const savedPlaylistsMessage = document.getElementById('saved-playlists-message');

    const clickedPlaylistPreview = document.getElementById('clicked-playlist-preview');
    const previewPlaylistName = document.getElementById('preview-playlist-name');
    const clickedPreviewFileList = document.getElementById('clicked-preview-file-list');
    const closePreviewBtn = document.getElementById('close-preview-btn');

    const MAX_PLAYLIST_ITEMS = 15;
    
    const API_BASE_URL = 'https://sgmv25-backend.onrender.com/';
    /* Configurazione per file in locale
    const API_BASE_URL = 'http://localhost:3000';
    */
    let availableFiles = [];
    let currentPlaylist = JSON.parse(localStorage.getItem('currentPlaylist')) || [];
    let playlistsCache = {};

    let currentPage = 1;
    const filesPerPage = 5;
    let totalPages = 1;

    const monthNames = [
        "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
    ];

    function savePlaylistStateLocal() {
        localStorage.setItem('currentPlaylist', JSON.stringify(currentPlaylist));
    }

    async function fetchAvailableFiles() {
        const searchTerm = searchInput.value;
        try {
            const response = await fetch(`${API_BASE_URL}/files?page=${currentPage}&limit=${filesPerPage}&search=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) {
                throw new Error('Errore nel caricamento dei file disponibili.');
            }
            const data = await response.json();
            availableFiles = data.files;
            totalPages = data.totalPages;
            renderSearchResults();
            renderPaginationControls();
        } catch (error) {
            console.error('Errore:', error);
            searchResults.innerHTML = `<p style="color: red;">${error.message}</p>`;
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

    async function fetchSavedPlaylists() {
        try {
            const response = await fetch(`${API_BASE_URL}/playlists`);
            if (!response.ok) {
                throw new Error('Errore nel caricamento delle playlist salvate.');
            }
            const data = await response.json();
            renderSavedPlaylistsGrouped(data.playlists);
        } catch (error) {
            console.error('Errore:', error);
            savedPlaylistsMessage.textContent = `Errore: ${error.message}`;
            savedPlaylistsMessage.style.color = 'red';
        }
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

    async function deletePlaylist(playlistId) {
        if (!confirm('Sei sicuro di voler eliminare questa playlist?')) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                alert(data.message);
                delete playlistsCache[playlistId];
                fetchSavedPlaylists();
            } else {
                alert(`Errore nell'eliminazione: ${data.message}`);
            }
        } catch (error) {
            console.error('Errore nell\'eliminazione della playlist:', error);
            alert('Si è verificato un errore durante l\'eliminazione della playlist.');
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