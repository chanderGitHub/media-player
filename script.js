const container = document.getElementById("media-container");
const searchBox = document.getElementById("search");

const audioPlayer = document.getElementById("audio-player");
const videoPlayer = document.getElementById("video-player");
const player = document.getElementById("player");
const playerThumb = document.getElementById("player-thumb");
const playerTitle = document.getElementById("player-title");

const shuffleBtn = document.getElementById("shuffle-btn");
const repeatBtn = document.getElementById("repeat-btn");
const downloadBtn = document.getElementById("download-btn");

const themeToggle = document.getElementById("theme-toggle");

const waveform = document.getElementById("waveform");
const waveCtx = waveform.getContext("2d");

let mediaList = [];
let audioContext, analyser, source;
let currentIndex = 0;
let repeatMode = false;
let shuffleMode = false;
let waveStyle = "bars";

// Load media.json
fetch("media.json")
  .then(res => res.json())
  .then(data => { mediaList = data; renderMedia(mediaList); });

function renderMedia(list) {
  container.innerHTML = "";
  list.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "media-card";
    card.innerHTML = `
      <img src="${item.thumbnail}" class="thumbnail">
      <h3>${item.title}</h3>
      <p>${item.type.toUpperCase()}</p>
    `;
    card.onclick = () => playMedia(item, i);
    container.appendChild(card);
  });
}

function playMedia(item, index) {
  currentIndex = index;

  player.style.display = "block";
  playerThumb.src = item.thumbnail;
  playerTitle.textContent = item.title;

  downloadBtn.href = item.file;

  audioPlayer.style.display = "none";
  videoPlayer.style.display = "none";

  if (["mp3", "wav", "ogg"].includes(item.type)) {
    audioPlayer.src = item.file;
    audioPlayer.style.display = "block";
    audioPlayer.play();
    startWaveform();
  } else {
    audioPlayer.pause();
    videoPlayer.src = item.file;
    videoPlayer.style.display = "block";
    videoPlayer.play();
    clearWave();
  }
}

function nextTrack() {
  if (shuffleMode)
    currentIndex = Math.floor(Math.random() * mediaList.length);
  else
    currentIndex = (currentIndex + 1) % mediaList.length;

  playMedia(mediaList[currentIndex], currentIndex);
}

audioPlayer.onended = () => {
  if (repeatMode) audioPlayer.play();
  else nextTrack();
};

// Waveform
function startWaveform() {
  if (!audioContext) audioContext = new AudioContext();

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  source = audioContext.createMediaElementSource(audioPlayer);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  drawWave();
}

function drawWave() {
  requestAnimationFrame(drawWave);

  const buffer = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(buffer);

  waveCtx.clearRect(0, 0, waveform.width, waveform.height);

  const barWidth = waveform.width / buffer.length;

  for (let i = 0; i < buffer.length; i++) {
    const barHeight = buffer[i];

    let color = `hsl(${i * 5}, 100%, 50%)`;

    if (waveStyle === "line") {
      waveCtx.strokeStyle = color;
      waveCtx.beginPath();
      waveCtx.moveTo(i * barWidth, waveform.height);
      waveCtx.lineTo(i * barWidth, waveform.height - barHeight);
      waveCtx.stroke();
    }

    else if (waveStyle === "glow") {
      waveCtx.shadowBlur = 20;
      waveCtx.shadowColor = color;
      waveCtx.fillStyle = color;
      waveCtx.fillRect(i * barWidth, waveform.height - barHeight, barWidth - 1, barHeight);
    }

    else {
      waveCtx.fillStyle = color;
      waveCtx.fillRect(i * barWidth, waveform.height - barHeight, barWidth - 1, barHeight);
    }
  }
}

function clearWave() {
  waveCtx.clearRect(0, 0, waveform.width, waveform.height);
}

// Search
searchBox.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  renderMedia(mediaList.filter(item => item.title.toLowerCase().includes(q)));
});

// Shuffle / Repeat
shuffleBtn.onclick = () => {
  shuffleMode = !shuffleMode;
  shuffleBtn.style.background = shuffleMode ? "green" : "#333";
};

repeatBtn.onclick = () => {
  repeatMode = !repeatMode;
  repeatBtn.style.background = repeatMode ? "green" : "#333";
};

// Dark Mode
themeToggle.onclick = () => {
  document.body.classList.toggle("dark");
};

// Waveform Style Buttons
document.querySelectorAll("#wave-style button").forEach(btn => {
  btn.onclick = () => {
    waveStyle = btn.dataset.style;
  };
});

// Keyboard Shortcuts
document.addEventListener("keydown", e => {
  if (e.code === "Space") {
    if (audioPlayer.style.display === "block")
      audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause();
  }
  if (e.code === "ArrowRight") audioPlayer.currentTime += 5;
  if (e.code === "ArrowLeft") audioPlayer.currentTime -= 5;
});

// Floating Player (Draggable)
let drag = false, offsetX, offsetY;
document.getElementById("drag-handle").onmousedown = e => {
  drag = true;
  offsetX = e.offsetX; offsetY = e.offsetY;
};
document.onmouseup = () => drag = false;
document.onmousemove = e => {
  if (!drag) return;
  player.style.left = (e.clientX - offsetX) + "px";
  player.style.top = (e.clientY - offsetY) + "px";
};
