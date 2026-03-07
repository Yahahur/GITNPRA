document.addEventListener("DOMContentLoaded", () => {

  /* ================= MAKER CONNECTION ================= */
  const selectedMaker = localStorage.getItem("selectedMaker") || "HONDA";
  const modelSelect = document.getElementById("modelSelect");
  const addModelBtn = document.getElementById("addModelBtn");
  const removeModelBtn = document.getElementById("removeModelBtn");
  const eventSelect = document.getElementById("eventSelect");
  const addEventBtn = document.getElementById("addEventBtn");
  const removeEventBtn = document.getElementById("removeEventBtn");
  const goPicSummaryBtn = document.getElementById("goPicSummaryBtn");
  const goHomeBtn = document.getElementById("goHomeBtn");

  function getModelsKey(maker) {
    return `NPRA_MODELS_${maker}`;
  }

  function buildStorageKey(maker, model) {
    return `NPRA_MASTER_SCHEDULE_${maker}__${model}`;
  }

  function getMakerModels(maker) {
    const raw = localStorage.getItem(getModelsKey(maker));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
    return [];
  }

  function saveMakerModels(maker, models) {
    localStorage.setItem(getModelsKey(maker), JSON.stringify(models));
  }

  function getEventsKey(maker) {
    return `NPRA_EVENTS_${maker}`;
  }

  function getMakerEvents(maker) {
    const raw = localStorage.getItem(getEventsKey(maker));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  }

  function saveMakerEvents(maker, events) {
    localStorage.setItem(getEventsKey(maker), JSON.stringify(events));
  }

  function getSelectedEventKey(maker) {
    return `selectedEvent_${maker}`;
  }

  let currentModel = localStorage.getItem(`selectedModel_${selectedMaker}`) || getMakerModels(selectedMaker)[0] || "";
  let STORAGE_KEY = currentModel ? buildStorageKey(selectedMaker, currentModel) : "";

  function updateTitle() {
    document.title = currentModel ? `${selectedMaker} - ${currentModel}` : `${selectedMaker}`;
    document.querySelector("h1").textContent = currentModel
      ? `NPRA MASTER SCHEDULE - ${selectedMaker} (${currentModel})`
      : `NPRA MASTER SCHEDULE - ${selectedMaker} (No model selected)`;
  }

  /* ================= ELEMENTS ================= */
  const mainTableBody = document.querySelector("#mainTable tbody");

  const addRowBtn = document.getElementById("addRowBtn");
  const deleteRowBtn = document.getElementById("deleteRowBtn");
  const clearDataBtn = document.getElementById("clearDataBtn");
  const enableBlockSelect = document.getElementById("enableBlockSelect");

  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const resetBtn = document.getElementById("resetBtn");

  const dateFrom = document.getElementById("dateFrom");
  const dateTo = document.getElementById("dateTo");
  const dateSearchBtn = document.getElementById("dateSearchBtn");
  const dateResetBtn = document.getElementById("dateResetBtn");

  const exportBtn = document.getElementById("exportData");
  const importBtn = document.getElementById("importBtn");
  const importInput = document.getElementById("importData");

  const statusFilterInputs = Array.from(document.querySelectorAll(".statusFilter"));
  const statusFilterAllBtn = document.getElementById("statusFilterAllBtn");
  const statusFilterResetBtn = document.getElementById("statusFilterResetBtn");

  let selectedBlock = null;
  let summaryHighlightTimeout = null;
  const SUMMARY_TARGET_KEY = "NPRA_SUMMARY_TARGET";

  const PIC_OPTIONS = [
    "FMEA","APQP","MPPD","PREPARATION","EVENT","DOCUMENTATION",
    "ME FINAL PROCESS 2", "CQA", "QAE", "QC FINAL", "fabrication",
    "eed final assy", "Final ect", "md", "pd pc event", "mm and eq", "—"
  ];

  const INCLUDE_OPTIONS = ["For Include", "Not Included"];

  function normalizeStatus(value) {
    if (value === "Close") return "Closed";
    return value;
  }

  function normalizeInclude(value) {
    if (value === "Include") return "For Include";
    if (value === "Not Include") return "Not Included";
    return value;
  }

  function createPicSelectHTML(selected = "—") {
    const options = PIC_OPTIONS.map(pic => {
      const selectedAttr = pic === selected ? " selected" : "";
      return `<option value="${pic}"${selectedAttr}>${pic}</option>`;
    }).join("");
    return `<select class="pic-select" data-pic="${selected}">${options}</select>`;
  }

  function createEventSelectHTML(selected = "—") {
    const events = getMakerEvents(selectedMaker);
    const base = events.length ? events : ["—"];
    const options = base.map(event => {
      const selectedAttr = event === selected ? " selected" : "";
      return `<option value="${event}"${selectedAttr}>${event}</option>`;
    }).join("");
    return `<select class="event-select" data-event="${selected}">${options}</select>`;
  }

  function createIncludeSelectHTML(selected = "For Include") {
    const options = INCLUDE_OPTIONS.map(v => {
      const selectedAttr = v === selected ? " selected" : "";
      return `<option value="${v}"${selectedAttr}>${v}</option>`;
    }).join("");
    return `<select class="include-select" data-include="${selected}">${options}</select>`;
  }

  function renderModelOptions() {
    if (!modelSelect) return;

    const models = getMakerModels(selectedMaker);
    if (!models.includes(currentModel)) {
      currentModel = models[0] || "";
    }

    modelSelect.innerHTML = "";
    if (models.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No model (add one)";
      opt.selected = true;
      modelSelect.appendChild(opt);
      modelSelect.disabled = true;
      STORAGE_KEY = "";
    } else {
      modelSelect.disabled = false;
      models.forEach(model => {
        const opt = document.createElement("option");
        opt.value = model;
        opt.textContent = model;
        opt.selected = model === currentModel;
        modelSelect.appendChild(opt);
      });
      STORAGE_KEY = buildStorageKey(selectedMaker, currentModel);
      localStorage.setItem(`selectedModel_${selectedMaker}`, currentModel);
    }

    updateTitle();
  }

  function switchModel(model) {
    currentModel = model || "";
    if (currentModel) {
      localStorage.setItem(`selectedModel_${selectedMaker}`, currentModel);
      STORAGE_KEY = buildStorageKey(selectedMaker, currentModel);
    } else {
      STORAGE_KEY = "";
    }
    updateTitle();
    selectedBlock = null;
    clearSelectedBlockUI();
    loadTable();
    applyFilters();
  }

  function renderEventOptions() {
    if (!eventSelect) return;

    const events = getMakerEvents(selectedMaker);
    eventSelect.innerHTML = "";

    if (!events.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No event (add one)";
      opt.selected = true;
      eventSelect.appendChild(opt);
      eventSelect.disabled = true;
      localStorage.removeItem(getSelectedEventKey(selectedMaker));
      return;
    }

    const saved = localStorage.getItem(getSelectedEventKey(selectedMaker));
    const selected = saved && events.includes(saved) ? saved : events[0];

    eventSelect.disabled = false;
    events.forEach(event => {
      const opt = document.createElement("option");
      opt.value = event;
      opt.textContent = event;
      opt.selected = event === selected;
      eventSelect.appendChild(opt);
    });

    localStorage.setItem(getSelectedEventKey(selectedMaker), selected);
  }

  /* ================= UTIL ================= */
  function formatDate(value) {
    if (!value) return "—";
    const m = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const d = new Date(value);
    if (isNaN(d)) return "—";
    return `${m[d.getMonth()]}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;
  }

  function parseDateOnly(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d)) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getBlocks() {
    const rows = Array.from(mainTableBody.rows);
    const blocks = [];
    for (let i = 0; i < rows.length; i += 4) {
      blocks.push(rows.slice(i, i + 4).filter(Boolean));
    }
    return blocks;
  }

  function getStatusSelectsInBlock(blockRows) {
    return blockRows.flatMap(row => Array.from(row.querySelectorAll(".status-select")));
  }

  function getDateCellsByType(row) {
    const dateCells = Array.from(row.querySelectorAll(".date-cell"));
    if (dateCells.length === 0) return { npra: null, target: null, recovery: null };

    // First row in each block has NPRA + TARGET + RECOVERY
    if (dateCells.length >= 3) {
      return { npra: dateCells[0], target: dateCells[1], recovery: dateCells[2] };
    }

    // Other rows have TARGET + RECOVERY
    if (dateCells.length >= 2) {
      return { npra: null, target: dateCells[0], recovery: dateCells[1] };
    }

    return { npra: null, target: dateCells[0], recovery: null };
  }

  function tagDateCellTypes() {
    getBlocks().forEach(blockRows => {
      blockRows.forEach(row => {
        const { npra, target, recovery } = getDateCellsByType(row);
        if (npra) {
          npra.classList.add("npra-date");
          npra.classList.remove("target-date", "recovery-date");
        }
        if (target) {
          target.classList.add("target-date");
          target.classList.remove("npra-date");
        }
        if (recovery) {
          recovery.classList.add("recovery-date");
          recovery.classList.remove("npra-date");
        }
      });
    });
  }

  /* ================= STATUS COLOR ================= */
  function applyStatusLogic(select) {
    const td = select.closest("td");
    const val = select.value;

    td.style.backgroundColor =
      val === "Open" ? "#f8d7da" :
      val === "Closed" ? "#d4edda" :
      val === "Cancelled" ? "#fff3cd" :
      val === "Rejected" ? "#f5c6cb" :
      "";
  }

  function hydrateStatusSelect(select) {
    const legacyCloseOption = select.querySelector('option[value="Close"]');
    if (legacyCloseOption) {
      legacyCloseOption.value = "Closed";
      legacyCloseOption.textContent = "Closed";
    }

    const savedStatus = normalizeStatus(select.dataset.status || select.value);
    if (savedStatus) {
      select.value = savedStatus;
    }
    select.dataset.status = select.value;
  }

  function updateStatusReasonUI(select) {
    const td = select.closest("td");
    if (!td) return;

    const reason = (select.dataset.reason || "").trim();
    if (["Cancelled", "Rejected"].includes(select.value) && reason) {
      td.title = `${select.value} reason: ${reason}`;
    } else if (["Cancelled", "Rejected"].includes(select.value)) {
      td.title = `${select.value} reason: (not provided)`;
    } else {
      td.title = "";
      select.dataset.reason = "";
    }
  }

  function askReasonIfNeeded(select) {
    if (!["Cancelled", "Rejected"].includes(select.value)) {
      select.dataset.reason = "";
      return;
    }

    const current = select.dataset.reason || "";
    const entered = prompt(`Enter reason for ${select.value}:`, current);
    if (entered === null) {
      select.value = "Open";
      select.dataset.reason = "";
    } else {
      select.dataset.reason = entered.trim();
    }
  }

  function isResolvedStatus(status) {
    return ["Closed", "Cancelled", "Rejected"].includes(status);
  }

  function getStatusDateColor(status) {
    if (status === "Closed") return "#d4edda";
    if (status === "Cancelled") return "#fff3cd";
    if (status === "Rejected") return "#f5c6cb";
    return "";
  }

  function applyDateColorByStatus(select) {
    const row = select.closest("tr");
    if (!row) return;

    const { target, recovery } = getDateCellsByType(row);
    const status = select.value;

    [target, recovery].forEach(td => {
      if (!td) return;
      if (isResolvedStatus(status)) {
        td.style.backgroundColor = getStatusDateColor(status);
        td.title = `${status}`;
      }
    });
  }

  /* ================= DATE WARNING ================= */
  function updateDateWarnings() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Reset only target/recovery columns (NPRA must not turn red)
    document.querySelectorAll(".target-date, .recovery-date").forEach(td => {
      td.style.backgroundColor = "";
      td.title = "";
    });

    // Apply warning colors for due/overdue target/recovery cells
    document.querySelectorAll(".target-date, .recovery-date").forEach(td => {
      const row = td.closest("tr");
      const statusSelect = row ? row.querySelector(".status-select") : null;
      if (statusSelect && isResolvedStatus(statusSelect.value)) {
        return;
      }

      const raw = td.dataset.raw;
      if (!raw) return;

      const target = parseDateOnly(raw);
      if (!target) return;

      const diff = Math.ceil((target - today) / 86400000);
      if (diff <= 5) {
        td.style.backgroundColor = "#f8d7da";
        td.title = diff >= 0 ? `Due in ${diff} day(s)` : "Overdue";
      }
    });

    // Resolved rows override warning with status-specific colors.
    document.querySelectorAll(".status-select").forEach(select => {
      applyDateColorByStatus(select);
    });
  }

  /* ================= RENUMBER ================= */
  function renumberItems() {
    let count = 1;
    for (let i = 0; i < mainTableBody.rows.length; i += 4) {
      if (mainTableBody.rows[i]) {
        mainTableBody.rows[i].cells[0].innerText = count++;
      }
    }
  }

  /* ================= SAVE / LOAD ================= */
  function syncSelectValues() {
    document.querySelectorAll(".status-select").forEach(select => {
      select.value = normalizeStatus(select.value);
      select.dataset.status = select.value;
      select.dataset.reason = select.dataset.reason || "";
      [...select.options].forEach(opt => {
        opt.selected = opt.value === select.value;
      });
    });

    document.querySelectorAll(".pic-select").forEach(select => {
      const persisted = select.dataset.pic || select.value;
      if (PIC_OPTIONS.includes(persisted)) {
        select.value = persisted;
      }
      select.dataset.pic = select.value;
      [...select.options].forEach(opt => {
        opt.selected = opt.value === select.value;
      });
    });

    document.querySelectorAll(".event-select").forEach(select => {
      const persisted = select.dataset.event || select.value;
      if (persisted) {
        select.value = persisted;
      }
      select.dataset.event = select.value;
      [...select.options].forEach(opt => {
        opt.selected = opt.value === select.value;
      });
    });

    document.querySelectorAll(".include-select").forEach(select => {
      const persisted = normalizeInclude(select.dataset.include || select.value);
      if (INCLUDE_OPTIONS.includes(persisted)) {
        select.value = persisted;
      }
      select.dataset.include = select.value;
      [...select.options].forEach(opt => {
        opt.selected = opt.value === select.value;
      });
    });
  }

  function normalizeAndHydratePicCells() {
    document.querySelectorAll(".status-cell").forEach(statusCell => {
      let picCell = statusCell.previousElementSibling;
      while (picCell && (picCell.classList.contains("date-cell") || picCell.classList.contains("include-cell"))) {
        picCell = picCell.previousElementSibling;
      }
      if (!picCell) return;

      picCell.classList.add("pic-cell");

      if (!picCell.querySelector(".pic-select")) {
        const raw = (picCell.textContent || "").trim();
        const selected = PIC_OPTIONS.includes(raw) ? raw : "—";
        picCell.innerHTML = createPicSelectHTML(selected);
      }

      const select = picCell.querySelector(".pic-select");
      if (!select) return;

      const saved = select.dataset.pic;
      if (saved && PIC_OPTIONS.includes(saved)) {
        select.value = saved;
      }
      if (!PIC_OPTIONS.includes(select.value)) {
        select.value = "—";
      }
      select.dataset.pic = select.value;
    });
  }


  function normalizeAndHydrateEventCells() {
    const eventOptions = getMakerEvents(selectedMaker);
    const blocks = getBlocks();

    blocks.forEach(blockRows => {
      const firstRow = blockRows[0];
      if (!firstRow || firstRow.cells.length < 3) return;

      const eventCell = firstRow.cells[2];
      eventCell.classList.add("event-cell");

      if (!eventCell.querySelector(".event-select")) {
        const raw = (eventCell.textContent || "").trim();
        const selected = eventOptions.includes(raw) ? raw : (eventOptions[0] || "");
        eventCell.innerHTML = createEventSelectHTML(selected || "—");
      }

      const select = eventCell.querySelector(".event-select");
      if (!select) return;

      if (!eventOptions.length) {
        select.innerHTML = '<option value="">No event</option>';
        select.value = "";
        select.disabled = true;
      } else {
        select.disabled = false;
        const current = select.dataset.event || select.value || eventOptions[0];
        select.innerHTML = eventOptions.map(event => {
          const sel = event === current ? " selected" : "";
          return `<option value="${event}"${sel}>${event}</option>`;
        }).join("");
        if (!eventOptions.includes(select.value)) {
          select.value = eventOptions[0];
        }
      }

      select.dataset.event = select.value;
    });
  }

  function normalizeAndHydrateIncludeCells() {
    document.querySelectorAll(".status-cell").forEach(statusCell => {
      const targetDateCell = statusCell.previousElementSibling;
      if (!targetDateCell || !targetDateCell.classList.contains("date-cell")) return;

      let includeCell = targetDateCell.previousElementSibling;
      if (!includeCell || !includeCell.classList.contains("include-cell")) {
        includeCell = document.createElement("td");
        includeCell.className = "include-cell";
        targetDateCell.parentNode.insertBefore(includeCell, targetDateCell);
      }

      if (!includeCell.querySelector(".include-select")) {
        const raw = (includeCell.textContent || "").trim();
        const normalizedRaw = normalizeInclude(raw);
        const selected = INCLUDE_OPTIONS.includes(normalizedRaw) ? normalizedRaw : "For Include";
        includeCell.innerHTML = createIncludeSelectHTML(selected);
      }

      const select = includeCell.querySelector(".include-select");
      if (!select) return;

      const saved = normalizeInclude(select.dataset.include);
      if (saved && INCLUDE_OPTIONS.includes(saved)) {
        select.value = saved;
      }

      select.value = normalizeInclude(select.value);
      if (!INCLUDE_OPTIONS.includes(select.value)) {
        select.value = "For Include";
      }
      select.dataset.include = select.value;
    });
  }

  function saveTable() {
    syncSelectValues();
    if (!STORAGE_KEY) return;
    localStorage.setItem(STORAGE_KEY, mainTableBody.innerHTML);
  }

  function loadTable() {
    if (!STORAGE_KEY) {
      mainTableBody.innerHTML = "";
      return;
    }

    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      mainTableBody.innerHTML = "";
      return;
    }
    mainTableBody.innerHTML = data;

    tagDateCellTypes();
    normalizeAndHydratePicCells();
    normalizeAndHydrateEventCells();
    normalizeAndHydrateIncludeCells();

    document.querySelectorAll(".status-select").forEach(select => {
      hydrateStatusSelect(select);
      applyStatusLogic(select);
      updateStatusReasonUI(select);
    });

    updateDateWarnings();
    renumberItems();
  }

  /* ================= FILTERS ================= */
  function blockText(blockRows) {
    return blockRows.map(row => row.textContent.toLowerCase()).join(" ");
  }

  function blockInDateRange(blockRows, fromDate, toDate) {
    const allDateCells = blockRows.flatMap(row => Array.from(row.querySelectorAll(".date-cell")));
    const raws = allDateCells.map(td => td.dataset.raw).filter(Boolean);

    if (raws.length === 0) return false;

    return raws.some(raw => {
      const d = parseDateOnly(raw);
      if (!d) return false;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }

  function getEnabledStatusFilters() {
    const checked = statusFilterInputs
      .filter(input => input.checked)
      .map(input => input.value);
    return new Set(checked);
  }

  function blockMatchesStatus(blockRows, enabledStatuses) {
    if (enabledStatuses.size === 0) return false;

    const statuses = blockRows.flatMap(row =>
      Array.from(row.querySelectorAll(".status-select")).map(select => select.value)
    );

    if (statuses.length === 0) return true;
    return statuses.some(status => enabledStatuses.has(status));
  }

  function getBlockEvent(blockRows) {
    const firstRow = blockRows[0];
    if (!firstRow) return "";
    const select = firstRow.querySelector(".event-select");
    return select ? select.value : "";
  }

  function blockMatchesSelectedEvent(blockRows) {
    const selectedEvent = eventSelect?.value || "";
    if (!selectedEvent) return true;
    return getBlockEvent(blockRows) === selectedEvent;
  }

  function applyFilters() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const fromDate = parseDateOnly(dateFrom.value);
    const toDate = parseDateOnly(dateTo.value);
    const enabledStatuses = getEnabledStatusFilters();

    getBlocks().forEach(blockRows => {
      const matchesSearch = !query || blockText(blockRows).includes(query);
      const matchesDate = (!fromDate && !toDate) || blockInDateRange(blockRows, fromDate, toDate);
      const matchesStatus = blockMatchesStatus(blockRows, enabledStatuses);
      const matchesEvent = blockMatchesSelectedEvent(blockRows);
      const visible = matchesSearch && matchesDate && matchesStatus && matchesEvent;

      blockRows.forEach(row => {
        row.style.display = visible ? "" : "none";
      });
    });
  }

  /* ================= BLOCK SELECT ================= */
  function clearSelectedBlockUI() {
    document.querySelectorAll("tr.selected-block").forEach(tr => tr.classList.remove("selected-block"));
  }

  function setSelectedBlockFromRow(row) {
    const rows = Array.from(mainTableBody.rows);
    const index = rows.indexOf(row);
    if (index === -1) return;

    const start = Math.floor(index / 4) * 4;
    const blockRows = rows.slice(start, start + 4);

    clearSelectedBlockUI();
    blockRows.forEach(r => r.classList.add("selected-block"));
    selectedBlock = blockRows[0] || null;
  }

  function clearSummaryTargetHighlight() {
    if (summaryHighlightTimeout) {
      clearTimeout(summaryHighlightTimeout);
      summaryHighlightTimeout = null;
    }
    document.querySelectorAll("tr.summary-target-highlight").forEach(tr => {
      tr.classList.remove("summary-target-highlight");
    });
  }

  function highlightSummaryTargetBlock(row) {
    const rows = Array.from(mainTableBody.rows);
    const index = rows.indexOf(row);
    if (index === -1) return;

    const start = Math.floor(index / 4) * 4;
    const blockRows = rows.slice(start, start + 4);

    clearSummaryTargetHighlight();
    blockRows.forEach(r => r.classList.add("summary-target-highlight"));

    summaryHighlightTimeout = setTimeout(() => {
      blockRows.forEach(r => r.classList.remove("summary-target-highlight"));
      summaryHighlightTimeout = null;
    }, 5000);
  }

  function loadSummaryTarget() {
    const raw = localStorage.getItem(SUMMARY_TARGET_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function clearSummaryTarget() {
    localStorage.removeItem(SUMMARY_TARGET_KEY);
  }

  function jumpToSummaryTarget() {
    const target = loadSummaryTarget();
    if (!target) return;

    if (target.maker && target.maker !== selectedMaker) {
      clearSummaryTarget();
      return;
    }

    if (target.model && modelSelect && modelSelect.value !== target.model) {
      const hasModel = Array.from(modelSelect.options).some(opt => opt.value === target.model);
      if (hasModel) {
        switchModel(target.model);
      }
    }

    if (target.event && eventSelect) {
      const hasEvent = Array.from(eventSelect.options).some(opt => opt.value === target.event);
      if (hasEvent) {
        eventSelect.value = target.event;
        localStorage.setItem(getSelectedEventKey(selectedMaker), target.event);
      }
    }

    searchInput.value = "";
    dateFrom.value = "";
    dateTo.value = "";
    statusFilterInputs.forEach(input => {
      input.checked = true;
    });
    applyFilters();

    const allRows = Array.from(mainTableBody.rows);
    const targetRow = allRows.find(row => {
      const itemNo = row.cells[0]?.textContent?.trim();
      const process = row.cells[3]?.textContent?.trim();
      const product = row.cells[4]?.textContent?.trim();
      if (target.itemNo && itemNo !== target.itemNo) return false;
      if (target.process && process !== target.process) return false;
      if (target.product && product !== target.product) return false;
      return true;
    });

    if (targetRow) {
      highlightSummaryTargetBlock(targetRow);
      targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    clearSummaryTarget();
  }

  /* ================= ADD BLOCK ================= */
  addRowBtn.addEventListener("click", () => {
    if (!STORAGE_KEY) return alert("Add/select a model first.");
    const selectedEvent = eventSelect?.value || "";
    if (!selectedEvent) return alert("Add/select an event first.");

    const process = prompt("Enter Process:");
    const product = prompt("Enter Product:");
    if (!process || !product) return;

    const statusHTML = `
      <select class="status-select">
        <option value="Open">Open</option>
        <option value="Closed">Closed</option>
        <option value="Cancelled">Cancelled</option>
        <option value="Rejected">Rejected</option>
        <option value="—">—</option>
      </select>`;
    const picHTML = createPicSelectHTML();
    const includeHTML = createIncludeSelectHTML("For Include");

    for (let i = 0; i < 4; i++) {
      const tr = document.createElement("tr");
      tr.innerHTML = i === 0 ? `
        <td rowspan="4"></td>
        <td rowspan="4" class="date-cell npra-date" data-raw="">—</td>
        <td rowspan="4" class="event-cell">${createEventSelectHTML(selectedEvent)}</td>
        <td rowspan="4">${process}</td>
        <td rowspan="4">${product}</td>
        <td rowspan="4">—</td>
        <td rowspan="4">—</td>
        <td rowspan="2" class="vertical-text">OCCURRENCE</td>
        <td>—</td><td class="pic-cell">${picHTML}</td>
        <td class="include-cell">${includeHTML}</td>
        <td class="date-cell target-date" data-raw="">—</td>
        <td class="status-cell">${statusHTML}</td>
        <td class="date-cell recovery-date" data-raw="">—</td>
      ` : `
        ${i === 2 ? `<td rowspan="2" class="vertical-text">OUTFLOW</td>` : ""}
        <td>—</td><td class="pic-cell">${picHTML}</td>
        <td class="include-cell">${includeHTML}</td>
        <td class="date-cell target-date" data-raw="">—</td>
        <td class="status-cell">${statusHTML}</td>
        <td class="date-cell recovery-date" data-raw="">—</td>
      `;
      mainTableBody.appendChild(tr);
    }

    renumberItems();
    updateDateWarnings();
    saveTable();
    applyFilters();
  });

  /* ================= INLINE EDIT (TEXT ONLY, NO STATUS) ================= */
  document.addEventListener("dblclick", e => {
    const td = e.target.closest("td");

    if (
      !td ||
      td.classList.contains("vertical-text") ||
      td.classList.contains("status-cell") ||
      td.classList.contains("pic-cell") ||
      td.classList.contains("event-cell") ||
      td.classList.contains("include-cell") ||
      td.querySelector("input") ||
      td.querySelector("select")
    ) return;

    const ta = document.createElement("textarea");
    ta.value = td.textContent === "—" ? "" : td.textContent;
    td.textContent = "";
    td.appendChild(ta);
    ta.focus();

    ta.onblur = () => {
      td.textContent = ta.value.trim() || "—";
      saveTable();
      applyFilters();
    };
  });

  /* ================= INLINE DATE EDIT ================= */
  document.addEventListener("dblclick", e => {
    const td = e.target.closest(".date-cell");
    if (!td || td.querySelector("input")) return;

    const input = document.createElement("input");
    input.type = "date";
    input.value = td.dataset.raw || "";
    td.textContent = "";
    td.appendChild(input);
    input.focus();

    input.onchange = input.onblur = () => {
      td.dataset.raw = input.value;
      td.textContent = formatDate(input.value);
      updateDateWarnings();
      saveTable();
      applyFilters();
    };
  });

  /* ================= BLOCK CLICK SELECT ================= */
  mainTableBody.addEventListener("click", e => {
    if (!enableBlockSelect || !enableBlockSelect.checked) return;
    if (e.target.closest("input, textarea, select, button")) return;
    const row = e.target.closest("tr");
    if (!row) return;
    setSelectedBlockFromRow(row);
  });

  if (enableBlockSelect) {
    enableBlockSelect.addEventListener("change", () => {
      if (!enableBlockSelect.checked) {
        clearSelectedBlockUI();
        selectedBlock = null;
      }
    });
  }

  /* ================= STATUS CHANGE ================= */
  document.addEventListener("change", e => {
    if (e.target.classList.contains("status-select")) {
      const allowed = ["Open", "Closed", "Close", "Cancelled", "Rejected", "—"];
      e.target.value = normalizeStatus(e.target.value);
      if (!allowed.includes(e.target.value)) e.target.value = "Open";

      askReasonIfNeeded(e.target);
      e.target.dataset.status = e.target.value;
      applyStatusLogic(e.target);
      updateStatusReasonUI(e.target);
      updateDateWarnings();
      saveTable();
      applyFilters();
    }

    if (e.target.classList.contains("pic-select")) {
      if (!PIC_OPTIONS.includes(e.target.value)) {
        e.target.value = "—";
      }
      e.target.dataset.pic = e.target.value;
      saveTable();
      applyFilters();
    }

    if (e.target.classList.contains("event-select")) {
      e.target.dataset.event = e.target.value;
      saveTable();
      applyFilters();
    }

    if (e.target.classList.contains("include-select")) {
      e.target.value = normalizeInclude(e.target.value);
      if (!INCLUDE_OPTIONS.includes(e.target.value)) e.target.value = "For Include";
      e.target.dataset.include = e.target.value;
      saveTable();
      applyFilters();
    }
  });

  /* ================= SEARCH / DATE FILTER ================= */
  searchBtn.addEventListener("click", applyFilters);
  resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    applyFilters();
  });

  dateSearchBtn.addEventListener("click", applyFilters);
  dateResetBtn.addEventListener("click", () => {
    dateFrom.value = "";
    dateTo.value = "";
    applyFilters();
  });

  statusFilterInputs.forEach(input => {
    input.addEventListener("change", applyFilters);
  });

  statusFilterAllBtn?.addEventListener("click", () => {
    statusFilterInputs.forEach(input => {
      input.checked = true;
    });
    applyFilters();
  });

  statusFilterResetBtn?.addEventListener("click", () => {
    statusFilterInputs.forEach(input => {
      input.checked = true;
    });
    applyFilters();
  });

  /* ================= DELETE BLOCK ================= */
  deleteRowBtn.addEventListener("click", () => {
    if (!selectedBlock) return alert("Enable block select, then click any row in the block first.");
    if (!confirm("Delete this block?")) return;

    let r = selectedBlock;
    for (let i = 0; i < 4 && r; i++) {
      const next = r.nextElementSibling;
      r.remove();
      r = next;
    }

    selectedBlock = null;
    renumberItems();
    saveTable();
    applyFilters();
  });

  /* ================= EXPORT / IMPORT ================= */
  exportBtn.onclick = () => {
    if (!STORAGE_KEY) return alert("Add/select a model first.");
    const payload = {
      maker: selectedMaker,
      tableHtml: localStorage.getItem(STORAGE_KEY) || ""
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${selectedMaker}_NPRA.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  importBtn.onclick = () => {
    if (!STORAGE_KEY) return alert("Add/select a model first.");
    importInput.click();
  };

  importInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const r = new FileReader();
    r.onload = () => {
      try {
        const raw = String(r.result || "");
        let html = raw;

        const parsed = JSON.parse(raw);
        if (typeof parsed === "string") {
          html = parsed;
        } else if (parsed && typeof parsed.tableHtml === "string") {
          html = parsed.tableHtml;
        }

        localStorage.setItem(STORAGE_KEY, html);
        loadTable();
        applyFilters();
        alert("Import successful.");
      } catch {
        localStorage.setItem(STORAGE_KEY, String(r.result || ""));
        loadTable();
        applyFilters();
        alert("Import successful.");
      }
    };
    r.readAsText(file);
    e.target.value = "";
  };

  /* ================= CLEAR ================= */
  clearDataBtn.onclick = () => {
    if (confirm(`Clear saved data for ${selectedMaker} (${currentModel})?`)) {
      localStorage.removeItem(STORAGE_KEY);
      mainTableBody.innerHTML = "";
      selectedBlock = null;
    }
  };

  /* ================= MODEL CONTROLS ================= */
  renderModelOptions();
  renderEventOptions();

  modelSelect?.addEventListener("change", () => {
    switchModel(modelSelect.value);
  });

  eventSelect?.addEventListener("change", () => {
    localStorage.setItem(getSelectedEventKey(selectedMaker), eventSelect.value || "");
    applyFilters();
  });

  addModelBtn?.addEventListener("click", () => {
    const next = prompt(`Enter new model name for ${selectedMaker}:`);
    if (!next) return;

    const model = next.trim();
    if (!model) return;

    const models = getMakerModels(selectedMaker);
    if (!models.includes(model)) {
      models.push(model);
      saveMakerModels(selectedMaker, models);
    }

    renderModelOptions();
    switchModel(model);
  });

  removeModelBtn?.addEventListener("click", () => {
    if (!currentModel) return alert("No model selected.");
    if (!confirm(`Remove model ${currentModel} from ${selectedMaker}?`)) return;

    const models = getMakerModels(selectedMaker).filter(model => model !== currentModel);
    localStorage.removeItem(buildStorageKey(selectedMaker, currentModel));
    saveMakerModels(selectedMaker, models);

    const nextModel = models[0] || "";
    renderModelOptions();
    switchModel(nextModel);
  });


  addEventBtn?.addEventListener("click", () => {
    const next = prompt(`Enter new event name for ${selectedMaker}:`);
    if (!next) return;

    const event = next.trim();
    if (!event) return;

    const events = getMakerEvents(selectedMaker);
    if (!events.includes(event)) {
      events.push(event);
      saveMakerEvents(selectedMaker, events);
    }

    renderEventOptions();
    eventSelect.value = event;
    localStorage.setItem(getSelectedEventKey(selectedMaker), event);
    loadTable();
    applyFilters();
  });

  removeEventBtn?.addEventListener("click", () => {
    const currentEvent = eventSelect?.value || "";
    if (!currentEvent) return alert("No event selected.");
    if (!confirm(`Remove event ${currentEvent} from ${selectedMaker}?`)) return;

    const events = getMakerEvents(selectedMaker).filter(event => event !== currentEvent);
    saveMakerEvents(selectedMaker, events);

    renderEventOptions();
    localStorage.setItem(getSelectedEventKey(selectedMaker), eventSelect?.value || "");
    loadTable();
    applyFilters();
  });

  goPicSummaryBtn?.addEventListener("click", () => {
    localStorage.setItem("selectedMaker", selectedMaker);
    if (currentModel) {
      localStorage.setItem(`selectedModel_${selectedMaker}`, currentModel);
    }
    window.location.href = "picsummary.html";
  });

  goHomeBtn?.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  /* ================= INITIAL LOAD ================= */
  loadTable();
  applyFilters();
  jumpToSummaryTarget();

});
