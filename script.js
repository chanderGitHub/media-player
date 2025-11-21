const container = document.getElementById("media-container");
const searchBox = document.getElementById("search");

const audioPlayer = document.getElementById("audio-player");
const videoPlayer = document.getElementById("video-player");
const player = document.getElementById("player");
const playerThumb = document.getElementById("player-thumb");
const playerTitle = document.getElementById("player-title");
const playerType = document.getElementById("player-type");
const closePlayer = document.getElementById("close-player");

const canvas = document.getElementById("waveform");
const ctx = canvas.getContext("2d");

let mediaList = [];
let animationId = null;
let waveOffset = 0;

/* Resize canvas */
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* Glowing digital waveform */
function startWaveform() {
    cancelAnimationFrame(animationId);

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let width = canvas.width;
        let height = canvas.height;
        let center = height / 2;
        let step = 6;

        waveOffset += 0.04;

        for (let x = 0; x < width; x += step) {

            let barHeight =
                Math.sin((x / 35) + waveOffset) * 28 +
                Math.sin((x / 15) - waveOffset * 1.5) * 16 +
                50;

            ctx.fillStyle = glowGradient();
            ctx.shadowBlur = 18;
            ctx.shadowColor = "#00f5ff";

            ctx.fillRect(x, center - barHeight / 2, 4, barHeight);
        }

        animationId = requestAnimationFrame(draw);
    }

    draw();
}

function stopWaveform() {
    cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* Neon gradient */
function glowGradient() {
    let g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#00eaff");
    g.addColorStop(0.5, "#00ff95");
    g.addColorStop(1, "#0084ff");
    return g;
}

/* Load media.json */
fetch("media.json")
  .then(res => res.json())
  .then(data => {
    mediaList = data;
    renderMedia(data);
  });

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

    audioPlayer.onpause = stopWaveform;
    audioPlayer.onplay = startWaveform;

    startWaveform();
  } else {
    videoPlayer.src = item.file;
    videoPlayer.style.display = "block";
    videoPlayer.play();
  }
}

closePlayer.onclick = () => {
  audioPlayer.pause();
  videoPlayer.pause();
  stopWaveform();
  player.classList.add("hidden");
};

/* Search */
searchBox.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  renderMedia(mediaList.filter(x => x.title.toLowerCase().includes(q)));
});
