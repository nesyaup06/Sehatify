/* Sehatify — aplikasi satu halaman (vanilla JS) dengan Supabase sebagai backend */
(() => {
'use strict';

// ── Konfigurasi & klien Supabase ─────────────────────────────
const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.SEHATIFY_CONFIG;
const BELUM_SETUP = /GANTI-DENGAN/.test(SUPABASE_URL + SUPABASE_ANON_KEY);
const db = BELUM_SETUP ? null : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Data tetap ───────────────────────────────────────────────
const SEKTOR = ['Makanan & Minuman', 'Fashion', 'Grosir & Retail'];
const LOKASI = ['DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Banten', 'Bali',
  'Sumatera Utara', 'Sumatera Barat', 'Sulawesi Selatan', 'Kalimantan Timur', 'Kalimantan Selatan',
  'Nusa Tenggara Barat', 'Lampung', 'Lainnya'];
const KATEGORI = ['Sangat Baik', 'Baik', 'Cukup', 'Buruk'];
const WARNA = { 'Sangat Baik': 'var(--good2)', 'Baik': 'var(--good)', 'Cukup': 'var(--mid)', 'Buruk': 'var(--bad)' };
const SKALA5 = ['Sangat tidak setuju', 'Tidak setuju', 'Netral', 'Setuju', 'Sangat setuju'];

const FAKTOR = {
  INS: { n: 'Sumber Daya',  en: 'Institutional Resources', role: 'owner',    max: 3, from: 1,  d: 'Legalitas, dukungan pemerintah, kolaborasi, dan sumber modal.' },
  OPS: { n: 'Inovasi',      en: 'Operational Stability',   role: 'owner',    max: 5, from: 26, d: 'Stabilitas operasional harian: modal kerja, pasokan, peralatan.' },
  ECT: { n: 'Eksternal',    en: 'Economic Connectivity',   role: 'owner',    max: 5, from: 32, d: 'Jangkauan pasar, pertumbuhan penjualan, utang, dan arus kas.' },
  OV:  { n: 'Budaya',       en: 'Organizational Values',   role: 'employee', max: 5, from: 18, d: 'Nilai bersama, kepercayaan, dan suasana kerja.' },
  LDI: { n: 'Kepemimpinan', en: 'Leader Involvement',      role: 'employee', max: 5, from: 7,  d: 'Keterlibatan pemimpin dalam pekerjaan dan pengembangan karyawan.' },
  WEQ: { n: 'Proses',       en: 'Work Environment Quality', role: 'employee', max: 5, from: 13, d: 'Kualitas lingkungan, beban, dan jam kerja.' },
};
const URUT = Object.keys(FAKTOR);

const SOAL = {
  INS: ['Apakah bisnis Anda memiliki Nomor Induk Berusaha (NIB)?',
    'Apakah Anda pernah menerima bantuan pendanaan dari pemerintah?',
    'Apakah Anda pernah mengikuti kegiatan yang diselenggarakan pemerintah?',
    'Apakah Anda berkolaborasi dengan pedagang atau bisnis lain?',
    'Apakah Anda menggunakan pemasaran digital untuk mempromosikan bisnis?',
    'Apa sumber modal keuangan utama bisnis Anda?'],
  LDI: ['Pemimpin Anda terhubung dengan karyawan secara personal',
    'Pemimpin Anda bertindak sebagai panutan bagi karyawan',
    'Pemimpin Anda terbuka untuk menerapkan ide atau saran dari karyawan',
    'Pemimpin Anda terlibat langsung dalam pekerjaan sehari-hari',
    'Pemimpin Anda aktif berpartisipasi dalam melatih karyawan baru',
    'Pemimpin Anda memperlakukan karyawan secara adil dalam memberi hukuman dan penghargaan'],
  WEQ: ['Tempat kerja bebas dari kecelakaan kerja',
    'Saya puas dengan jam kerja yang ditetapkan di perusahaan ini',
    'Beban kerja saya dapat dikelola dengan baik',
    'Kondisi kerja fisik (kebisingan, pencahayaan, suhu) nyaman',
    'Sebagian besar karyawan bertanggung jawab dan jarang absen tanpa alasan sah'],
  OV: ['Saya merasa bebas membicarakan kesulitan kerja dengan pemimpin atau rekan',
    'Suasana di tempat kerja saya positif dan mendukung',
    'Semangat kerja karyawan di tempat kerja saya umumnya tinggi',
    'Karyawan di tempat kerja saya saling membantu saat dibutuhkan',
    'Tingkat kepercayaan antar karyawan di tempat kerja saya sangat kuat',
    'Kerja tim di tempat kerja saya sangat efektif',
    'Karyawan di tempat kerja saya saling menghormati',
    'Karyawan di tempat kerja saya memandang pekerjaan sebagai bentuk dedikasi'],
  OPS: ['Modal kerja mencukupi untuk operasional bisnis sehari-hari',
    'Perusahaan mampu membayar gaji karyawan tepat waktu',
    'Peralatan/mesin dalam kondisi baik dan berfungsi optimal',
    'Rantai pasokan bisnis berjalan lancar tanpa gangguan signifikan',
    'Permintaan produk/jasa dapat diprediksi dengan baik',
    'Kualitas hubungan jangka panjang bisnis dengan pelanggan sangat baik'],
  ECT: ['Kemampuan bisnis kami menjangkau pasar atau pelanggan baru sangat baik',
    'Pertumbuhan penjualan bisnis kami selama setahun terakhir sangat memuaskan',
    'Liabilitas bisnis kami (pinjaman, utang) sangat dapat dikelola',
    'Situasi arus kas bisnis kami sangat sehat dan stabil'],
};
const PILIHAN_INS = {
  default: ['Tidak', 'Dalam proses', 'Ya'],
  5: ['Modal sendiri', 'Keluarga', 'Bank / kredit'],   // indeks soal (0-based) yang berbeda
};

// ── Utilitas ─────────────────────────────────────────────────
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f2 = v => (v == null ? '–' : Number(v).toFixed(2));
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const kuantil = (s, p) => { const i = (s.length - 1) * p, l = Math.floor(i); return s[l] + (s[Math.ceil(i)] - s[l]) * (i - l); };
const rupiah = v => (v == null ? '–' : 'Rp ' + Number(v).toLocaleString('id-ID'));
const view = $('#view');

let toastT;
function toast(msg, err) {
  const t = $('#toast');
  t.textContent = msg; t.className = 'on' + (err ? ' err' : '');
  clearTimeout(toastT); toastT = setTimeout(() => (t.className = ''), 3500);
}
const pesanError = m => ({
  'Invalid login credentials': 'Email atau kata sandi salah.',
  'User already registered': 'Email sudah terdaftar.',
  'Email not confirmed': 'Email belum dikonfirmasi. Periksa kotak masuk Anda.',
}[m] || m || 'Terjadi kesalahan.');

// ── State ────────────────────────────────────────────────────
const S = { session: null, profile: null, scores: null, sudah: null, sektor: '', q: '', page: 1, urut: 'desc' };

async function muatProfil() {
  S.profile = null;
  if (!S.session) return;
  const { data } = await db.from('profiles').select('*').eq('id', S.session.user.id).maybeSingle();
  S.profile = data;
}

async function muatSkor(paksa) {
  if (S.scores && !paksa) return S.scores;
  let semua = [], dari = 0;
  for (;;) {
    const { data, error } = await db.from('v_scores').select('*').order('label').range(dari, dari + 999);
    if (error) throw error;
    semua = semua.concat(data);
    if (data.length < 1000) break;
    dari += 1000;
  }
  return (S.scores = semua);
}
const baris = () => (S.sektor ? S.scores.filter(r => r.sektor === S.sektor) : S.scores);
const terlemah = r => {
  const ada = URUT.filter(k => r[k.toLowerCase()] != null);
  return ada.length ? FAKTOR[ada.reduce((a, b) => (r[a.toLowerCase()] <= r[b.toLowerCase()] ? a : b))].n : '–';
};

// ── Navigasi ─────────────────────────────────────────────────
const PRIVAT = ['ringkasan', 'distribusi', 'data', 'penilaian', 'profil'];
const go = h => { const t = '#/' + h; if (location.hash === t) route(); else location.hash = t; };

function nav(r) {
  const item = (h, t) => `<a href="#/${h}" ${r === h ? 'aria-current="page"' : ''}>${t}</a>`;
  if (!S.profile) {
    $('#nav').innerHTML = item('masuk', 'Masuk') + item('daftar', 'Daftar').replace('<a ', '<a class="cta" ');
    return;
  }
  $('#nav').innerHTML = S.profile.role === 'admin'
    ? item('ringkasan', 'Dasbor') + item('distribusi', 'Distribusi') + item('data', 'Data UMKM') + item('profil', 'Profil')
    : item('ringkasan', 'Ringkasan') + item('distribusi', 'Distribusi') + item('data', 'Data UMKM') + item('penilaian', 'Penilaian') + item('profil', 'Profil');
}

function route() {
  const r = location.hash.replace(/^#\/?/, '').split('?')[0];
  if (BELUM_SETUP && r) return go('');
  if (PRIVAT.includes(r) && !S.profile) return go('masuk');
  if ((r === 'masuk' || r === 'daftar') && S.profile) return go('ringkasan');
  if (r === 'penilaian' && S.profile && S.profile.role === 'admin') return go('ringkasan');
  nav(r);
  const peta = { '': beranda, masuk: tampilMasuk, daftar: tampilDaftar, ringkasan, distribusi, data: tampilData, penilaian, profil };
  (peta[r] || beranda)();
  scrollTo(0, 0);
}

function halaman(judul, sub, isi, filter) {
  view.innerHTML = `<div class="head"><div><h1>${judul}</h1><p>${sub}</p></div>${filter ? filterSektor() : ''}</div>${isi}`;
  if (filter) $('#fsektor').onchange = e => { S.sektor = e.target.value; S.page = 1; route(); };
}
const filterSektor = () => `<label class="f" style="margin:0">Sektor
  <select id="fsektor"><option value="">Semua sektor</option>${SEKTOR.map(s => `<option ${S.sektor === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>`;
const memuat = j => halaman(j, 'Memuat data…', '');
const galat = e => { view.innerHTML = `<div class="note">Gagal memuat data: ${esc(e.message || e)}. Pastikan skema SQL sudah dijalankan.</div>`; };

// ── Beranda ──────────────────────────────────────────────────
function beranda() {
  const bar = (n, w) => `<div>${n}<span class="t"><i style="width:${w}%"></i></span></div>`;
  view.innerHTML = `
  ${BELUM_SETUP ? '<div class="note"><b>Supabase belum dikonfigurasi.</b> Isi <code>js/config.js</code> sesuai panduan di README.</div>' : ''}
  <section class="hero">
    <span class="eyebrow">UMKM tumbuh, organisasi tangguh</span>
    <h1>Bisnis yang sehat dimulai dari <em>tim yang kuat.</em></h1>
    <p class="sub">Kenali kesehatan organisasi usaha Anda lewat enam faktor yang terukur. Dapatkan gambaran yang lebih jernih, lalu tentukan langkah berikutnya.</p>
    <div class="actions">
      ${S.profile ? '<a class="btn" href="#/ringkasan">Buka dasbor <span aria-hidden="true">→</span></a>' : '<a class="btn" href="#/daftar">Mulai penilaian <span aria-hidden="true">→</span></a><a class="btn ghost" href="#/masuk">Masuk</a>'}
    </div>
    <div class="hero-preview" aria-hidden="true">
      <div class="hp-top"><span class="hp-dots"><i></i><i></i><i></i></span><span>Contoh tampilan hasil</span><span></span></div>
      <div class="hp-body">
        <div class="ring"><b>3,9<small>dari 5</small></b></div>
        <div class="hp-bars">${bar('Sumber Daya', 74)}${bar('Budaya', 86)}${bar('Kepemimpinan', 68)}${bar('Proses', 80)}</div>
      </div>
      <div class="hp-chip"><i></i>Kategori: Baik</div>
    </div>
  </section>
  <section class="factors-section"><div class="section-title"><span class="eyebrow">Pendekatan menyeluruh</span><h2>Enam faktor. Satu arah pertumbuhan.</h2><p>Penilaian dilakukan oleh orang yang paling memahami tiap aspek.</p></div>
  <div class="feat-grid">
  ${URUT.map(k => `<article class="feat"><div class="ico">${k}</div><h3>${FAKTOR[k].n}</h3><p>${FAKTOR[k].d}</p><span class="who">Diisi ${FAKTOR[k].role === 'owner' ? 'pemilik' : 'karyawan'}</span></article>`).join('')}
  </div></section>
  <section class="home-note"><div><h2>Dibangun untuk UMKM Indonesia</h2><p>Pemilik dan karyawan berkontribusi dari perspektif masing-masing. Hasilnya membantu Anda melihat kekuatan tim dan area yang bisa dikembangkan.</p></div>
    ${S.profile ? '' : '<a class="btn" href="#/daftar">Daftar gratis</a>'}</section>`;
}

// ── Masuk & Daftar ───────────────────────────────────────────
function tampilMasuk() {
  view.innerHTML = `<div class="head"><div><h1>Masuk</h1><p>Akses ringkasan dan penilaian UMKM Anda.</p></div></div>
  <form class="form" id="fmasuk">
    <label class="f">Email<input type="email" name="email" required autocomplete="email"></label>
    <label class="f">Kata sandi<input type="password" name="pw" required autocomplete="current-password"></label>
    <button class="btn" type="submit">Masuk</button>
    <p class="alt">Belum punya akun? <a href="#/daftar">Daftar</a></p>
  </form>`;
  $('#fmasuk').onsubmit = async e => {
    e.preventDefault();
    const b = e.submitter; b.disabled = true;
    const { data, error } = await db.auth.signInWithPassword({ email: e.target.email.value.trim(), password: e.target.pw.value });
    if (error) { toast(pesanError(error.message), true); b.disabled = false; return; }
    S.session = data.session; await muatProfil(); S.scores = null; S.sudah = null;
    go('ringkasan');
  };
}

function tampilDaftar() {
  view.innerHTML = `<div class="head"><div><h1>Daftar</h1><p>Buat akun untuk usaha Anda atau untuk karyawan di usaha yang sudah terdaftar.</p></div></div>
  <form class="form wide" id="fdaftar">
    <div class="pick">
      <label><input type="radio" name="role" value="owner" checked>Pemilik<small>Mengisi sumber daya, inovasi, eksternal</small></label>
      <label><input type="radio" name="role" value="employee">Karyawan<small>Mengisi budaya, kepemimpinan, proses</small></label>
    </div>
    <label class="f">Nama UMKM<input type="text" name="nama" required minlength="2" maxlength="150"></label>
    <label class="f">Email<input type="email" name="email" required autocomplete="email"></label>
    <div class="two">
      <label class="f">Kata sandi<input type="password" name="pw" required minlength="8" autocomplete="new-password"></label>
      <label class="f">Ulangi kata sandi<input type="password" name="pw2" required minlength="8" autocomplete="new-password"></label>
    </div>
    <div class="two">
      <label class="f">Lokasi<select name="lokasi" required><option value="">Pilih…</option>${LOKASI.map(l => `<option>${l}</option>`).join('')}</select></label>
      <label class="f">Sektor<select name="sektor" required><option value="">Pilih…</option>${SEKTOR.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
    </div>
    <label class="f">Omzet per bulan (Rp), opsional<input type="number" name="omzet" min="0" step="1000" inputmode="numeric"></label>
    <button class="btn" type="submit">Buat akun</button>
    <p class="alt">Sudah punya akun? <a href="#/masuk">Masuk</a></p>
  </form>`;
  $('#fdaftar').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, b = e.submitter, role = f.role.value, nama = f.nama.value.trim();
    if (f.pw.value !== f.pw2.value) return toast('Kata sandi tidak sama.', true);
    b.disabled = true;
    if (role === 'owner') {
      const { data: ada } = await db.rpc('owner_exists', { p_name: nama });
      if (ada) { toast(`UMKM "${nama}" sudah memiliki Pemilik terdaftar.`, true); b.disabled = false; return; }
    }
    const { data, error } = await db.auth.signUp({
      email: f.email.value.trim(), password: f.pw.value,
      options: { data: { umkm_name: nama, role, lokasi: f.lokasi.value, sektor: f.sektor.value, omzet: f.omzet.value } },
    });
    if (error) { toast(pesanError(error.message), true); b.disabled = false; return; }
    if (!data.session) {
      view.innerHTML = `<div class="head"><div><h1>Periksa email Anda</h1><p>Kami mengirim tautan konfirmasi ke ${esc(f.email.value)}. Setelah dikonfirmasi, silakan <a href="#/masuk">masuk</a>.</p></div></div>`;
      return;
    }
    S.session = data.session; await muatProfil(); S.scores = null; S.sudah = null;
    toast('Akun berhasil dibuat.'); go('ringkasan');
  };
}

// ── Ringkasan ────────────────────────────────────────────────
async function ringkasan() {
  memuat('Ringkasan');
  try { await muatSkor(); } catch (e) { return galat(e); }
  if (S.profile.role === 'admin') return ringkasanAdmin();
  return ringkasanUsaha();
}

async function statusPenilaian() {
  if (S.sudah == null) {
    const { data, error } = await db.from('submissions').select('id').eq('user_id', S.session.user.id).maybeSingle();
    if (error) throw error;
    S.sudah = !!data;
  }
  return S.sudah;
}

function ringkasanAdmin() {
  const semua = S.scores, usaha = semua.filter(x => x.source === 'platform');
  const survei = semua.filter(x => x.source !== 'platform');
  const baik = usaha.filter(x => x.kategori === 'Baik' || x.kategori === 'Sangat Baik').length;
  const skorRata = mean(usaha.map(x => Number(x.total)));
  const rataF = URUT.map(k => {
    const nilai = usaha.map(x => x[k.toLowerCase()]).filter(x => x != null).map(Number);
    return [k, nilai.length ? mean(nilai) : null];
  });
  const bar = (lbl, val, mx, warna, kanan) => `<div class="row"><span>${lbl}</span><span class="track"><i style="width:${mx ? (val / mx) * 100 : 0}%;background:${warna}"></i></span><b>${kanan}</b></div>`;
  const terbaru = [...usaha].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).slice(0, 5);
  halaman('Dasbor admin', 'Pantau hasil penilaian dan kesehatan organisasi UMKM di platform.', `
    <div class="dashboard-welcome"><div><span class="eyebrow">PUSAT PEMANTAUAN</span><h2>Halo, Admin.</h2><p>Berikut gambaran aktivitas dan kondisi UMKM yang terdaftar.</p></div><span class="welcome-mark" aria-hidden="true">U</span></div>
    <div class="stats">
      <div class="stat"><span>UMKM dengan hasil</span><b>${usaha.length}</b><small>penilaian pemilik selesai</small></div>
      <div class="stat"><span>Survei pembanding</span><b>${survei.length}</b><small>data anonim</small></div>
      <div class="stat"><span>Rata-rata skor UMKM</span><b>${usaha.length ? f2(skorRata) : '–'}</b><small>/ 5</small></div>
      <div class="stat"><span>Kategori baik ke atas</span><b>${usaha.length ? Math.round((baik / usaha.length) * 100) : 0}%</b><small>${baik} dari ${usaha.length} UMKM</small></div>
    </div>
    <div class="cols">
      <section class="blk panel"><span class="eyebrow">KONDISI ORGANISASI</span><h2>Rata-rata per faktor</h2>
        ${rataF.map(([k, v]) => bar(FAKTOR[k].n, v || 0, 5, 'var(--accent)', f2(v))).join('')}
        ${usaha.length ? '' : '<p class="muted small">Belum ada hasil penilaian dari UMKM yang berpartisipasi.</p>'}
      </section>
      <section class="blk panel"><span class="eyebrow">AKTIVITAS TERBARU</span><h2>UMKM diperbarui</h2>
        ${terbaru.length ? `<div class="recent-list">${terbaru.map(x => `<div class="recent-item"><div><b>${esc(x.label)}</b><span>${esc(x.sektor || 'Sektor belum diisi')} · ${x.n_pegawai || 0} karyawan mengisi</span></div><strong>${f2(x.total)}<small> / 5</small></strong></div>`).join('')}</div>` : '<p class="muted small">Belum ada UMKM yang menyelesaikan penilaian.</p>'}
        <a class="text-link" href="#/data">Lihat seluruh data UMKM <span aria-hidden="true">→</span></a>
      </section>
    </div>
    <p class="privacy-note">Data pembanding ditampilkan secara anonim. Dasbor ini menyajikan skor gabungan, bukan jawaban atau alamat email pengguna.</p>`);
}

async function ringkasanUsaha() {
  let sudah;
  try { sudah = await statusPenilaian(); } catch (e) { return galat(e); }
  const namaKey = S.profile.umkm_name.trim().toLowerCase();
  const m = S.scores.find(x => x.umkm_key === namaKey);
  const pemilik = S.profile.role === 'owner';
  const roleName = pemilik ? 'Pemilik usaha' : 'Karyawan';
  const action = sudah
    ? '<span class="status-pill complete"><i></i>Penilaian sudah dikirim</span>'
    : `<a class="btn" href="#/penilaian">Mulai penilaian <span aria-hidden="true">→</span></a>`;
  if (!m) {
    halaman('Ringkasan', `${roleName} · ${esc(S.profile.umkm_name)}`, `
      <div class="dashboard-welcome"><div><span class="eyebrow">${pemilik ? 'DASBOR PEMILIK' : 'DASBOR KARYAWAN'}</span><h2>${pemilik ? 'Bangun bisnis yang lebih kuat.' : 'Suara Anda membantu tim berkembang.'}</h2><p>${pemilik ? 'Mulai dengan penilaian singkat dari perspektif pemilik usaha.' : 'Ringkasan usaha akan tersedia setelah pemilik menyelesaikan penilaiannya.'}</p></div><span class="welcome-mark" aria-hidden="true">${pemilik ? 'P' : 'K'}</span></div>
      <section class="panel next-step"><div><span class="eyebrow">LANGKAH BERIKUTNYA</span><h2>${pemilik ? (sudah ? 'Penilaian Anda tersimpan.' : 'Lengkapi penilaian pemilik') : (sudah ? 'Terima kasih atas kontribusi Anda.' : 'Menunggu penilaian pemilik')}</h2><p>${pemilik ? (sudah ? 'Skor gabungan akan tampil setelah hasil dapat dihitung.' : 'Jawaban Anda menjadi dasar ringkasan kesehatan organisasi UMKM.') : (sudah ? 'Hasil akan muncul setelah penilaian pemilik usaha dikirim.' : 'Pemilik usaha perlu mengirim penilaian terlebih dahulu sebelum karyawan dapat mengisi.')}</p></div>${pemilik || sudah ? action : '<span class="status-pill"><i></i>Menunggu pemilik</span>'}</section>
      <p class="privacy-note">Skor gabungan hanya ditampilkan setelah penilaian pemilik tersedia.</p>`);
    return;
  }
  const faktorTerlemah = terlemah(m);
  const menungguPegawai = pemilik && !m.n_pegawai;
  halaman('Ringkasan usaha', `${roleName} · ${esc(m.label)}${m.sektor ? ' · ' + esc(m.sektor) : ''}`, `
    <div class="dashboard-welcome"><div><span class="eyebrow">${pemilik ? 'DASBOR PEMILIK' : 'DASBOR KARYAWAN'}</span><h2>${pemilik ? 'Usaha Anda, lebih siap bertumbuh.' : 'Terima kasih sudah ikut membangun tim.'}</h2><p>Skor gabungan dari penilaian pemilik dan ${m.n_pegawai || 0} karyawan yang sudah mengisi.</p></div><span class="welcome-mark" aria-hidden="true">${pemilik ? 'P' : 'K'}</span></div>
    <div class="stats">
      <div class="stat"><span>Skor kesehatan usaha</span><b>${f2(m.total)}</b><small>/ 5</small></div>
      <div class="stat"><span>Kategori</span><b class="category-value" style="color:${WARNA[m.kategori] || 'var(--accent)'}">${esc(m.kategori)}</b><small>hasil gabungan</small></div>
      <div class="stat"><span>Karyawan berpartisipasi</span><b>${m.n_pegawai || 0}</b><small>penilaian terkirim</small></div>
      <div class="stat"><span>Faktor yang perlu perhatian</span><b class="category-value">${esc(faktorTerlemah)}</b><small>prioritas pengembangan</small></div>
    </div>
    <div class="cols">
      <section class="blk panel"><span class="eyebrow">PROFIL ORGANISASI</span><h2>Skor per faktor</h2>
        ${URUT.map(k => { const v = m[k.toLowerCase()]; return `<div class="row"><span>${FAKTOR[k].n}</span><span class="track"><i style="width:${v == null ? 0 : (v / 5) * 100}%;background:var(--accent)"></i></span><b>${v == null ? '<span class="muted small">menunggu</span>' : f2(v)}</b></div>`; }).join('')}
        <p class="muted small factor-caption">Skor budaya, kepemimpinan, dan proses merupakan rata-rata karyawan yang berpartisipasi.</p>
      </section>
      <section class="blk panel"><span class="eyebrow">SARAN LANGKAH</span><h2>${menungguPegawai ? 'Ajak tim ikut berpendapat.' : 'Jadikan hasil sebagai awal.'}</h2>
        <p class="muted">${menungguPegawai ? 'Belum ada penilaian karyawan. Ajak tim mengisi agar skor budaya, kepemimpinan, dan proses bisa dihitung.' : `Gunakan faktor ${esc(faktorTerlemah)} sebagai bahan diskusi bersama tim untuk memilih satu perbaikan yang bisa dimulai.`}</p>
        <div class="next-actions">${!sudah ? action : ''}<a class="text-link" href="#/data">Bandingkan dengan UMKM lain <span aria-hidden="true">→</span></a></div>
      </section>
    </div>`);
}

// ── Distribusi ───────────────────────────────────────────────
async function distribusi() {
  memuat('Distribusi');
  try { await muatSkor(); } catch (e) { return galat(e); }
  const r = baris(), s = r.map(x => Number(x.total)).sort((a, b) => a - b);
  if (!s.length) return halaman('Distribusi', 'Belum ada data untuk sektor ini.', '', true);
  const q1 = kuantil(s, .25), q2 = kuantil(s, .5), q3 = kuantil(s, .75), iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  const bins = Array.from({ length: 8 }, (_, i) => 1 + i * .5);
  const cnt = bins.map((b, i) => s.filter(v => v >= b && (i === 7 ? v <= b + .5 : v < b + .5)).length);
  const top = Math.max(...cnt, 1);
  const outl = r.filter(x => x.total < lo || x.total > hi).sort((a, b) => b.total - a.total);
  halaman('Distribusi', 'Sebaran skor total dan ukuran pemusatannya.', `
  <section class="blk"><h2>Frekuensi skor</h2>
    <div class="hist" role="img" aria-label="Histogram skor total">${cnt.map(c => `<div>${c}<i style="height:${(c / top) * 85}%"></i></div>`).join('')}</div>
    <div class="hist-x">${bins.map(b => `<span>${b.toFixed(1)}</span>`).join('')}</div>
  </section>
  <div class="cols">
    <section class="blk"><h2>Statistik</h2><dl class="kv">
      <div><dt>Jumlah UMKM</dt><dd>${s.length}</dd></div><div><dt>Rata-rata</dt><dd>${f2(mean(s))}</dd></div>
      <div><dt>Median</dt><dd>${f2(q2)}</dd></div><div><dt>Kuartil 1 (Q1)</dt><dd>${f2(q1)}</dd></div>
      <div><dt>Kuartil 3 (Q3)</dt><dd>${f2(q3)}</dd></div><div><dt>Rentang antar-kuartil</dt><dd>${f2(iqr)}</dd></div>
      <div><dt>Batas pencilan</dt><dd>${f2(lo)} – ${f2(hi)}</dd></div></dl></section>
    <section class="blk"><h2>Pencilan (${outl.length})</h2>
      ${outl.length ? `<dl class="kv">${outl.slice(0, 12).map(x => `<div><dt>${esc(x.label)}</dt><dd>${f2(x.total)}</dd></div>`).join('')}</dl>${outl.length > 12 ? `<p class="muted small" style="margin-top:.75rem">dan ${outl.length - 12} lainnya.</p>` : ''}` : '<p class="muted">Tidak ada pencilan pada rentang ini.</p>'}
    </section>
  </div>`, true);
}

// ── Data UMKM ────────────────────────────────────────────────
const PER = 15;
async function tampilData() {
  memuat('Data UMKM');
  try { await muatSkor(); } catch (e) { return galat(e); }
  const q = S.q.toLowerCase();
  let r = baris().filter(x => !q || [x.label, x.lokasi, x.sektor].some(v => (v || '').toLowerCase().includes(q)));
  r = [...r].sort((a, b) => (S.urut === 'desc' ? b.total - a.total : a.total - b.total));
  const hal = Math.max(1, Math.ceil(r.length / PER)); S.page = Math.min(S.page, hal);
  const potong = r.slice((S.page - 1) * PER, S.page * PER);
  halaman('Data UMKM', `${r.length} UMKM. Data survei bersifat anonim; UMKM yang mendaftar ditandai.`, `
  <div class="tools"><label class="f">Cari<input type="search" id="cari" placeholder="Nama, lokasi, atau sektor" value="${esc(S.q)}"></label></div>
  <div class="scroll"><table class="data"><thead><tr><th>Nama</th><th>Sektor</th><th>Lokasi</th>
    <th class="n"><button id="urut" title="Ubah urutan">Skor ${S.urut === 'desc' ? '↓' : '↑'}</button></th><th>Kategori</th><th>Faktor terlemah</th></tr></thead><tbody>
  ${potong.map(x => `<tr><td>${esc(x.label)}${x.source === 'platform' ? '<span class="tag">terdaftar</span>' : ''}</td><td>${esc(x.sektor || '–')}</td><td>${esc(x.lokasi || '–')}</td>
    <td class="n">${f2(x.total)}</td><td><span class="dot" style="background:${WARNA[x.kategori]}"></span>${esc(x.kategori)}</td><td>${terlemah(x)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Tidak ada data yang cocok.</td></tr>'}
  </tbody></table></div>
  <div class="pager"><span>Halaman ${S.page} dari ${hal}</span><span class="actions">
    <button class="btn ghost" id="prev" ${S.page <= 1 ? 'disabled' : ''}>Sebelumnya</button>
    <button class="btn ghost" id="next" ${S.page >= hal ? 'disabled' : ''}>Berikutnya</button></span></div>`, true);
  let t; const c = $('#cari');
  c.oninput = () => { clearTimeout(t); t = setTimeout(() => { S.q = c.value; S.page = 1; tampilData().then(() => { const n = $('#cari'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }); }, 250); };
  $('#urut').onclick = () => { S.urut = S.urut === 'desc' ? 'asc' : 'desc'; tampilData(); };
  $('#prev').onclick = () => { S.page--; tampilData(); };
  $('#next').onclick = () => { S.page++; tampilData(); };
}

// ── Penilaian ────────────────────────────────────────────────
async function penilaian() {
  memuat('Penilaian');
  try { await statusPenilaian(); } catch (e) { return galat(e); }
  if (S.sudah) return hasil();
  const role = S.profile.role, kunci = URUT.filter(k => FAKTOR[k].role === role);
  const total = kunci.reduce((n, k) => n + SOAL[k].length, 0);
  const opsi = (id, k, i) => {
    const f = FAKTOR[k];
    const lab = k === 'INS' ? (PILIHAN_INS[i] || PILIHAN_INS.default) : null;
    return Array.from({ length: f.max }, (_, v) => `<label><input type="radio" name="${id}" value="${v + 1}" required><span ${lab ? 'class="wide"' : ''}>${v + 1}${lab ? ' · ' + lab[v] : ''}</span></label>`).join('');
  };
  halaman('Penilaian', role === 'owner'
    ? 'Isi sebagai pemilik. Pertanyaan menilai sumber daya, inovasi, dan hubungan eksternal usaha. Kuesioner hanya dapat diisi sekali.'
    : 'Isi sebagai karyawan. Pertanyaan menilai budaya, kepemimpinan, dan proses kerja. Kuesioner hanya dapat diisi sekali.', `
  ${role === 'employee' ? '<div class="note">Karyawan dapat mengisi setelah pemilik usaha mengisi kuesionernya.</div>' : ''}
  <form id="fnilai" novalidate>
  ${kunci.map(k => `<fieldset><legend>${FAKTOR[k].n}</legend>
    <p class="small muted">${k === 'INS' ? 'Pilih jawaban yang paling sesuai.' : '1 = ' + SKALA5[0] + ' · 5 = ' + SKALA5[4]}</p>
    ${SOAL[k].map((t, i) => { const id = `${k.toLowerCase()}_oh${FAKTOR[k].from + i}`; return `<div class="q" data-q="${id}"><p>${esc(t)}</p><div class="opts">${opsi(id, k, i)}</div></div>`; }).join('')}
  </fieldset>`).join('')}
  <div class="sticky"><span class="muted" id="prog">0 dari ${total} terjawab</span><button class="btn" type="submit">Kirim penilaian</button></div>
  </form>`);
  const f = $('#fnilai');
  f.onchange = () => { $('#prog').textContent = `${$$('.q', f).filter(q => $('input:checked', q)).length} dari ${total} terjawab`; $$('.miss', f).forEach(q => $('input:checked', q) && q.classList.remove('miss')); };
  f.onsubmit = async e => {
    e.preventDefault();
    const jawab = {}, kosong = [];
    $$('.q', f).forEach(q => { const c = $('input:checked', q); if (c) jawab[q.dataset.q] = Number(c.value); else { kosong.push(q); q.classList.add('miss'); } });
    if (kosong.length) { kosong[0].scrollIntoView({ block: 'center' }); return toast(`${kosong.length} pertanyaan belum dijawab.`, true); }
    const b = e.submitter; b.disabled = true;
    const { error } = await db.rpc('submit_assessment', { p_answers: jawab });
    if (error) { toast(pesanError(error.message), true); b.disabled = false; return; }
    S.sudah = true; S.scores = null; toast('Penilaian tersimpan.'); hasil();
  };
}

async function hasil() {
  memuat('Hasil penilaian');
  let m;
  try { await muatSkor(true); m = S.scores.find(x => x.umkm_key === S.profile.umkm_name.trim().toLowerCase()); } catch (e) { return galat(e); }
  if (!m) return halaman('Hasil penilaian', 'Penilaian Anda tersimpan. Hasil akan tampil setelah pemilik usaha mengisi kuesioner.', '');
  halaman('Hasil penilaian', `${esc(m.label)} — berdasarkan penilaian pemilik dan ${m.n_pegawai} karyawan.`, `
  <div class="stats"><div class="stat"><span>Skor total</span><b>${f2(m.total)}</b> <small>/ 5</small></div>
    <div class="stat"><span>Kategori</span><b style="color:${WARNA[m.kategori]}">${esc(m.kategori)}</b></div>
    <div class="stat"><span>Faktor terlemah</span><b style="font-size:1.6rem">${terlemah(m)}</b></div></div>
  <section class="blk"><h2>Skor per faktor</h2>
    ${URUT.map(k => { const v = m[k.toLowerCase()]; return `<div class="row"><span>${FAKTOR[k].n}</span><span class="track"><i style="width:${v == null ? 0 : (v / 5) * 100}%;background:var(--accent)"></i></span><b>${v == null ? '<span class="muted small">menunggu</span>' : f2(v)}</b></div>`; }).join('')}
  </section>
  <p class="muted small">Skor budaya, kepemimpinan, dan proses adalah rata-rata seluruh pegawai yang sudah mengisi.</p>`);
}

// ── Profil ───────────────────────────────────────────────────
function profil() {
  const p = S.profile;
  halaman('Profil', 'Informasi akun Anda.', `
  <dl class="kv" style="max-width:36rem;margin-bottom:2rem">
    <div><dt>Nama UMKM</dt><dd>${esc(p.umkm_name)}</dd></div><div><dt>Email</dt><dd>${esc(S.session.user.email)}</dd></div>
    <div><dt>Peran</dt><dd>${p.role === 'owner' ? 'Pemilik usaha' : p.role === 'admin' ? 'Administrator' : 'Karyawan'}</dd></div><div><dt>Lokasi</dt><dd>${esc(p.lokasi || '–')}</dd></div>
    <div><dt>Sektor</dt><dd>${esc(p.sektor || '–')}</dd></div>${p.role === 'admin' ? '' : `<div><dt>Omzet per bulan</dt><dd>${rupiah(p.omzet)}</dd></div>`}</dl>
  <button class="btn ghost" id="keluar">Keluar</button>`);
  $('#keluar').onclick = async () => { await db.auth.signOut(); };
}

// ── Mulai ────────────────────────────────────────────────────
async function mulai() {
  if (BELUM_SETUP) { addEventListener('hashchange', route); return route(); }
  const { data } = await db.auth.getSession();
  S.session = data.session; await muatProfil();
  db.auth.onAuthStateChange(ev => {
    if (ev === 'SIGNED_OUT') { Object.assign(S, { session: null, profile: null, scores: null, sudah: null }); setTimeout(() => go(''), 0); }
  });
  addEventListener('hashchange', route);
  route();
}
mulai();
})();