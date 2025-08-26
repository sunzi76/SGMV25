document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://sgmv25-backend.onrender.com';
    let allFiles = [];
    let currentPage = 1;
    const filesPerPage = 8;
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

    async function fetchFiles() {
        const fileList = document.getElementById('search-results');
        const pagination = document.getElementById('pagination');
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

    function setupPagination(totalFiles, currentPage, pagination) {
        if (!pagination) return;
        const totalPages = Math.ceil(totalFiles / filesPerPage);
        pagination.innerHTML = '';
        if (totalPages > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.textContent = 'Precedente';
            prevBtn.classList.add('page-btn');
            if (currentPage === 1) prevBtn.disabled = true;
            prevBtn.addEventListener('click', () => {
                currentPage--;
                const currentFiles = document.getElementById('search-input').value.trim() !== '' ? 
                                     allFiles.filter(file => typeof file === 'string' && file.toLowerCase().includes(document.getElementById('search-input').value.toLowerCase())) :
                                     allFiles;
                displayFiles(currentFiles, currentPage, document.getElementById('search-results'), document.getElementById('pagination'));
            });
            pagination.appendChild(prevBtn);

            const pageInfo = document.createElement('span');
            pageInfo.textContent = `Pagina ${currentPage} di ${totalPages}`;
            pageInfo.classList.add('page-info');
            pagination.appendChild(pageInfo);

            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Successivo';
            nextBtn.classList.add('page-btn');
            if (currentPage === totalPages) nextBtn.disabled = true;
            nextBtn.addEventListener('click', () => {
                currentPage++;
                const currentFiles = document.getElementById('search-input').value.trim() !== '' ? 
                                     allFiles.filter(file => typeof file === 'string' && file.toLowerCase().includes(document.getElementById('search-input').value.toLowerCase())) :
                                     allFiles;
                displayFiles(currentFiles, currentPage, document.getElementById('search-results'), document.getElementById('pagination'));
            });
            pagination.appendChild(nextBtn);
        }
    }

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

    async function fetchSavedPlaylists() {
        const savedPlaylistsList = document.getElementById('saved-playlists-list');
        if (!savedPlaylistsList) return;
        try {
            const response = await fetch(`${API_BASE_URL}/playlists`);
            if (!response.ok) {
                throw new Error('Errore nel recupero delle playlist salvate.');
            }
            const playlists = await response.json();
            savedPlaylistsList.innerHTML = '';
            if (playlists.length === 0) {
                savedPlaylistsList.innerHTML = '<p>Nessuna playlist salvata.</p>';
                return;
            }
            const playlistsByYear = playlists.reduce((acc, playlist) => {
                const date = new Date(playlist.creationDate);
                const year = date.getFullYear().toString();
                const month = date.getMonth();
                if (!acc[year]) {
                    acc[year] = {};
                }
                if (!acc[year][month]) {
                    acc[year][month] = [];
                }
                acc[year][month].push(playlist);
                return acc;
            }, {});
            const sortedYears = Object.keys(playlistsByYear).sort((a, b) => b - a);
            sortedYears.forEach(year => {
                const yearItem = document.createElement('li');
                yearItem.classList.add('year-item');
                yearItem.innerHTML = `<span class="year-header"><span class="toggle-icon">▶</span> Anno ${year}</span>`;
                const monthsList = document.createElement('ul');
                monthsList.classList.add('months-list', 'hidden');
                const sortedMonths = Object.keys(playlistsByYear[year]).sort((a, b) => b - a);
                sortedMonths.forEach(month => {
                    const monthItem = document.createElement('li');
                    monthItem.classList.add('month-item');
                    monthItem.innerHTML = `<span class="month-header"><span class="toggle-icon">▶</span> ${monthNames[month]}</span>`;
                    const playlistsList = document.createElement('ul');
                    playlistsList.classList.add('playlists-list', 'hidden');
                    playlistsByYear[year][month].sort((a, b) => b.creationDate.localeCompare(a.creationDate)).forEach(playlist => {
                        const playlistLi = document.createElement('li');
                        playlistLi.classList.add('saved-playlist-item');
                        playlistLi.innerHTML = `
                            <span class="playlist-date">${new Date(playlist.creationDate).toLocaleDateString('it-IT')}</span>
                            <span class="playlist-name">${playlist.name}</span>
                            <div class="saved-playlist-actions">
                                <button class="preview-playlist-btn" data-playlist-name="${playlist.name}">
                                    🔍
                                </button>
                                <a href="${API_BASE_URL}/download-playlist/${playlist.name}" class="download-playlist-btn" target="_blank">
                                    ⬇️
                                </a>
                                <button class="delete-playlist-btn" data-playlist-id="${playlist.id}">
                                    🗑️
                                </button>
                            </div>
                        `;
                        playlistsList.appendChild(playlistLi);
                    });
                    monthItem.appendChild(playlistsList);
                    monthsList.appendChild(monthItem);
                });
                yearItem.appendChild(monthsList);
                savedPlaylistsList.appendChild(yearItem);
            });
            savedPlaylistsList.addEventListener('click', (event) => {
                const yearHeader = event.target.closest('.year-header');
                const monthHeader = event.target.closest('.month-header');
                if (yearHeader) {
                    const monthsList = yearHeader.nextElementSibling;
                    if (monthsList) {
                        monthsList.classList.toggle('hidden');
                        yearHeader.querySelector('.toggle-icon').textContent = monthsList.classList.contains('hidden') ? '▶' : '▼';
                    }
                } else if (monthHeader) {
                    const playlistsList = monthHeader.nextElementSibling;
                    if (playlistsList) {
                        playlistsList.classList.toggle('hidden');
                        monthHeader.querySelector('.toggle-icon').textContent = playlistsList.classList.contains('hidden') ? '▶' : '▼';
                    }
                }
            });
        } catch (error) {
            console.error('Errore nel recupero delle playlist:', error);
            savedPlaylistsList.innerHTML = '<p>Impossibile caricare le playlist.</p>';
        }
    }

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

    document.getElementById('uploadPdfForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const fileInput = document.getElementById('pdfFileInput');
        const uploadMessage = document.getElementById('upload-message');
        const uploadWarning = document.getElementById('upload-warning-message');
        const file = fileInput.files[0];
        if (!file) {
            uploadMessage.textContent = 'Per favore, seleziona un file da caricare.';
            uploadMessage.style.color = 'red';
            return;
        }
        if (file.type !== 'application/pdf') {
            uploadMessage.textContent = '⚠️ Errore: Puoi caricare solo file in formato PDF.';
            uploadMessage.style.color = 'red';
            uploadWarning.classList.add('hidden');
            return;
        }
        uploadMessage.textContent = 'Caricamento in corso...';
        uploadMessage.style.color = 'black';
        uploadWarning.classList.add('hidden');
        const formData = new FormData();
        formData.append('pdfFile', file);
        try {
            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            if (response.ok) {
                uploadMessage.textContent = `File "${file.name}" caricato con successo!`;
                uploadMessage.style.color = 'green';
                fetchFiles();
            } else {
                uploadMessage.textContent = result.message || 'Errore durante il caricamento del file.';
                uploadMessage.style.color = 'red';
            }
        } catch (error) {
            console.error('Errore di rete o del server:', error);
            uploadMessage.textContent = 'Errore di rete o del server.';
            uploadMessage.style.color = 'red';
        }
    });

    document.getElementById('search-input').addEventListener('input', (event) => {
        const searchInput = event.target;
        const clearSearchBtn = document.getElementById('clear-search-btn');
        const query = searchInput.value.toLowerCase();
        if (query.length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        const filteredFiles = allFiles.filter(file => typeof file === 'string' && file.toLowerCase().includes(query));
        currentPage = 1; 
        const fileList = document.getElementById('search-results');
        const pagination = document.getElementById('pagination');
        displayFiles(filteredFiles, currentPage, fileList, pagination);
    });

    document.getElementById('clear-search-btn').addEventListener('click', () => {
        const searchInput = document.getElementById('search-input');
        const clearSearchBtn = document.getElementById('clear-search-btn');
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        const fileList = document.getElementById('search-results');
        const pagination = document.getElementById('pagination');
        displayFiles(allFiles, 1, fileList, pagination);
    });

    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('add-to-playlist-btn')) {
            const filename = event.target.dataset.filename;
            const playlist = document.getElementById('playlist');
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
            if (playlist.children.length >= 15) {
                alert('Hai raggiunto il limite massimo di 15 brani per la playlist.');
                return;
            }
            const li = document.createElement('li');
            li.textContent = filename;
            li.dataset.filename = filename;
            li.draggable = true;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Rimuovi';
            removeBtn.classList.add('remove-from-playlist-btn');
            li.appendChild(removeBtn);
            playlist.appendChild(li);
        }
    });

    document.getElementById('playlist').addEventListener('click', function(event) {
        if (event.target.classList.contains('remove-from-playlist-btn')) {
            const li = event.target.parentElement;
            li.remove();
        }
    });

    document.getElementById('clear-playlist-btn').addEventListener('click', function() {
        const playlist = document.getElementById('playlist');
        if (playlist.children.length > 0) {
            const confirmed = confirm("Sei sicuro di voler svuotare la playlist?");
            if (confirmed) {
                playlist.innerHTML = '';
            }
        }
    });

    document.getElementById('save-playlist-btn').addEventListener('click', async function() {
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
                fetchSavedPlaylists();
                const savedPlaylistsSection = document.getElementById('saved-playlists-section');
                savedPlaylistsSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                messageDiv.textContent = result.message || 'Errore nel salvataggio della playlist.';
                messageDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Errore nel salvataggio della playlist:', error);
            messageDiv.textContent = 'Errore di rete o del server.';
            messageDiv.style.color = 'red';
        }
    });

    document.getElementById('saved-playlists-list').addEventListener('click', async function(event) {
        if (event.target.classList.contains('preview-playlist-btn')) {
            const playlistName = event.target.dataset.playlistName;
            showPlaylistPreview(playlistName);
        } else if (event.target.classList.contains('delete-playlist-btn')) {
            const playlistId = event.target.dataset.playlistId;
            const confirmed = confirm("Sei sicuro di voler eliminare questa playlist?");
            if (confirmed) {
                try {
                    const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, {
                        method: 'DELETE',
                    });
                    if (response.ok) {
                        alert('Playlist eliminata con successo!');
                        fetchSavedPlaylists();
                    } else {
                        alert('Errore nell\'eliminazione della playlist.');
                    }
                } catch (error) {
                    console.error('Errore durante l\'eliminazione della playlist:', error);
                }
            }
        }
    });
    
    document.getElementById('close-preview-btn').addEventListener('click', function() {
        document.getElementById('clicked-playlist-preview').classList.add('hidden');
    });

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
    
    document.querySelector('a[href="#saved-playlists-section"]').addEventListener('click', (event) => {
        event.preventDefault();
        fetchSavedPlaylists();
        const targetSection = document.getElementById('saved-playlists-section');
        targetSection.scrollIntoView({ behavior: 'smooth' });
    });

    fetchFiles();
    fetchSavedPlaylists();
});