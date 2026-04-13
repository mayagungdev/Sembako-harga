// 🔁 GANTI URL INI dengan URL CSV dari Google Sheets Anda
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ3B_3bz96kPXSafKlnY70baWV9cNjGDlR3Se7FgW_P8Hm_XKdsddjsWNx_WCDqYAmUf4gcAnMpPRhz/pub?gid=0&single=true&output=csv"; 

let barangData = [];       // menyimpan array {nama, kategori, harga}
let chartInstance = null;

// Format Rupiah
function formatRp(angka) {
    return "Rp " + new Intl.NumberFormat("id-ID").format(angka);
}

// Ambil data dari Google Sheets
async function loadData() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();
        
        // Parse CSV sederhana
        const rows = csvText.trim().split("\n");
        const headers = rows[0].toLowerCase().split(",");
        const namaIndex = headers.findIndex(h => h.includes("nama") || h.includes("barang"));
        const kategoriIndex = headers.findIndex(h => h.includes("kategori"));
        const hargaIndex = headers.findIndex(h => h.includes("harga"));
        
        if (namaIndex === -1 || hargaIndex === -1) {
            throw new Error("Kolom 'nama_barang' atau 'harga' tidak ditemukan");
        }
        
        barangData = [];
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(",");
            if (cols.length < 3) continue;
            const nama = cols[namaIndex]?.trim();
            const kategori = (kategoriIndex !== -1 ? cols[kategoriIndex]?.trim() : "Lainnya") || "Lainnya";
            let harga = parseInt(cols[hargaIndex]?.trim());
            if (isNaN(harga)) continue;
            
            barangData.push({ nama, kategori, harga });
        }
        
        // Update UI
        updateCategoryFilter();
        applyFiltersAndRender();
    } catch (error) {
        console.error(error);
        document.getElementById("tableBody").innerHTML = `<tr><td colspan="3">❌ Gagal memuat data. Cek URL Google Sheet.</td></tr>`;
        document.getElementById("stats").innerHTML = "❌ Error: " + error.message;
    }
}

// Isi dropdown kategori unik
function updateCategoryFilter() {
    const kategoriSet = new Set(barangData.map(item => item.kategori));
    const select = document.getElementById("categoryFilter");
    select.innerHTML = '<option value="all">📁 Semua Kategori</option>';
    [...kategoriSet].sort().forEach(kat => {
        select.innerHTML += `<option value="${kat}">${kat}</option>`;
    });
}

// Filter data berdasarkan search, harga, kategori
function getFilteredData() {
    const search = document.getElementById("search").value.toLowerCase();
    const min = parseInt(document.getElementById("minPrice").value) || 0;
    const max = parseInt(document.getElementById("maxPrice").value) || Infinity;
    const kategori = document.getElementById("categoryFilter").value;
    
    return barangData.filter(item => {
        const matchNama = item.nama.toLowerCase().includes(search);
        const matchHarga = item.harga >= min && item.harga <= max;
        const matchKategori = (kategori === "all") || (item.kategori === kategori);
        return matchNama && matchHarga && matchKategori;
    });
}

// Tampilkan statistik dan tabel
function updateStatsAndTable(filtered) {
    if (!filtered.length) {
        document.getElementById("stats").innerHTML = "⚠️ Tidak ada barang dengan filter ini";
        document.getElementById("tableBody").innerHTML = `<tr><td colspan="3">Tidak ditemukan</td></tr>`;
        return;
    }
    
    const total = filtered.length;
    const termurah = Math.min(...filtered.map(i => i.harga));
    const termahal = Math.max(...filtered.map(i => i.harga));
    const rata = filtered.reduce((a,b) => a + b.harga, 0) / total;
    
    document.getElementById("stats").innerHTML = `
        <span>📦 ${total} barang</span>
        <span>⬇️ Termurah: ${formatRp(termurah)}</span>
        <span>⬆️ Termahal: ${formatRp(termahal)}</span>
        <span>📊 Rata-rata: ${formatRp(Math.round(rata))}</span>
    `;
    
    // Tabel
    let html = "";
    filtered.forEach(item => {
        html += `<tr>
                    <td>${item.nama}</td>
                    <td>${item.kategori}</td>
                    <td>${formatRp(item.harga)}</td>
                 </tr>`;
    });
    document.getElementById("tableBody").innerHTML = html;
}

// Grafik: rata-rata harga per kategori (dari data yg sudah difilter)
function updateChart(filtered) {
    const ctx = document.getElementById("priceChart").getContext("2d");
    if (chartInstance) chartInstance.destroy();
    
    // Kelompokkan per kategori dari filtered
    const mapKategori = new Map();
    filtered.forEach(item => {
        if (!mapKategori.has(item.kategori)) mapKategori.set(item.kategori, []);
        mapKategori.get(item.kategori).push(item.harga);
    });
    const labels = [...mapKategori.keys()];
    const avgPrices = labels.map(kat => {
        const prices = mapKategori.get(kat);
        return prices.reduce((a,b) => a+b,0) / prices.length;
    });
    
    if (labels.length === 0) return;
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rata-rata Harga (Rp)',
                data: avgPrices,
                backgroundColor: '#f4a261',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: { callbacks: { label: (ctx) => `Rp ${ctx.raw.toLocaleString('id-ID')}` } }
            },
            scales: {
                y: { ticks: { callback: (val) => 'Rp ' + val.toLocaleString('id-ID') } }
            }
        }
    });
}

// Gabungkan semua update
function applyFiltersAndRender() {
    const filtered = getFilteredData();
    updateStatsAndTable(filtered);
    updateChart(filtered);
}

// Event listeners
function bindEvents() {
    document.getElementById("search").addEventListener("input", applyFiltersAndRender);
    document.getElementById("minPrice").addEventListener("input", applyFiltersAndRender);
    document.getElementById("maxPrice").addEventListener("input", applyFiltersAndRender);
    document.getElementById("categoryFilter").addEventListener("change", applyFiltersAndRender);
}

// Mulai
loadData();
bindEvents();
