document.addEventListener("DOMContentLoaded", () => {
  const makers = ["HONDA", "SUZUKI", "MAZDA", "SUBARU", "DAIHATSU", "TOYOTA", "NISSAN"];
  const tbody = document.querySelector("#picSummaryTable tbody");
  const backBtn = document.getElementById("backToDashboard");

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

  function collectSummary() {
    const summary = new Map();

    makers.forEach(maker => {
      const html = localStorage.getItem(`NPRA_MASTER_SCHEDULE_${maker}`);
      if (!html) return;

      const temp = document.createElement("tbody");
      temp.innerHTML = html;

      temp.querySelectorAll("tr").forEach(row => {
        const statusSelect = row.querySelector(".status-select");
        const picSelect = row.querySelector(".pic-select");
        if (!statusSelect || !picSelect) return;

        const status = getSelectValue(statusSelect, "status", "Open");
        const pic = getSelectValue(picSelect, "pic", "—");
        if (!pic) return;

        if (!summary.has(pic)) {
          summary.set(pic, { Open: 0, Close: 0, Cancelled: 0, Rejected: 0 });
        }

        const bucket = summary.get(pic);
        if (bucket.hasOwnProperty(status)) {
          bucket[status]++;
        }
      });
    });

    return [...summary.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  function render() {
    const rows = collectSummary();
    tbody.innerHTML = "";

    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" style="text-align:center;">No PIC data found yet.</td>`;
      tbody.appendChild(tr);
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

  backBtn?.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  render();
});
