const musics = [
  {
    title: "Louvor 1",
    artist: "EasyMusic",
    duration: 477,
    src: "https://easymusic.ai/pt/music/4849658-0c6f1650-8d70-f363-6340-d23c70f0a6db/embed",
    audioSrc: "https://cdn9.easymusic.ai/audios/0c6f1650-8d70-f363-6340-d23c70f0a6db.mp3"
  },
  {
    title: "Sobre Esta Pedra",
    artist: "EasyMusic",
    duration: 477,
    src: "https://easymusic.ai/pt/music/4847517-6e91a80b-001d-f2d8-64c0-24960a3d18ef/embed",
    audioSrc: "https://cdn9.easymusic.ai/audios/6e91a80b-001d-f2d8-64c0-24960a3d18ef.mp3"
  },
  {
    title: "Fe e Te Ver Alem do Meu Olhar",
    artist: "EasyMusic",
    duration: 472,
    src: "https://easymusic.ai/pt/music/4847046-c274f9c3-3b41-fa4f-9fd9-e9b98d4e6c92/embed",
    audioSrc: "https://cdn9.easymusic.ai/audios/c274f9c3-3b41-fa4f-9fd9-e9b98d4e6c92.mp3"
  },
  {
    title: "Majestade Eterna",
    artist: "EasyMusic",
    duration: 416,
    src: "https://easymusic.ai/pt/music/4846809-29585878-5a5d-fb93-6e1f-3e2454ab8ea3/embed",
    audioSrc: "https://cdn9.easymusic.ai/audios/29585878-5a5d-fb93-6e1f-3e2454ab8ea3.mp3"
  },
  {
    title: "Debaixo da Tua Sombra",
    artist: "EasyMusic",
    duration: 399,
    src: "https://easymusic.ai/pt/music/4846598-bc8bd4b5-0c63-f28b-96d9-7ceb3a5ad931/embed",
    audioSrc: "https://cdn9.easymusic.ai/audios/bc8bd4b5-0c63-f28b-96d9-7ceb3a5ad931.mp3"
  }
];

let currentIndex = 0;
let isPlaying = false;
let loadedIndex = null;
let shuffle = false;
let repeatMode = "all";
let autoNextTimer = null;
let turboGain = false;
let audioContext = null;
let audioSource = null;
let gainNode = null;
const audioPlayer = new Audio();
audioPlayer.crossOrigin = "anonymous";

