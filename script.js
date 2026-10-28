const $ = id => document.getElementById(id);
const SINIR = 1000, BEKLE = 5000;
const oku = (k, v) => { try { return JSON.parse(localStorage.getItem(k)) ?? v; } catch { return v; } };
const yaz = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const WH = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
let kanallar = oku("wp_kanallar", []), gecmis = oku("wp_gecmis", []), tur = "duz";

function toast(msg, hata) {
  const t = document.createElement("div");
  t.className = "toast" + (hata ? " hata" : "");
  t.textContent = msg;
  $("toasts").append(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("ici")));
  setTimeout(() => { t.classList.remove("ici"); setTimeout(() => t.remove(), 600); }, 2800);
}

function kanalCiz() {
  const sec = oku("wp_secili", "");
  $("kanal").innerHTML = "";
  kanallar.forEach(k => {
    const o = new Option(k.ad, k.id, false, k.id === sec);
    $("kanal").add(o);
  });
  if (!kanallar.length) $("kanal").add(new Option("Önce kanal ekle", ""));
  $("kanalListe").innerHTML = "";
  kanallar.forEach(k => {
    const li = document.createElement("li");
    const ad = document.createElement("span");
    ad.textContent = k.ad;
    const sil = document.createElement("button");
    sil.className = "ikincil"; sil.textContent = "Sil";
    sil.onclick = () => { kanallar = kanallar.filter(x => x.id !== k.id); yaz("wp_kanallar", kanallar); kanalCiz(); };
    li.append(ad, sil);
    $("kanalListe").append(li);
  });
}

function gecmisCiz() {
  $("liste").innerHTML = "";
  if (!gecmis.length) { $("liste").innerHTML = '<li class="bos" style="border:0">Henüz mesaj yok.</li>'; return; }
  gecmis.forEach(g => {
    const li = document.createElement("li");
    const m = document.createElement("small");
    m.textContent = new Date(g.t).toLocaleString("tr-TR") + " · " + g.kanal + " · " + (g.tur === "embed" ? "Embed" : "Düz");
    const p = document.createElement("p");
    p.textContent = g.metin;
    li.append(m, p);
    $("liste").append(li);
  });
}

function alanEkle() {
  if ($("alanlar").children.length >= 25) return toast("En fazla 25 alan", true);
  const d = document.createElement("div");
  d.className = "alan";
  d.innerHTML = '<input type="text" maxlength="256" placeholder="Alan adı"><input type="text" maxlength="1024" placeholder="Değer"><label><input type="checkbox"> yan yana</label>';
  const x = document.createElement("button");
  x.className = "ikincil"; x.textContent = "×";
  x.onclick = () => d.remove();
  d.append(x);
  $("alanlar").append(d);
}

function kalan() { return Math.max(0, Math.ceil((BEKLE - (Date.now() - oku("wp_son", 0))) / 1000)); }
function butonGuncelle() {
  const k = kalan();
  $("gonder").disabled = k > 0;
  $("gonder").textContent = k > 0 ? "Bekle (" + k + ")" : "Gönder!";
}

async function gonder() {
  if (kalan() > 0) return;
  const kanal = kanallar.find(k => k.id === $("kanal").value);
  if (!kanal) { toast("Önce bir kanal ekle", true); $("dlg").showModal(); return; }
  const metin = $("metin").value.trim();
  const url = v => (v = v.trim()) ? (/^https?:\/\//i.test(v) ? v : false) : null;
  let body, ozet;
  if (tur === "duz") {
    if (!metin) return toast("Mesaj boş olamaz", true);
    body = { content: metin, tts: $("tts").checked };
    ozet = metin;
  } else {
    const e = {};
    const baslik = $("eBaslik").value.trim();
    if (baslik) e.title = baslik;
    if (metin) e.description = metin;
    const link = url($("eUrl").value), resim = url($("eResim").value), kucuk = url($("eKucuk").value);
    if (link === false || resim === false || kucuk === false) return toast("Linkler https:// ile başlamalı", true);
    if (link) e.url = link;
    if (resim) e.image = { url: resim };
    if (kucuk) e.thumbnail = { url: kucuk };
    if ($("eYazar").value.trim()) e.author = { name: $("eYazar").value.trim() };
    if ($("eAlt").value.trim()) e.footer = { text: $("eAlt").value.trim() };
    if ($("eZaman").checked) e.timestamp = new Date().toISOString();
    e.color = parseInt($("eRenk").value.slice(1), 16);
    const f = [...$("alanlar").children].map(d => {
      const i = d.querySelectorAll("input");
      return { name: i[0].value.trim(), value: i[1].value.trim(), inline: i[2].checked };
    }).filter(a => a.name && a.value);
    if (f.length) e.fields = f;
    if (!e.title && !e.description && !e.image && !f.length) return toast("Embed boş olamaz", true);
    body = { embeds: [e] };
    ozet = [baslik, metin].filter(Boolean).join(" — ") || "(görsel/alanlar)";
  }
  yaz("wp_son", Date.now());
  butonGuncelle();
  try {
    const r = await fetch(kanal.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) {
      toast("Gönderildi");
      gecmis.unshift({ t: Date.now(), kanal: kanal.ad, tur, metin: ozet.slice(0, 300) });
      yaz("wp_gecmis", gecmis); gecmisCiz();
      $("metin").value = ""; $("sayac").textContent = "0 / " + SINIR;
    } else {
      localStorage.removeItem("wp_son");
      toast(r.status === 429 ? "Discord hız sınırı, biraz bekle" : "Hata: " + r.status, true);
    }
  } catch { localStorage.removeItem("wp_son"); toast("Bağlantı hatası", true); }
}

$("gonder").onclick = gonder;
$("alanEkle").onclick = alanEkle;
$("kanal").onchange = () => yaz("wp_secili", $("kanal").value);
$("metin").oninput = () => $("sayac").textContent = $("metin").value.length + " / " + SINIR;
$("kanalBtn").onclick = () => $("dlg").showModal();
$("kapat").onclick = () => $("dlg").close();
$("temizle").onclick = () => { gecmis = []; yaz("wp_gecmis", gecmis); gecmisCiz(); };
$("kEkle").onclick = () => {
  const ad = $("kAd").value.trim(), u = $("kUrl").value.trim();
  if (!ad) return toast("Kanal adı yaz", true);
  if (!WH.test(u)) return toast("Geçerli bir Discord webhook adresi gir", true);
  const k = { id: String(Date.now()), ad, url: u };
  kanallar.push(k); yaz("wp_kanallar", kanallar); yaz("wp_secili", k.id);
  $("kAd").value = $("kUrl").value = "";
  kanalCiz();
};
document.querySelectorAll(".tur button").forEach(b => b.onclick = () => {
  tur = b.dataset.tur;
  document.querySelectorAll(".tur button").forEach(x => x.classList.toggle("on", x === b));
  $("embedAlan").hidden = tur !== "embed";
  $("ttsEtiket").hidden = tur === "embed";
  $("metin").placeholder = tur === "embed" ? "Embed açıklaması, Enter ile gönder" : "Mesajını yaz, Enter ile gönder";
});
document.querySelector(".yazi").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.target.matches("textarea,input[type=text],input[type=url]")) {
    e.preventDefault(); gonder();
  }
});

kanalCiz(); gecmisCiz(); alanEkle(); butonGuncelle();
setInterval(butonGuncelle, 250);
if (!kanallar.length) $("dlg").showModal();
