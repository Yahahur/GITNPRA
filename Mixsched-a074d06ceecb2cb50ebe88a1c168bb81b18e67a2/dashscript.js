document.addEventListener("DOMContentLoaded", () => {
  window.Auth?.requireAuth?.();
  const role = window.Auth?.getRole?.() || "";
  const isUser = role === "user";

  const makers = [
    "HONDA",
    "SUZUKI",
    "MAZDA",
    "SUBARU",
    "DAIHATSU",
    "TOYOTA",
    "NISSAN"
  ];

  const makerGrid = document.getElementById("makerGrid");
  const exportAllDataBtn = document.getElementById("exportAllDataBtn");
  const importAllDataBtn = document.getElementById("importAllDataBtn");
  const importAllDataInput = document.getElementById("importAllDataInput");
  const goHomeBtn = document.getElementById("goHomeBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const accessIndicator = document.getElementById("accessIndicator");
  const dueNotice = document.getElementById("dueNotice");

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

  function getStatusCountByMaker(maker) {
    const count = { Open: 0, Closed: 0, Cancelled: 0, Rejected: 0, Due: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const models = getMakerModels(maker);
    models.forEach(model => {
      const key = buildStorageKey(maker, model);
      const html = localStorage.getItem(key);
      if (!html) return;

      const temp = document.createElement("tbody");
      temp.innerHTML = html;

      temp.querySelectorAll(".status-select").forEach(select => {
        let val = getSelectValue(select, "status", "Open");
        if (val === "Close") val = "Closed";
        if (count.hasOwnProperty(val)) count[val]++;
      });

      temp.querySelectorAll("tr").forEach(row => {
        const statusSelect = row.querySelector(".status-select");
        const targetDateCell = row.querySelector(".target-date");
        if (!statusSelect || !targetDateCell) return;

        let status = getSelectValue(statusSelect, "status", statusSelect.value || "Open");
        if (status === "Close") status = "Closed";
        if (isResolvedStatus(status)) return;

        const targetDate = parseDateOnly(targetDateCell.dataset.raw || "");
        if (!targetDate || targetDate > today) return;

        count.Due++;
      });
    });

    return count;
  }

  function getDueByMaker() {
    return makers
      .map(maker => ({ maker, due: getStatusCountByMaker(maker).Due }))
      .filter(entry => entry.due > 0);
  }



  function buildMakerCard(maker) {
    const status = getStatusCountByMaker(maker);

    const card = document.createElement("div");
    card.className = "maker-card";

    card.innerHTML = `
      <div class="maker-name">${maker}</div>
      <div class="status-row open"><span>OPEN</span><strong>${status.Open}</strong></div>
      <div class="status-row close"><span>CLOSED</span><strong>${status.Closed}</strong></div>
      <div class="status-row cancelled"><span>CANCELLED</span><strong>${status.Cancelled}</strong></div>
      <div class="status-row rejected"><span>REJECTED</span><strong>${status.Rejected}</strong></div>
      <div class="status-row due"><span>DUE ITEMS</span><strong>${status.Due}</strong></div>
    `;

    card.addEventListener("click", () => {
      localStorage.setItem("selectedMaker", maker);
      const models = getMakerModels(maker);
      const preferred = localStorage.getItem(`selectedModel_${maker}`);
      const model = preferred && models.includes(preferred) ? preferred : (models[0] || "");
      if (model) localStorage.setItem(`selectedModel_${maker}`, model);
      window.location.href = "honda.html";
    });

    return card;
  }

  function buildSummaryCard() {
    const card = document.createElement("div");
    card.className = "maker-card summary-card";
    card.innerHTML = `
      <div class="maker-name">ALL PIC SUMMARY</div>
      <p class="summary-note">Select maker and model, then view Open/Closed/Cancelled/Rejected by PIC.</p>
      <div class="status-row"><span>OPEN SUMMARY</span><strong>→</strong></div>
      <div class="status-row"><span>CLOSED SUMMARY</span><strong>→</strong></div>
      <div class="status-row"><span>CANCELLED SUMMARY</span><strong>→</strong></div>
      <div class="status-row"><span>REJECTED SUMMARY</span><strong>→</strong></div>
    `;

    card.addEventListener("click", () => {
      window.location.href = "picsummary.html";
    });

    return card;
  }



  function renderAccessIndicator() {
    if (!accessIndicator) return;
    accessIndicator.textContent = `Access: ${isUser ? "USER" : "ADMIN"}`;
    accessIndicator.classList.toggle("user", isUser);
    accessIndicator.classList.toggle("admin", !isUser);
  }

  function renderDueNotice() {
    if (!dueNotice) return;

    const dueByMaker = getDueByMaker();
    const totalDue = dueByMaker.reduce((sum, entry) => sum + entry.due, 0);

    dueNotice.hidden = false;
    if (totalDue > 0) {
      const makerSummary = dueByMaker.map(entry => `${entry.maker} (${entry.due})`).join(", ");
      dueNotice.textContent = `⚠️ ${totalDue} due item(s). Makers: ${makerSummary}.`;
    } else {
      dueNotice.textContent = "✅ No overdue target-date items.";
    }
  }

  if (isUser) {
    exportAllDataBtn?.setAttribute("hidden", "hidden");
    importAllDataBtn?.setAttribute("hidden", "hidden");
  }

  function renderDashboard() {
    makerGrid.innerHTML = "";
    makers.forEach(maker => makerGrid.appendChild(buildMakerCard(maker)));
    makerGrid.appendChild(buildSummaryCard());
    renderDueNotice();
  }

  function exportAllMakersData() {
    const keys = Object.keys(localStorage).filter(key =>
      key.startsWith("NPRA_MASTER_SCHEDULE_") ||
      key.startsWith("NPRA_MODELS_") ||
      key.startsWith("selectedModel_") ||
      key === "selectedMaker"
    );

    const payload = {
      exportedAt: new Date().toISOString(),
      data: {}
    };

    keys.forEach(key => {
      payload.data[key] = localStorage.getItem(key);
    });

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "NPRA_ALL_MAKERS_DATA.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importAllMakersData(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        if (!payload || typeof payload !== "object" || !payload.data) {
          throw new Error("Invalid backup format.");
        }

        Object.entries(payload.data).forEach(([key, value]) => {
          localStorage.setItem(key, typeof value === "string" ? value : "");
        });

        renderAccessIndicator();
        renderDashboard();
        alert("All makers/model data imported successfully.");
      } catch (error) {
        alert(`Import failed: ${error.message}`);
      }
    };

    reader.readAsText(file);
  }

  exportAllDataBtn?.addEventListener("click", exportAllMakersData);
  importAllDataBtn?.addEventListener("click", () => importAllDataInput?.click());
  importAllDataInput?.addEventListener("change", e => {
    importAllMakersData(e.target.files[0]);
    e.target.value = "";
  });

  goHomeBtn?.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  logoutBtn?.addEventListener("click", () => {
    window.Auth?.logout?.();
  });

  renderAccessIndicator();
  renderDashboard();


  window.addEventListener("storage", renderDashboard);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") renderDashboard();
  });

});
