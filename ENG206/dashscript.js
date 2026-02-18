document.addEventListener("DOMContentLoaded", () => {

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

  function getModelsKey(maker) {
    return `NPRA_MODELS_${maker}`;
  }

  function buildStorageKey(maker, model) {
    return `NPRA_MASTER_SCHEDULE_${maker}__${model}`;
  }

  function getMakerModels(maker) {
    const raw = localStorage.getItem(getModelsKey(maker));
    if (!raw) return ["DEFAULT"];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {}
    return ["DEFAULT"];
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

  function getStatusCountByMaker(maker) {
    const count = { Open: 0, Close: 0, Cancelled: 0, Rejected: 0 };

    const models = getMakerModels(maker);
    models.forEach(model => {
      const key = buildStorageKey(maker, model);
      const html = localStorage.getItem(key);
      if (!html) return;

      const temp = document.createElement("tbody");
      temp.innerHTML = html;

      temp.querySelectorAll(".status-select").forEach(select => {
        const val = getSelectValue(select, "status", "Open");
        if (count.hasOwnProperty(val)) count[val]++;
      });
    });

    return count;
  }

  function buildMakerCard(maker) {
    const status = getStatusCountByMaker(maker);

    const card = document.createElement("div");
    card.className = "maker-card";

    card.innerHTML = `
      <div class="maker-name">${maker}</div>
      <div class="status-row open"><span>OPEN</span><strong>${status.Open}</strong></div>
      <div class="status-row close"><span>CLOSED</span><strong>${status.Close}</strong></div>
      <div class="status-row cancelled"><span>CANCELLED</span><strong>${status.Cancelled}</strong></div>
      <div class="status-row rejected"><span>REJECTED</span><strong>${status.Rejected}</strong></div>
    `;

    card.addEventListener("click", () => {
      localStorage.setItem("selectedMaker", maker);
      const models = getMakerModels(maker);
      const preferred = localStorage.getItem(`selectedModel_${maker}`);
      const model = preferred && models.includes(preferred) ? preferred : (models[0] || "DEFAULT");
      localStorage.setItem(`selectedModel_${maker}`, model);
      window.location.href = "honda.html";
    });

    return card;
  }

  function buildSummaryCard() {
    const card = document.createElement("div");
    card.className = "maker-card summary-card";
    card.innerHTML = `
      <div class="maker-name">ALL PIC SUMMARY</div>
      <p class="summary-note">Select maker and model, then view Open/Close/Cancelled/Rejected by PIC.</p>
      <div class="status-row"><span>OPEN SUMMARY</span><strong>→</strong></div>
      <div class="status-row"><span>CLOSE SUMMARY</span><strong>→</strong></div>
      <div class="status-row"><span>CANCELLED SUMMARY</span><strong>→</strong></div>
      <div class="status-row"><span>REJECTED SUMMARY</span><strong>→</strong></div>
    `;

    card.addEventListener("click", () => {
      window.location.href = "picsummary.html";
    });

    return card;
  }

  function renderDashboard() {
    makerGrid.innerHTML = "";
    makers.forEach(maker => makerGrid.appendChild(buildMakerCard(maker)));
    makerGrid.appendChild(buildSummaryCard());
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

  renderDashboard();

  window.addEventListener("storage", renderDashboard);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") renderDashboard();
  });

});
