const container = document.getElementById("media-container");
const searchBox = document.getElementById("search");

const audioPlayer = document.getElementById("audio-player");
const videoPlayer = document.getElementById("video-player");
const player = document.getElementById("player");
const playerThumb = document.getElementById("player-thumb");
const playerTitle = document.getElementById("player-title");

let mediaList = [];

// Load media.json
fetch("media.json")
  .then(response => response.json())
  .then(data => {
    mediaList = data;
    renderMedia(mediaList);
  })
  .catch(err => console.error("Error loading media.json:", err));

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
      <img src="${item.thumbnail}" class="thumbnail">
      <h3>${item.title}</h3>
      <p>${item.type.toUpperCase()}</p>
    `;

    card.onclick = () => playMedia(item);
    container.appendChild(card);
  });
}

function playMedia(item) {
  player.style.display = "block";
  playerThumb.src = item.thumbnail;
  playerTitle.textContent = item.title;

  audioPlayer.style.display = "none";
  videoPlayer.style.display = "none";

  if (["mp3", "wav", "ogg"].includes(item.type)) {
    audioPlayer.src = item.file;
    audioPlayer.style.display = "block";
    audioPlayer.play();
  } else if (["mp4", "webm", "mov"].includes(item.type)) {
    videoPlayer.src = item.file;
    videoPlayer.style.display = "block";
    videoPlayer.play();
  }
}

searchBox.addEventListener("input", e => {
  const q = e.target.value.toLowerCase();

  const filtered = mediaList.filter(item =>
    item.title.toLowerCase().includes(q)
  );

  renderMedia(filtered);
});
