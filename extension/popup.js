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
