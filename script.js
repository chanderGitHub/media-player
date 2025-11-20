/* Advanced media-player script
   - expects media.json at repo root
   - media.json entries: file (path), type (ext), title, thumbnail, description, lyrics, date
*/
const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

const uploadBtn = qs('#upload-btn');
const darkToggle = qs('#dark-toggle');
const searchInput = qs('#search');
const filterType = qs('#filter-type');
const sortBy = qs('#sort-by');
const stats = qs('#stats');
const libraryEl = qs('#library');
const playlistEl = qs('#playlist');
const clearPlaylistBtn = qs('#clear-playlist');

const playerSection = qs('#player');
const playerThumb = qs('#player-thumb');
const playerTitle = qs('#player-title');
const playerDesc = qs('#player-desc');
const audioEl = qs('#audio');
const videoEl = qs('#video');
const playBtn = qs('#play');
const prevBtn = qs('#prev');
const nextBtn = qs('#next');
const shuffleBtn = qs('#shuffle');
const repeatBtn = qs('#repeat');
const volumeEl = qs('#volume');
const progressEl = qs('#progress');
const curTimeEl = qs('#cur-time');
const durTimeEl = qs('#dur-time');
const waveCanvas = qs('#wave');
const toggleLyrics = qs('#toggle-lyrics');
const lyricsEl = qs('#lyrics');

let mediaList = [];
let filtered = [];
let playlist = []; // array of file paths
let currIndex = -1;
let isPlaying = false;
let shuffle = false;
let repeatMode = 'none'; // none | one | all

// AudioContext for waveform
let audioCtx, analyser, sourceNode;
const canvasCtx = waveCanvas.getContext('2d');

function humanTime(s){
  if (!isFinite(s) || s<=0) return '0:00';
  const m = Math.floor(s/60), sec = Math.floor(s%60);
  return `${m}:${String(sec).padStart(2,'0')}`;
}

function safeFetchJSON(url){
  return fetch(url + '?v=' + Date.now(), {cache:'no-store'}).then(r=>{
    if(!r.ok) throw new Error('fetch failed '+r.status);
    return r.json();
  });
}

function loadMedia(){
  safeFetchJSON('media.json').then(data=>{
    mediaList = Array.isArray(data) ? data : [];
    // normalize: ensure fields exist
    mediaList = mediaList.map(it => {
      return {
        file: it.file || it.src || it.path || '',
        type: (it.type || '').toString().toLowerCase(),
        title: it.title || (it.file || '').split('/').pop(),
        thumbnail: it.thumbnail || '',
        description: it.description || '',
        lyrics: it.lyrics || '',
        date: it.date || ''
      };
    });
    filtered = [...mediaList];
    renderLibrary();
    updateStats();
  }).catch(e=>{
    console.error(e);
    libraryEl.innerHTML = `<div style="color:#888;padding:12px">Failed to load media.json — check path & CORS. Error: ${e.message}</div>`;
    stats.textContent = '0 items';
  });
}

function renderLibrary(){
  libraryEl.innerHTML = '';
  if(filtered.length===0){
    libraryEl.innerHTML = `<div style="padding:14px;color:#666">No media found</div>`;
    stats.textContent = '0 items shown';
    return;
  }
  filtered.forEach((it, idx)=>{
    const card = document.createElement('div');
    card.className = 'media-card';
    const thumb = it.thumbnail || '';
    card.innerHTML = `
      <img loading="lazy" class="thumbnail" src="${thumb}" onerror="this.style.opacity=.3;this.src='data:,'">
      <h4 style="margin:6px 0 4px">${escapeHtml(it.title)}</h4>
      <div style="color:var(--muted);font-size:13px">${escapeHtml(it.type.toUpperCase())}</div>
    `;
    card.onclick = () => {
      // play this item (find index within filtered)
      playByFile(it.file);
    };
    // context menu: add to playlist
    card.oncontextmenu = (ev) => { ev.preventDefault(); addToPlaylist(it.file); return false; };
    libraryEl.appendChild(card);
  });
  updateStats();
}

