/* ==========================================================
   1. ДАННЫЕ И НАСТРОЙКИ ПРИЛОЖЕНИЯ
   ========================================================== */

// Категории транспорта и люди в очереди.
// Чтобы изменить список, отредактируйте только этот массив.
const CATEGORIES = [
  { id: "car", name: "Машина", people: ["Слава", "Антон", "Артём", "Серёга"] },
  { id: "shovel", name: "Лопата", people: ["Слава", "Антон", "Артём"] },
  { id: "kamaz", name: "Камаз", people: ["Слава", "Антон", "Артём"] },
  { id: "truck", name: "Фура", people: ["Слава", "Антон", "Артём"] },
];

const STORAGE_KEYS = {
  selections: "pogruzka_v2",
  github: "pogruzka_gh",
};

// Иконки категорий в формате SVG.
const CATEGORY_ICONS = {
  car: '<svg viewBox="0 0 24 24"><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-5l2-5h10l4 5h2v5h-2M9 17h6M3 12h18M12 7v5"/></svg>',
  shovel: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="10" height="9" rx="1"/><path d="M16 8h3.5l2.5 3v3h-6"/><circle cx="10" cy="17" r="1.8"/><circle cx="19" cy="17" r="1.8"/><path d="M6 14l-3 3.5H1.5"/></svg>',
  kamaz: '<svg viewBox="0 0 24 24"><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3V6h11v11M9 17h6M14 9h4l3 4v4h-2"/></svg>',
  truck: '<svg viewBox="0 0 24 24"><rect x="1.5" y="5" width="13" height="9" rx="1"/><path d="M14.5 8H18l3 3v3h-6.5"/><circle cx="5" cy="17" r="1.7"/><circle cx="9.5" cy="17" r="1.7"/><circle cx="18.5" cy="17" r="1.7"/></svg>',
};

const SHIFT_HANDOVER_RULE =
  "Если в конце смены грузящий передаёт машину другому, очередь переходит к следующему человеку.";

let savedSelections = readStorage(STORAGE_KEYS.selections);
let draftSelections = copyData(savedSelections);
let githubConfig = readStorage(STORAGE_KEYS.github);
let githubFileSha = null;


/* ==========================================================
   2. ОБЩИЕ ПОМОЩНИКИ
   ========================================================== */

// Короткая функция для поиска элемента по его id.
function getElement(id) {
  return document.getElementById(id);
}

// JSON-копия нужна, чтобы черновик не менял уже сохранённые данные.
function copyData(value) {
  return JSON.parse(JSON.stringify(value));
}

// Безопасно читает объект из localStorage.
function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch (error) {
    return {};
  }
}

// Сохраняет объект в localStorage. Ошибка хранилища не останавливает приложение.
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Браузер может запретить запись, например в приватном режиме.
  }
}

// Экранирует текст перед вставкой в HTML.
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Показывает короткое сообщение под списком категорий.
function showMessage(text) {
  getElement("msg").textContent = text;
}

// Добавляет ведущий ноль к числу даты.
function padNumber(number) {
  return number < 10 ? `0${number}` : String(number);
}

// Возвращает сегодняшнюю дату в формате YYYY-MM-DD.
function getTodayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = padNumber(today.getMonth() + 1);
  const day = padNumber(today.getDate());

  return `${year}-${month}-${day}`;
}

// Оставляет в данных только имя человека и дату погрузки.
function cleanSelections(data) {
  const cleanData = {};

  CATEGORIES.forEach((category) => {
    const selection = data && data[category.id];

    if (selection && selection.name) {
      cleanData[category.id] = {
        name: selection.name,
        iso: selection.iso || "",
      };
    }
  });

  return cleanData;
}

// Проверяет, есть ли изменения, которые ещё не сохранены.
function hasUnsavedChanges() {
  return JSON.stringify(draftSelections) !== JSON.stringify(savedSelections);
}

// Ищет категорию по её id.
function findCategory(categoryId) {
  return CATEGORIES.find((category) => category.id === categoryId);
}


/* ==========================================================
   3. ОЧЕРЕДЬ И ДАТЫ
   ========================================================== */

// Возвращает следующего человека по кругу после того, кто грузил последним.
function getNextPerson(category, lastPersonName) {
  const lastPersonIndex = category.people.indexOf(lastPersonName);

  if (lastPersonIndex === -1 || category.people.length === 0) {
    return "—";
  }

  const nextPersonIndex = (lastPersonIndex + 1) % category.people.length;
  return category.people[nextPersonIndex];
}

