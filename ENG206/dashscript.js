document.addEventListener("DOMContentLoaded", () => {

  const makers = ["HONDA", "SUZUKI", "MAZDA", "SUBARU", "DAIHATSU", "TOYOTA", "NISSAN"];

  const makerGrid = document.getElementById("makerGrid");
  const exportAllDataBtn = document.getElementById("exportAllDataBtn");
  const importAllDataBtn = document.getElementById("importAllDataBtn");
  const importAllDataInput = document.getElementById("importAllDataInput");
  const eventSearchInput = document.getElementById("eventSearchInput");
  const eventSearchBtn = document.getElementById("eventSearchBtn");
  const eventSearchResetBtn = document.getElementById("eventSearchResetBtn");
  const eventSearchBody = document.getElementById("eventSearchBody");

  function getSelectValue(select, dataKey, fallback = "") {
    if (!select) return fallback;
    if (select.dataset[dataKey]) return select.dataset[dataKey];

    const selectedOption = select.querySelector("option[selected]");
    if (selectedOption) return selectedOption.value || selectedOption.textContent.trim();

    const option = select.options[select.selectedIndex >= 0 ? select.selectedIndex : 0];
    return option ? (option.value || option.textContent.trim()) : fallback;
  }

  function getEventFromBlockStartRow(row) {
    if (!row || row.cells.length < 3) return "—";
    return (row.cells[2].textContent || "—").trim() || "—";
  }

  function getMakerBlocks(maker) {
    const html = localStorage.getItem(`NPRA_MASTER_SCHEDULE_${maker}`);
    if (!html) return [];

    const temp = document.createElement("tbody");
    temp.innerHTML = html;

    const rows = Array.from(temp.querySelectorAll("tr"));
    const blocks = [];
    for (let i = 0; i < rows.length; i += 4) {
      const blockRows = rows.slice(i, i + 4);
      if (!blockRows.length) continue;
      blocks.push({ event: getEventFromBlockStartRow(blockRows[0]), rows: blockRows });
    }
    return blocks;
  }

  function getStatusCount(maker) {
    const count = { Open: 0, Close: 0, Cancelled: 0, Rejected: 0 };

    getMakerBlocks(maker).forEach(block => {
      block.rows.forEach(row => {
        const statusSelect = row.querySelector(".status-select");
        if (!statusSelect) return;
        const status = getSelectValue(statusSelect, "status", "Open");
        if (count.hasOwnProperty(status)) count[status]++;
      });
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
      <p class="summary-note">View total Open/Close/Cancelled/Rejected items grouped by PIC per maker/event.</p>
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

  function renderEventSearch() {
    const query = (eventSearchInput?.value || "").trim().toLowerCase();
    const rows = [];

    makers.forEach(maker => {
      const blocks = getMakerBlocks(maker);
      const grouped = new Map();
      blocks.forEach(block => {
        const eventName = block.event || "—";
        if (query && !eventName.toLowerCase().includes(query)) return;
        grouped.set(eventName, (grouped.get(eventName) || 0) + 1);
      });

      grouped.forEach((count, eventName) => {
        rows.push({ maker, eventName, count });
      });
    });

    eventSearchBody.innerHTML = "";
    if (!rows.length) {
      eventSearchBody.innerHTML = '<tr><td colspan="3">No events found.</td></tr>';
      return;
    }

    rows.sort((a, b) => (a.maker + a.eventName).localeCompare(b.maker + b.eventName));
    rows.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${row.maker}</td><td>${row.eventName}</td><td>${row.count}</td>`;
      eventSearchBody.appendChild(tr);
    });
  }

  function exportAllMakersData() {
    const payload = { exportedAt: new Date().toISOString(), selectedMaker: localStorage.getItem("selectedMaker") || "HONDA", makers: {} };
    makers.forEach(maker => {
      payload.makers[maker] = localStorage.getItem(`NPRA_MASTER_SCHEDULE_${maker}`) || "";
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
        if (!payload || typeof payload !== "object" || !payload.makers) throw new Error("Invalid backup format.");

        makers.forEach(maker => {
          const key = `NPRA_MASTER_SCHEDULE_${maker}`;
          localStorage.setItem(key, typeof payload.makers[maker] === "string" ? payload.makers[maker] : "");
        });

        if (payload.selectedMaker) localStorage.setItem("selectedMaker", payload.selectedMaker);

        renderDashboard();
        renderEventSearch();
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

  eventSearchBtn?.addEventListener("click", renderEventSearch);
  eventSearchResetBtn?.addEventListener("click", () => {
    if (eventSearchInput) eventSearchInput.value = "";
    renderEventSearch();
  });

  renderDashboard();
  renderEventSearch();

  window.addEventListener("storage", () => {
    renderDashboard();
    renderEventSearch();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      renderDashboard();
      renderEventSearch();
    }
  });

});
