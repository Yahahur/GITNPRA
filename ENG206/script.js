document.addEventListener("DOMContentLoaded", () => {

  /* ================= MAKER CONNECTION ================= */
  const selectedMaker = localStorage.getItem("selectedMaker") || "HONDA";
  document.title = selectedMaker;
  document.querySelector("h1").textContent =
    `NPRA MASTER SCHEDULE - ${selectedMaker}`;

  const STORAGE_KEY = `NPRA_MASTER_SCHEDULE_${selectedMaker}`;

  /* ================= ELEMENTS ================= */
  const mainTableBody = document.querySelector("#mainTable tbody");

  const addRowBtn = document.getElementById("addRowBtn");
  const deleteRowBtn = document.getElementById("deleteRowBtn");
  const clearDataBtn = document.getElementById("clearDataBtn");

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

  let selectedBlock = null;

  /* ================= DATE FORMAT ================= */
  function formatDate(value) {
    if (!value) return "—";
    const m = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const d = new Date(value);
    if (isNaN(d)) return "—";
    return `${m[d.getMonth()]}-${String(d.getDate()).padStart(2,"0")}-${d.getFullYear()}`;
  }

  /* ================= STATUS COLOR ================= */
  function applyStatusLogic(select) {
    const td = select.closest("td");
    const val = select.value;

    td.style.backgroundColor =
      val === "Open" ? "#f8d7da" :
      val === "Close" ? "#d4edda" :
      val === "Cancelled" ? "#fff3cd" :
      val === "Rejected" ? "#f5c6cb" :
      "";
  }

  /* ================= DATE WARNING ================= */
  function updateDateWarnings() {
    const today = new Date();
    today.setHours(0,0,0,0);

    document.querySelectorAll(".date-cell").forEach(td => {
      const raw = td.dataset.raw;
      if (!raw) return td.style.backgroundColor = "";

      const target = new Date(raw);
      target.setHours(0,0,0,0);
      const diff = Math.ceil((target - today) / 86400000);

      if (diff <= 5) {
        td.style.backgroundColor = "#f8d7da";
        td.title = diff >= 0 ? `Due in ${diff} day(s)` : "Overdue";
      } else {
        td.style.backgroundColor = "";
        td.title = "";
      }
    });
  }

  /* ================= RENUMBER ================= */
  function renumberItems() {
    let count = 1;
    for (let i = 0; i < mainTableBody.rows.length; i += 4) {
      mainTableBody.rows[i].cells[0].innerText = count++;
    }
  }

  /* ================= SAVE / LOAD ================= */
  function syncSelectValues() {
    // 🔑 ensure selected value is saved in HTML
    document.querySelectorAll(".status-select").forEach(select => {
      [...select.options].forEach(opt => {
        opt.selected = opt.value === select.value;
      });
    });
  }

  function saveTable() {
    syncSelectValues(); // update HTML <option selected> before saving
    localStorage.setItem(STORAGE_KEY, mainTableBody.innerHTML);
  }

  function loadTable() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    mainTableBody.innerHTML = data;

    document.querySelectorAll(".status-select").forEach(applyStatusLogic);
    updateDateWarnings();
    renumberItems();
  }

  /* ================= ADD BLOCK ================= */
  addRowBtn.addEventListener("click", () => {
    const line = prompt("Enter Line / Event:");
    const process = prompt("Enter Process:");
    const product = prompt("Enter Product:");
    if (!line || !process || !product) return;

    const statusHTML = `
      <select class="status-select">
        <option>Open</option>
        <option>Close</option>
        <option>Cancelled</option>
        <option>Rejected</option>
        <option>—</option>
      </select>`;

    for (let i = 0; i < 4; i++) {
      const tr = document.createElement("tr");
      tr.innerHTML = i === 0 ? `
        <td rowspan="4"></td>
        <td rowspan="4" class="date-cell" data-raw="">—</td>
        <td rowspan="4">${line}</td>
        <td rowspan="4">${process}</td>
        <td rowspan="4">${product}</td>
        <td rowspan="4">—</td>
        <td rowspan="4">—</td>
        <td rowspan="2" class="vertical-text">OCCURRENCE</td>
        <td>—</td><td>—</td>
        <td class="date-cell" data-raw="">—</td>
        <td class="status-cell">${statusHTML}</td>
        <td class="date-cell" data-raw="">—</td>
      ` : `
        ${i === 2 ? `<td rowspan="2" class="vertical-text">OUTFLOW</td>` : ""}
        <td>—</td><td>—</td>
        <td class="date-cell" data-raw="">—</td>
        <td class="status-cell">${statusHTML}</td>
        <td class="date-cell" data-raw="">—</td>
      `;
      mainTableBody.appendChild(tr);
    }

    renumberItems();
    saveTable();
  });

  /* ================= INLINE EDIT (TEXT ONLY, NO STATUS) ================= */
  document.addEventListener("dblclick", e => {
    const td = e.target.closest("td");

    if (
      !td ||
      td.classList.contains("vertical-text") ||
      td.classList.contains("status-cell") || // 🔒 protect STATUS column
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
    };
  });

  /* ================= STATUS CHANGE ================= */
  document.addEventListener("change", e => {
    if (e.target.classList.contains("status-select")) {
      const allowed = ["Open","Close","Cancelled","Rejected","—"];
      if (!allowed.includes(e.target.value)) e.target.value = "Open"; // safety
      applyStatusLogic(e.target);
      saveTable();
    }
  });

  /* ================= DELETE BLOCK ================= */
  deleteRowBtn.addEventListener("click", () => {
    if (!selectedBlock) return alert("Double-click a block first.");
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
  });

  /* ================= EXPORT / IMPORT ================= */
  exportBtn.onclick = () => {
    const blob = new Blob([localStorage.getItem(STORAGE_KEY)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${selectedMaker}_NPRA.json`;
    a.click();
  };

  importBtn.onclick = () => importInput.click();

  importInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      localStorage.setItem(STORAGE_KEY, r.result);
      loadTable();
    };
    r.readAsText(file);
  };

  /* ================= CLEAR ================= */
  clearDataBtn.onclick = () => {
    if (confirm("Clear all saved data for " + selectedMaker + "?")) {
      localStorage.removeItem(STORAGE_KEY);
      mainTableBody.innerHTML = "";
    }
  };

  /* ================= INITIAL LOAD ================= */
  loadTable();

});