function updateStats(){
  stats.textContent = `Total: ${mediaList.length} · Shown: ${filtered.length} · Playlist: ${playlist.length}`;
}

function escapeHtml(s){
  if(!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function applyFilters(){
  const q = searchInput.value.trim().toLowerCase();
  const ft = filterType.value;
  const sb = sortBy.value;
  filtered = mediaList.filter(it => {
    if(ft!=='all' && it.type!==(ft==='audio'?'mp3':'mp4') && ft!=='all' && it.type!==ft) {
      // accept also generic 'audio'/'video' by extension check
      if(ft==='audio' && !it.file.match(/\.(mp3|wav|ogg|m4a)$/i)) return false;
      if(ft==='video' && !it.file.match(/\.(mp4|webm|mov|mkv)$/i)) return false;
    }
    if(!q) return true;
    const hay = (it.title + ' ' + it.description + ' ' + it.file).toLowerCase();
    return hay.includes(q);
  });

  // sort
  if(sb==='title') filtered.sort((a,b)=>a.title.localeCompare(b.title));
  else if(sb==='date') filtered.sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  else if(sb==='type') filtered.sort((a,b)=> a.type.localeCompare(b.type));

  renderLibrary();
}

function addToPlaylist(file){
  if(!file) return;
  if(!playlist.includes(file)) playlist.push(file);
  renderPlaylist();
  updateStats();
}

function removeFromPlaylist(file){
  playlist = playlist.filter(f=>f!==file);
  renderPlaylist();
  updateStats();
}

function renderPlaylist(){
  playlistEl.innerHTML = '';
  if(playlist.length===0){
    playlistEl.innerHTML = '<div style="color:var(--muted)">No items in playlist — right-click a library item to add</div>';
    return;
  }
  playlist.forEach((file, i) => {
    const meta = mediaList.find(m => m.file===file) || {title:file, type:''};
    const row = document.createElement('div');
    row.className = 'pl-item';
    row.innerHTML = `<div class="title">${escapeHtml(meta.title)}</div>
      <div class="actions">
        <button class="small" data-action="play" data-file="${file}">▶</button>
        <button class="small" data-action="up" data-file="${file}">↑</button>
        <button class="small" data-action="down" data-file="${file}">↓</button>
        <button class="small" data-action="remove" data-file="${file}">✕</button>
      </div>`;
    playlistEl.appendChild(row);
  });
  // attach events
  qsa('.pl-item .actions button').forEach(btn=>{
    btn.onclick = (e) => {
      const act = btn.dataset.action, file = btn.dataset.file;
      if(act==='play') playByFile(file);
      if(act==='remove') removeFromPlaylist(file);
      if(act==='up') {
        const i = playlist.indexOf(file);
        if(i>0){ [playlist[i-1], playlist[i]] = [playlist[i], playlist[i-1]]; renderPlaylist(); }
      }
      if(act==='down') {
        const i = playlist.indexOf(file);
        if(i>=0 && i<playlist.length-1){ [playlist[i], playlist[i+1]] = [playlist[i+1], playlist[i]]; renderPlaylist(); }
      }
      updateStats();
    };
  });
}

clearPlaylistBtn.onclick = () => { playlist = []; renderPlaylist(); updateStats(); };

// ===== Playback management =====
function findIndexInPlaylist(file){
  return playlist.findIndex(f=>f===file);
}

function playByFile(file){
  if(!file) return;
  // load media metadata
  const meta = mediaList.find(m=>m.file===file) || {file, title:file, thumbnail:''};
  // ensure file path is relative to site root; media.json should already have media/...
  prepareAndPlay(meta);
  // ensure we add to playlist if not present
  if(!playlist.includes(file)) { playlist.push(file); renderPlaylist(); updateStats();}
}

function prepareAndPlay(meta){
  currIndex = findIndexInPlaylist(meta.file);
  if(currIndex===-1) currIndex = playlist.indexOf(meta.file); // fallback
  playerThumb.src = meta.thumbnail || '';
  playerTitle.textContent = meta.title || meta.file;
  playerDesc.textContent = meta.description || '';
  lyricsEl.textContent = meta.lyrics || '';
  playerSection.style.display = 'block';
  // choose audio or video
  const isVideo = meta.file.match(/\.(mp4|webm|mov|mkv)$/i);
  stopAll();
  if(isVideo){
    videoEl.src = meta.file;
    videoEl.classList.add('video-visible');
    videoEl.currentTime = 0;
    videoEl.play();
    isPlaying = true;
    audioEl.style.display = 'none';
    videoEl.style.display = 'block';
    attachMediaEvents(videoEl);
    setupWave(videoEl); // still try to show waveform though might be muted
  } else {
    audioEl.src = meta.file;
    audioEl.currentTime = 0;
    audioEl.play();
    isPlaying = true;
    audioEl.style.display = 'block';
    videoEl.style.display = 'none';
    attachMediaEvents(audioEl);
    setupWave(audioEl);
  }
  playBtn.textContent = 'Pause';
}

function stopAll(){
  try{ audioEl.pause(); videoEl.pause(); } catch(e){}
  audioEl.src = ''; videoEl.src = '';
  isPlaying = false;
  playBtn.textContent = 'Play';
}

playBtn.onclick = () => {
  if(isPlaying){ pauseCurrent(); } else { resumeCurrent(); }
};

function pauseCurrent(){
  if(!audioEl.src && !videoEl.src) return;
  if(!audioEl.paused) audioEl.pause();
  if(!videoEl.paused) videoEl.pause();
  isPlaying = false;
  playBtn.textContent = 'Play';
}
function resumeCurrent(){
  if(audioEl.src && audioEl.paused){ audioEl.play(); isPlaying=true; playBtn.textContent='Pause'; }
  if(videoEl.src && videoEl.paused){ videoEl.play(); isPlaying=true; playBtn.textContent='Pause'; }
}

prevBtn.onclick = () => {
  if(playlist.length===0) return;
  if(currIndex>0) currIndex--; else currIndex = (repeatMode==='all' ? playlist.length-1 : 0);
  playByFile(playlist[currIndex]);
};
nextBtn.onclick = () => {
  if(playlist.length===0) return;
  if(shuffle){
    const nxt = Math.floor(Math.random()*playlist.length);
    currIndex = nxt;
    playByFile(playlist[currIndex]);
    return;
  }
  if(currIndex<playlist.length-1){ currIndex++; playByFile(playlist[currIndex]); }
  else {
    if(repeatMode==='all'){ currIndex=0; playByFile(playlist[currIndex]); }
    else { pauseCurrent(); }
  }
};

shuffleBtn.onclick = () => { shuffle = !shuffle; shuffleBtn.style.opacity = shuffle ? 1 : 0.6; };
repeatBtn.onclick = () => {
  repeatMode = repeatMode==='none' ? 'one' : repeatMode==='one' ? 'all' : 'none';
  repeatBtn.textContent = 'Repeat: ' + repeatMode;
};

// volume
volumeEl.value = 0.8;
volumeEl.oninput = (e)=>{ const v = parseFloat(e.target.value); audioEl.volume = v; videoEl.volume = v; localStorage.setItem('media-volume', v); };
const savedVol = parseFloat(localStorage.getItem('media-volume') || '0.8');
volumeEl.value = savedVol; audioEl.volume = savedVol; videoEl.volume = savedVol;

// progress and time updates
function attachMediaEvents(el){
  el.onloadedmetadata = () => {
    durTimeEl.textContent = humanTime(el.duration);
  };
  el.ontimeupdate = () => {
    curTimeEl.textContent = humanTime(el.currentTime);
    if(el.duration) progressEl.style.width = ((el.currentTime / el.duration) * 100) + '%';
  };
  el.onended = () => {
    if(repeatMode==='one'){ el.currentTime=0; el.play(); return; }
    nextBtn.onclick();
  };
}

// progress click to seek
const progressWrap = progressEl.parentElement;
progressWrap.onclick = (e) => {
  const rect = progressWrap.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const el = audioEl.src ? audioEl : videoEl.src ? videoEl : null;
  if(el && el.duration) el.currentTime = pct * el.duration;
};

// simple waveform using AnalyserNode
function setupWave(mediaElement){
  // stop previous
  if(sourceNode && audioCtx) {
    try{ sourceNode.disconnect(); } catch(e) {}
  }
  try {
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    // create source from media element (works for audio; for video we can createMediaElementSource too if CORS allowed)
    try{
      sourceNode = audioCtx.createMediaElementSource(mediaElement);
    } catch(err){
      // cross-origin blocked; fallback to no waveform
      canvasCtx.clearRect(0,0,waveCanvas.width,waveCanvas.height);
      return;
    }
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw(){
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      canvasCtx.fillStyle = 'rgba(0,0,0,0.02)';
      canvasCtx.fillRect(0,0,waveCanvas.width,waveCanvas.height);
      const barWidth = waveCanvas.width / bufferLength;
      let x=0;
      for(let i=0;i<bufferLength;i++){
        const v = dataArray[i] / 255;
        const h = v * waveCanvas.height;
        canvasCtx.fillStyle = 'rgba(15,188,249,0.9)';
        canvasCtx.fillRect(x, waveCanvas.height - h, barWidth - 1, h);
        x += barWidth;
      }
    }
    draw();
  } catch(e){ console.warn('Waveform setup failed', e); }
}

// keyboard shortcuts
window.addEventListener('keydown', (e)=>{
  if(e.code==='Space'){ e.preventDefault(); playBtn.click(); }
  if(e.code==='ArrowRight'){ seekRel(5); }
  if(e.code==='ArrowLeft'){ seekRel(-5); }
});

// seek relative
function seekRel(sec){ const el = audioEl.src ? audioEl : videoEl.src ? videoEl : null; if(el && el.duration) el.currentTime = Math.max(0, Math.min(el.duration, el.currentTime + sec)); }

// dark mode
function applyTheme(t){
  if(t==='dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  localStorage.setItem('media-theme', t);
}
darkToggle.onclick = () => {
  const cur = localStorage.getItem('media-theme') || 'light';
  const next = cur==='light' ? 'dark' : 'light';
  applyTheme(next);
  darkToggle.textContent = next==='dark' ? 'Light' : 'Dark';
};
const savedTheme = localStorage.getItem('media-theme') || 'light';
applyTheme(savedTheme);
darkToggle.textContent = savedTheme==='dark' ? 'Light' : 'Dark';

// Upload button: open GitHub upload page for media folder (manual upload)
uploadBtn.onclick = () => {
  window.open('https://github.com/chanderGitHub/media-player/upload/main/media', '_blank');
};

// toggle lyrics
toggleLyrics.onclick = () => {
  const vis = lyricsEl.hasAttribute('hidden');
  if(vis){ lyricsEl.removeAttribute('hidden'); toggleLyrics.textContent='Hide Lyrics'; }
  else { lyricsEl.setAttribute('hidden',''); toggleLyrics.textContent='Lyrics'; }
};

// init interactive controls
searchInput.oninput = debounce(()=>{ applyFilters(); }, 220);
filterType.onchange = applyFilters;
sortBy.onchange = applyFilters;

// Playlist click delegation (play on click)
playlistEl.onclick = (e) => {
  const btn = e.target.closest('button[data-action]');
  if(btn) return; // handled by renderPlaylist
  const item = e.target.closest('.pl-item');
  if(!item) return;
  const file = item.querySelector('button[data-action="play"]')?.dataset.file;
  if(file) playByFile(file);
};

// helpers
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

// initial load
loadMedia();

// restore playlist from localStorage (optional)
try{
  const saved = JSON.parse(localStorage.getItem('media-playlist') || '[]');
  if(Array.isArray(saved) && saved.length) { playlist = saved; renderPlaylist(); updateStats(); }
} catch(e){}

// persist playlist on unload
window.addEventListener('beforeunload', ()=>{ localStorage.setItem('media-playlist', JSON.stringify(playlist)); });
