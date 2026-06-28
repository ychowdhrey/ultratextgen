#!/usr/bin/env python3
"""
Turkish "şekilli yazı / havalı nick" Pinterest board — every pin drives to
https://ultratextgen.com/tr/ (the Zalgo pin to the /tr/ zalgo use case page).
Mirrors generate-es-pins.py via scripts/_locale_pin_kit.py. Topics track the
/tr/ page intent: şekilli yazı oluşturucu — kalın, italik, el yazısı, gotik,
balon fontlar; sembol kopyala yapıştır; oyun nicki, Instagram bio, WhatsApp
durum, Discord.

Styled row samples avoid Turkish-only letters (ş ı ğ İ) because the Unicode
Mathematical-Alphanumeric block can't style them; headlines use the brand sans,
which renders Turkish fully.

Run:  python3 scripts/generate-tr-pins.py
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = importlib.util.spec_from_file_location(
    "lpk", os.path.join(HERE, "_locale_pin_kit.py"))
_m = importlib.util.module_from_spec(KIT)
KIT.loader.exec_module(_m)
st, wrap, smallcaps = _m.st, _m.wrap, _m.smallcaps
strike, under, build_board = _m.strike, _m.under, _m.build_board

LOCALE = "tr"
DEST = "https://ultratextgen.com/tr/"
ZALGO = "https://ultratextgen.com/tr/usecase/zalgo-text/"
BOARD = "Şekilli Yazı & Havalı Nick — Kopyala Yapıştır ✨"
CAMPAIGN = "tr_howto_pins"
CTA = "KOPYALAMAK İÇİN DOKUN"
SUFFIX = "/tr"

PINS = [
    dict(slug="kopyala-yapistir", kicker="ULTRATEXTGEN · NASIL KULLANILIR",
         headline="Şekilli Yazı Kopyala Yapıştır",
         benefit="Yazını yaz, onlarca farklı stilde kopyala.",
         rows=[("normal", "stil"), ("El Yazısı", st("Script", "stil")),
               ("Kalın", st("Bold", "stil")), ("Içi Boş", st("Double-struck", "stil"))],
         title="Şekilli Yazı Kopyala Yapıştır — Ücretsiz",
         kw=["şekilli yazı", "şekilli yazı kopyala", "şekilli harfler",
             "yazı kopyala yapıştır", "kopyala yapıştır"]),
    dict(slug="font-olusturucu", kicker="ULTRATEXTGEN · OLUŞTURUCU",
         headline="Şekilli Yazı Oluşturucu",
         benefit="Yazını anında birçok fonta dönüştür.",
         rows=[("normal", "metin"), ("El Yazısı", st("Script", "metin")),
               ("Kalın", st("Bold", "metin")), ("Mono", st("Monospace", "metin"))],
         title="Şekilli Yazı Oluşturucu — Kopyala Yapıştır",
         kw=["şekilli yazı oluşturucu", "font oluşturucu", "yazı oluşturucu",
             "şekilli harfler", "şekilli yazı"]),
    dict(slug="sekilli-harfler", kicker="ULTRATEXTGEN · STİLLER",
         headline="Şekilli Harf Stilleri",
         benefit="El yazısı, gotik, balon ve daha fazlası tek yerde.",
         rows=[("El Yazısı", st("Script", "stil")), ("Gotik", st("Fraktur", "stil")),
               ("Balon", st("Circled", "stil")), ("Kapital", smallcaps("stil"))],
         title="Şekilli Harf Stilleri — Kopyala Yapıştır",
         kw=["şekilli harfler", "harf stilleri", "farklı yazı stilleri",
             "şekilli yazı", "havalı yazı"]),
    dict(slug="instagram-bio", kicker="ULTRATEXTGEN · INSTAGRAM",
         headline="Instagram Bio için Şekilli Yazı",
         benefit="Biyografini, adını ve hikâyelerini süsle.",
         rows=[("El Yazısı", wrap("✶", st("Script", "self love"))),
               ("Italik", wrap("⊹", st("Italic", "good vibes"))),
               ("Kapital", wrap("˚✧", smallcaps("kendin ol"), "✧˚"))],
         title="Instagram Bio için Şekilli Yazı — Kopyala",
         kw=["instagram bio yazı", "instagram için şekilli yazı", "instagram bio aesthetic",
             "şekilli yazı instagram", "aesthetic"]),
    dict(slug="el-yazisi", kicker="ULTRATEXTGEN · EL YAZISI",
         headline="El Yazısı Fontu Kopyala",
         benefit="Zarif el yazısı, yapıştırmaya hazır.",
         rows=[("El Yazısı", st("Script", "merhaba")),
               ("Kalın El Yazısı", st("Bold Script", "merhaba")),
               ("Italik", st("Italic", "merhaba"))],
         title="El Yazısı Fontu Kopyala Yapıştır — Ücretsiz",
         kw=["el yazısı fontu", "el yazısı kopyala", "el yazısı harfler",
             "şekilli yazı", "kaligrafi"]),
    dict(slug="isimler", kicker="ULTRATEXTGEN · İSİMLER",
         headline="Adını Şekilli Yazıyla Yaz",
         benefit="Adını profiller, nickler ve durumlar için dönüştür.",
         rows=[("El Yazısı", st("Script", "Defne")), ("Kalın", st("Bold", "Defne")),
               ("Gotik", st("Fraktur", "Defne")), ("Içi Boş", st("Double-struck", "Defne"))],
         title="Adını Şekilli Yazıyla Yaz — Kopyala Yapıştır",
         kw=["isim şekilli yazı", "şekilli isimler", "havalı isimler",
             "şekilli yazı", "isim kopyala"]),
    dict(slug="oyun-nicki", kicker="ULTRATEXTGEN · OYUN",
         headline="Havalı Oyun Nickleri",
         benefit="Sembollerle havalı bir oyuncu adı oluştur.",
         rows=[("Mono", wrap("≪", st("Monospace", "PROGAMER"), "≫")),
               ("Kapital", wrap("★", smallcaps("efsane"))),
               ("Içi Boş", wrap("⊱", st("Double-struck", "Avci"), "⊰"))],
         title="Havalı Oyun Nickleri — Kopyala Yapıştır Ücretsiz",
         kw=["oyun nicki", "havalı nick", "oyun isimleri",
             "şekilli yazı", "nick kopyala"]),
    dict(slug="whatsapp", kicker="ULTRATEXTGEN · WHATSAPP",
         headline="WhatsApp için Şekilli Yazı",
         benefit="Durum, isim ve mesajları tarzla yaz.",
         rows=[("El Yazısı", st("Script", "good vibes")),
               ("Kalın Italik", st("Bold Italic", "mutlu ol")),
               ("Mono", st("Monospace", "online"))],
         title="WhatsApp için Şekilli Yazı — Durum Kopyala",
         kw=["whatsapp şekilli yazı", "whatsapp durum yazı", "whatsapp için yazı",
             "şekilli yazı", "kopyala yapıştır"]),
    dict(slug="semboller", kicker="ULTRATEXTGEN · SEMBOLLER",
         headline="Sembol Kopyala Yapıştır",
         benefit="Metnini tek tıkla süsleyen semboller ve süslemeler.",
         rows=[("Kalp & yıldız", "♡ ✶ ⋆ ˚ ✧ ♥"),
               ("Çiçek & süs", "❀ ✿ ⊹ ☆ ✰ ◇"),
               ("Ayraçlar", "✦ ── ✦   ⊱ ⋆ ⊰")],
         title="Sembol Kopyala Yapıştır — Metin Süsleme Ücretsiz",
         kw=["sembol kopyala yapıştır", "semboller", "özel semboller",
             "sembol kopyala", "şekilli yazı"]),
    dict(slug="tiktok", kicker="ULTRATEXTGEN · TIKTOK",
         headline="TikTok için Şekilli Yazı",
         benefit="TikTok adını ve biyografini kişiselleştir.",
         rows=[("Kalın", st("Bold", "kullanici")), ("Mono", st("Monospace", "highlight")),
               ("Italik", st("Italic", "vibe"))],
         title="TikTok için Şekilli Yazı — İsim & Bio Kopyala",
         kw=["tiktok şekilli yazı", "tiktok için yazı", "tiktok bio yazı",
             "şekilli yazı", "tiktok isim"]),
    dict(slug="gotik", kicker="ULTRATEXTGEN · GOTİK",
         headline="Gotik Yazı Kopyala",
         benefit="Nickler, biyolar ve gönderiler için karanlık, şık stil.",
         rows=[("Gotik", st("Fraktur", "karanlik")), ("Gotik", st("Fraktur", "Krallik")),
               ("Içi Boş", st("Double-struck", "gece"))],
         title="Gotik Yazı Kopyala Yapıştır — Gotik Font Ücretsiz",
         kw=["gotik yazı", "gotik harfler", "gotik font",
             "şekilli yazı", "dark"]),
    dict(slug="balon-yazi", kicker="ULTRATEXTGEN · BALON",
         headline="Balon Yazı Kopyala",
         benefit="Yuvarlak balon harfler nickler ve başlıklar için.",
         rows=[("Balon", st("Circled", "BALON")), ("Balon", st("Circled", "stil")),
               ("Kalın", st("Bold", "BASLIK"))],
         title="Balon Yazı Kopyala Yapıştır — Balon Font",
         kw=["balon yazı", "balon font", "balon harfler",
             "şekilli yazı", "kopyala yapıştır"]),
    dict(slug="discord", kicker="ULTRATEXTGEN · DISCORD",
         headline="Discord için Yazı ve Semboller",
         benefit="Discord adını, takma adını ve bio'nu tarzla yaz.",
         rows=[("Kalın", st("Bold", "sunucu")), ("Mono", st("Monospace", "online")),
               ("Içi Boş", st("Double-struck", "lonca"))],
         title="Discord için Yazı ve Semboller — Kopyala",
         kw=["discord yazı", "discord için font", "discord sembolleri",
             "şekilli yazı", "discord"]),
    dict(slug="zalgo", kicker="ULTRATEXTGEN · ZALGO", dest=ZALGO,
         headline="Zalgo Yazı (Glitch) Kopyala",
         benefit="Gönderiler ve nickler için ürkütücü bozuk yazı.",
         rows=[("Zalgo", "y̷a̷z̷i̷"), ("Glitch", "g̸l̸i̸t̸c̸h̸"),
               ("Ürkütücü", "u̶r̶k̶u̶t̶u̶c̶u̶")],
         title="Zalgo Yazı (Glitch) Kopyala Yapıştır — Ücretsiz",
         kw=["zalgo yazı", "zalgo oluşturucu", "glitch yazı", "bozuk yazı",
             "şekilli yazı"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Bir kez yaz, tüm Unicode "
         f"stillerini UltraTextGen'de kopyala: ücretsiz, tarayıcıda, uygulama "
         f"yok. Bio, isim, nick, durum ve yorumlar için ideal.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Türkçe dikey pin: {pin['headline']} — UltraTextGen'den kopyala "
            f"yapıştır şekilli yazı örnekleri.")


def main():
    build_board(LOCALE, PINS, BOARD, DEST, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
