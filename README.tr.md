🌍 Diller  
[English](README.md) | [Français](README.fr.md) | [Español](README.es.md) | [Português](README.pt.md) | [Deutsch](README.de.md) | [Русский](README.ru.md) | [العربية](README.ar.md) | [Polski](README.pl.md) | [Türkçe](README.tr.md)

# UltraTextGen

UltraTextGen, vakit kaybetmek istemeyenler için tasarlanmış hızlı ve sade bir Unicode metin üretecidir.

- Ağır sayfa yok.
- Gereksiz yükleme yok.
- Dikkat dağıtan şey yok.

Metnini yaz, kopyala ve yoluna devam et.


## Neden UltraTextGen

Çoğu süslü yazı aracı yavaş, dağınık ve asla kullanmayacağın efektlerle dolu.

UltraTextGen bunun tam tersi.

Anında yüklenir  
Tamamen tarayıcıda çalışır  
Kayıt yok, açılır pencere yok  
Seninle kopyala düğmesi arasında hiçbir şey yok

Zaman kazandırmak için yapıldı, zaman harcatmak için değil.


## Ne Yapar

**Her yere yapıştırabileceğin süslü yazı.** UltraTextGen normal metni Unicode
tabanlı stillere çevirir — toplam 114 stil — ve bunlar sosyal medyada ve
mesajlaşma uygulamalarında çalışır. Çıktı gerçek metindir, görsel değil:
kopyalanır, yapıştırılır ve koyduğun her yerde olduğu gibi kalır.

**Oyunlar ve profiller için süslü isimler.** Bir süsleme katmanı ismin çevresine
çerçeve, taç ve ayraç yerleştirir; oyun bazlı kural motoru da sonucu oyunun
gerçekten uygulayacağı karakter sınırına göre denetler — sen bir isim değiştirme
hakkı harcamadan önce.

**Karakterlerin yetmediği yerde yazdırılabilir ve görsel çıktı.** Balon ve el
yazısı çalışma sayfaları, boyama sayfaları, kavisli ve yay biçimli yazı, dövme
harflendirmesi. Bunların hepsi tarayıcında SVG/PNG olarak üretilir ve kopyala-
yapıştırın çözemediği işler için sonraki adımdır — çizmek, boyamak, yazdırmak —
asla varsayılan yanıt değil.

Yukarıdakilerin tümü istemci tarafında çalışır. Hiçbir şey sunucuda üretilmez ve
çalışması için hiçbir yazı tipi dosyası indirilmez.


## Kimin İçin

Biyografilerini ve açıklamalarını güncelleyen içerik üreticileri  
Varyasyon deneyen sosyal medya yöneticileri  
Discord ve oyun toplulukları  
Zahmetsiz görsel vurgu isteyen herkes

Hız önemliyse bu araç sana göre.


## Hız İçin Tasarlandı

UltraTextGen bilinçli olarak hafif tutuldu.

- Framework yok
- Bundler yok
- Tarayıcı tarafında bağımlılık yok
- Gereksiz animasyon yok

Her şey hızlı yüklenecek ve yavaş bağlantılarda bile akıcı kalacak şekilde tasarlandı.


## Tasarım Felsefesi

- Gösterişten önce hız
- Zekice olmaktan önce sadelik
- Etkileyici olmaktan önce kullanışlılık

Kullanıcının daha hızlı ilerlemesine yardımcı olmayan bir şey yayına girmez.


## Canlı Site

**Ana sayfa:** https://ultratextgen.com

### Sitede neler var

Aşağıdaki her bölümün arama ve gezinme özelliği yerleşik kendi dizin sayfası var
— bir şey bulmanın en hızlı yolu budur. Sayılar her hafta `sitemap.xml`
üzerinden güncellenir.

