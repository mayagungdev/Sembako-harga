async function fetchSpreadsheetData(csvUrl) {
    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error("Gagal fetch CSV");
        const csvText = await response.text();
        const data = parseCSV(csvText);
        
        const produkList = [];
        for (let row of data) {
            const nama = row.nama_barang || row.nama;
            const kategori = row.kategori || "Umum";
            const hargaDasar = parseInt(row.harga_satuan_dasar || row.harga);
            const satuanDasar = row.satuan_dasar || "pcs";
            const isEceran = (row.ecer || "").toLowerCase() === "ya";
            let daftarSatuan = [];
            
            if (isEceran && row.daftar_satuan) {
                // format "6 batang:11000;12 batang:20000"
                const parts = row.daftar_satuan.split(";");
                for (let part of parts) {
                    const [namaSatuan, hargaStr] = part.split(":");
                    if (namaSatuan && hargaStr) {
                        daftarSatuan.push({
                            nama: namaSatuan.trim(),
                            harga: parseInt(hargaStr)
                        });
                    }
                }
            }
            // selalu tambahkan satuan dasar
            daftarSatuan.unshift({
                nama: satuanDasar,
                harga: hargaDasar
            });
            
            if (nama && !isNaN(hargaDasar)) {
                produkList.push({
                    nama,
                    kategori,
                    satuanDasar,
                    isEceran,
                    daftarSatuan, // array {nama, harga}
                    lastUpdate: new Date().toISOString()
                });
            }
        }
        return produkList;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

async function importProdukFromSheet(usahaId, csvUrl) {
    const produkBaru = await fetchSpreadsheetData(csvUrl);
    // Hapus produk lama untuk usaha ini
    const existing = await getByIndex("produk", "usahaId", usahaId);
    for (let prod of existing) {
        await deleteItem("produk", prod.id);
    }
    for (let p of produkBaru) {
        await addItem("produk", { ...p, usahaId });
    }
    return produkBaru.length;
}