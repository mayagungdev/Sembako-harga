let currentUsahaId = null;
let daftarUsaha = [];

async function loadPage(page) {
    const main = document.getElementById("mainContent");
    const response = await fetch(`pages/${page}.html`);
    const html = await response.text();
    main.innerHTML = html;
    
    // Panggil init tiap halaman
    if (page === "home") await loadHomePage();
    else if (page === "kasir") await loadKasirPage();
    else if (page === "history") await loadHistoryPage();
    else if (page === "setting") await loadSettingPage();
}

async function loadHomePage() {
    // tampilkan usaha aktif dan ringkasan
    const usaha = await getAll("usaha");
    const aktif = usaha.find(u => u.id == currentUsahaId);
    const produk = await getByIndex("produk", "usahaId", currentUsahaId);
    const history = await getByIndex("history", "usahaId", currentUsahaId);
    const totalPenjualan = history.reduce((sum, h) => sum + h.total, 0);
    const html = `
        <div class="card">
            <h3>🏪 Usaha Aktif: ${aktif ? aktif.nama : "Pilih dulu"}</h3>
            <p>📦 Produk: ${produk.length}</p>
            <p>💰 Total Penjualan: ${formatRp(totalPenjualan)}</p>
            <p>🧾 Transaksi: ${history.length}</p>
        </div>
        <div class="card">
            <h3>📊 Grafik penjualan (coming soon)</h3>
            <canvas id="simpleChart" height="150"></canvas>
        </div>
    `;
    document.getElementById("mainContent").innerHTML = html;
}

async function loadKasirPage() {
    // memuat daftar produk untuk usaha aktif
    const produk = await getByIndex("produk", "usahaId", currentUsahaId);
    let html = `<div class="card"><h3>🛒 Kasir</h3>
        <div id="keranjangList">Keranjang kosong</div>
        <div>Total: <span id="totalBayar">Rp 0</span></div>
        <button class="primary" onclick="simpanTransaksi(currentUsahaId, 'thermal')">🧾 Nota Thermal</button>
        <button class="accent" onclick="simpanTransaksi(currentUsahaId, 'pdf')">📄 Simpan PDF</button>
    </div>
    <div class="card"><h3>Daftar Produk</h3>
        <input type="text" id="cariProduk" placeholder="Cari...">
        <div id="daftarProduk"></div>
    </div>`;
    document.getElementById("mainContent").innerHTML = html;
    renderDaftarProduk(produk);
    document.getElementById("cariProduk").addEventListener("input", (e) => {
        const filtered = produk.filter(p => p.nama.toLowerCase().includes(e.target.value.toLowerCase()));
        renderDaftarProduk(filtered);
    });
}

function renderDaftarProduk(produk) {
    const container = document.getElementById("daftarProduk");
    let html = "";
    for (let p of produk) {
        html += `<div class="card" style="display:flex; justify-content:space-between; align-items:center">
            <div><strong>${p.nama}</strong><br>${formatRp(p.harga)} ${p.isEceran ? "(ecer)" : ""}</div>
            <div><input type="number" id="jml_${p.id}" placeholder="jumlah" min="0" step="${p.isEceran ? 0.1 : 1}" style="width:80px"> 
            <button onclick="tambahKeKeranjangViaProduk(${p.id}, '${p.nama}', ${p.harga}, ${p.isEceran})">+</button></div>
        </div>`;
    }
    container.innerHTML = html;
}

window.tambahKeKeranjangViaProduk = (id, nama, harga, isEceran) => {
    const input = document.getElementById(`jml_${id}`);
    let jumlah = parseFloat(input.value);
    if (isNaN(jumlah) || jumlah <= 0) {
        showToast("Masukkan jumlah");
        return;
    }
    if (!isEceran) jumlah = Math.floor(jumlah);
    tambahKeKeranjang({ id, nama, harga, isEceran }, jumlah);
    input.value = "";
};

async function loadHistoryPage() {
    const historyList = await getByIndex("history", "usahaId", currentUsahaId);
    historyList.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
    let html = `<div class="card"><h3>📜 Riwayat Transaksi</h3>
        <ul id="historyList" style="list-style:none; padding:0">`;
    for (let h of historyList) {
        html += `<li class="card" style="margin:8px 0">
            <div><strong>${new Date(h.tanggal).toLocaleString()}</strong> - Total ${formatRp(h.total)}</div>
            <div>${h.items.map(i => `${i.nama} x${i.jumlah}`).join(", ")}</div>
            <button onclick="hapusHistory(${h.id})" class="icon-btn">🗑️ Hapus</button>
        </li>`;
    }
    html += `</ul></div>`;
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
        <div id="daftarUsaha">
            ${usaha.map(u => `<div class="card">${u.nama} <button onclick="pilihUsaha(${u.id})">Aktifkan</button> <button onclick="hapusUsaha(${u.id})">Hapus</button></div>`).join('')}
        </div>
        <hr>
        <h4>Tambah Usaha Baru</h4>
        <input type="text" id="namaUsaha" placeholder="Nama Warung">
        <input type="url" id="csvUrl" placeholder="Link CSV Google Sheets">
        <button class="primary" onclick="tambahUsaha()">Tambah & Import Data</button>
    </div>`;
    document.getElementById("mainContent").innerHTML = html;
}

window.tambahUsaha = async () => {
    const nama = document.getElementById("namaUsaha").value;
    const csvUrl = document.getElementById("csvUrl").value;
    if (!nama || !csvUrl) return showToast("Isi semua");
    const usahaId = await addItem("usaha", { nama, csvUrl });
    await importProdukFromSheet(usahaId, csvUrl);
    showToast("Usaha ditambahkan");
    loadSettingPage();
};

window.pilihUsaha = (id) => {
    currentUsahaId = id;
    localStorage.setItem("activeUsahaId", id);
    showToast("Usaha aktif berubah");
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

// Navigasi
document.querySelectorAll("nav button").forEach(btn => {
    btn.addEventListener("click", () => {
        const page = btn.dataset.page;
        loadPage(page);
        document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    });
});

// Mulai
(async () => {
    await openDB();
    const savedId = localStorage.getItem("activeUsahaId");
    if (savedId) currentUsahaId = parseInt(savedId);
    loadPage("home");
})(); 