const iframeBox = document.getElementById("iframeBox");
const currentTitle = document.getElementById("currentTitle");
const playPauseBtn = document.getElementById("playPauseBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const musicList = document.getElementById("musicList");
const totalMusics = document.getElementById("totalMusics");
const progressBar = document.getElementById("progressBar");
const currentTimeLabel = document.getElementById("currentTime");
const durationTimeLabel = document.getElementById("durationTime");
const volumeSlider = document.getElementById("volumeSlider");
const turboBtn = document.getElementById("turboBtn");

function renderLibrary() {
  musicList.innerHTML = "";

  musics.forEach((music, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "music-item" + (index === currentIndex ? " selected" : "");
    item.innerHTML = `
      <h3>${index + 1}. ${music.title}</h3>
      <p>${music.artist}</p>
    `;

    item.onclick = () => {
      currentIndex = index;
      playTrack();
    };

    musicList.appendChild(item);
  });
}

function playTrack() {
  const music = musics[currentIndex];
  clearAutoNextTimer();
  loadIframe(music);

  if (turboGain) {
    setupAudioBoost();
  }

  if (audioPlayer.src !== music.audioSrc) {
    audioPlayer.src = music.audioSrc;
  }
  durationTimeLabel.textContent = formatTime(music.duration);
  updateProgress();

  audioPlayer.play()
    .then(() => {
      setPlayingState(true);
      startAutoNextTimer(music.duration);
    })
    .catch(() => {
      setPlayingState(false);
    });

  renderLibrary();
}

function loadIframe(music) {
  if (loadedIndex === currentIndex) {
    currentTitle.textContent = music.title;
    return;
  }

  iframeBox.innerHTML = `
    <iframe
      width="100%"
      height="760"
      src="${music.src}"
      allow="autoplay; web-share"
      loading="lazy"
      title="EasyMusic.AI Player - ${music.title}"
      sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation">
    </iframe>
  `;

  currentTitle.textContent = music.title;
  loadedIndex = currentIndex;
}

function pauseTrack() {
  clearAutoNextTimer();
  audioPlayer.pause();
  setPlayingState(false);
}

function stopTrackVisual() {
  pauseTrack();
  iframeBox.innerHTML = `
    <div class="empty-player">
      Player descarregado.<br>
      Aperte Play para carregar novamente a faixa selecionada.
    </div>
  `;
  loadedIndex = null;
}

function setPlayingState(playing) {
  isPlaying = playing;
  playPauseBtn.innerHTML = `<span class="control-icon">${playing ? "⏸" : "▶"}</span>`;
  playPauseBtn.setAttribute("aria-label", playing ? "Pausar" : "Tocar");
  playPauseBtn.title = playing ? "Pausar" : "Tocar";
  playPauseBtn.classList.toggle("pause", playing);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function updateProgress() {
  const duration = audioPlayer.duration || musics[currentIndex].duration || 0;
  const currentTime = audioPlayer.currentTime || 0;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  progressBar.value = progress;
  progressBar.style.setProperty("--progress", `${progress}%`);
  currentTimeLabel.textContent = formatTime(currentTime);
  durationTimeLabel.textContent = formatTime(duration);
}

function seekTrack() {
  const duration = audioPlayer.duration || musics[currentIndex].duration || 0;

  if (!duration) {
    return;
  }

  audioPlayer.currentTime = (Number(progressBar.value) / 100) * duration;
  updateProgress();

  if (isPlaying) {
    clearAutoNextTimer();
    startAutoNextTimer(duration);
  }
}

function setupAudioBoost() {
  if (gainNode) {
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    }
    return;
  }

  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    audioSource = audioSource || audioContext.createMediaElementSource(audioPlayer);
    gainNode = audioContext.createGain();
    audioSource.connect(gainNode);
    gainNode.connect(audioContext.destination);
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    updateVolume();
  } catch (error) {
    gainNode = null;
    audioPlayer.volume = Number(volumeSlider.value) / 100;
  }
}

function updateVolume() {
  const volume = Number(volumeSlider.value) / 100;
  const gain = turboGain ? 2.2 : 1;

  volumeSlider.style.setProperty("--volume", `${volume * 100}%`);
  audioPlayer.volume = volume;

  if (gainNode) {
    gainNode.gain.value = gain;
  }
}

function toggleTurboGain() {
  setupAudioBoost();
  turboGain = !turboGain;
  updateVolume();
  updateTurboButton();
}

function updateTurboButton() {
  turboBtn.classList.toggle("active", turboGain);
  turboBtn.setAttribute("aria-pressed", String(turboGain));
  turboBtn.setAttribute("aria-label", turboGain ? "Turbo gain ligado" : "Turbo gain desligado");
  turboBtn.title = turboGain ? "Turbo Gain: Ligado" : "Turbo Gain: Desligado";
}

function togglePlay() {
  if (isPlaying) {
    pauseTrack();
    return;
  }

  playTrack();
}

function nextTrack() {
  clearAutoNextTimer();

  if (repeatMode === "one") {
    playTrack();
    return;
  }

  if (shuffle) {
    currentIndex = getRandomIndex();
  } else {
    currentIndex += 1;

    if (currentIndex >= musics.length) {
      if (repeatMode === "all") {
        currentIndex = 0;
      } else {
        currentIndex = musics.length - 1;
        stopTrackVisual();
        return;
      }
    }
  }

  playTrack();
}

function previousTrack() {
  clearAutoNextTimer();

  if (shuffle) {
    currentIndex = getRandomIndex();
  } else {
    currentIndex -= 1;

    if (currentIndex < 0) {
      currentIndex = musics.length - 1;
    }
  }

  playTrack();
}

