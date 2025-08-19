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

        let data; // La variabile 'data' è ora dichiarata qui, all'inizio della funzione

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

    document.addEventListener('click', (event) => {
        if (event.target.id === 'clear-search-btn') {
            const searchInput = document.getElementById('search-input');
            const clearSearchBtn = event.target;
            searchInput.value = '';
            clearSearchBtn.classList.remove('visible');
            const fileList = document.getElementById('file-list');
            const pagination = document.getElementById('pagination');
            displayFiles(allFiles, 1, fileList, pagination);
        }
    });

    // Gestione del pop-up (apertura e chiusura)
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('show-diagrams-btn')) {
            const filename = event.target.dataset.filename;
            showChordDiagrams(filename);
        }
        if (event.target.classList.contains('close-btn')) {
            const diagramsModal = document.getElementById('diagrams-modal');
            if (diagramsModal) {
                diagramsModal.classList.remove('visible');
                diagramsModal.classList.add('hidden');
            }
        }
    });

    // Caricamento iniziale dei file
    fetchFiles();
});