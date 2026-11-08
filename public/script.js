// Set this to your verified backend hostname. The browser address remains google.oss.
// Your backend. Keep this URL as-is if your API is hosted at gle.qzz.io.
const API_BASE = "https://gle.qzz.io";

const $ = (id) => document.getElementById(id);
const home = $("home");
const resultsView = $("results-view");
const homeForm = $("search-form");
const resultsForm = $("results-search-form");
const homeInput = $("search-input");
const resultsInput = $("results-input");
const homeClear = $("clear-button");
const resultsClear = $("results-clear");
const resultsMeta = $("results-meta");
const resultsList = $("results-list");
const answerBox = $("answer-box");
const knowledgePanel = $("knowledge-panel");
const peopleAlsoAsk = $("people-also-ask");
const questionsList = $("questions-list");
const relatedBox = $("related-searches");
const pagination = $("pagination");
const loading = $("loading");
const errorBox = $("error-message");

let activeController = null;
let latestRequest = 0;

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function safeUrl(value) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch { return null; }
}

function showResultsMode(query) {
  home.hidden = true;
  resultsView.hidden = false;
  document.body.classList.add("showing-results");
  resultsInput.value = query;
  homeInput.value = query;
  $("topbar").hidden = true;
  document.title = `${query} - Google OSS`;
}

function showHomeMode() {
  home.hidden = false;
  resultsView.hidden = true;
  $("topbar").hidden = false;
  document.title = "Google OSS";
  homeInput.value = "";
  history.pushState({}, "", "/");
  homeInput.focus();
}

function setLoading(on) {
  loading.hidden = !on;
  errorBox.hidden = true;
  if (on) {
    resultsMeta.textContent = "";
    resultsList.replaceChildren();
    answerBox.replaceChildren();
    knowledgePanel.replaceChildren();
    knowledgePanel.hidden = true;
    peopleAlsoAsk.hidden = true;
    questionsList.replaceChildren();
    relatedBox.replaceChildren();
    pagination.replaceChildren();
  }
}

function showError(message) {
  loading.hidden = true;
  errorBox.hidden = false;
  errorBox.textContent = message;
}

function addAnswerBox(data) {
  const box = data.answerBox;
  if (!box) return;
  const card = make("section", "answer-card");
  card.append(make("h2", "", box.title || "Quick answer"));
  const answer = box.answer || box.snippet || box.snippetHighlighted?.join(" ") || "";
  if (answer) card.append(make("p", "", answer));
  const source = safeUrl(box.link || box.source?.link);
  if (source) {
    const a = make("a", "answer-source", box.source?.title || "Read more");
    a.href = source; a.target = "_blank"; a.rel = "noopener noreferrer";
    card.append(a);
  }
  answerBox.append(card);
}

function addKnowledgePanel(data) {
  const kp = data.knowledgeGraph;
  if (!kp) return;
  knowledgePanel.hidden = false;
  if (kp.imageUrl && safeUrl(kp.imageUrl)) {
    const img = document.createElement("img");
    img.className = "kp-image"; img.src = kp.imageUrl; img.alt = kp.title || "Knowledge panel";
    img.loading = "lazy"; knowledgePanel.append(img);
  }
  if (kp.title) knowledgePanel.append(make("h2", "", kp.title));
  if (kp.type) knowledgePanel.append(make("p", "", kp.type));
  if (kp.description) knowledgePanel.append(make("p", "", kp.description));
  if (kp.descriptionLink && safeUrl(kp.descriptionLink)) {
    const a = make("a", "kp-link", "Read more");
    a.href = kp.descriptionLink; a.target = "_blank"; a.rel = "noopener noreferrer";
    knowledgePanel.append(a);
  }
}

