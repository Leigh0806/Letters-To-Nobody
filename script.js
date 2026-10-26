
"use strict";

const STORAGE_KEY = "lettersToNobody.entries.v1";

const form = document.getElementById("entry-form");
const dateInput = document.getElementById("entry-date");
const titleInput = document.getElementById("entry-title");
const bodyInput = document.getElementById("entry-body");
const saveButton = document.getElementById("save-button");
const newButton = document.getElementById("new-button");
const statusMessage = document.getElementById("form-status");
const entriesList = document.getElementById("entries-list");
const emptyMessage = document.getElementById("empty-message");
const entryCount = document.getElementById("entry-count");
const searchInput = document.getElementById("search-entries");
const exportButton = document.getElementById("export-button");

let entries = [];
let editingId = null;

// Get today's date in the computer's local time.
function todayAsISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;

    return new Date(now.getTime() - offset)
        .toISOString()
        .slice(0, 10);
}

// Read saved entries from this browser.
function loadEntries() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved === null) {
            entries = [];
            return;
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            throw new Error("The saved diary data is not a list.");
        }

        entries = parsed.filter(entry =>
            entry &&
            typeof entry.id === "string" &&
            typeof entry.date === "string" &&
            typeof entry.title === "string" &&
            typeof entry.body === "string"
        );
    } catch (error) {
        entries = [];

        showStatus(
            "The diary could not be loaded. Your saved data may need recovery. " +
            "Do not save new entries until you have checked your browser storage."
        );

        console.error("Diary loading error:", error);
    }
}

// Save the full collection to browser storage.
function storeEntries() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        return true;
    } catch (error) {
        showStatus(
            "Saving failed. Your browser may be out of storage space. " +
            "Copy your writing somewhere safe before continuing."
        );

        console.error("Diary saving error:", error);
        return false;
    }
}

function showStatus(message) {
    statusMessage.textContent = message;
}

function formatDate(dateString) {
    const parts = dateString.split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    const date = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

// Create elements safely without treating diary text as HTML.
function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function renderEntries() {
    entriesList.replaceChildren();

    const query = searchInput.value.trim().toLowerCase();

    const sortedEntries = [...entries].sort((a, b) => {
        if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
        }

        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });

    const visibleEntries = sortedEntries.filter(entry => {
        const searchable = (entry.title + " " + entry.body).toLowerCase();
        return searchable.includes(query);
    });

    entryCount.textContent =
        entries.length + (entries.length === 1 ? " PAGE" : " PAGES");

    emptyMessage.hidden = visibleEntries.length > 0;

    if (entries.length === 0) {
        emptyMessage.textContent =
            "Your pages will live here. Write your first entry whenever you're ready. ♡";
    } else if (visibleEntries.length === 0) {
        emptyMessage.textContent =
            "No pages match that search. Try another word.";
    }

    for (const entry of visibleEntries) {
        const card = makeElement("article", "entry-card");

        const date = makeElement(
            "p",
            "entry-date",
            formatDate(entry.date).toUpperCase()
        );

        const title = makeElement("h3", "", entry.title);

        const previewText = entry.body.length > 240
            ? entry.body.slice(0, 240) + "…"
            : entry.body;

        const preview = makeElement("p", "entry-preview", previewText);

        const actions = makeElement("div", "entry-actions");

        const openButton = makeElement("button", "", "OPEN / EDIT");
        openButton.type = "button";
        openButton.addEventListener("click", () => openEntry(entry.id));

        const deleteButton = makeElement(
            "button",
            "secondary danger",
            "DELETE"
        );
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => deleteEntry(entry.id));

        actions.append(openButton, deleteButton);
        card.append(date, title, preview, actions);
        entriesList.append(card);
    }
}

function openEntry(id) {
    const entry = entries.find(item => item.id === id);

    if (!entry) {
        showStatus("That entry could not be found.");
        return;
    }

    editingId = entry.id;
    dateInput.value = entry.date;
    titleInput.value = entry.title;
    bodyInput.value = entry.body;

    saveButton.textContent = "SAVE CHANGES ♡";
    showStatus("You're editing an existing page. Your original stays saved until you save changes.");

    document.getElementById("writing-desk").scrollIntoView({
        behavior: "smooth"
    });

    titleInput.focus({ preventScroll: true });
}

