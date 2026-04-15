function formatRp(angka) {
    return "Rp " + new Intl.NumberFormat("id-ID").format(angka);
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
}

// Konversi CSV ke JSON sederhana
function parseCSV(csvText) {
    const rows = csvText.trim().split(/\r?\n/);
    const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
    const data = [];
    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(",");
        if (cols.length < headers.length) continue;
        let obj = {};
        headers.forEach((h, idx) => { obj[h] = cols[idx]?.trim(); });
        data.push(obj);
    }
    return data;
}