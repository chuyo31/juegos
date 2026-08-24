const FALLBACK_GAMES = [
  {
    id: "repair-mahjong",
    name: "Repair Mahjong",
    version: "V4",
    category: "Puzzle",
    platform: ["Web"],
    status: "WEB",
    playUrl: "https://chuyo31.github.io/repair-mahjong/",
    downloadUrl: "",
    cover: "",
    description: "Mahjong de reparación electrónica con móviles, PC y consolas.",
    tags: ["Puzzle", "Mahjong", "Reparación"],
    featured: true
  }
];

let games = [];
let activeCategory = "Todos";

const $ = (selector) => document.querySelector(selector);

async function loadGames() {
  try {
    const response = await fetch("./games.json?v=2", { cache: "no-store" });
    if (!response.ok) throw new Error(`games.json HTTP ${response.status}`);
    const data = await response.json();
    games = Array.isArray(data) ? data : FALLBACK_GAMES;
  } catch (error) {
    console.warn("No se pudo cargar games.json. Usando catálogo integrado.", error);
    games = FALLBACK_GAMES;
  }

  document.title = "CHUYO31 GAMES";
  $("#year").textContent = new Date().getFullYear();
  buildCategories();
  render();
}

function buildCategories() {
  const categories = ["Todos", ...new Set(games.map(game => game.category).filter(Boolean))];

  $("#categories").innerHTML = categories.map(category => `
    <button class="category ${category === activeCategory ? "active" : ""}"
            data-category="${escapeHtml(category)}">
      ${escapeHtml(category)}
    </button>
  `).join("");

  document.querySelectorAll(".category").forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      buildCategories();
      render();
    });
  });
}

function render() {
  const query = $("#search").value.trim().toLowerCase();

  const filtered = games.filter(game => {
    const categoryMatch = activeCategory === "Todos" || game.category === activeCategory;
    const searchable = [
      game.name, game.description, game.category,
      ...(game.tags || []), ...(game.platform || [])
    ].join(" ").toLowerCase();

    return categoryMatch && (!query || searchable.includes(query));
  });

  const gameCount = $("#gameCount");
  if (gameCount) {
    gameCount.textContent =
      `${games.length} ${games.length === 1 ? "juego" : "juegos"}`;
  }

  $("#games").innerHTML = filtered.map(createGameCard).join("");
  $("#empty").classList.toggle("hidden", filtered.length > 0);
}

function createGameCard(game) {
  const cover = game.cover
    ? `<img src="${escapeAttribute(game.cover)}" alt="${escapeAttribute(game.name)}">`
    : `<div class="cover-icon">🎮</div>`;

  const tags = (game.tags || [])
    .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");

  const platforms = (game.platform || [])
    .map(platform => `<span class="platform">${escapeHtml(platform)}</span>`)
    .join("");

  const play = game.playUrl
    ? `<a class="btn play" href="${escapeAttribute(game.playUrl)}" target="_blank" rel="noopener">▶ JUGAR</a>`
    : `<span class="btn play disabled">▶ JUGAR</span>`;

  const download = game.downloadUrl
    ? `<a class="btn download" href="${escapeAttribute(game.downloadUrl)}" target="_blank" rel="noopener">↓ DESCARGAR</a>`
    : `<span class="btn download disabled">↓ DESCARGAR</span>`;

  return `
    <article class="game-card">
      <div class="cover">
        <span class="badge">${escapeHtml(game.status || "WEB")}</span>
        ${cover}
      </div>
      <div class="game-body">
        <div class="game-meta">
          <span>${escapeHtml(game.category || "Juego")}</span>
          <span>V${escapeHtml(game.version || "1.0")}</span>
        </div>
        <h2>${escapeHtml(game.name)}</h2>
        <p>${escapeHtml(game.description || "")}</p>
        <div class="tags">${tags}</div>
        <div class="platforms">${platforms}</div>
        <div class="actions">${play}${download}</div>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttribute(value) { return escapeHtml(value); }

$("#search").addEventListener("input", render);

document.querySelector("#themeButton")?.addEventListener("click", () => {
  document.documentElement.classList.toggle("light");
});

loadGames();