function resetEditor() {
    editingId = null;
    form.reset();
    dateInput.value = todayAsISO();
    saveButton.textContent = "SAVE TO MY DIARY ♡";
    showStatus("A fresh page, whenever you're ready.");
}

form.addEventListener("submit", event => {
    event.preventDefault();

    const date = dateInput.value;
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!date || !title || !body) {
        showStatus("Please fill in the date, title and entry.");
        return;
    }

    const now = new Date().toISOString();

    if (editingId !== null) {
        const index = entries.findIndex(entry => entry.id === editingId);

        if (index === -1) {
            showStatus("That entry no longer exists. Start a new entry instead.");
            return;
        }

        const previousEntry = entries[index];

        entries[index] = {
            ...previousEntry,
            date,
            title,
            body,
            updatedAt: now
        };
    } else {
        entries.push({
            id: crypto.randomUUID(),
            date,
            title,
            body,
            createdAt: now,
            updatedAt: now
        });
    }

    if (!storeEntries()) {
        // Restore the previous saved collection if storage fails.
        loadEntries();
        renderEntries();
        return;
    }

    const message = editingId !== null
        ? "Your changes have been saved. ♡"
        : "Your entry has been tucked safely into the archive. ♡";

    resetEditor();
    showStatus(message);
    renderEntries();
});

newButton.addEventListener("click", () => {
    resetEditor();

    document.getElementById("writing-desk").scrollIntoView({
        behavior: "smooth"
    });

    titleInput.focus({ preventScroll: true });
});

function deleteEntry(id) {
    const entry = entries.find(item => item.id === id);

    if (!entry) {
        return;
    }

    const confirmed = window.confirm(
        'Delete "' + entry.title + '" permanently from this browser? ' +
        "Export a backup first if you may want it later."
    );

    if (!confirmed) {
        return;
    }

    const previousEntries = entries;
    entries = entries.filter(item => item.id !== id);

    if (!storeEntries()) {
        entries = previousEntries;
        renderEntries();
        return;
    }

    if (editingId === id) {
        resetEditor();
    }

    showStatus("The entry has been deleted.");
    renderEntries();
}

searchInput.addEventListener("input", renderEntries);

