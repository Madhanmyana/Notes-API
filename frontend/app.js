const API_BASE_URL = 'https://notes-api-mls1.onrender.com';

// DOM Elements
const notesListContainer = document.getElementById('notes-list-container');
const btnNewNote = document.getElementById('btn-new-note');
const emptyState = document.getElementById('empty-state');
const editorContainer = document.getElementById('editor-container');
const noteForm = document.getElementById('note-form');
const noteIdInput = document.getElementById('note-id');
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const noteCreatedAtSpan = document.getElementById('note-created-at');
const noteModeBadge = document.getElementById('note-mode-badge');
const btnDelete = document.getElementById('btn-delete');
const btnCancel = document.getElementById('btn-cancel');
const appContainer = document.querySelector('.app-container');
const validationError = document.getElementById('validation-error');
const toast = document.getElementById('toast');

// App State
let notes = [];
let currentNoteId = null;

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    fetchNotes();
    
    // Event Listeners
    btnNewNote.addEventListener('click', initNewNote);
    btnCancel.addEventListener('click', closeEditor);
    btnDelete.addEventListener('click', deleteCurrentNote);
    noteForm.addEventListener('submit', handleFormSubmit);
    
    // Real-time validation checking to clear error messages
    noteTitleInput.addEventListener('input', clearValidationError);
    noteContentInput.addEventListener('input', clearValidationError);
});

