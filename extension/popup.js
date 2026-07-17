const fields = ["backendUrl", "apiToken", "niche"];

chrome.storage.sync.get(fields, (saved) => {
  fields.forEach((f) => {
    if (saved[f]) document.getElementById(f).value = saved[f];
  });
});

document.getElementById("save").addEventListener("click", () => {
  const values = {};
  fields.forEach((f) => (values[f] = document.getElementById(f).value.trim()));

  chrome.storage.sync.set(values, () => {
    const status = document.getElementById("status");
    status.textContent = "Configurações salvas ✓";
    setTimeout(() => (status.textContent = ""), 2000);
  });
});

document.getElementById("startBatch").addEventListener("click", () => {
  const usernames = document
    .getElementById("usernames")
    .value.split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  if (usernames.length === 0) {
    alert("Cole pelo menos um @usuário, um por linha.");
    return;
  }

  const niche = document.getElementById("niche").value.trim();
  const intervalSeconds = Number(document.getElementById("interval").value);

  chrome.runtime.sendMessage({ type: "START_BATCH_ANALYSIS", usernames, niche, intervalSeconds });

  document.getElementById("batchLog").style.display = "block";
  document.getElementById("batchLog").innerHTML = "<div>Iniciando...</div>";
});

// Mantém o log de progresso atualizado enquanto o popup estiver aberto
function refreshBatchLog() {
  chrome.storage.local.get(["batchLog", "batchRunning"], ({ batchLog, batchRunning }) => {
    if (!batchLog) return;
    const el = document.getElementById("batchLog");
    el.style.display = "block";
    el.innerHTML = batchLog.map((line) => `<div>${line}</div>`).join("");
    el.scrollTop = el.scrollHeight;

    const btn = document.getElementById("startBatch");
    btn.disabled = !!batchRunning;
    btn.textContent = batchRunning ? "Análise em andamento..." : "Iniciar análise em lote";
  });
}

refreshBatchLog();
setInterval(refreshBatchLog, 1500);