// Показывает дату как «сегодня», «вчера» или короткую календарную дату.
function formatRelativeDate(isoDate) {
  if (!isoDate) {
    return "";
  }

  const [year, month, day] = isoDate.split("-").map(Number);
  const today = new Date();
  const todayAtMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const selectedDate = new Date(year, month - 1, day);
  const daysAgo = Math.round(
    (todayAtMidnight - selectedDate) / 86_400_000,
  );

  if (daysAgo === 0) {
    return "сегодня";
  }

  if (daysAgo === 1) {
    return "вчера";
  }

  if (daysAgo >= 2 && daysAgo <= 4) {
    return `${daysAgo} дня назад`;
  }

  if (daysAgo >= 5 && daysAgo <= 7) {
    return `${daysAgo} дней назад`;
  }

  const dateOptions = { day: "numeric", month: "short" };

  if (selectedDate.getFullYear() !== todayAtMidnight.getFullYear()) {
    dateOptions.year = "numeric";
  }

  return selectedDate.toLocaleDateString("ru-RU", dateOptions);
}


/* ==========================================================
   4. ГЛАВНЫЙ ЭКРАН: СПИСОК КАТЕГОРИЙ
   ========================================================== */

// Собирает HTML одной строки табло.
function renderCategoryRow(category) {
  const selection = draftSelections[category.id];
  const categoryIcon = CATEGORY_ICONS[category.id] || "";
  const categoryName = escapeHtml(category.name);

  if (!selection) {
    return `
      <button class="row" data-id="${escapeHtml(category.id)}">
        <span class="cat">${categoryIcon}${categoryName}</span>
        <span class="nx empty">не выбрано</span>
        <span class="lst empty">—</span>
      </button>
    `;
  }

  const lastPerson = escapeHtml(selection.name);
  const nextPerson = escapeHtml(getNextPerson(category, selection.name));
  const relativeDate = escapeHtml(formatRelativeDate(selection.iso));

  return `
    <button class="row" data-id="${escapeHtml(category.id)}">
      <span class="cat">${categoryIcon}${categoryName}</span>
      <span class="nx"><span>${nextPerson}</span></span>
      <span class="lst">
        <span class="n">${lastPerson}</span>
        <span class="w">${relativeDate}</span>
      </span>
    </button>
  `;
}

// Перерисовывает табло и обновляет доступность кнопки «Сохранить».
function renderBoard() {
  const categoryRows = CATEGORIES.map(renderCategoryRow).join("");
  const boardHtml = `
    <div class="board">
      <div class="bh">
        <span>Вид машины</span>
        <span>Грузит</span>
        <span>Грузил</span>
      </div>
      ${categoryRows}
    </div>
  `;

  getElement("list").innerHTML = boardHtml;
  getElement("save").disabled = !hasUnsavedChanges();

  document.querySelectorAll(".row").forEach((rowButton) => {
    rowButton.addEventListener("click", () => {
      openSelectionSheet(rowButton.dataset.id);
    });
  });
}


/* ==========================================================
   5. ВСПЛЫВАЮЩИЕ ОКНА
   ========================================================== */

// Закрывает окно выбора, настроек или правил.
function closeSheet() {
  getElement("ov").classList.remove("on");
}

// Закрывает окно при нажатии на затемнённую область вокруг него.
getElement("ov").addEventListener("click", (event) => {
  if (event.target === getElement("ov")) {
    closeSheet();
  }
});

// Собирает общий заголовок всплывающего окна.
function renderSheetHeader(title, headingId) {
  return `
    <div class="hd">
      <h2 id="${headingId}">${escapeHtml(title)}</h2>
      <button class="x" id="close-sheet" aria-label="Закрыть">✕</button>
    </div>
  `;
}

// Показывает выбранный сотрудником список правил.
function openRulesSheet() {
  const sheet = getElement("sheet");

  sheet.innerHTML = `
    ${renderSheetHeader("Правила", "rules-title")}
    <p class="rules-intro">Правило очередности погрузки:</p>
    <ol class="rules-list">
      <li>${escapeHtml(SHIFT_HANDOVER_RULE)}</li>
    </ol>
    <button class="opt done" id="rules-done">Понятно</button>
  `;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "rules-title");

  getElement("close-sheet").addEventListener("click", closeSheet);
  getElement("rules-done").addEventListener("click", closeSheet);
  getElement("ov").classList.add("on");
}