// Fetch all notes from API
async function fetchNotes() {
    try {
        showLoadingState();
        const response = await fetch(`${API_BASE_URL}/notes/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        notes = await response.json();
        renderNotesList();
    } catch (error) {
        console.error('Error fetching notes:', error);
        showErrorState('Failed to load notes. Please ensure the backend is running and CORS is enabled.');
    }
}

// Render the list of notes in the sidebar
function renderNotesList() {
    if (notes.length === 0) {
        notesListContainer.innerHTML = '<div class="loading-state">No notes found.</div>';
        return;
    }

    notesListContainer.innerHTML = '';
    
    // Sort notes by created_at (newest first)
    const sortedNotes = [...notes].sort((a, b) => {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    sortedNotes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = `note-item ${currentNoteId === note.id ? 'active' : ''}`;
        noteItem.dataset.id = note.id;
        
        // Formatted Date
        const dateStr = formatNoteDate(note.created_at);
        
        // Strip HTML if any for the preview
        const plainContent = note.content || '';
        
        noteItem.innerHTML = `
            <div class="note-item-title">${escapeHTML(note.title || 'Untitled')}</div>
            <div class="note-item-preview">${escapeHTML(plainContent)}</div>
            <span class="note-item-date">${dateStr}</span>
        `;
        
        noteItem.addEventListener('click', () => selectNote(note.id));
        notesListContainer.appendChild(noteItem);
    });
}

// Select and display a note in the editor
function selectNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    currentNoteId = id;
    
    // Update active state in UI list
    document.querySelectorAll('.note-item').forEach(item => {
        if (parseInt(item.dataset.id) === id) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Populate editor fields
    noteIdInput.value = note.id;
    noteTitleInput.value = note.title;
    noteContentInput.value = note.content;
    noteCreatedAtSpan.textContent = `Created on ${formatNoteDate(note.created_at, true)}`;
    noteModeBadge.textContent = 'View & Edit';
    
    // Show Delete button (hidden for new notes)
    btnDelete.classList.remove('hidden');
    clearValidationError();

    // Show editor container, hide empty state
    emptyState.classList.add('hidden');
    editorContainer.classList.remove('hidden');
    
    // Toggle class for mobile view responsive layouts
    appContainer.classList.add('active-editor');
}

// Prepare the editor for creating a new note
function initNewNote() {
    currentNoteId = null;
    
    // Deselect list items
    document.querySelectorAll('.note-item').forEach(item => item.classList.remove('active'));
    
    // Clear editor fields
    noteIdInput.value = '';
    noteTitleInput.value = '';
    noteContentInput.value = '';
    noteCreatedAtSpan.textContent = '';
    noteModeBadge.textContent = 'New Note';
    
    // Hide Delete button
    btnDelete.classList.add('hidden');
    clearValidationError();

    // Show editor container, hide empty state
    emptyState.classList.add('hidden');
    editorContainer.classList.remove('hidden');
    
    // Switch to editor view on mobile
    appContainer.classList.add('active-editor');
    
    // Auto focus title
    noteTitleInput.focus();
}

// Close the editor panel and reset selection
function closeEditor() {
    currentNoteId = null;
    document.querySelectorAll('.note-item').forEach(item => item.classList.remove('active'));
    
    editorContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    
    // Switch back to list view on mobile
    appContainer.classList.remove('active-editor');
}

// Handle Form Submission (Create or Update)
async function handleFormSubmit(event) {
    event.preventDefault();
    clearValidationError();

    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();
    const id = noteIdInput.value ? parseInt(noteIdInput.value) : null;

    // Validate inputs locally based on Pydantic rules
    if (title.length < 3) {
        showValidationError('Title must be at least 3 characters long.');
        return;
    }
    if (content.length < 10) {
        showValidationError('Content must be at least 10 characters long.');
        return;
    }

    const isEdit = id !== null;
    const url = isEdit ? `${API_BASE_URL}/notes/${id}` : `${API_BASE_URL}/notes/`;
    const method = isEdit ? 'PUT' : 'POST';
    
    // Build request payload
    // If backend makes ID optional, we can omit it for POST. 
    // For PUT, the ID needs to be included in the body or matches what the backend expects.
    const payload = {
        title: title,
        content: content
    };

    if (isEdit) {
        payload.id = id;
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        showToast(isEdit ? 'Note updated successfully' : 'Note created successfully');
        
        // Refresh notes list
        await fetchNotes();
        
        // If we created a note, find it in the refreshed array and select it
        if (!isEdit) {
            // Find the most recently created note with the matching title
            const newlyCreated = notes.find(n => n.title === title) || notes[0];
            if (newlyCreated) {
                selectNote(newlyCreated.id);
            } else {
                closeEditor();
            }
        } else {
            selectNote(id);
        }

    } catch (error) {
        console.error('Error saving note:', error);
        showValidationError(`Server error: ${error.message || 'Could not save note.'}`);
    }
}

// Delete Current Note
async function deleteCurrentNote() {
    if (!currentNoteId) return;
    
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/notes/${currentNoteId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        showToast('Note deleted');
        closeEditor();
        await fetchNotes();
    } catch (error) {
        console.error('Error deleting note:', error);
        showToast('Failed to delete note. Try again.', true);
    }
}

// UI State Helper: Show loading in sidebar
function showLoadingState() {
    notesListContainer.innerHTML = '<div class="loading-state">Loading notes...</div>';
}

// UI State Helper: Show error in sidebar
function showErrorState(message) {
    notesListContainer.innerHTML = `<div class="error-state">${escapeHTML(message)}</div>`;
}

// Helper: Show validation error
function showValidationError(message) {
    validationError.textContent = message;
    validationError.classList.remove('hidden');
}

// Helper: Clear validation error
function clearValidationError() {
    validationError.textContent = '';
    validationError.classList.add('hidden');
}

// Helper: Show toast notification
let toastTimeout;
function showToast(message, isError = false) {
    toast.textContent = message;
    if (isError) {
        toast.style.borderColor = 'var(--danger)';
        toast.style.color = 'var(--danger)';
    } else {
        toast.style.borderColor = 'var(--border-color)';
        toast.style.color = 'var(--text-primary)';
    }
    
    toast.classList.add('show');
    toast.classList.remove('hidden');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Helper: Format date
function formatNoteDate(dateString, includeTime = false) {
    if (!dateString) return 'Just now';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Recently';
        
        const options = { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (e) {
        return 'Recently';
    }
}

// Helper: Escape HTML to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
