(() => {
  "use strict";

  const DATA_URL = "./data/kaisou.json";
  const STORAGE_KEY = "toukenRecollectionChecklist.v1";

  const battlefields = [
    "維新の記憶 函館（1-1）",
    "維新の記憶 会津（1-2）",
    "維新の記憶 宇都宮（1-3）",
    "維新の記憶 鳥羽（1-4）",
    "江戸の記憶 鳥羽（2-1）",
    "江戸の記憶 江戸（2-2）",
    "江戸の記憶 江戸（元禄）（2-3）",
    "江戸の記憶 大阪（大阪冬の陣）（2-4）",
    "織豊の記憶 関ヶ原（3-1）",
    "織豊の記憶 本能寺（3-2）",
    "織豊の記憶 越前（3-3）",
    "織豊の記憶 安土（3-4）",
    "戦国の記憶 長篠（4-1）",
    "戦国の記憶 三方ヶ原（4-2）",
    "戦国の記憶 桶狭間（4-3）",
    "戦国の記憶 京都（西陣）（4-4）",
    "武家の記憶 鎌倉（元弘の乱）（5-1）",
    "武家の記憶 博多湾（元寇）（5-2）",
    "武家の記憶 墨俣（承久の乱）（5-3）",
    "武家の記憶 厚樫山（阿津賀志山の戦い）（5-4）",
    "池田屋の記憶 京都（市中）（6-1）",
    "池田屋の記憶 京都（三条大橋）（6-2）",
    "池田屋の記憶 京都（池田屋二階）（6-3）",
    "池田屋の記憶 京都（池田屋一階）（6-4）",
    "延享の記憶 江戸（新橋）（7-1）",
    "延享の記憶 江戸（白金台）（7-2）",
    "延享の記憶 江戸（江戸城下）（7-3）",
    "延享の記憶 江戸（江戸城内）（7-4）",
    "青野原の記憶 京都（阿弥陀ヶ峰）（8-1）",
    "青野原の記憶 信濃（上田城）（8-2）",
    "青野原の記憶 美濃（青野原）（8-3）",
    "青野原の記憶 京都（五条）（8-4）"
  ];

  const $ = (selector) => document.querySelector(selector);
  const listEl = $("#recollection-list");
  const statusEl = $("#status-message");
  const searchInput = $("#search-input");
  const battlefieldSelect = $("#battlefield-select");
  const hideCompleted = $("#hide-completed");
  const includeUnspecified = $("#include-unspecified");
  const completed = loadProgress();
  let recollections = [];
  let byId = new Map();

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return new Set(Array.isArray(saved.completedIds) ? saved.completedIds.map(String) : []);
    } catch (error) {
      return new Set();
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        schemaVersion: 1,
        completedIds: [...completed]
      }));
    } catch (error) {
      statusEl.textContent = "ブラウザに保存できませんでした。プライベートブラウズ設定などをご確認ください。";
    }
  }

  function normalizeCharacterName(name) {
    return String(name || "").trim().replace(/・極$/, "");
  }

  function cleanText(value) {
    return String(value ?? "").trim();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function asArray(value) {
    if (value == null || value === "") return [];
    return Array.isArray(value) ? value : [value];
  }

  function prerequisiteItems(item) {
    return asArray(item.prerequisites).filter((entry) => entry != null && entry !== "");
  }

  function renderPrerequisite(entry) {
    if (typeof entry === "object") {
      const number = entry.number ?? entry.id;
      const name = entry.name || (number != null ? `回想其の${number}` : "前提回想");
      if (number != null && byId.has(String(number))) {
        return `<button class="prereq-link" type="button" data-detail-id="${escapeHtml(number)}">${escapeHtml(name)}</button>`;
      }
      return escapeHtml(name);
    }
    return escapeHtml(entry);
  }

  function initFilters() {
    battlefields.forEach((battlefield) => {
      const option = document.createElement("option");
      option.value = battlefield;
      option.textContent = battlefield;
      battlefieldSelect.appendChild(option);
    });

  }

  function matchesSearch(item, query) {
    if (!query) return true;
    const text = [
      item.name,
      item.id,
      item.battlefield,
      item.trigger,
      ...asArray(item.characters),
      ...prerequisiteItems(item).map((entry) => typeof entry === "object" ? entry.name : entry)
    ].join(" ").toLocaleLowerCase("ja");
    return text.includes(query.toLocaleLowerCase("ja"));
  }

  function renderCard(item) {
    const id = String(item.id);
    const isDone = completed.has(id);
    const characters = asArray(item.characters).filter(Boolean);
    const prereqs = prerequisiteItems(item);
    const extras = [];
    if (prereqs.length) {
      extras.push(`<p><span class="meta-label">前提・追加条件：</span>${prereqs.map(renderPrerequisite).join("、")}</p>`);
    }
    const trigger = cleanText(item.trigger);
    return `
      <article class="recollection-card ${isDone ? "is-complete" : ""}" data-id="${escapeHtml(id)}">
        <label class="complete-check" aria-label="回想其の${escapeHtml(id)}を回収済みにする">
          <input type="checkbox" class="complete-toggle" data-id="${escapeHtml(id)}" ${isDone ? "checked" : ""}>
        </label>
        <div class="card-main">
          <div class="card-title-row">
            <span class="card-number">其の${escapeHtml(id)}</span>
            <span class="card-title">${escapeHtml(item.name || "（回想名未入力）")}</span>
          </div>
          <p class="character-list"><span class="meta-label">刀剣男士：</span>${characters.length ? characters.map(escapeHtml).join("、") : "未入力"}</p>
          <div class="card-meta">
            <span><span class="meta-label">合戦場：</span>${escapeHtml(item.battlefield || "指定なし／未入力")}</span>
            ${trigger ? `<span><span class="meta-label">発生：</span>${escapeHtml(trigger)}</span>` : ""}
          </div>
          ${extras.length ? `<div class="card-extra">${extras.join("")}</div>` : ""}
        </div>
      </article>`;
  }

  function updateProgress() {
    const total = recollections.length;
    const done = recollections.filter((item) => completed.has(String(item.id))).length;
    const percent = total ? Math.round(done / total * 100) : 0;
    $("#progress-text").textContent = `${done} / ${total} 件 回収済み`;
    $("#progress-percent").textContent = `${percent}%`;
    $("#progress-fill").style.width = `${percent}%`;
    $("#progress-bar").setAttribute("aria-valuenow", String(percent));
  }

  function renderList() {
    const search = cleanText(searchInput.value);
    const battlefield = battlefieldSelect.value;

const visible = recollections.filter((item) => {
  if (hideCompleted.checked && completed.has(String(item.id))) {
    return false;
  }

  const isUnspecified =
    item.battlefield == null || item.battlefield === "";

  // 特定の合戦場を選択した場合
  if (battlefield) {
    if (item.battlefield !== battlefield) {
      // 指定なしも表示がONなら、指定なしの回想は残す
      if (!(includeUnspecified.checked && isUnspecified)) {
        return false;
      }
    }
  }


  if (!matchesSearch(item, search)) {
    return false;
  }

  return true;
});


    $("#result-count").textContent = `${visible.length} 件表示（全 ${recollections.length} 件）`;
    listEl.innerHTML = visible.length
      ? visible.map(renderCard).join("")
      : `<div class="empty-state">条件に一致する回想がありません。検索条件を変えてみてください。</div>`;
    updateProgress();
  }

  function showDetails(id) {
    const item = byId.get(String(id));
    if (!item) return;
    $("#dialog-title").textContent = `其の${item.id} ${item.name || ""}`;
    const prereqs = prerequisiteItems(item);
    $("#dialog-content").innerHTML = `
      <p><strong>刀剣男士：</strong>${asArray(item.characters).filter(Boolean).map(escapeHtml).join("、") || "未入力"}</p>
      <p><strong>合戦場：</strong>${escapeHtml(item.battlefield || "指定なし／未入力")}</p>
      <p><strong>発生：</strong>${escapeHtml(item.trigger || "未入力")}</p>
      ${prereqs.length ? `<p><strong>前提・追加条件：</strong>${prereqs.map(renderPrerequisite).join("、")}</p>` : ""}
      <p><strong>回収状況：</strong>${completed.has(String(item.id)) ? "回収済み" : "未回収"}</p>`;
    const dialog = $("#detail-dialog");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  listEl.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".complete-toggle");
    if (!checkbox) return;
    const id = String(checkbox.dataset.id);
    if (checkbox.checked) completed.add(id);
    else completed.delete(id);
    saveProgress();
    renderList();
  });

  listEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-detail-id]");
    if (button) showDetails(button.dataset.detailId);
  });

searchInput.addEventListener("input", renderList);
battlefieldSelect.addEventListener("change", renderList);
hideCompleted.addEventListener("change", renderList);
includeUnspecified.addEventListener("change", renderList);

  $("#reset-filters").addEventListener("click", () => {
    searchInput.value = "";
    battlefieldSelect.value = "";
    hideCompleted.checked = false;
    includeUnspecified.checked = false;
    renderList();
  });

  $("#close-dialog").addEventListener("click", () => $("#detail-dialog").close());
  $("#detail-dialog").addEventListener("click", (event) => {
    if (event.target === $("#detail-dialog")) $("#detail-dialog").close();
  });

  async function start() {
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("JSONの最上位は配列である必要があります。");
      recollections = data;
      byId = new Map(recollections.map((item) => [String(item.id), item]));
      initFilters();
      statusEl.textContent = "";
      renderList();
    } catch (error) {
      console.error(error);
      statusEl.textContent = "回想データを読み込めませんでした。index.html・style.css・script.js・kaisou.json が同じフォルダーにあるか確認してください。HTMLファイルを直接開いた場合は、GitHub Pages上で確認するかローカルサーバーを使ってください。";
    }
  }

  start();
})();