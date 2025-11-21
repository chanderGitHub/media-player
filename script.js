const container = document.getElementById("media-container");
const searchBox = document.getElementById("search");

const audioPlayer = document.getElementById("audio-player");
const videoPlayer = document.getElementById("video-player");
const player = document.getElementById("player");
const playerThumb = document.getElementById("player-thumb");
const playerTitle = document.getElementById("player-title");
const playerType = document.getElementById("player-type");
const closePlayer = document.getElementById("close-player");
const waveformBox = document.getElementById("waveform");

let mediaList = [];
let waveformInterval;

/* LOAD media.json */
fetch("media.json")
  .then(res => res.json())
  .then(data => {
    mediaList = data;
    renderMedia(data);
  })
  .catch(err => console.error("media.json Load Error:", err));

/* RENDER MEDIA GRID */
function renderMedia(list) {
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = "<p>No media found</p>";
    return;
  }

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "media-card";

    card.innerHTML = `
      <img src="${item.thumbnail}">
      <h3>${item.title}</h3>
      <p>${item.type.toUpperCase()}</p>
    `;

    card.onclick = () => playMedia(item);
    container.appendChild(card);
  });
}

/* WAVEFORM (COLORFUL BARS) */
function startWaveform() {
  waveformBox.innerHTML = "";
  clearInterval(waveformInterval);

  for (let i = 0; i < 25; i++) {
    const bar = document.createElement("div");
    bar.className = "wave-bar";
    waveformBox.appendChild(bar);
  }

  waveformInterval = setInterval(() => {
    document.querySelectorAll(".wave-bar").forEach(bar => {
      bar.style.height = (10 + Math.random() * 100) + "%";
    });
  }, 150);
}

function stopWaveform() {
  clearInterval(waveformInterval);
  waveformBox.innerHTML = "";
}

/* PLAY MEDIA */
function playMedia(item) {
  player.classList.remove("hidden");

  playerThumb.src = item.thumbnail;
  playerTitle.textContent = item.title;
  playerType.textContent = item.type.toUpperCase();

  audioPlayer.style.display = "none";
  videoPlayer.style.display = "none";

  stopWaveform();

  if (["mp3", "wav", "ogg"].includes(item.type)) {
    audioPlayer.src = item.file;
    audioPlayer.style.display = "block";
    audioPlayer.play();
    startWaveform();
  } else {
    videoPlayer.src = item.file;
    videoPlayer.style.display = "block";
    videoPlayer.play();
  }
}

/* CLOSE PLAYER */
closePlayer.onclick = () => {
  stopWaveform();
  audioPlayer.pause();
  videoPlayer.pause();
  player.classList.add("hidden");
};

/* SEARCH */
searchBox.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  renderMedia(mediaList.filter(x => x.title.toLowerCase().includes(q)));
});

/* KEYBOARD SHORTCUTS */
document.addEventListener("keydown", e => {
  if (e.code === "Space") {
    e.preventDefault();
    if (!player.classList.contains("hidden")) {
      if (!audioPlayer.paused) audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause();
      if (!videoPlayer.paused) videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause();
    }
  }
  if (e.code === "ArrowRight") audioPlayer.currentTime += 5;
  if (e.code === "ArrowLeft") audioPlayer.currentTime -= 5;
});