// Download a backup of all diary entries as a JSON file.
exportButton.addEventListener("click", () => {
    try {
        
const backup = {
    app: "Letters to Nobody",
    version: 2,
    exportedAt: new Date().toISOString(),
    entries,
    books,
    quotes,
    songs,
    movies
	memories: memoryWallItems,
};


        const blob = new Blob(
            [JSON.stringify(backup, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "letters-to-nobody-backup.json";
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        showStatus(
            "Your backup has been prepared. Keep it somewhere private and safe."
        );
    } catch (error) {
        showStatus("The backup could not be created.");
        console.error("Backup error:", error);
    }
});

// Start the diary.
dateInput.value = todayAsISO();
loadEntries();

/* =========================================
   SCRAPBOOK COLLECTIONS
   Each collection has its own localStorage key.
   ========================================= */

const BOOKS_KEY = "lettersToNobody.books.v1";
const QUOTES_KEY = "lettersToNobody.quotes.v1";
const SONGS_KEY = "lettersToNobody.songs.v1";
const MOVIES_KEY = "lettersToNobody.movies.v1";

let books = readCollection(BOOKS_KEY);
let quotes = readCollection(QUOTES_KEY);
let songs = readCollection(SONGS_KEY);
let movies = readCollection(MOVIES_KEY);

function newId() {
    if (window.crypto && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function readCollection(key) {
    try {
        const raw = localStorage.getItem(key);

        if (raw === null) return [];

        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            throw new Error("Collection data is not a list.");
        }

        return parsed;
    } catch (error) {
        console.error("Could not read collection:", key, error);
        alert(
            "One scrapbook collection could not be loaded. " +
            "Check your browser storage before making changes."
        );
        return [];
    }
}

function saveCollection(key, collection) {
    try {
        localStorage.setItem(key, JSON.stringify(collection));
        return true;
    } catch (error) {
        alert(
            "This collection could not be saved. " +
            "Your browser may be out of storage space. " +
            "Export or copy your important items before continuing."
        );

        console.error("Could not save collection:", key, error);
        return false;
    }
}

function safeText(tag, className, value) {
    const el = document.createElement(tag);

    if (className) el.className = className;

    el.textContent = value == null ? "" : String(value);
    return el;
}

function addDeleteButton(parent, label, callback) {
    const button = safeText("button", "secondary danger", label);
    button.type = "button";
    button.addEventListener("click", callback);
    parent.append(button);
}

function confirmDelete(label) {
    return window.confirm(
        'Remove "' + label + '" from this scrapbook?'
    );
}

/* ---------- BOOKCASE ---------- */

const bookForm = document.getElementById("book-form");
const bookshelf = document.getElementById("bookshelf");
const quoteBook = document.getElementById("quote-book");
const quoteForm = document.getElementById("quote-form");
const quotesList = document.getElementById("quotes-list");

function renderBooks() {
    bookshelf.replaceChildren();

    quoteBook.replaceChildren(
        new Option("Choose a book", "")
    );

    if (books.length === 0) {
        const note = safeText(
            "p",
            "collection-empty",
            "Your shelves are waiting for their first story."
        );
        bookshelf.append(note);
    }

    books.forEach(book => {
        const spine = safeText("button", "book-spine " + book.colour, "");
        spine.type = "button";
        spine.title = book.title + (book.author ? " by " + book.author : "");
        spine.setAttribute("aria-label", "View quotes from " + book.title);

        spine.append(
            safeText("span", "spine-mark", "✳"),
            safeText("span", "spine-title", book.title),
            safeText("span", "spine-mark", "♡")
        );

        spine.addEventListener("click", () => {
            quoteBook.value = book.id;
            renderQuotes();
            document.getElementById("quote-desk").scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });

        const wrapper = document.createElement("div");
        wrapper.append(spine);

        addDeleteButton(wrapper, "REMOVE", () => {
            if (!confirmDelete(book.title)) return;

            const oldBooks = books;
            const oldQuotes = quotes;

            books = books.filter(item => item.id !== book.id);
            quotes = quotes.filter(item => item.bookId !== book.id);

            if (
                !saveCollection(BOOKS_KEY, books) ||
                !saveCollection(QUOTES_KEY, quotes)
            ) {
                books = oldBooks;
                quotes = oldQuotes;
                saveCollection(BOOKS_KEY, books);
                saveCollection(QUOTES_KEY, quotes);
            }

            renderBooks();
            renderQuotes();
        });

        bookshelf.append(wrapper);

        const option = new Option(
            book.title + (book.author ? " · " + book.author : ""),
            book.id
        );

        quoteBook.add(option);
    });
}

bookForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = document.getElementById("book-title").value.trim();
    const author = document.getElementById("book-author").value.trim();
    const colour = document.getElementById("book-colour").value;

    if (!title) return;

    const book = {
        id: newId(),
        title,
        author,
        colour,
        createdAt: new Date().toISOString()
    };

    books.push(book);

    if (!saveCollection(BOOKS_KEY, books)) {
        books = books.filter(item => item.id !== book.id);
        return;
    }

    bookForm.reset();
    renderBooks();
});

/* ---------- QUOTE COLLECTION ---------- */

function renderQuotes() {
    quotesList.replaceChildren();

    const selectedBook = quoteBook.value;
    const visibleQuotes = quotes.filter(quote =>
        !selectedBook || quote.bookId === selectedBook
    );

    if (visibleQuotes.length === 0) {
        quotesList.append(
            safeText(
                "p",
                "collection-empty",
                selectedBook
                    ? "No quotes saved from this book yet."
                    : "Your favourite lines will be pressed here."
            )
        );
        return;
    }

    visibleQuotes.slice().reverse().forEach(quote => {
        const card = safeText("article", "quote-card", "");

        card.append(safeText("blockquote", "", "“" + quote.text + "”"));

        const book = books.find(item => item.id === quote.bookId);
        let source = book ? book.title : "Unknown book";

        if (book && book.author) source += " · " + book.author;
        if (quote.page) source += " · " + quote.page;

        card.append(safeText("p", "quote-source", source));

        if (quote.note) {
            card.append(safeText("p", "quote-note", quote.note));
        }

        addDeleteButton(card, "REMOVE QUOTE", () => {
            if (!confirmDelete("this quote")) return;

            const oldQuotes = quotes;
            quotes = quotes.filter(item => item.id !== quote.id);

            if (!saveCollection(QUOTES_KEY, quotes)) {
                quotes = oldQuotes;
                return;
            }

            renderQuotes();
        });

        quotesList.append(card);
    });
}

quoteForm.addEventListener("submit", event => {
    event.preventDefault();

    const bookId = quoteBook.value;
    const text = document.getElementById("quote-text").value.trim();
    const page = document.getElementById("quote-page").value.trim();
    const note = document.getElementById("quote-note").value.trim();

    if (!bookId || !text) return;

    const quote = {
        id: newId(),
        bookId,
        text,
        page,
        note,
        createdAt: new Date().toISOString()
    };

    quotes.push(quote);

    if (!saveCollection(QUOTES_KEY, quotes)) {
        quotes = quotes.filter(item => item.id !== quote.id);
        return;
    }

    quoteForm.reset();
    quoteBook.value = bookId;
    renderQuotes();
});

quoteBook.addEventListener("change", renderQuotes);

/* ---------- MUSIC ROOM / VINYL CRATE ---------- */

const songForm = document.getElementById("song-form");
const songSearch = document.getElementById("search-songs");
const vinylCrate = document.getElementById("vinyl-crate");
const songsEmpty = document.getElementById("songs-empty");
const songDetail = document.getElementById("song-detail");

songForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = document.getElementById("song-title").value.trim();
    const artist = document.getElementById("song-artist").value.trim();
    const album = document.getElementById("song-album").value.trim();
    const link = document.getElementById("song-link").value.trim();
    const memory = document.getElementById("song-memory").value.trim();

    if (!title || !artist) return;

    // Only allow ordinary web links.
    if (link && !/^https?:\/\//i.test(link)) {
        alert("Please enter a valid link starting with https:// or http://");
        return;
    }

    const song = {
        id: newId(),
        title,
        artist,
        album,
        link,
        memory,
        createdAt: new Date().toISOString()
    };

    songs.push(song);

    if (!saveCollection(SONGS_KEY, songs)) {
        songs = songs.filter(item => item.id !== song.id);
        return;
    }

    songForm.reset();
    renderSongs();
});

