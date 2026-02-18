document.addEventListener("DOMContentLoaded", () => {
  const makers = ["HONDA", "SUZUKI", "MAZDA", "SUBARU", "DAIHATSU", "TOYOTA", "NISSAN"];

  const tbody = document.querySelector("#picSummaryTable tbody");
  const backBtn = document.getElementById("backToDashboard");
  const makerFilter = document.getElementById("makerFilter");
  const modelFilter = document.getElementById("modelFilter");

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

  function collectSummary() {
    const summary = new Map();
    const maker = makerFilter.value;
    const model = modelFilter.value;

    const html = localStorage.getItem(buildStorageKey(maker, model));
    if (!html) return [];

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

    return [...summary.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  function render() {
    const rows = collectSummary();
    tbody.innerHTML = "";

    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" style="text-align:center;">No PIC data found for selected maker/model.</td>`;
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

  makerFilter?.addEventListener("change", () => {
    localStorage.setItem("selectedMaker", makerFilter.value);
    populateModelOptions();
    localStorage.setItem(`selectedModel_${makerFilter.value}`, modelFilter.value);
    render();
  });

  modelFilter?.addEventListener("change", () => {
    localStorage.setItem(`selectedModel_${makerFilter.value}`, modelFilter.value);
    render();
  });

  populateMakerOptions();
  populateModelOptions();
  render();
});