function addOrganicResults(items) {
  let visible = 0;
  for (const item of items || []) {
    const link = safeUrl(item.link);
    if (!link) continue;
    visible++;
    const card = make("article", "result");
    const site = make("div", "result-site");
    const faviconWrap = make("span", "site-favicon");
    if (item.favicon && safeUrl(item.favicon)) {
      const img = document.createElement("img");
      img.src = item.favicon; img.alt = ""; img.loading = "lazy";
      img.onerror = () => { img.remove(); faviconWrap.textContent = "•"; };
      faviconWrap.append(img);
    } else {
      faviconWrap.textContent = (item.displayLink || new URL(link).hostname).slice(0, 1).toUpperCase();
    }
    const siteText = make("div");
    siteText.append(make("div", "site-name", item.displayLink || new URL(link).hostname));
    siteText.append(make("div", "site-url", item.displayedUrl || link.replace(/^https?:\/\//, "").split("/").slice(0, 3).join("/")));
    site.append(faviconWrap, siteText);
    const title = make("a", "result-title", item.title || link);
    title.href = link; title.target = "_blank"; title.rel = "noopener noreferrer";
    const snippet = make("p", "result-snippet");
    if (item.date) snippet.append(make("span", "result-date", item.date + " — "));
    snippet.append(document.createTextNode(item.snippet || ""));
    card.append(site, title);
    if (item.snippet || item.date) card.append(snippet);
    resultsList.append(card);
  }
  return visible;
}

function addPeopleAlsoAsk(items, query) {
  if (!Array.isArray(items) || !items.length) return;
  peopleAlsoAsk.hidden = false;
  for (const item of items.slice(0, 6)) {
    const question = typeof item === "string" ? item : item.question;
    if (!question) continue;
    const row = make("button", "question-row");
    row.type = "button";
    row.append(make("span", "", question));
    row.innerHTML += '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    row.addEventListener("click", () => runSearch(question, 1, true));
    questionsList.append(row);
  }
}

function addRelatedSearches(items) {
  if (!Array.isArray(items) || !items.length) return;
  const section = make("section", "related");
  section.append(make("h2", "", "Related searches"));
  const grid = make("div", "related-grid");
  for (const item of items.slice(0, 8)) {
    const query = typeof item === "string" ? item : item.query;
    if (!query) continue;
    const a = make("a", "", "");
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.innerHTML = '<circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path>';
    a.append(icon, make("span", "", query));
    a.href = "/search?q=" + encodeURIComponent(query);
    a.addEventListener("click", (event) => {
      event.preventDefault(); runSearch(query, 1);
    });
    grid.append(a);
  }
  section.append(grid);
  relatedBox.append(section);
}

function addPagination(query, page, resultCount) {
  const prev = make("button", "", "Previous");
  prev.disabled = page <= 1;
  prev.addEventListener("click", () => runSearch(query, page - 1));
  const label = make("span", "", `Page ${page}`);
  const next = make("button", "", "Next");
  next.disabled = resultCount === 0;
  next.addEventListener("click", () => runSearch(query, page + 1));
  pagination.append(prev, label, next);
}

function render(data, query, page) {
  const count = addOrganicResults(data.organic || []);
  const total = data.searchInformation?.totalResults;
  resultsMeta.textContent = total
    ? `About ${Number(total).toLocaleString()} results`
    : `Web results for “${query}”`;
  addAnswerBox(data);
  addKnowledgePanel(data);
  addPeopleAlsoAsk(data.peopleAlsoAsk, query);
  addRelatedSearches(data.relatedSearches);
  addPagination(query, page, count);
  if (!count && !data.answerBox) {
    resultsList.append(make("p", "result-snippet", "No results were returned. Try different keywords."));
  }
}

async function runSearch(rawQuery, page = 1, fromHistory = false) {
  const query = String(rawQuery || "").trim().slice(0, 200);
  if (!query) return;
  const requestId = ++latestRequest;
  if (activeController) activeController.abort();
  activeController = new AbortController();

  showResultsMode(query);
  if (!fromHistory) {
    const url = `/search?q=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ""}`;
    history.pushState({ query, page }, "", url);
  }
  setLoading(true);

  try {
    const endpoint = new URL("/api/search", API_BASE);
    endpoint.searchParams.set("q", query);
    endpoint.searchParams.set("page", String(page));
    const response = await fetch(endpoint.toString(), {
      signal: activeController.signal,
      headers: { "Accept": "application/json" }
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Search server returned an invalid response (${response.status}).`);
    }
    if (requestId !== latestRequest) return;
    if (!response.ok) throw new Error(data.error || `Search service returned ${response.status}`);
    setLoading(false);
    render(data, query, page);
  } catch (error) {
    if (error.name === "AbortError" || requestId !== latestRequest) return;
    showError(error.message || "Could not connect to the search service. Please try again.");
  }
}

homeForm.addEventListener("submit", (event) => {
  event.preventDefault(); runSearch(homeInput.value, 1);
});
resultsForm.addEventListener("submit", (event) => {
  event.preventDefault(); runSearch(resultsInput.value, 1);
});
homeClear.addEventListener("click", () => { homeInput.value = ""; homeInput.focus(); });
resultsClear.addEventListener("click", () => { resultsInput.value = ""; resultsInput.focus(); });
$("curious-button").addEventListener("click", () => runSearch("interesting facts about the world", 1));

window.addEventListener("popstate", () => {
  const params = new URLSearchParams(location.search);
  const query = params.get("q");
  const page = Math.max(1, Number(params.get("page")) || 1);
  if (location.pathname === "/search" && query) runSearch(query, page, true);
  else {
    resultsView.hidden = true;
    home.hidden = false;
    $("topbar").hidden = false;
    document.body.classList.remove("showing-results");
    document.title = "Google OSS";
    homeInput.value = "";
  }
});

const initial = new URLSearchParams(location.search);
if (location.pathname === "/search" && initial.get("q")) {
  runSearch(initial.get("q"), Math.max(1, Number(initial.get("page")) || 1), true);
}