function renderSongs() {
    vinylCrate.replaceChildren();
    songDetail.hidden = true;
    songDetail.replaceChildren();

    const query = songSearch.value.trim().toLowerCase();

    const visibleSongs = songs.filter(song =>
        [song.title, song.artist, song.album]
            .join(" ")
            .toLowerCase()
            .includes(query)
    );

    songsEmpty.hidden = visibleSongs.length > 0;

    songsEmpty.textContent = songs.length === 0
        ? "Your first favourite song is waiting to be filed here."
        : "No records match that search. Try another title or artist.";

    visibleSongs.slice().reverse().forEach(song => {
        const card = safeText("button", "vinyl-card", "");
        card.type = "button";

        const disc = safeText("span", "vinyl-disc", "");
        disc.append(
            safeText(
                "span",
                "vinyl-label",
                song.title + "\n" + song.artist
            )
        );

        card.append(
            disc,
            safeText("h3", "", song.title),
            safeText("p", "", song.artist),
            safeText("p", "", song.album || "Single / album not listed")
        );

        card.addEventListener("click", () => showSongDetails(song));
        vinylCrate.append(card);
    });
}

function showSongDetails(song) {
    songDetail.replaceChildren();
    songDetail.hidden = false;

    songDetail.append(
        safeText("p", "section-label", "RECORD NOTES"),
        safeText("h3", "", song.title),
        safeText("p", "", "Artist: " + song.artist)
    );

    if (song.album) {
        songDetail.append(
            safeText("p", "", "Album: " + song.album)
        );
    }

    if (song.memory) {
        songDetail.append(
            safeText("p", "movie-note", "My memory: " + song.memory)
        );
    }

    if (song.link) {
        const link = safeText("a", "", "OPEN SONG LINK ↗");
        link.href = song.link;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        songDetail.append(link);
    }

    addDeleteButton(songDetail, "REMOVE RECORD", () => {
        if (!confirmDelete(song.title)) return;

        const oldSongs = songs;
        songs = songs.filter(item => item.id !== song.id);

        if (!saveCollection(SONGS_KEY, songs)) {
            songs = oldSongs;
            return;
        }

        renderSongs();
    });

    songDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

songSearch.addEventListener("input", renderSongs);

/* ---------- CINEMA / FILM JOURNAL ---------- */

const movieForm = document.getElementById("movie-form");
const movieSearch = document.getElementById("search-movies");
const moviesList = document.getElementById("movies-list");
const moviesEmpty = document.getElementById("movies-empty");

movieForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = document.getElementById("movie-title").value.trim();
    const year = document.getElementById("movie-year").value;
    const rating = document.getElementById("movie-rating").value;
    const scene = document.getElementById("movie-scene").value.trim();
    const quote = document.getElementById("movie-quote").value.trim();
    const review = document.getElementById("movie-review").value.trim();

    if (!title) return;

    const movie = {
        id: newId(),
        title,
        year,
        rating,
        scene,
        quote,
        review,
        createdAt: new Date().toISOString()
    };

    movies.push(movie);

    if (!saveCollection(MOVIES_KEY, movies)) {
        movies = movies.filter(item => item.id !== movie.id);
        return;
    }

    movieForm.reset();
    renderMovies();
});