function startAutoNextTimer(durationInSeconds) {
  if (!durationInSeconds) {
    return;
  }

  autoNextTimer = window.setTimeout(() => {
    nextTrack();
  }, Math.max(durationInSeconds - audioPlayer.currentTime, 0) * 1000);
}

function clearAutoNextTimer() {
  if (autoNextTimer) {
    window.clearTimeout(autoNextTimer);
    autoNextTimer = null;
  }
}

function getRandomIndex() {
  if (musics.length <= 1) {
    return 0;
  }

  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * musics.length);
  } while (randomIndex === currentIndex);

  return randomIndex;
}

function toggleShuffle() {
  shuffle = !shuffle;
  updateShuffleButton();
}

function updateShuffleButton() {
  const shuffleIcon = shuffle
    ? `
      <svg class="shuffle-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h3c4 0 5 10 10 10h3" />
        <path d="M17 14l3 3-3 3" />
        <path d="M4 17h3c2.3 0 3.7-2.6 5-5" />
        <path d="M13 7c1.2-1.3 2.4-2 4-2h3" />
        <path d="M17 2l3 3-3 3" />
      </svg>
    `
    : `
      <svg class="shuffle-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8h12" />
        <path d="M13 5l3 3-3 3" />
        <path d="M4 16h12" />
        <path d="M13 13l3 3-3 3" />
      </svg>
    `;

  shuffleBtn.innerHTML = `
    <span class="control-icon">${shuffleIcon}</span>
    <span class="control-label">Aleatorio</span>
  `;
  shuffleBtn.classList.toggle("active", shuffle);
  shuffleBtn.setAttribute("aria-pressed", String(shuffle));
  shuffleBtn.setAttribute("aria-label", shuffle ? "Aleatorio ligado" : "Aleatorio desligado");
  shuffleBtn.title = shuffle ? "Aleatorio: Ligado" : "Aleatorio: Desligado";
}

function toggleRepeat() {
  if (repeatMode === "all") {
    repeatMode = "one";
    updateRepeatButton();
    return;
  }

  if (repeatMode === "one") {
    repeatMode = "off";
    updateRepeatButton();
    return;
  }

  repeatMode = "all";
  updateRepeatButton();
}

function updateRepeatButton() {
  const repeatLabel = repeatMode === "one" ? "Uma" : repeatMode === "all" ? "Todas" : "Off";
  const repeatAria = repeatMode === "one" ? "Repetir uma" : repeatMode === "all" ? "Repetir todas" : "Repeticao desligada";
  const repeatTitle = repeatMode === "one" ? "Repetir: Uma" : repeatMode === "all" ? "Repetir: Todas" : "Repetir: Desligado";
  const repeatBadge = repeatMode === "one" ? `<span class="repeat-badge" aria-hidden="true">1</span>` : "";

  repeatBtn.innerHTML = `
    <span class="control-icon repeat-icon">↻${repeatBadge}</span>
    <span class="control-label">${repeatLabel}</span>
  `;
  repeatBtn.setAttribute("aria-label", repeatAria);
  repeatBtn.setAttribute("aria-pressed", String(repeatMode !== "off"));
  repeatBtn.title = repeatTitle;
  repeatBtn.classList.toggle("active", repeatMode !== "off");
  repeatBtn.classList.toggle("repeat-one", repeatMode === "one");
}

totalMusics.textContent = musics.length;
updateShuffleButton();
updateRepeatButton();
updateVolume();
updateTurboButton();
audioPlayer.addEventListener("ended", nextTrack);
audioPlayer.addEventListener("timeupdate", updateProgress);
audioPlayer.addEventListener("loadedmetadata", updateProgress);
progressBar.addEventListener("input", seekTrack);
volumeSlider.addEventListener("input", updateVolume);
durationTimeLabel.textContent = formatTime(musics[currentIndex].duration);
updateProgress();
renderLibrary();