// Показывает окно выбора последнего загрузившего и даты.
function openSelectionSheet(categoryId) {
  const category = findCategory(categoryId);

  if (!category) {
    return;
  }

  const currentSelection = draftSelections[categoryId] || {};
  let selectedDate = currentSelection.iso || getTodayIsoDate();
  const peopleButtons = category.people
    .map((person) => {
      const isSelected = currentSelection.name === person;

      return `
        <button
          class="opt${isSelected ? " sel" : ""}"
          data-person="${escapeHtml(person)}"
        >${escapeHtml(person)}</button>
      `;
    })
    .join("");

  const sheet = getElement("sheet");
  sheet.innerHTML = `
    ${renderSheetHeader(category.name, "selection-title")}
    <label class="lbl" for="dt">Дата</label>
    <input type="date" class="dt" id="dt" value="${escapeHtml(selectedDate)}">
    <span class="lbl">Очерёдность</span>
    ${peopleButtons}
    <button class="opt done" id="selection-done">Готово</button>
  `;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "selection-title");

  // При изменении даты обновляет дату выбранной записи.
  getElement("dt").addEventListener("change", (event) => {
    if (event.target.value) {
      selectedDate = event.target.value;
    }

    if (draftSelections[categoryId]) {
      draftSelections[categoryId].iso = selectedDate;
    }

    renderBoard();
  });

  // Выбор имени делает этого человека последним загрузившим.
  sheet.querySelectorAll("[data-person]").forEach((personButton) => {
    personButton.addEventListener("click", () => {
      draftSelections[categoryId] = {
        name: personButton.dataset.person,
        iso: selectedDate,
      };

      sheet.querySelectorAll("[data-person]").forEach((button) => {
        button.classList.toggle("sel", button === personButton);
      });

      showMessage("");
      renderBoard();
    });
  });

  getElement("close-sheet").addEventListener("click", closeSheet);
  getElement("selection-done").addEventListener("click", closeSheet);
  getElement("ov").classList.add("on");
}


/* ==========================================================
   6. СИНХРОНИЗАЦИЯ С GITHUB
   ========================================================== */

// GitHub настроен, если указаны репозиторий и токен.
function isGitHubConfigured() {
  return Boolean(githubConfig.repo && githubConfig.token);
}

// Возвращает адрес файла с данными в репозитории.
function getGitHubFileUrl() {
  const repository = githubConfig.repo;
  const filePath = githubConfig.path || "data.json";

  return `https://api.github.com/repos/${repository}/contents/${filePath}`;
}

// Создаёт заголовки авторизованного запроса к GitHub.
function getGitHubHeaders() {
  return {
    Authorization: `Bearer ${githubConfig.token}`,
    Accept: "application/vnd.github+json",
  };
}

