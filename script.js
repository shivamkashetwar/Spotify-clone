/*
 * Spotify web player clone
 *
 * Folder layout:
 *   songs/
 *     albums.json          ["pal-pal"]   <- list of album folders
 *     <album>/
 *       info.json          { "title", "description", "artist", "songs": ["a.mp3"] }
 *       cover.jpg          (optional - a placeholder is shown if missing)
 *       *.mp3
 *
 * Run it with a local server (e.g. VS Code "Live Server" or `python -m http.server`),
 * because fetch() does not work when you open index.html directly from disk.
 */

// ---------- State ----------
const audio = new Audio();
let songs = [];
let currentFolder = "";
let currentTrack = "";
let currentArtist = "";
let lastVolume = 0.5;
let isSeeking = false;

// ---------- Elements ----------
const $ = (sel) => document.querySelector(sel);
const songListEl = $("#songList");
const cardContainer = $("#cardContainer");
const playBtn = $("#play");
const playIcon = $("#playIcon");
const prevBtn = $("#previous");
const nextBtn = $("#next");
const seekbar = $("#seekbar");
const progress = $("#progress");
const circle = $("#circle");
const songInfoEl = $("#songinfo");
const songTimeEl = $("#songtime");
const volumeInput = $("#volume");
const volumeIcon = $("#volumeIcon");
const muteBtn = $("#muteBtn");
const sidebar = $("#sidebar");

// ---------- Helpers ----------
const formatTime = (s) => {
    if (!Number.isFinite(s) || s < 0) return "00:00";
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(Math.floor(s % 60)).padStart(2, "0");
    return `${m}:${sec}`;
};

const cleanTitle = (file) => file.replace(/\.mp3$/i, "").replace(/_/g, " ").trim();

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return res.json();
}

const trackUrl = (track) => `${currentFolder}/${encodeURIComponent(track)}`;
const setIcon = (el, id) => el.setAttribute("href", `#${id}`);

// ---------- Data loading ----------
async function loadFolder(folder, meta) {
    currentFolder = `songs/${folder}`;
    const info = meta || await fetchJSON(`${currentFolder}/info.json`);
    songs = Array.isArray(info.songs) ? info.songs : [];
    currentArtist = info.artist || "Unknown artist";
    renderSongList();
}

// ---------- Rendering ----------
function renderSongList() {
    songListEl.replaceChildren();

    if (!songs.length) {
        const li = document.createElement("li");
        li.textContent = "No songs in this playlist.";
        songListEl.append(li);
        return;
    }

    for (const song of songs) {
        const li = document.createElement("li");
        li.dataset.track = song;
        li.tabIndex = 0;
        li.innerHTML = `
            <img class="invert" width="34" src="img/music.svg" alt="">
            <div class="info"><div></div><div></div></div>
            <div class="playnow"><span>Play Now</span><img class="invert" src="img/play.svg" alt=""></div>`;
        const [title, artist] = li.querySelectorAll(".info div");
        title.textContent = cleanTitle(song);   // textContent keeps file names safe
        artist.textContent = currentArtist;
        songListEl.append(li);
    }
    highlightCurrent();
}

function highlightCurrent() {
    for (const li of songListEl.children) {
        li.classList.toggle("active", li.dataset.track === currentTrack);
    }
}

function createCard(folder, meta) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.folder = folder;
    card.tabIndex = 0;
    card.innerHTML = `
        <div class="cover">
            <img alt="" loading="lazy">
            <div class="play">
                <svg width="18" height="18"><use href="#i-play"/></svg>
            </div>
        </div>
        <h2></h2>
        <p></p>`;

    const img = card.querySelector("img");
    img.src = `songs/${encodeURIComponent(folder)}/cover.jpg`;
    // No cover.jpg? Swap in a gradient placeholder instead of a broken image.
    img.addEventListener("error", () => {
        const ph = document.createElement("div");
        ph.className = "cover-placeholder";
        img.replaceWith(ph);
    }, { once: true });

    card.querySelector("h2").textContent = meta.title || folder;
    card.querySelector("p").textContent = meta.description || "";
    return card;
}

async function displayAlbums() {
    const folders = await fetchJSON("songs/albums.json");
    const metas = await Promise.all(
        folders.map((f) => fetchJSON(`songs/${encodeURIComponent(f)}/info.json`).catch(() => ({})))
    );
    cardContainer.replaceChildren(...folders.map((f, i) => createCard(f, metas[i])));
    return { folders, metas };
}

// ---------- Playback ----------
function playMusic(track, { autoplay = true } = {}) {
    if (!track) return;
    currentTrack = track;
    audio.src = trackUrl(track);
    songInfoEl.textContent = `${cleanTitle(track)} - ${currentArtist}`;
    songTimeEl.textContent = "00:00 / 00:00";
    updateSeek(0);
    highlightCurrent();
    if (autoplay) audio.play().catch((err) => console.warn("Playback blocked:", err));
}

function playNext() {
    const i = songs.indexOf(currentTrack);
    if (i !== -1 && i + 1 < songs.length) playMusic(songs[i + 1]);
}