function renderMovies() {
    moviesList.replaceChildren();

    const query = movieSearch.value.trim().toLowerCase();

    const visibleMovies = movies.filter(movie =>
        [
            movie.title,
            movie.year,
            movie.scene,
            movie.quote,
            movie.review
        ].join(" ").toLowerCase().includes(query)
    );

    moviesEmpty.hidden = visibleMovies.length > 0;
    moviesEmpty.textContent = movies.length === 0
        ? "The lights are low. Your first film is yet to be filed."
        : "No films match that search. Try another title or scene.";

    visibleMovies.slice().reverse().forEach(movie => {
        const card = safeText("article", "movie-card", "");
        const poster = safeText("div", "movie-poster", "");

        poster.append(
            safeText("span", "", "LETTERS TO NOBODY · CINEMA"),
            safeText("h3", "", movie.title),
            safeText("p", "", movie.year || "YEAR UNKNOWN")
        );

        card.append(poster);

        const rating = Math.max(1, Math.min(5, Number(movie.rating) || 5));
        card.append(
            safeText("p", "movie-rating", "★".repeat(rating) + "☆".repeat(5 - rating))
        );

        if (movie.scene) {
            card.append(
                safeText("p", "movie-note", "Favourite scene: " + movie.scene)
            );
        }

        if (movie.quote) {
            card.append(
                safeText("p", "movie-note", "“" + movie.quote + "”")
            );
        }

        if (movie.review) {
            card.append(
                safeText("p", "movie-note", movie.review)
            );
        }

        addDeleteButton(card, "REMOVE FILM", () => {
            if (!confirmDelete(movie.title)) return;

            const oldMovies = movies;
            movies = movies.filter(item => item.id !== movie.id);

            if (!saveCollection(MOVIES_KEY, movies)) {
                movies = oldMovies;
                return;
            }

            renderMovies();
        });

        moviesList.append(card);
    });
}

