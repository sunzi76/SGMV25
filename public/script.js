// Gestione dei click globali
document.addEventListener('click', async function(event) {
    // Gestione dell'apertura del modale dei diagrammi
    if (event.target.classList.contains('show-diagrams-btn')) {
        const filename = event.target.dataset.filename;
        showChordDiagrams(filename);
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
    // Gestione del click per l'anteprima delle playlist salvate
    if (event.target.classList.contains('preview-playlist-btn')) {
        const playlistName = event.target.dataset.playlistName;
        showPlaylistPreview(playlistName);
    }
    // Gestione della chiusura dell'anteprima
    if (event.target.id === 'close-preview-btn') {
        document.getElementById('clicked-playlist-preview').classList.add('hidden');
    }
    // Gestione del pulsante "Elimina"
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
                    fetchSavedPlaylists(); // Ricarica la lista
                } else {
                    alert('Errore nell\'eliminazione della playlist.');
                }
            } catch (error) {
                console.error('Errore durante l\'eliminazione della playlist:', error);
            }
        }
    }
});

// Aggiunge la logica per l'aggiunta alla playlist in una funzione separata
function handleAddtoPlaylist(event) {
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

// Aggiunge la logica per il salvataggio in una funzione separata
async function handleSavePlaylist(event) {
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
}

// Collega i gestori di eventi ai pulsanti specifici
document.getElementById('save-playlist-btn').addEventListener('click', handleSavePlaylist);
document.getElementById('add-to-playlist-btn').addEventListener('click', handleAddtoPlaylist);
document.getElementById('clear-playlist-btn').addEventListener('click', handleClearPlaylist);