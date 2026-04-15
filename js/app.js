let currentUsahaId = null;

async function loadPage(page) {
    const main = document.getElementById("mainContent");
    const response = await fetch(`pages/${page}.html`);
    const html = await response.text();
    main.innerHTML = html;
    
    if (page === "home") await loadHomePage();
    else if (page === "kasir") await loadKasirPage();
    else if (page === "history") await loadHistoryPage();
    else if (page === "setting") await loadSettingPage();
}

async function loadHomePage() {
    const usaha = await getAll("usaha");
    const aktif = usaha.find(u => u.id == currentUsahaId);
    let produk = [];
    let history = [];
    if (currentUsahaId) {
        produk = await getByIndex("produk", "usahaId", currentUsahaId);
        history = await getByIndex("history", "usahaId", currentUsahaId);
    }
    const totalPenjualan = history.reduce((sum, h) => sum + h.total, 0);
    const html = `
        <div class="card">
            <h3>🏪 Usaha Aktif: ${aktif ? aktif.nama : "Belum pilih"}</h3>
            <div class="stats-grid">
                <div class="stat-card"><div class="value">${produk.length}</div><div>Produk</div></div>
                <div class="stat-card"><div class="value">${history.length}</div><div>Transaksi</div></div>
                <div class="stat-card"><div class="value">${formatRp(totalPenjualan)}</div><div>Total Penjualan</div></div>
            </div>
        </div>
        <div class="card">
            <h3>📋 Panduan Cepat</h3>
            <ul style="margin-left: 1.5rem;">
                <li>Tambahkan usaha di menu Setelan</li>
                <li>Pastikan Google Sheets berisi kolom: nama_barang, kategori, harga_satuan_dasar, satuan_dasar, ecer, daftar_satuan</li>
                <li>Untuk produk eceran, isi daftar_satuan contoh: "6 batang:11000;12 batang:20000"</li>
                <li>Transaksi kasir tersimpan otomatis di History</li>
            </ul>
        </div>
    `;
    document.getElementById("mainContent").innerHTML = html;
}

async function loadKasirPage() {
    if (!currentUsahaId) {
        document.getElementById("mainContent").innerHTML = `<div class="card">⚠️ Pilih usaha dulu di menu Setelan</div>`;
        return;
    }
    const produk = await getByIndex("produk", "usahaId", currentUsahaId);
    let html = `
        <div class="card">
            <h3>🛒 Keranjang</h3>
            <div id="keranjangList">Keranjang kosong</div>
        </div>
        <div class="card">
            <h3>📦 Daftar Produk</h3>
            <div class="filter-bar">
                <input type="text" id="cariProduk" placeholder="Cari...">
            </div>
            <div id="daftarProduk"></div>
        </div>
    `;
    document.getElementById("mainContent").innerHTML = html;
    renderDaftarProduk(produk);
    document.getElementById("cariProduk").addEventListener("input", (e) => {
        const filtered = produk.filter(p => p.nama.toLowerCase().includes(e.target.value.toLowerCase()));
        renderDaftarProduk(filtered);
    });
}

function renderDaftarProduk(produk) {
    const container = document.getElementById("daftarProduk");
    if (!container) return;
    let html = "";
    for (let p of produk) {
        html += `<div class="card" style="margin-bottom:0.75rem">
                    <div><strong>${p.nama}</strong> (${p.kategori})</div>
                    <div class="filter-bar" style="margin-top:0.5rem">
                        <select id="satuan_${p.id}">`;
        for (let sat of p.daftarSatuan) {
            html += `<option value='${JSON.stringify(sat)}'>${sat.nama} - ${formatRp(sat.harga)}</option>`;
        }
        html += `</select>
                        <input type="number" id="jml_${p.id}" placeholder="Jumlah" min="0" step="any" style="width:100px">
                        <button class="primary" onclick="tambahKeKeranjangWrapper(${p.id})">+</button>
                    </div>
                </div>`;
    }
    container.innerHTML = html;
}

window.tambahKeKeranjangWrapper = async (produkId) => {
    const produk = (await getByIndex("produk", "usahaId", currentUsahaId)).find(p => p.id === produkId);
    if (!produk) return;
    const satuanSelect = document.getElementById(`satuan_${produkId}`);
    const satuanObj = JSON.parse(satuanSelect.value);
    const jumlahInput = document.getElementById(`jml_${produkId}`);
    let jumlah = parseFloat(jumlahInput.value);
    if (isNaN(jumlah) || jumlah <= 0) {
        showToast("Masukkan jumlah valid");
        return;
    }
    tambahKeKeranjang(produk, satuanObj, jumlah);
    jumlahInput.value = "";
};