<!-- START_PILLARS -->
| Bölüm | İngilizce sayfa | Yerelleştirilmiş sayfa |
|---|---:|---:|
| [Kütüphane](https://ultratextgen.com/library/) | 336 | 1.084 |
| [Semboller](https://ultratextgen.com/symbol/) | 113 | 1.652 |
| [Cevaplar](https://ultratextgen.com/answers/) | 65 | 75 |
| [Kullanım Alanları](https://ultratextgen.com/usecase/) | 36 | 144 |
| [Rehberler](https://ultratextgen.com/guide/) | 32 | 90 |
| [Kategoriler](https://ultratextgen.com/category/) | 23 | 0 |
| [Güncellemeler](https://ultratextgen.com/updates/) | 11 | 56 |
| [Gömme Araçları](https://ultratextgen.com/embed/) | 6 | 0 |

**Toplam 4.576 URL**, 30 dilde.
<!-- END_PILLARS -->


## Platform Sayfaları

Stillerin tam beklendiği gibi görünmesi için her büyük platforma özel sayfalar.

<!-- START_PLATFORMS -->
### Sosyal Medya Platformları
**Facebook:** https://ultratextgen.com/facebook/
**Instagram:** https://ultratextgen.com/instagram/
**LinkedIn:** https://ultratextgen.com/linkedin/
**Pinterest:** https://ultratextgen.com/pinterest/
**Snapchat:** https://ultratextgen.com/snapchat/
**TikTok:** https://ultratextgen.com/tiktok/
**X (Twitter):** https://ultratextgen.com/x/
**YouTube:** https://ultratextgen.com/youtube/

### Mesajlaşma Platformları
**Discord:** https://ultratextgen.com/discord/
**Telegram:** https://ultratextgen.com/telegram/
**WhatsApp:** https://ultratextgen.com/whatsapp/
<!-- END_PLATFORMS -->


## Diller

Sitenin büyük bölümü yerelleştirilmiştir, yalnızca arayüz değil — her dilin
kendi sayfaları var; bunlar İngilizceden makineyle çevrilmek yerine o pazar için
yazılmıştır.

<!-- START_LOCALES -->
Site 30 dilde mevcut:

العربية (`ar`) · Bosanski (`bs`) · Čeština (`cs`) · Dansk (`da`) · Deutsch (`de`) · Español (`es`) · Suomi (`fi`) · Français (`fr`) · हिन्दी (`hi`) · Hrvatski (`hr`) · Magyar (`hu`) · Bahasa Indonesia (`id`) · Italiano (`it`) · 日本語 (`ja`) · 한국어 (`ko`) · Bahasa Melayu (`ms`) · Nederlands (`nl`) · Norsk (`no`) · Polski (`pl`) · Português (`pt`) · Română (`ro`) · Русский (`ru`) · Slovenčina (`sk`) · Српски (`sr`) · Svenska (`sv`) · ไทย (`th`) · Tagalog (`tl`) · Türkçe (`tr`) · Tiếng Việt (`vi`) · 繁體中文 (`zh-tw`)
<!-- END_LOCALES -->


## Gömme Araçları

UltraTextGen araçlarının, dış sayfalara ve platformlara gömülmek üzere hazırlanmış hafif sürümleri.

<!-- START_EMBED -->
- https://ultratextgen.com/embed/bio-font-generator/
- https://ultratextgen.com/embed/character-counter/
- https://ultratextgen.com/embed/linkedin-headline-generator/
- https://ultratextgen.com/embed/name-checker/
- https://ultratextgen.com/embed/nickname-generator/
- https://ultratextgen.com/embed/zalgo-text-generator/
<!-- END_EMBED -->


## Proje Yapısı

```
ultratextgen/
├── index.html               # Ana sayfa
├── style.css                # Genel stil dosyası
├── script.js                # Arayüz mantığı — giriş, çıktı ızgarası, kopyalama
├── styles.js                # Unicode stil kaydı (114 stil)
├── renderer.js              # Render motoru — style.type üzerinden dağıtım yapar
├── header.js                # Ortak gezinme enjektörü
├── sitemap.xml              # Otomatik üretilir — asla elle düzenleme
├── _redirects, _headers     # Cloudflare Pages yapılandırması
├── _routes.json             # Pages Functions yönlendirmesi (yalnızca `/` çağırır)
├── functions/               # Cloudflare Pages ara katmanı
│
├── js/                      # Özellik modülleri, her biri bir dizin
│   ├── flair/               #   isim süsleme paketleri
│   ├── gamename/            #   oyun bazlı isim kuralları + denetleyici
│   ├── counter/             #   karakter sayacı (testleri var)
│   ├── printables/          #   yazdırılabilir sayfa motoru
│   ├── curved/  tattoo/     #   SVG/PNG çıktı modları
│   ├── vertical/  kaomoji/  #   …ve yaklaşık 20 tane daha
│
├── category/  usecase/      # İçerik sütunları ("Sitede neler var" bölümüne bakın)
├── guide/     answers/
├── library/   symbol/
├── updates/   embed/
│
├── <lang>/                  # 30 yerelleştirilmiş site ağacı (de/, es/, ja/, …)
│
├── discord/  instagram/     # Platform sayfaları
├── linkedin/ tiktok/  …
│
├── data/                    # Araçların okuduğu kayıt ve dizinler
├── docs/                    # Mühendislik ve süreç dokümantasyonu
└── scripts/                 # Derleme, doğrulama ve üretim betikleri
```

Depo kökündeki `CLAUDE.md` tam mühendislik rehberidir — içerik kuralları,
yerelleştirme akışı, doğrulama kapıları ve yazım kuralları.


## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Ön yüz | HTML5, CSS3, saf JavaScript (ES6+) — framework yok, bundler yok |
| Görsel çıktı | Yerel Canvas/SVG, istemci tarafında render edilir |
| Derleme araçları | Node.js (site haritası, doğrulayıcılar), Python (varlık üretimi) |
| CI/CD | GitHub Actions |
| Barındırma | Cloudflare Pages + Pages Functions |

Ön yüzde derleme adımı yoktur. Node ve Python yalnızca dağıtımdan önce çalışan
araçlarda kullanılır, tarayıcıda asla.


## Geliştirme

```bash
npm install            # Yalnızca derleme araçları — tarayıcıya hiçbir şey gitmez

npx serve .            # Yerelde sun; ya da: python3 -m http.server 8080
npm run prebuild       # sitemap.xml dosyasını yeniden üret
npm run sync-readme    # Bu dosyadaki üretilen blokları yenile
```

Ön yüz için derleme adımı yok — `index.html` dosyasını doğrudan aç ya da dizini
herhangi bir statik dosya sunucusuyla sun.