movieSearch.addEventListener("input", renderMovies);

/* ---------- INITIALISE THE SCRAPBOOK ---------- */

renderBooks();
renderQuotes();
renderSongs();
renderMovies();

/* =================================
   MEMORY WALL: SAVE, DISPLAY, DELETE
   ================================= */

const memoryWallStorageKey = "lettersToNobody.memories.v1";

let memoryWallItems = [];

try {
  const storedMemories = localStorage.getItem(memoryWallStorageKey);
  memoryWallItems = storedMemories ? JSON.parse(storedMemories) : [];

  if (!Array.isArray(memoryWallItems)) {
    memoryWallItems = [];
  }
} catch (error) {
  console.error("Could not load Memory Wall data:", error);
  memoryWallItems = [];
}

function saveMemoryWallItems() {
  try {
    localStorage.setItem(
      memoryWallStorageKey,
      JSON.stringify(memoryWallItems)
    );
    return true;
  } catch (error) {
    alert(
      "Your memory could not be saved. Your browser storage may be full. " +
      "Export a backup and try removing a large photo or note."
    );
    console.error("Could not save Memory Wall data:", error);
    return false;
  }
}

function renderMemoryWall() {
  const grid = document.getElementById("memory-grid");
  const emptyMessage = document.getElementById("memory-empty");

  if (!grid || !emptyMessage) return;

  grid.replaceChildren();
  emptyMessage.hidden = memoryWallItems.length > 0;

  memoryWallItems.forEach((memory) => {
    const card = document.createElement("article");
    card.className = "memory-polaroid";

    if (memory.image) {
      const image = document.createElement("img");
      image.alt = memory.caption || "A saved memory";
      image.loading = "lazy";
      image.src = memory.image;

      image.addEventListener("error", () => {
        const placeholder = document.createElement("div");
        placeholder.className = "memory-no-photo";
        placeholder.textContent =
          "Photo not found. Check the photo path in your memory.";
        image.replaceWith(placeholder);
      }, { once: true });

      card.appendChild(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "memory-no-photo";
      placeholder.textContent = "A little moment, kept forever ♡";
      card.appendChild(placeholder);
    }

    const caption = document.createElement("h3");
    caption.className = "memory-caption";
    caption.textContent = memory.caption || "Untitled memory";
    card.appendChild(caption);

    if (memory.date) {
      const date = document.createElement("p");
      date.className = "memory-date";
      date.textContent = memory.date;
      card.appendChild(date);
    }

    if (memory.note) {
      const note = document.createElement("p");
      note.className = "memory-note";
      note.textContent = memory.note;
      card.appendChild(note);
    }

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "memory-delete";
    deleteButton.textContent = "Remove memory";

    deleteButton.addEventListener("click", () => {
      const confirmed = confirm(
        "Remove this memory from your wall?"
      );

      if (!confirmed) return;

      const previousItems = memoryWallItems;
      memoryWallItems = memoryWallItems.filter(
        (item) => item.id !== memory.id
      );

      if (saveMemoryWallItems()) {
        renderMemoryWall();
      } else {
        memoryWallItems = previousItems;
      }
    });

    card.appendChild(deleteButton);
    grid.appendChild(card);
  });
}

const memoryWallForm = document.getElementById("memory-form");

if (memoryWallForm) {
  memoryWallForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const caption = document
      .getElementById("memory-caption").value.trim();

    const date = document
      .getElementById("memory-date").value;

    const image = document
      .getElementById("memory-image").value.trim();

    const note = document
      .getElementById("memory-note").value.trim();

    if (!caption) {
      alert("Give your memory a little title first.");
      return;
    }

    const memory = {
      id: Date.now().toString() + "-" +
          Math.random().toString(36).slice(2, 8),
      caption,
      date,
      image,
      note
    };

    memoryWallItems.unshift(memory);

    if (saveMemoryWallItems()) {
      memoryWallForm.reset();
      renderMemoryWall();
    } else {
      memoryWallItems.shift();
    }
  });
}

renderMemoryWall();

renderEntries();