async function loadHistoryPage() {
    if (!currentUsahaId) {
        document.getElementById("mainContent").innerHTML = `<div class="card">⚠️ Pilih usaha dulu</div>`;
        return;
    }
    const historyList = await getByIndex("history", "usahaId", currentUsahaId);
    historyList.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
    let html = `<div class="card"><h3>📜 Riwayat Transaksi</h3>`;
    if (historyList.length === 0) html += `<p>Belum ada transaksi</p>`;
    else {
        for (let h of historyList) {
            html += `<div class="card" style="margin-bottom:1rem">
                        <div><strong>${new Date(h.tanggal).toLocaleString()}</strong> - Total ${formatRp(h.total)}</div>
                        <div style="font-size:0.85rem">${h.items.map(i => `${i.nama} (${i.jumlah} ${i.satuanTerpilih})`).join(", ")}</div>
                        <button class="icon-btn" onclick="hapusHistory(${h.id})">🗑️ Hapus</button>
                    </div>`;
        }
    }
    html += `</div>`;
    document.getElementById("mainContent").innerHTML = html;
}

window.hapusHistory = async (id) => {
    if (confirm("Hapus transaksi ini?")) {
        await deleteItem("history", id);
        loadHistoryPage();
        showToast("Terhapus");
    }
};

async function loadSettingPage() {
    const usaha = await getAll("usaha");
    let html = `<div class="card"><h3>⚙️ Kelola Usaha</h3>
        <div id="daftarUsaha">`;
    for (let u of usaha) {
        html += `<div class="card" style="margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center">
                    <span><strong>${u.nama}</strong></span>
                    <div>
                        <button class="primary" onclick="pilihUsaha(${u.id})">Aktifkan</button>
                        <button onclick="hapusUsaha(${u.id})">Hapus</button>
                    </div>
                </div>`;
    }
    html += `</div>
        <hr style="margin:1rem 0">
        <h4>Tambah Usaha Baru</h4>
        <input type="text" id="namaUsaha" placeholder="Nama Warung" style="width:100%; margin-bottom:0.5rem">
        <input type="url" id="csvUrl" placeholder="Link CSV Google Sheets" style="width:100%; margin-bottom:0.5rem">
        <button class="primary" onclick="tambahUsaha()">Tambah & Import Data</button>
        <hr style="margin:1rem 0">
        <h4>Backup & Restore</h4>
        <button class="primary" onclick="backupData()">💾 Backup Data</button>
        <input type="file" id="restoreFile" accept=".json" style="margin-top:0.5rem">
        <button class="accent" onclick="restoreFromFile()">📂 Restore Data</button>
    </div>`;
    document.getElementById("mainContent").innerHTML = html;
}

window.tambahUsaha = async () => {
    const nama = document.getElementById("namaUsaha").value;
    const csvUrl = document.getElementById("csvUrl").value;
    if (!nama || !csvUrl) return showToast("Isi semua");
    showToast("Mengambil data dari sheet...");
    try {
        const usahaId = await addItem("usaha", { nama, csvUrl });
        await importProdukFromSheet(usahaId, csvUrl);
        showToast("Usaha ditambahkan");
        loadSettingPage();
    } catch (err) {
        showToast("Gagal: " + err.message);
    }
};

window.pilihUsaha = (id) => {
    currentUsahaId = id;
    localStorage.setItem("activeUsahaId", id);
    showToast(`Usaha aktif: ${id}`);
    loadPage("home");
};

window.hapusUsaha = async (id) => {
    if (confirm("Hapus usaha beserta semua produk & history?")) {
        const produk = await getByIndex("produk", "usahaId", id);
        for (let p of produk) await deleteItem("produk", p.id);
        const history = await getByIndex("history", "usahaId", id);
        for (let h of history) await deleteItem("history", h.id);
        await deleteItem("usaha", id);
        if (currentUsahaId == id) currentUsahaId = null;
        loadSettingPage();
        showToast("Usaha dihapus");
    }
};

window.restoreFromFile = async () => {
    const fileInput = document.getElementById("restoreFile");
    if (!fileInput.files.length) return showToast("Pilih file backup");
    try {
        await restoreData(fileInput.files[0]);
        // reload data
        const savedId = localStorage.getItem("activeUsahaId");
        if (savedId) currentUsahaId = parseInt(savedId);
        loadSettingPage();
        showToast("Restore berhasil, refresh halaman");
    } catch (err) {
        showToast("Restore gagal: " + err.message);
    }
};

// Navigasi
document.querySelectorAll("nav button").forEach(btn => {
    btn.addEventListener("click", () => {
        const page = btn.dataset.page;
        loadPage(page);
        document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    });
});

// Theme toggle sederhana
let isDark = localStorage.getItem("theme") === "dark";
function applyTheme() {
    if (isDark) document.body.classList.add("dark");
    else document.body.classList.remove("dark");
    document.getElementById("themeToggle").innerHTML = isDark ? "☀️" : "🌙";
}
function toggleTheme() {
    isDark = !isDark;
    localStorage.setItem("theme", isDark ? "dark" : "light");
    applyTheme();
}
document.getElementById("themeToggle").addEventListener("click", toggleTheme);
applyTheme();

// Inisialisasi
(async () => {
    await openDB();
    const savedId = localStorage.getItem("activeUsahaId");
    if (savedId) currentUsahaId = parseInt(savedId);
    loadPage("home");
})();