document.addEventListener("DOMContentLoaded", () => {
  const makers = ["HONDA", "SUZUKI", "MAZDA", "SUBARU", "DAIHATSU", "TOYOTA", "NISSAN"];
  const tbody = document.querySelector("#picSummaryTable tbody");
  const backBtn = document.getElementById("backToDashboard");
  const summaryMakerSelect = document.getElementById("summaryMakerSelect");
  const summaryEventSelect = document.getElementById("summaryEventSelect");

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

  function populateMakerOptions() {
    summaryMakerSelect.innerHTML = makers.map(m => `<option value="${m}">${m}</option>`).join("");
    const preferred = localStorage.getItem("selectedMaker") || makers[0];
    summaryMakerSelect.value = makers.includes(preferred) ? preferred : makers[0];
  }

  function populateEventOptions() {
    const maker = summaryMakerSelect.value;
    const eventSet = new Set(getMakerBlocks(maker).map(block => block.event));
    const events = ["ALL EVENTS", ...Array.from(eventSet).sort((a, b) => a.localeCompare(b))];
    summaryEventSelect.innerHTML = events.map(e => `<option value="${e}">${e}</option>`).join("");
  }

  function collectSummary() {
    const maker = summaryMakerSelect.value;
    const selectedEvent = summaryEventSelect.value;
    const summary = new Map();

    getMakerBlocks(maker).forEach(block => {
      if (selectedEvent !== "ALL EVENTS" && block.event !== selectedEvent) return;

      block.rows.forEach(row => {
        const statusSelect = row.querySelector(".status-select");
        const picSelect = row.querySelector(".pic-select");
        if (!statusSelect || !picSelect) return;

        const status = getSelectValue(statusSelect, "status", "Open");
        const pic = getSelectValue(picSelect, "pic", "—");
        if (!summary.has(pic)) summary.set(pic, { Open: 0, Close: 0, Cancelled: 0, Rejected: 0 });

        const bucket = summary.get(pic);
        if (bucket.hasOwnProperty(status)) bucket[status]++;
      });
    });

    return [...summary.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  function render() {
    const rows = collectSummary();
    tbody.innerHTML = "";

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No PIC data for selected maker/event.</td></tr>';
      return;
    }

    rows.forEach(([pic, data]) => {
      const total = data.Open + data.Close + data.Cancelled + data.Rejected;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${pic}</td>
        <td>${data.Open}</td>
        <td>${data.Close}</td>
        <td>${data.Cancelled}</td>
        <td>${data.Rejected}</td>
        <td>${total}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  summaryMakerSelect?.addEventListener("change", () => {
    populateEventOptions();
    render();
  });

  summaryEventSelect?.addEventListener("change", render);

  backBtn?.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  populateMakerOptions();
  populateEventOptions();
  render();
});