// Кодирует и декодирует содержимое файла GitHub в base64.
function encodeBase64(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function decodeBase64(text) {
  return decodeURIComponent(escape(atob(text)));
}

// Загружает сохранённые данные из GitHub.
async function pullFromGitHub() {
  const response = await fetch(`${getGitHubFileUrl()}?t=${Date.now()}`, {
    headers: getGitHubHeaders(),
    cache: "no-store",
  });

  if (response.status === 404) {
    githubFileSha = null;
    return {};
  }

  if (!response.ok) {
    throw new Error(response.status);
  }

  const file = await response.json();
  githubFileSha = file.sha;

  try {
    return cleanSelections(JSON.parse(decodeBase64(file.content)));
  } catch (error) {
    return {};
  }
}

// Сохраняет переданные данные в файл GitHub.
async function pushToGitHub(selections) {
  const requestBody = {
    message: "Погрузка машин: обновление",
    content: encodeBase64(JSON.stringify(selections, null, 1)),
  };

  if (githubFileSha) {
    requestBody.sha = githubFileSha;
  }

  const headers = getGitHubHeaders();
  headers["Content-Type"] = "application/json";

  const response = await fetch(getGitHubFileUrl(), {
    method: "PUT",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(response.status);
  }

  const result = await response.json();
  githubFileSha = result.content.sha;
}

// Обновляет данные с GitHub, не затирая несохранённые изменения на экране.
async function syncWithGitHub(showResult) {
  if (!isGitHubConfigured()) {
    if (showResult) {
      showMessage("GitHub не настроен: нажми ⚙");
    }
    return;
  }

  try {
    const remoteSelections = await pullFromGitHub();
    const remoteDataChanged =
      JSON.stringify(remoteSelections) !== JSON.stringify(savedSelections);

    if (remoteDataChanged) {
      const hadUnsavedChanges = hasUnsavedChanges();
      savedSelections = remoteSelections;
      writeStorage(STORAGE_KEYS.selections, savedSelections);

      if (!hadUnsavedChanges) {
        draftSelections = copyData(savedSelections);
        renderBoard();
      }
    }

    if (showResult) {
      showMessage("Обновлено ✓");
    }
  } catch (error) {
    if (showResult) {
      showMessage(`Нет связи с GitHub (код ${error.message})`);
    }
  }
}


/* ==========================================================
   7. КНОПКИ: СОХРАНИТЬ, ОБНОВИТЬ, ПРАВИЛА И НАСТРОЙКИ
   ========================================================== */

// Сохраняет изменения локально или синхронизирует их с GitHub.
getElement("save").addEventListener("click", async () => {
  if (!isGitHubConfigured()) {
    savedSelections = copyData(draftSelections);
    writeStorage(STORAGE_KEYS.selections, savedSelections);
    renderBoard();
    showMessage("Сохранено на этом телефоне (GitHub не настроен)");
    return;
  }

  const changedCategories = CATEGORIES.filter((category) => {
    return (
      JSON.stringify(draftSelections[category.id]) !==
      JSON.stringify(savedSelections[category.id])
    );
  });

  showMessage("Сохраняю…");

  try {
    const remoteSelections = await pullFromGitHub();

    changedCategories.forEach((category) => {
      const updatedSelection = draftSelections[category.id];

      if (updatedSelection) {
        remoteSelections[category.id] = updatedSelection;
      } else {
        delete remoteSelections[category.id];
      }
    });

    await pushToGitHub(remoteSelections);
    savedSelections = remoteSelections;
    draftSelections = copyData(remoteSelections);
    writeStorage(STORAGE_KEYS.selections, savedSelections);
    renderBoard();
    showMessage("Сохранено в GitHub ✓");
  } catch (error) {
    showMessage(
      `Не удалось сохранить в GitHub (код ${error.message}). Нажми «Сохранить» ещё раз.`,
    );
  }
});

// Обновляет данные вручную.
getElement("ref").addEventListener("click", () => {
  syncWithGitHub(true);
});

// Открывает окно с правилом очередности.
getElement("rules").addEventListener("click", openRulesSheet);

// Показывает настройки синхронизации с GitHub.
getElement("cfg").addEventListener("click", openGitHubSettings);

function openGitHubSettings() {
  const sheet = getElement("sheet");
  sheet.innerHTML = `
    ${renderSheetHeader("Синхронизация с GitHub", "github-title")}
    <p class="hint">
      Данные хранятся в файле в вашем репозитории. Токен остаётся только на этом телефоне.
    </p>
    <label class="lbl" for="github-repo">Репозиторий (владелец/название)</label>
    <input
      class="dt"
      id="github-repo"
      value="${escapeHtml(githubConfig.repo || "")}"
      placeholder="ivan/pogruzka-data"
      autocapitalize="off"
    >
    <label class="lbl" for="github-path">Файл</label>
    <input
      class="dt"
      id="github-path"
      value="${escapeHtml(githubConfig.path || "data.json")}"
      autocapitalize="off"
    >
    <label class="lbl" for="github-token">Токен (Contents: Read and write)</label>
    <input
      class="dt"
      id="github-token"
      type="password"
      value="${escapeHtml(githubConfig.token || "")}"
      autocapitalize="off"
    >
    <button class="opt done" id="save-github-settings">Сохранить настройки</button>
    <button class="opt" id="disconnect-github">Отключить GitHub</button>
  `;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "github-title");

  getElement("save-github-settings").addEventListener("click", () => {
    githubConfig = {
      repo: getElement("github-repo").value.trim(),
      path: getElement("github-path").value.trim() || "data.json",
      token: getElement("github-token").value.trim(),
    };

    writeStorage(STORAGE_KEYS.github, githubConfig);
    closeSheet();
    renderBoard();
    syncWithGitHub(true);
  });

  getElement("disconnect-github").addEventListener("click", () => {
    githubConfig = {};
    writeStorage(STORAGE_KEYS.github, githubConfig);
    closeSheet();
    renderBoard();
    showMessage("GitHub отключён");
  });

  getElement("close-sheet").addEventListener("click", closeSheet);
  getElement("ov").classList.add("on");
}


/* ==========================================================
   8. ЗАПУСК И АВТООБНОВЛЕНИЕ
   ========================================================== */

// Обновляет данные при возвращении в приложение, если нет несохранённых правок.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !hasUnsavedChanges()) {
    syncWithGitHub(false);
  }
});

// Периодически проверяет GitHub, когда приложение открыто.
setInterval(() => {
  if (!document.hidden && !hasUnsavedChanges()) {
    syncWithGitHub(false);
  }
}, 30_000);

// Первый запуск: показывает табло и загружает данные из GitHub.
renderBoard();
syncWithGitHub(false);