function playPrevious() {
    const i = songs.indexOf(currentTrack);
    // Like the real app: restart the song if we're a few seconds in
    if (audio.currentTime > 3 || i <= 0) audio.currentTime = 0;
    else playMusic(songs[i - 1]);
}

function togglePlay() {
    if (!audio.src) return;
    if (audio.paused) audio.play().catch((err) => console.warn("Playback blocked:", err));
    else audio.pause();
}

function updateSeek(percent) {
    const p = Math.min(100, Math.max(0, percent || 0));
    progress.style.width = p + "%";
    circle.style.left = p + "%";
    seekbar.setAttribute("aria-valuenow", Math.round(p));
}

function setVolume(value) {
    audio.volume = value;
    volumeInput.value = Math.round(value * 100);
    setIcon(volumeIcon, value === 0 ? "i-mute" : "i-volume");
    muteBtn.setAttribute("aria-label", value === 0 ? "Unmute" : "Mute");
}

// ---------- Seekbar (click + drag) ----------
function ratioFromEvent(e) {
    const rect = seekbar.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
}

function wireSeekbar() {
    seekbar.addEventListener("pointerdown", (e) => {
        if (!Number.isFinite(audio.duration)) return;
        isSeeking = true;
        seekbar.setPointerCapture(e.pointerId);
        updateSeek(ratioFromEvent(e) * 100);
    });
    seekbar.addEventListener("pointermove", (e) => {
        if (isSeeking) updateSeek(ratioFromEvent(e) * 100);
    });
    seekbar.addEventListener("pointerup", (e) => {
        if (!isSeeking) return;
        isSeeking = false;
        audio.currentTime = audio.duration * ratioFromEvent(e);
    });
    seekbar.addEventListener("keydown", (e) => {
        if (!Number.isFinite(audio.duration)) return;
        if (e.key === "ArrowRight") audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
        if (e.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5);
    });
}

// ---------- Event wiring ----------
function wireEvents() {
    const closeSidebarOnMobile = () => {
        if (window.matchMedia("(max-width: 1200px)").matches) sidebar.classList.remove("open");
    };

    // Song list
    const playFromList = (e) => {
        const li = e.target.closest("li[data-track]");
        if (!li) return;
        playMusic(li.dataset.track);
        closeSidebarOnMobile();
    };
    songListEl.addEventListener("click", playFromList);
    songListEl.addEventListener("keydown", (e) => { if (e.key === "Enter") playFromList(e); });

    // Album cards
    const openAlbum = async (e) => {
        const card = e.target.closest(".card");
        if (!card) return;
        try {
            await loadFolder(card.dataset.folder);
            playMusic(songs[0]);
        } catch (err) {
            console.error("Could not load album:", err);
        }
    };
    cardContainer.addEventListener("click", openAlbum);
    cardContainer.addEventListener("keydown", (e) => { if (e.key === "Enter") openAlbum(e); });

    // Transport
    playBtn.addEventListener("click", togglePlay);
    nextBtn.addEventListener("click", playNext);
    prevBtn.addEventListener("click", playPrevious);

    // Audio -> UI
    audio.addEventListener("play", () => {
        setIcon(playIcon, "i-pause");
        playBtn.setAttribute("aria-label", "Pause");
    });
    audio.addEventListener("pause", () => {
        setIcon(playIcon, "i-play");
        playBtn.setAttribute("aria-label", "Play");
    });
    audio.addEventListener("timeupdate", () => {
        songTimeEl.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        if (audio.duration && !isSeeking) updateSeek((audio.currentTime / audio.duration) * 100);
    });
    audio.addEventListener("ended", playNext);

    wireSeekbar();

    // Volume
    volumeInput.addEventListener("input", (e) => {
        const v = Number(e.target.value) / 100;
        if (v > 0) lastVolume = v;
        setVolume(v);
    });
    muteBtn.addEventListener("click", () => {
        if (audio.volume > 0) {
            lastVolume = audio.volume;
            setVolume(0);
        } else {
            setVolume(lastVolume || 0.5);
        }
    });

    // Sidebar (mobile)
    $("#openSidebar").addEventListener("click", () => sidebar.classList.add("open"));
    $("#closeSidebar").addEventListener("click", () => sidebar.classList.remove("open"));

    // Space bar toggles play/pause
    document.addEventListener("keydown", (e) => {
        if (e.code !== "Space") return;
        if (e.target.closest("input, button, [role='slider']")) return;
        e.preventDefault();
        togglePlay();
    });
}

// ---------- Init ----------
async function main() {
    setVolume(0.5);
    wireEvents();

    try {
        const { folders, metas } = await displayAlbums();
        if (folders.length) {
            await loadFolder(folders[0], metas[0]);
            playMusic(songs[0], { autoplay: false });
        } else {
            cardContainer.textContent = "No playlists found. Add a folder name to songs/albums.json.";
        }
    } catch (err) {
        console.error(err);
        cardContainer.textContent =
            "Couldn't load playlists. Open the project through a local server (not by double-clicking index.html) and check songs/albums.json.";
    }
}

main();
