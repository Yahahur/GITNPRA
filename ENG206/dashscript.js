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

  function getStatusCount(maker) {
    const key = `NPRA_MASTER_SCHEDULE_${maker}`;
    const html = localStorage.getItem(key);

    const count = { Open: 0, Close: 0, Cancelled: 0, Rejected: 0 };
    if (!html) return count;

    const temp = document.createElement("tbody");
    temp.innerHTML = html;

    temp.querySelectorAll(".status-select").forEach(select => {
      const val = getSelectValue(select, "status", "Open");
      if (count.hasOwnProperty(val)) count[val]++;
    });

    return count;
  }

  function buildCard(maker) {
    const status = getStatusCount(maker);

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
      window.location.href = "honda.html";
    });

    return card;
  }

  function buildSummaryCard() {
    const card = document.createElement("div");
    card.className = "maker-card summary-card";
    card.innerHTML = `
      <div class="maker-name">ALL PIC SUMMARY</div>
      <p class="summary-note">View total Open/Close/Cancelled/Rejected items grouped by PIC across all makers.</p>
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
    makers.forEach(maker => makerGrid.appendChild(buildCard(maker)));
    makerGrid.appendChild(buildSummaryCard());
  }

  function exportAllMakersData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      selectedMaker: localStorage.getItem("selectedMaker") || "HONDA",
      makers: {}
    };

    makers.forEach(maker => {
      const key = `NPRA_MASTER_SCHEDULE_${maker}`;
      payload.makers[maker] = localStorage.getItem(key) || "";
    });

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "NPRA_ALL_MAKERS_DATA.json";
    a.click();
  }

  function importAllMakersData(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        if (!payload || typeof payload !== "object" || !payload.makers) {
          throw new Error("Invalid backup format.");
        }

        makers.forEach(maker => {
          const key = `NPRA_MASTER_SCHEDULE_${maker}`;
          const value = payload.makers[maker];
          localStorage.setItem(key, typeof value === "string" ? value : "");
        });

        if (payload.selectedMaker) {
          localStorage.setItem("selectedMaker", payload.selectedMaker);
        }

        renderDashboard();
        alert("All makers data imported successfully.");
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
