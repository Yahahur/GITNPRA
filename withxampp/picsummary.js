document.addEventListener("DOMContentLoaded", () => {
  window.Auth?.requireAuth?.();
  const makers = ["HONDA", "SUZUKI", "MAZDA", "SUBARU", "DAIHATSU", "TOYOTA", "NISSAN"];
  const STATUS_KEYS = ["Open", "Closed", "Cancelled", "Rejected"];
  const SUMMARY_TARGET_KEY = "NPRA_SUMMARY_TARGET";

  const tbody = document.querySelector("#picSummaryTable tbody");
  const backBtn = document.getElementById("backToDashboard");
  const goHomeBtn = document.getElementById("goHomeBtn");
  const makerFilter = document.getElementById("makerFilter");
  const logoutBtn = document.getElementById("logoutBtn");
  const modelFilter = document.getElementById("modelFilter");
  const eventFilter = document.getElementById("eventFilter");
  const statusDetailPanel = document.getElementById("statusDetailPanel");
  const statusDetailTitle = document.getElementById("statusDetailTitle");
  const statusDetailList = document.getElementById("statusDetailList");
  const picDueNotice = document.getElementById("picDueNotice");

  function getModelsKey(maker) {
    return `NPRA_MODELS_${maker}`;
  }

  function getEventsKey(maker) {
    return `NPRA_EVENTS_${maker}`;
  }

  function getSelectedEventKey(maker) {
    return `selectedEvent_${maker}`;
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

  function getMakerEvents(maker) {
    const raw = localStorage.getItem(getEventsKey(maker));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
    return [];
  }

  function normalizeStatus(value) {
    if (value === "Close") return "Closed";
    return value;
  }


  function parseDateOnly(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d)) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function isResolvedStatus(status) {
    return ["Closed", "Cancelled", "Rejected"].includes(status);
  }

  function getSelectValue(select, dataKey, fallback = "") {
    if (!select) return fallback;

    const dataValue = select.dataset[dataKey];
    if (dataValue) return dataValue;

    const selectedOption = select.querySelector("option[selected]");
    if (selectedOption) {
      return selectedOption.value || selectedOption.textContent.trim();
    }

    const option = select.options[select.selectedIndex >= 0 ? select.selectedIndex : 0];
    return option ? (option.value || option.textContent.trim()) : fallback;
  }

  function getBlockHeader(rows, index) {
    const blockStart = Math.floor(index / 4) * 4;
    const headerRow = rows[blockStart];
    if (!headerRow) return { itemNo: "—", process: "—", product: "—" };

    return {
      itemNo: headerRow.cells[0]?.textContent?.trim() || "—",
      process: headerRow.cells[3]?.textContent?.trim() || "—",
      product: headerRow.cells[4]?.textContent?.trim() || "—"
    };
  }

  function addDetail(summary, key, status, detail) {
    if (!summary.has(key)) {
      summary.set(key, {
        event: detail.event,
        pic: detail.pic,
        maker: detail.maker,
        model: detail.model,
        Open: 0,
        Closed: 0,
        Cancelled: 0,
        Rejected: 0,
        details: {
          Open: [],
          Closed: [],
          Cancelled: [],
          Rejected: []
        }
      });
    }

    const bucket = summary.get(key);
    if (!STATUS_KEYS.includes(status)) return;
    bucket[status] += 1;
    bucket.details[status].push(detail);
  }

  function openSummaryTarget(record) {
    if (!record) return;

    const maker = record.maker || makerFilter.value || "HONDA";
    const model = record.model || modelFilter.value || "";

    localStorage.setItem("selectedMaker", maker);
    if (model) {
      localStorage.setItem(`selectedModel_${maker}`, model);
    }

    const payload = {
      maker,
      model,
      event: record.event || "",
      pic: record.pic || "",
      status: record.status || "",
      itemNo: record.itemNo || "",
      process: record.process || "",
      product: record.product || "",
      createdAt: Date.now()
    };
    localStorage.setItem(SUMMARY_TARGET_KEY, JSON.stringify(payload));

    window.location.href = "honda.html";
  }

  function populateMakerOptions() {
    makerFilter.innerHTML = "";
    makers.forEach(maker => {
      const opt = document.createElement("option");
      opt.value = maker;
      opt.textContent = maker;
      makerFilter.appendChild(opt);
    });

    const savedMaker = localStorage.getItem("selectedMaker");
    if (savedMaker && makers.includes(savedMaker)) {
      makerFilter.value = savedMaker;
    }
  }

  function populateModelOptions() {
    const maker = makerFilter.value;
    const models = getMakerModels(maker);

    modelFilter.innerHTML = "";
    if (!models.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No model";
      modelFilter.appendChild(opt);
      modelFilter.disabled = true;
      return;
    }

    modelFilter.disabled = false;
    models.forEach(model => {
      const opt = document.createElement("option");
      opt.value = model;
      opt.textContent = model;
      modelFilter.appendChild(opt);
    });

    const savedModel = localStorage.getItem(`selectedModel_${maker}`);
    if (savedModel && models.includes(savedModel)) {
      modelFilter.value = savedModel;
    }
  }

  function populateEventOptions() {
    const maker = makerFilter.value;
    const events = getMakerEvents(maker);

    eventFilter.innerHTML = "";
    if (!events.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "All events";
      eventFilter.appendChild(opt);
      eventFilter.disabled = true;
      return;
    }

    eventFilter.disabled = false;
    events.forEach(event => {
      const opt = document.createElement("option");
      opt.value = event;
      opt.textContent = event;
      eventFilter.appendChild(opt);
    });

    const saved = localStorage.getItem(getSelectedEventKey(maker));
    if (saved && events.includes(saved)) {
      eventFilter.value = saved;
    }
  }

  function collectSummary() {
    const summary = new Map();
    const maker = makerFilter.value;
    const model = modelFilter.value;
    const selectedEvent = eventFilter?.value || "";
    if (!maker || !model) return [];

    const html = localStorage.getItem(buildStorageKey(maker, model));
    if (!html) return [];

    const temp = document.createElement("tbody");
    temp.innerHTML = html;

    const rows = Array.from(temp.querySelectorAll("tr"));
    let currentEvent = "";

    rows.forEach((row, index) => {
      const statusSelect = row.querySelector(".status-select");
      const picSelect = row.querySelector(".pic-select");
      if (!statusSelect || !picSelect) return;

      const status = normalizeStatus(getSelectValue(statusSelect, "status", "Open"));
      const pic = getSelectValue(picSelect, "pic", "—");
      if (!pic || pic === "—") return;

      const eventSelect = row.querySelector(".event-select");
      if (eventSelect) {
        currentEvent = getSelectValue(eventSelect, "event", "").trim();
      }
      const event = currentEvent || "No event";
      if (selectedEvent && event !== selectedEvent) return;
      const key = `${event}__${pic}`;
      const blockInfo = getBlockHeader(rows, index);

      addDetail(summary, key, status, {
        maker,
        model,
        event,
        pic,
        itemNo: blockInfo.itemNo,
        process: blockInfo.process,
        product: blockInfo.product,
        status
      });
    });

    return [...summary.values()].sort((a, b) => (`${a.event}|${a.pic}`).localeCompare(`${b.event}|${b.pic}`));
  }

  function collectDueByPic() {
    const maker = makerFilter.value;
    const model = modelFilter.value;
    const selectedEvent = eventFilter?.value || "";
    if (!maker || !model) return [];

    const html = localStorage.getItem(buildStorageKey(maker, model));
    if (!html) return [];

    const temp = document.createElement("tbody");
    temp.innerHTML = html;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const counts = new Map();
    let currentEvent = "";

    Array.from(temp.querySelectorAll("tr")).forEach(row => {
      const statusSelect = row.querySelector(".status-select");
      const picSelect = row.querySelector(".pic-select");
      const targetCell = row.querySelector(".target-date");
      if (!statusSelect || !picSelect || !targetCell) return;

      const eventSelect = row.querySelector(".event-select");
      if (eventSelect) currentEvent = getSelectValue(eventSelect, "event", "").trim();
      const event = currentEvent || "No event";
      if (selectedEvent && event !== selectedEvent) return;

      const status = normalizeStatus(getSelectValue(statusSelect, "status", "—"));
      if (isResolvedStatus(status)) return;

      const target = parseDateOnly(targetCell.dataset.raw || "");
      if (!target || target > today) return;

      const pic = getSelectValue(picSelect, "pic", "—");
      if (!pic || pic === "—") return;

      counts.set(pic, (counts.get(pic) || 0) + 1);
    });

    return [...counts.entries()].map(([pic, due]) => ({ pic, due })).sort((a, b) => b.due - a.due || a.pic.localeCompare(b.pic));
  }

  function renderDueNotice() {
    if (!picDueNotice) return;
    const dueRows = collectDueByPic();
    picDueNotice.hidden = false;

    if (!dueRows.length) {
      picDueNotice.textContent = "✅ No PIC currently has overdue target-date items for the selected filters.";
      return;
    }

    const list = dueRows.map(row => `${row.pic} (${row.due})`).join(", ");
    picDueNotice.textContent = `⚠️ PIC with due/past target dates: ${list}.`;
  }

  function clearStatusDetails() {
    statusDetailPanel.hidden = true;
    statusDetailList.innerHTML = "";
    statusDetailTitle.textContent = "Details";
  }

  function showStatusDetails(data, status) {
    const records = data?.details?.[status] || [];
    statusDetailList.innerHTML = "";

    statusDetailTitle.textContent = `${status.toUpperCase()} items • ${data.event} • ${data.pic}`;

    if (!records.length) {
      const li = document.createElement("li");
      li.textContent = "No matching items.";
      statusDetailList.appendChild(li);
    } else {
      records.forEach(record => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "detail-item-btn";
        btn.textContent = `Item ${record.itemNo} — ${record.process} / ${record.product}`;
        btn.addEventListener("click", () => openSummaryTarget(record));
        li.appendChild(btn);
        statusDetailList.appendChild(li);
      });
    }

    statusDetailPanel.hidden = false;
  }

  function render() {
    const rows = collectSummary();
    tbody.innerHTML = "";
    clearStatusDetails();
    renderDueNotice();

    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="7" style="text-align:center;">No PIC data found for selected maker/model.</td>`;
      tbody.appendChild(tr);
      return;
    }

    rows.forEach((data, index) => {
      const total = data.Open + data.Closed + data.Cancelled + data.Rejected;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.event}</td>
        <td>${data.pic}</td>
        <td><button class="status-count-btn" data-row-index="${index}" data-status="Open">${data.Open}</button></td>
        <td><button class="status-count-btn" data-row-index="${index}" data-status="Closed">${data.Closed}</button></td>
        <td><button class="status-count-btn" data-row-index="${index}" data-status="Cancelled">${data.Cancelled}</button></td>
        <td><button class="status-count-btn" data-row-index="${index}" data-status="Rejected">${data.Rejected}</button></td>
        <td>${total}</td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".status-count-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const rowIndex = Number(btn.dataset.rowIndex);
        const status = btn.dataset.status;
        if (Number.isNaN(rowIndex) || !status) return;
        showStatusDetails(rows[rowIndex], status);
      });
    });
  }

  backBtn?.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  goHomeBtn?.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  logoutBtn?.addEventListener("click", () => {
    window.Auth?.logout?.();
  });

  makerFilter?.addEventListener("change", () => {
    localStorage.setItem("selectedMaker", makerFilter.value);
    populateModelOptions();
    populateEventOptions();
    localStorage.setItem(`selectedModel_${makerFilter.value}`, modelFilter.value);
    if (eventFilter?.value) {
      localStorage.setItem(getSelectedEventKey(makerFilter.value), eventFilter.value);
    }
    render();
  });

  modelFilter?.addEventListener("change", () => {
    localStorage.setItem(`selectedModel_${makerFilter.value}`, modelFilter.value);
    render();
  });

  eventFilter?.addEventListener("change", () => {
    if (eventFilter.value) {
      localStorage.setItem(getSelectedEventKey(makerFilter.value), eventFilter.value);
    }
    render();
  });

  populateMakerOptions();
  populateModelOptions();
  populateEventOptions();
  render();
});
