#!/usr/bin/env python3
"""build_category_locale_pages.py — generate locale translations of category/* pages.

WHY THIS EXISTS
---------------
`library/` and `symbol/` pages are built from specs through a generator with a
validator behind it. `category/` had no equivalent: all 151 locale category
pages were hand-built one at a time, which is why the pillar's locale coverage
is uneven in a way no script could report on. This is the minimum version of
that missing pipeline — one template derived from the live house pattern
(`tr/alti-cizili-yazi/`, commit 36b6138fc), plus a per-locale content block.

It does NOT invent copy. Every translated string lives in SPECS below and was
authored deliberately; the script only assembles the house structure around it
so 6 locales cannot drift apart structurally the way hand-built pages do.

USAGE
  python3 scripts/build_category_locale_pages.py            # write all
  python3 scripts/build_category_locale_pages.py --only fr  # one locale
  python3 scripts/build_category_locale_pages.py --dry-run

AFTER RUNNING, in the same commit (see CLAUDE.md):
  1. add the PAGES entries + `python3 scripts/generate-site-art.py`
  2. `npm run sync:locale-mesh -- --fix --files <new pages>`
  3. commit, then `npm run check:translation-parity` (it diffs merge-base..HEAD,
     so uncommitted work is invisible to it)
"""

import argparse
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://ultratextgen.com"

# Combining marks — the transform these pages are about. Script-agnostic by
# construction (they attach to any grapheme), which is why the same three rows
# render correctly for every locale here.
UNDER, DOUBLE, WAVY = "̲", "̳", "̰"
UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
LOWER = "abcdefghijklmnopqrstuvwxyz"
DIGITS = "0123456789"


def deco(text, mark):
    return "".join(c + mark for c in text)


def alpha_pair(mark):
    """'A̲B̲…Z̲ a̲b̲…z̲' — the clipboard payload (space-joined, per house pattern)."""
    return deco(UPPER, mark) + " " + deco(LOWER, mark)


def alpha_label(mark):
    """'A̲B̲…Z̲ · a̲b̲…z̲' — the visible button label."""
    return deco(UPPER, mark) + " · " + deco(LOWER, mark)


FAQ_SVG = ('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" '
           'stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" '
           'stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')

HEAD_SCRIPTS = """<script async src="https://fundingchoicesmessages.google.com/i/pub-8242324164413945?ers=1"></script><script>(function() {function signalGooglefcPresent() {if (!window.frames['googlefcPresent']) {if (document.body) {const iframe = document.createElement('iframe'); iframe.style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;'; iframe.style.display = 'none'; iframe.name = 'googlefcPresent'; document.body.appendChild(iframe);} else {setTimeout(signalGooglefcPresent, 0);}}}signalGooglefcPresent();})();</script>
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-P55HXK8Q');</script>
  <!-- End Google Tag Manager -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8242324164413945"
       crossorigin="anonymous"></script>"""

# ---------------------------------------------------------------------------
# The EN parent every page in this run translates, and its existing siblings.
# ---------------------------------------------------------------------------
PARENT = "category/underline-text"
EXISTING_SIBLINGS = [("ru", "ru/podcherknutyy-tekst"), ("tr", "tr/alti-cizili-yazi")]

# ---------------------------------------------------------------------------
# Per-locale authored content. Nothing here is machine-translated.
# ---------------------------------------------------------------------------
SPECS = {
    "id": {
        "slug": "id/tulisan-garis-bawah", "lang": "id", "currency": "IDR",
        "home": "Beranda", "crumb": "Tulisan Garis Bawah",
        "title": "Tulisan Garis Bawah — Font Garis Bawah Copy Paste (t̲e̲k̲s̲)",
        "desc": "Bikin tulisan garis bawah online: ubah teksmu jadi t̲e̲k̲s̲, t̳e̳k̳s̳, dan t̰ḛk̰s̰. Copy paste ke bio Instagram, status WhatsApp, dan nick game — gratis, tanpa aplikasi.",
        "h1": "Tulisan garis bawah — copy paste",
        "tagline": "Ketik teksmu, langsung jadi tulisan garis bawah — garis tunggal, garis ganda, dan garis bergelombang. Tempel ke bio Instagram, status WhatsApp, judul, dan nick; garisnya ikut ke mana pun.",
        "og_desc": "Ubah teksmu jadi tulisan garis bawah: garis tunggal, ganda, dan bergelombang. Copy, tempel ke bio, status, atau nick.",
        "tw_desc": "Semua gaya tulisan garis bawah dalam satu halaman — ketik, copy, paste. Gratis.",
        "app_name": "Generator Tulisan Garis Bawah",
        "alt_names": ["Tulisan Garis Bawah", "Font Garis Bawah", "Teks Garis Bawah", "Huruf Garis Bawah", "Underline Text"],
        "app_desc": "Generator tulisan garis bawah: mengubah teksmu jadi gaya Unicode garis tunggal, ganda, dan bergelombang — copy paste untuk bio Instagram, status WhatsApp, dan nick game.",
        "demo": "coba tulisan garis bawah.\\nketik, copy, tempel.",
        "deco_label": "Tambahkan hiasan ke hasil",
        "deco_tabs": ["Simbol", "Bingkai", "Minimal"],
        "labels": ["Garis Tunggal", "Garis Ganda", "Garis Bergelombang", "Angka Garis Tunggal", "Angka Garis Ganda"],
        "copy_aria": ["Salin alfabet garis tunggal", "Salin alfabet garis ganda", "Salin alfabet garis bergelombang", "Salin angka garis tunggal", "Salin angka garis ganda"],
        "s1_h2": "Tulisan garis bawah Unicode: garis yang ikut ke mana-mana",
        "s1_intro": "<strong>Tulisan garis bawah</strong> di sini bukan format seperti di Word — tiap huruf ditempeli karakter gabungan Unicode yang bentuknya memang garis. Jadi waktu kamu copy, garisnya ikut terbawa: di bio Instagram yang tidak punya tombol garis bawah, di status WhatsApp, di deskripsi TikTok, bahkan di nick game.",
        "s1_example": "<strong>Contoh:</strong> «teks» → t̲e̲k̲s̲ (garis tunggal), t̳e̳k̳s̳ (garis ganda), t̰ḛk̰s̰ (garis bergelombang)",
        "s1_after": "Di Discord, dua garis bawah (__teks__) menghasilkan garis bawah asli — itu pintasan khusus aplikasi. WhatsApp sama sekali tidak punya pintasan untuk garis bawah; versi Unicode ini tetap bergaris di mana pun kamu tempel karena garisnya bagian dari karakternya.",
        "s2_h2": "Alfabet garis bawah (A–Z) — salin sekaligus",
        "s2_intro": "Alfabet lengkap dan angka dalam tiga gaya garis bawah. Ketuk satu baris, seluruh gaya itu tersalin ke papan klip.",
        "s2_after": "Pilih yang mana? <strong>Garis tunggal</strong> paling klasik dan paling terbaca — standar untuk penekanan. <strong>Garis ganda</strong> lebih tebal dan lebih menarik perhatian. <strong>Garis bergelombang</strong> mengingatkan pada garis merah salah ketik — cocok untuk penekanan yang jenaka. Ragu? Ketik katamu di atas dan lihat ketiganya bersebelahan.",
        "s3_h2": "Di mana tulisan garis bawah berguna?",
        "s3_intro": "Tugas tulisan garis bawah adalah menekankan — cara paling bersih memisahkan satu kata dari yang lain supaya terlihat.",
        "s3_example": "— <strong>Judul / kata penting</strong>: buat satu kata jadi p̲e̲n̲t̲i̲n̲g̲ di bio atau deskripsimu<br>— <strong>Harga / promo</strong>: tekankan frasa seperti «khusus hari ini»<br>— <strong>Nick dan bio</strong>: garis bawahi sebagian nama panggilanmu<br>— <strong>Menarik perhatian</strong>: tekankan satu kata di komentar atau pesan",
        "faqs": [
            ("Bagaimana cara membuat tulisan garis bawah?", "Ketik teksmu di kotak atas — versi garis tunggal (t̲e̲k̲s̲), garis ganda (t̳e̳k̳s̳), dan garis bergelombang (t̰ḛk̰s̰) langsung muncul. Ketuk tombol salin lalu tempel ke mana pun kamu mau. Karena garisnya adalah karakter Unicode yang menempel di bawah huruf, garisnya tetap ada bahkan di kolom yang tidak mendukung garis bawah."),
            ("Bagaimana membuat tulisan garis bawah di HP?", "WhatsApp punya pintasan untuk tebal (*teks*) dan coret (~teks~), tapi tidak untuk garis bawah — jadi Unicode adalah satu-satunya cara. Discord beda: mengapit teks dengan dua garis bawah (__teks__) menghasilkan garis bawah asli di dalam pesan. Di luar itu (Instagram, status WhatsApp, TikTok, nick), caranya adalah mengetik di sini dan menyalin versi bergaris bawahnya."),
            ("Apakah tulisan garis bawah bisa dipakai di Instagram?", "Bisa. Instagram tidak punya tombol garis bawah, tapi karakter Unicode bergaris bawah tampil normal di bio, nama tampilan, caption, dan komentar. Salin dari sini, tempel ke Instagram. Hanya kolom username (@) yang tidak menerimanya — di sana hanya huruf biasa, angka, titik, dan garis bawah yang berlaku."),
            ("Apa bedanya gaya-gaya garis bawah itu?", "Garis tunggal (t̲e̲k̲s̲) adalah garis bawah klasik — paling terbaca untuk penekanan dan kata penting. Garis ganda (t̳e̳k̳s̳) lebih tebal dan lebih mencolok. Garis bergelombang (t̰ḛk̰s̰) mengingatkan pada garis merah pemeriksa ejaan — berguna untuk penekanan jenaka atau kesan «cek dulu ini». Ketiganya disalin dan ditempel dengan cara yang sama."),
            ("Apakah garis bawahnya juga jalan di huruf non-Latin?", "Ya. Garisnya adalah karakter gabungan terpisah, bukan tabel huruf pengganti — jadi garis itu lewat di bawah huruf apa pun, termasuk aksara non-Latin. Di beberapa aplikasi lama garisnya mungkin tidak pas benar dengan hurufnya — cek dulu setelah menempel."),
        ],
        "related": [
            ("/id/tulisan-coret/", "Tulisan Coret", "Pasangan alami garis bawah — untuk kesan «dibatalkan»."),
            ("/id/tulisan-tebal/", "Tulisan Tebal", "Huruf tebal Unicode yang tetap tebal di mana pun ditempel."),
            ("/id/font-ig/", "Font Instagram", "Font yang paling bagus tampil di Instagram, plus ide bio."),
        ],
    },
    "pt": {
        "slug": "pt/texto-sublinhado", "lang": "pt", "currency": "BRL",
        "home": "Início", "crumb": "Texto Sublinhado",
        "title": "Texto Sublinhado — Fonte Sublinhada Copiar e Colar (t̲e̲x̲t̲o̲)",
        "desc": "Gerador de texto sublinhado: transforme seu texto em t̲e̲x̲t̲o̲, t̳e̳x̳t̳o̳ e t̰ḛx̰t̰o̰. Copie e cole na bio do Instagram, no status do WhatsApp e no nick — grátis, sem app.",
        "h1": "Texto sublinhado — copiar e colar",
        "tagline": "Digite seu texto e ele vira texto sublinhado na hora — linha simples, linha dupla e linha ondulada. Cole na bio do Instagram, no status do WhatsApp, no título e no nick; o sublinhado vai junto.",
        "og_desc": "Transforme seu texto em sublinhado: linha simples, dupla e ondulada. Copie e cole na bio, no status ou no nick.",
        "tw_desc": "Todos os estilos de texto sublinhado numa página — digite, copie, cole. Grátis.",
        "app_name": "Gerador de Texto Sublinhado",
        "alt_names": ["Texto Sublinhado", "Fonte Sublinhada", "Letras Sublinhadas", "Sublinhado Copiar e Colar", "Underline"],
        "app_desc": "Gerador de texto sublinhado: converte seu texto em estilos Unicode de linha simples, dupla e ondulada — copiar e colar para bio do Instagram, status do WhatsApp e nick de jogo.",
        "demo": "teste o texto sublinhado.\\ndigite, copie, cole.",
        "deco_label": "Adicione enfeites ao resultado",
        "deco_tabs": ["Símbolos", "Molduras", "Minimalista"],
        "labels": ["Linha Simples", "Linha Dupla", "Linha Ondulada", "Números Linha Simples", "Números Linha Dupla"],
        "copy_aria": ["Copiar alfabeto de linha simples", "Copiar alfabeto de linha dupla", "Copiar alfabeto de linha ondulada", "Copiar números de linha simples", "Copiar números de linha dupla"],
        "s1_h2": "Texto sublinhado em Unicode: o traço que cola em qualquer lugar",
        "s1_intro": "O <strong>texto sublinhado</strong> daqui não é formatação como no Word — cada letra recebe um caractere combinante do Unicode cujo desenho já é um traço. Por isso, quando você copia, o traço vai junto: na bio do Instagram que não tem botão de sublinhado, no status do WhatsApp, na descrição do TikTok e até no nick do jogo.",
        "s1_example": "<strong>Exemplo:</strong> «texto» → t̲e̲x̲t̲o̲ (linha simples), t̳e̳x̳t̳o̳ (linha dupla), t̰ḛx̰t̰o̰ (linha ondulada)",
        "s1_after": "No Discord, dois underscores (__texto__) geram um sublinhado nativo de verdade — é um atalho próprio do app. Já o WhatsApp não tem atalho nenhum para sublinhado; o sublinhado Unicode continua sublinhado onde quer que você cole, porque o traço faz parte do caractere.",
        "s2_h2": "Alfabeto sublinhado (A–Z) — copie inteiro",
        "s2_intro": "O alfabeto completo e os números em três estilos de sublinhado. Toque numa linha e o estilo inteiro vai para a área de transferência.",
        "s2_after": "Qual escolher? <strong>Linha simples</strong> é o sublinhado clássico — o mais legível para dar ênfase. <strong>Linha dupla</strong> é mais pesada e chama mais atenção. <strong>Linha ondulada</strong> lembra o traço vermelho do corretor ortográfico — funciona para uma ênfase irônica. Na dúvida, digite sua palavra acima e veja os três lado a lado.",
        "s3_h2": "Onde o texto sublinhado é útil?",
        "s3_intro": "O trabalho do sublinhado é enfatizar — a forma mais limpa de separar uma palavra das outras e fazer ela ser vista.",
        "s3_example": "— <strong>Título / palavra-chave</strong>: deixe uma palavra i̲m̲p̲o̲r̲t̲a̲n̲t̲e̲ na bio ou na descrição<br>— <strong>Preço / promoção</strong>: destaque expressões como «só hoje»<br>— <strong>Nick e bio</strong>: sublinhe uma parte do seu apelido<br>— <strong>Chamar atenção</strong>: destaque uma palavra num comentário ou mensagem",
        "faqs": [
            ("Como fazer texto sublinhado?", "Digite seu texto na caixa acima — as versões de linha simples (t̲e̲x̲t̲o̲), linha dupla (t̳e̳x̳t̳o̳) e linha ondulada (t̰ḛx̰t̰o̰) aparecem na hora. Toque no botão copiar e cole onde quiser. Como o traço é um caractere Unicode preso embaixo da letra, ele se mantém até em campos que não suportam sublinhado."),
            ("Como sublinhar texto no celular?", "O WhatsApp tem atalho para negrito (*texto*) e riscado (~texto~), mas não para sublinhado — então o Unicode é a única saída. O Discord é diferente: colocar o texto entre dois underscores (__texto__) gera um sublinhado nativo dentro da mensagem. Fora isso (Instagram, status do WhatsApp, TikTok, nick), o caminho é digitar aqui e copiar a versão sublinhada."),
            ("Dá para usar texto sublinhado no Instagram?", "Dá. O Instagram não tem botão de sublinhado, mas os caracteres Unicode sublinhados aparecem normalmente na bio, no nome de exibição, na legenda e nos comentários. Copie daqui e cole no Instagram. Só o campo de nome de usuário (@) não aceita — lá valem apenas letras comuns, números, ponto e underscore."),
            ("Qual a diferença entre os estilos de sublinhado?", "Linha simples (t̲e̲x̲t̲o̲) é o sublinhado clássico — o mais legível para ênfase e palavras importantes. Linha dupla (t̳e̳x̳t̳o̳) é mais pesada e mais chamativa. Linha ondulada (t̰ḛx̰t̰o̰) lembra o traço vermelho de erro de digitação dos editores de texto — serve para uma ênfase irônica ou um ar de «confere isso aqui». Os três se copiam e colam do mesmo jeito."),
            ("Funciona com acentos (ã, ç, é) e com outros alfabetos?", "Sim. O traço é um caractere combinante separado, não uma tabela de letras substitutas — então ele passa por baixo de qualquer letra, inclusive as acentuadas do português e alfabetos não latinos. Em alguns apps antigos o traço pode não alinhar perfeitamente com a letra — confira depois de colar."),
        ],
        "related": [
            ("/pt/letra-tachada/", "Letra Tachada", "O par natural do sublinhado — para a ideia de «cancelado»."),
            ("/pt/letras-negrito/", "Letras em Negrito", "Negrito Unicode que continua negrito onde você colar."),
            ("/pt/fontes-para-instagram/", "Fontes para Instagram", "As fontes que ficam melhores no Instagram, com ideias de bio."),
        ],
    },
    "de": {
        "slug": "de/unterstrichener-text", "lang": "de", "currency": "EUR",
        "home": "Startseite", "crumb": "Unterstrichener Text",
        "title": "Unterstrichener Text — Unterstrichene Schrift Kopieren (T̲e̲x̲t̲)",
        "desc": "Unterstrichener Text Generator: verwandle deinen Text in T̲e̲x̲t̲, T̳e̳x̳t̳ und T̰ḛx̰t̰. Zum Kopieren für Instagram-Bio, WhatsApp-Status und Nicknamen — kostenlos, ohne App.",
        "h1": "Unterstrichener Text — kopieren und einfügen",
        "tagline": "Tippe deinen Text, und er wird sofort unterstrichen — einfache Linie, doppelte Linie und Wellenlinie. Füge ihn in die Instagram-Bio, den WhatsApp-Status, Überschriften und Nicknamen ein; die Linie bleibt überall erhalten.",
        "og_desc": "Verwandle deinen Text in unterstrichene Schrift: einfach, doppelt und gewellt. Kopieren und in Bio, Status oder Nickname einfügen.",
        "tw_desc": "Alle unterstrichenen Schriftstile auf einer Seite — tippen, kopieren, einfügen. Kostenlos.",
        "app_name": "Generator für unterstrichenen Text",
        "alt_names": ["Unterstrichener Text", "Unterstrichene Schrift", "Text Unterstreichen", "Unterstrichene Buchstaben", "Underline Text"],
        "app_desc": "Generator für unterstrichenen Text: wandelt deinen Text in Unicode-Stile mit einfacher, doppelter und gewellter Linie um — zum Kopieren für Instagram-Bio, WhatsApp-Status und Gaming-Nicknamen.",
        "demo": "unterstrichenen text testen.\\ntippen, kopieren, einfügen.",
        "deco_label": "Verzierung zum Ergebnis hinzufügen",
        "deco_tabs": ["Symbole", "Rahmen", "Minimal"],
        "labels": ["Einfache Linie", "Doppelte Linie", "Wellenlinie", "Ziffern einfach", "Ziffern doppelt"],
        "copy_aria": ["Alphabet mit einfacher Linie kopieren", "Alphabet mit doppelter Linie kopieren", "Alphabet mit Wellenlinie kopieren", "Ziffern mit einfacher Linie kopieren", "Ziffern mit doppelter Linie kopieren"],
        "s1_h2": "Unterstrichener Unicode-Text: die Linie, die überall mitkommt",
        "s1_intro": "Der <strong>unterstrichene Text</strong> hier ist keine Formatierung wie in Word — an jeden Buchstaben wird ein kombinierendes Unicode-Zeichen gehängt, dessen Form bereits eine Linie ist. Deshalb wandert die Linie beim Kopieren mit: in die Instagram-Bio ohne Unterstreichen-Button, in den WhatsApp-Status, in die TikTok-Beschreibung und sogar in den Spiel-Nickname.",
        "s1_example": "<strong>Beispiel:</strong> «Text» → T̲e̲x̲t̲ (einfache Linie), T̳e̳x̳t̳ (doppelte Linie), T̰ḛx̰t̰ (Wellenlinie)",
        "s1_after": "In Discord erzeugen zwei Unterstriche (__Text__) eine echte, native Unterstreichung — das ist eine App-eigene Abkürzung. WhatsApp hat für Unterstreichen gar keine; die Unicode-Variante bleibt dagegen überall unterstrichen, weil die Linie Teil des Zeichens selbst ist.",
        "s2_h2": "Unterstrichenes Alphabet (A–Z) — komplett kopieren",
        "s2_intro": "Das vollständige Alphabet und die Ziffern in drei Unterstreichungsstilen. Tippe auf eine Zeile, und der ganze Stil landet in der Zwischenablage.",
        "s2_after": "Welchen nehmen? <strong>Einfache Linie</strong> ist die klassische Unterstreichung — am besten lesbar für Betonung. <strong>Doppelte Linie</strong> wirkt kräftiger und fällt stärker auf. <strong>Wellenlinie</strong> erinnert an die rote Rechtschreibprüfung — gut für ironische Betonung. Unsicher? Tippe dein Wort oben ein und sieh alle drei nebeneinander.",
        "s3_h2": "Wo ist unterstrichener Text nützlich?",
        "s3_intro": "Die Aufgabe der Unterstreichung ist Betonung — der sauberste Weg, ein Wort von den anderen abzuheben.",
        "s3_example": "— <strong>Überschrift / Schlüsselwort</strong>: mach ein einzelnes Wort in deiner Bio w̲i̲c̲h̲t̲i̲g̲<br>— <strong>Preis / Aktion</strong>: betone Formulierungen wie «nur heute»<br>— <strong>Nickname und Bio</strong>: unterstreiche einen Teil deines Spitznamens<br>— <strong>Aufmerksamkeit</strong>: hebe ein Wort in einem Kommentar oder einer Nachricht hervor",
        "faqs": [
            ("Wie schreibt man unterstrichenen Text?", "Tippe deinen Text in das Feld oben — die Versionen mit einfacher Linie (T̲e̲x̲t̲), doppelter Linie (T̳e̳x̳t̳) und Wellenlinie (T̰ḛx̰t̰) erscheinen sofort. Tippe auf Kopieren und füge sie ein, wo du willst. Da die Linie ein Unicode-Zeichen unter dem Buchstaben ist, bleibt sie selbst in Feldern erhalten, die kein Unterstreichen unterstützen."),
            ("Wie unterstreicht man Text auf dem Handy?", "WhatsApp hat Abkürzungen für fett (*Text*) und durchgestrichen (~Text~), aber keine fürs Unterstreichen — deshalb ist Unicode der einzige Weg. Discord ist anders: Text zwischen zwei Unterstriche zu setzen (__Text__) erzeugt eine echte native Unterstreichung in der Nachricht. Überall sonst (Instagram, WhatsApp-Status, TikTok, Nickname) tippst du hier und kopierst die unterstrichene Version."),
            ("Kann man unterstrichenen Text auf Instagram verwenden?", "Ja. Instagram hat keinen Unterstreichen-Button, aber unterstrichene Unicode-Zeichen werden in der Bio, im Anzeigenamen, in der Bildunterschrift und in Kommentaren problemlos angezeigt. Hier kopieren, bei Instagram einfügen. Nur das Feld für den Benutzernamen (@) nimmt sie nicht an — dort gelten nur einfache Buchstaben, Ziffern, Punkt und Unterstrich."),
            ("Was ist der Unterschied zwischen den Unterstreichungsstilen?", "Die einfache Linie (T̲e̲x̲t̲) ist die klassische Unterstreichung — am besten lesbar für Betonung und wichtige Wörter. Die doppelte Linie (T̳e̳x̳t̳) ist kräftiger und auffälliger. Die Wellenlinie (T̰ḛx̰t̰) erinnert an die rote Fehlermarkierung in Textprogrammen — gut für ironische Betonung oder ein «schau dir das mal an». Alle drei werden gleich kopiert und eingefügt."),
            ("Funktioniert das auch mit Umlauten (ä, ö, ü, ß) und anderen Schriften?", "Ja. Die Linie beruht auf einem eigenen kombinierenden Zeichen und nicht auf einer Ersatzbuchstaben-Tabelle — sie läuft also unter jedem Buchstaben durch, einschließlich ä, ö, ü, ß und nicht-lateinischer Schriften. Anders als bei fettem Unicode musst du deutsche Sonderzeichen nicht vereinfachen. In manchen älteren Apps sitzt die Linie eventuell nicht exakt am Buchstaben — prüfe es nach dem Einfügen."),
        ],
        "related": [
            ("/de/durchgestrichener-text/", "Durchgestrichener Text", "Die natürliche Ergänzung — für das Gefühl von «gestrichen»."),
            ("/de/fette-schrift/", "Fette Schrift", "Unicode-Fettschrift, die überall fett bleibt."),
            ("/de/schriftarten-fuer-instagram/", "Schriftarten für Instagram", "Die Schriften, die auf Instagram am besten wirken, plus Bio-Ideen."),
        ],
    },
    "fr": {
        "slug": "fr/texte-souligne", "lang": "fr", "currency": "EUR",
        "home": "Accueil", "crumb": "Texte Souligné",
        "title": "Texte Souligné — Écriture Soulignée à Copier-Coller (t̲e̲x̲t̲e̲)",
        "desc": "Générateur de texte souligné : transforme ton texte en t̲e̲x̲t̲e̲, t̳e̳x̳t̳e̳ et t̰ḛx̰t̰ḛ. À copier-coller dans ta bio Instagram, ton statut WhatsApp et ton pseudo — gratuit, sans appli.",
        "h1": "Texte souligné — à copier-coller",
        "tagline": "Tape ton texte, il devient souligné instantanément — trait simple, trait double et trait ondulé. Colle-le dans ta bio Instagram, ton statut WhatsApp, un titre ou un pseudo ; le trait suit partout.",
        "og_desc": "Transforme ton texte en souligné : trait simple, double et ondulé. Copie, colle dans ta bio, ton statut ou ton pseudo.",
        "tw_desc": "Tous les styles de texte souligné sur une page — tape, copie, colle. Gratuit.",
        "app_name": "Générateur de Texte Souligné",
        "alt_names": ["Texte Souligné", "Écriture Soulignée", "Souligner du Texte", "Lettres Soulignées", "Underline"],
        "app_desc": "Générateur de texte souligné : convertit ton texte en styles Unicode à trait simple, double et ondulé — à copier-coller pour ta bio Instagram, ton statut WhatsApp et ton pseudo de jeu.",
        "demo": "essaie le texte souligné.\\ntape, copie, colle.",
        "deco_label": "Ajouter une décoration au résultat",
        "deco_tabs": ["Symboles", "Cadres", "Minimaliste"],
        "labels": ["Trait Simple", "Trait Double", "Trait Ondulé", "Chiffres Trait Simple", "Chiffres Trait Double"],
        "copy_aria": ["Copier l'alphabet à trait simple", "Copier l'alphabet à trait double", "Copier l'alphabet à trait ondulé", "Copier les chiffres à trait simple", "Copier les chiffres à trait double"],
        "s1_h2": "Texte souligné en Unicode : le trait qui te suit partout",
        "s1_intro": "Le <strong>texte souligné</strong> ici n'est pas une mise en forme comme dans Word — chaque lettre reçoit un caractère combinant Unicode dont le dessin est déjà un trait. C'est pour ça que le trait voyage avec le texte quand tu copies : dans une bio Instagram qui n'a aucun bouton souligner, dans un statut WhatsApp, dans une description TikTok et même dans un pseudo de jeu.",
        "s1_example": "<strong>Exemple :</strong> «texte» → t̲e̲x̲t̲e̲ (trait simple), t̳e̳x̳t̳e̳ (trait double), t̰ḛx̰t̰ḛ (trait ondulé)",
        "s1_after": "Sur Discord, deux tirets bas (__texte__) produisent un vrai soulignement natif — c'est un raccourci propre à l'appli. WhatsApp, lui, n'a aucun raccourci pour souligner ; le souligné Unicode reste souligné partout où tu le colles, parce que le trait fait partie du caractère.",
        "s2_h2": "Alphabet souligné (A–Z) — à copier en entier",
        "s2_intro": "L'alphabet complet et les chiffres dans trois styles de soulignement. Touche une ligne et tout le style part dans le presse-papiers.",
        "s2_after": "Lequel choisir ? Le <strong>trait simple</strong> est le soulignement classique — le plus lisible pour mettre en valeur. Le <strong>trait double</strong> est plus épais et attire davantage l'œil. Le <strong>trait ondulé</strong> rappelle le trait rouge du correcteur orthographique — pratique pour une emphase ironique. Hésitant ? Tape ton mot en haut et vois les trois côte à côte.",
        "s3_h2": "À quoi sert le texte souligné ?",
        "s3_intro": "Le rôle du souligné, c'est de mettre en valeur — la façon la plus propre de détacher un mot des autres pour qu'il se voie.",
        "s3_example": "— <strong>Titre / mot-clé</strong> : rends un mot i̲m̲p̲o̲r̲t̲a̲n̲t̲ dans ta bio ou ta description<br>— <strong>Prix / promo</strong> : souligne des formules comme «aujourd'hui seulement»<br>— <strong>Pseudo et bio</strong> : souligne une partie de ton pseudo<br>— <strong>Attirer l'œil</strong> : mets un mot en valeur dans un commentaire ou un message",
        "faqs": [
            ("Comment écrire en texte souligné ?", "Tape ton texte dans le champ ci-dessus — les versions à trait simple (t̲e̲x̲t̲e̲), trait double (t̳e̳x̳t̳e̳) et trait ondulé (t̰ḛx̰t̰ḛ) s'affichent immédiatement. Touche le bouton copier et colle où tu veux. Comme le trait est un caractère Unicode accroché sous la lettre, il tient même dans les champs qui ne gèrent pas le soulignement."),
            ("Comment souligner du texte sur téléphone ?", "WhatsApp a des raccourcis pour le gras (*texte*) et le barré (~texte~), mais aucun pour le souligné — l'Unicode est donc la seule solution. Discord, c'est différent : encadrer le texte de deux tirets bas (__texte__) produit un vrai soulignement natif dans le message. Partout ailleurs (Instagram, statut WhatsApp, TikTok, pseudo), la méthode est de taper ici et de copier la version soulignée."),
            ("Peut-on utiliser du texte souligné sur Instagram ?", "Oui. Instagram n'a pas de bouton souligner, mais les caractères Unicode soulignés s'affichent sans problème dans la bio, le nom affiché, la légende et les commentaires. Copie ici, colle sur Instagram. Seul le champ du nom d'utilisateur (@) les refuse — là, seules les lettres simples, les chiffres, le point et le tiret bas sont acceptés."),
            ("Quelle différence entre les styles de soulignement ?", "Le trait simple (t̲e̲x̲t̲e̲) est le soulignement classique — le plus lisible pour l'emphase et les mots importants. Le trait double (t̳e̳x̳t̳e̳) est plus épais et plus voyant. Le trait ondulé (t̰ḛx̰t̰ḛ) évoque le trait rouge des correcteurs orthographiques — utile pour une emphase ironique ou un air de «vérifie ça». Les trois se copient et se collent de la même façon."),
            ("Ça marche avec les accents (é, è, ç, à) et les autres alphabets ?", "Oui. Le trait repose sur un caractère combinant distinct et non sur une table de lettres de remplacement — il passe donc sous n'importe quelle lettre, y compris les accents français et les alphabets non latins. Contrairement au gras Unicode, tu n'as pas à retirer tes accents. Sur certaines applis anciennes le trait peut être légèrement décalé — vérifie après avoir collé."),
        ],
        "related": [
            ("/fr/texte-barre/", "Texte Barré", "Le complément naturel du souligné — pour l'effet «annulé»."),
            ("/fr/texte-en-gras/", "Texte en Gras", "Le gras Unicode qui reste gras partout où tu le colles."),
            ("/fr/police-instagram/", "Police Instagram", "Les polices qui rendent le mieux sur Instagram, avec des idées de bio."),
        ],
    },
    "it": {
        "slug": "it/testo-sottolineato", "lang": "it", "currency": "EUR",
        "home": "Home", "crumb": "Testo Sottolineato",
        "title": "Testo Sottolineato — Scritte Sottolineate da Copiare (t̲e̲s̲t̲o̲)",
        "desc": "Generatore di testo sottolineato: trasforma il tuo testo in t̲e̲s̲t̲o̲, t̳e̳s̳t̳o̳ e t̰ḛs̰t̰o̰. Da copiare e incollare nella bio di Instagram, nello stato WhatsApp e nel nickname — gratis, senza app.",
        "h1": "Testo sottolineato — copia e incolla",
        "tagline": "Scrivi il tuo testo e diventa subito sottolineato — linea singola, linea doppia e linea ondulata. Incollalo nella bio di Instagram, nello stato WhatsApp, in un titolo o in un nickname; la linea resta ovunque.",
        "og_desc": "Trasforma il tuo testo in sottolineato: linea singola, doppia e ondulata. Copia e incolla nella bio, nello stato o nel nickname.",
        "tw_desc": "Tutti gli stili di testo sottolineato in una pagina — scrivi, copia, incolla. Gratis.",
        "app_name": "Generatore di Testo Sottolineato",
        "alt_names": ["Testo Sottolineato", "Scritte Sottolineate", "Sottolineare Testo", "Lettere Sottolineate", "Underline"],
        "app_desc": "Generatore di testo sottolineato: converte il tuo testo in stili Unicode con linea singola, doppia e ondulata — da copiare e incollare per la bio di Instagram, lo stato WhatsApp e il nickname di gioco.",
        "demo": "prova il testo sottolineato.\\nscrivi, copia, incolla.",
        "deco_label": "Aggiungi una decorazione al risultato",
        "deco_tabs": ["Simboli", "Cornici", "Minimal"],
        "labels": ["Linea Singola", "Linea Doppia", "Linea Ondulata", "Numeri Linea Singola", "Numeri Linea Doppia"],
        "copy_aria": ["Copia l'alfabeto a linea singola", "Copia l'alfabeto a linea doppia", "Copia l'alfabeto a linea ondulata", "Copia i numeri a linea singola", "Copia i numeri a linea doppia"],
        "s1_h2": "Testo sottolineato in Unicode: la linea che ti segue ovunque",
        "s1_intro": "Il <strong>testo sottolineato</strong> di questa pagina non è una formattazione come in Word — a ogni lettera viene agganciato un carattere combinante Unicode il cui disegno è già una linea. Per questo la linea viaggia insieme al testo quando copi: nella bio di Instagram che non ha alcun pulsante sottolinea, nello stato WhatsApp, nella descrizione TikTok e perfino nel nickname di gioco.",
        "s1_example": "<strong>Esempio:</strong> «testo» → t̲e̲s̲t̲o̲ (linea singola), t̳e̳s̳t̳o̳ (linea doppia), t̰ḛs̰t̰o̰ (linea ondulata)",
        "s1_after": "Su Discord due underscore (__testo__) producono una sottolineatura nativa vera — è una scorciatoia propria dell'app. WhatsApp invece non ha nessuna scorciatoia per sottolineare; il sottolineato Unicode resta sottolineato ovunque lo incolli, perché la linea fa parte del carattere.",
        "s2_h2": "Alfabeto sottolineato (A–Z) — copia tutto",
        "s2_intro": "L'alfabeto completo e i numeri in tre stili di sottolineatura. Tocca una riga e l'intero stile finisce negli appunti.",
        "s2_after": "Quale scegliere? La <strong>linea singola</strong> è la sottolineatura classica — la più leggibile per dare enfasi. La <strong>linea doppia</strong> è più pesante e si nota di più. La <strong>linea ondulata</strong> ricorda il tratto rosso del correttore ortografico — utile per un'enfasi ironica. Indeciso? Scrivi la tua parola qui sopra e guardale una accanto all'altra.",
        "s3_h2": "Dove serve il testo sottolineato?",
        "s3_intro": "Il compito del sottolineato è enfatizzare — il modo più pulito per staccare una parola dalle altre e farla notare.",
        "s3_example": "— <strong>Titolo / parola chiave</strong>: rendi una parola i̲m̲p̲o̲r̲t̲a̲n̲t̲e̲ nella bio o nella descrizione<br>— <strong>Prezzo / promo</strong>: sottolinea formule come «solo oggi»<br>— <strong>Nickname e bio</strong>: sottolinea una parte del tuo nome<br>— <strong>Attirare l'attenzione</strong>: evidenzia una parola in un commento o in un messaggio",
        "faqs": [
            ("Come si scrive il testo sottolineato?", "Scrivi il tuo testo nel riquadro qui sopra — le versioni a linea singola (t̲e̲s̲t̲o̲), linea doppia (t̳e̳s̳t̳o̳) e linea ondulata (t̰ḛs̰t̰o̰) compaiono subito. Tocca il pulsante copia e incolla dove vuoi. Dato che la linea è un carattere Unicode agganciato sotto la lettera, resta anche nei campi che non supportano la sottolineatura."),
            ("Come si sottolinea il testo dal telefono?", "WhatsApp ha le scorciatoie per il grassetto (*testo*) e il barrato (~testo~), ma non per il sottolineato — quindi l'Unicode è l'unica strada. Discord è diverso: racchiudere il testo tra due underscore (__testo__) genera una sottolineatura nativa vera dentro al messaggio. Per tutto il resto (Instagram, stato WhatsApp, TikTok, nickname) si scrive qui e si copia la versione sottolineata."),
            ("Si può usare il testo sottolineato su Instagram?", "Sì. Instagram non ha il pulsante sottolinea, ma i caratteri Unicode sottolineati si vedono senza problemi nella bio, nel nome visualizzato, nella didascalia e nei commenti. Copia da qui e incolla su Instagram. Solo il campo del nome utente (@) non li accetta — lì valgono soltanto lettere semplici, numeri, punto e underscore."),
            ("Che differenza c'è tra gli stili di sottolineatura?", "La linea singola (t̲e̲s̲t̲o̲) è la sottolineatura classica — la più leggibile per enfasi e parole importanti. La linea doppia (t̳e̳s̳t̳o̳) è più pesante e più vistosa. La linea ondulata (t̰ḛs̰t̰o̰) ricorda il tratto rosso dell'errore di battitura nei programmi di scrittura — utile per un'enfasi ironica o per un «controlla questo». Tutte e tre si copiano e incollano allo stesso modo."),
            ("Funziona con le lettere accentate (à, è, ì, ò, ù) e con altri alfabeti?", "Sì. La linea si basa su un carattere combinante separato e non su una tabella di lettere sostitutive — quindi passa sotto qualsiasi lettera, comprese le accentate italiane e gli alfabeti non latini. A differenza del grassetto Unicode non devi togliere gli accenti. In alcune app datate la linea può risultare leggermente disallineata — controlla dopo aver incollato."),
        ],
        "related": [
            ("/it/testo-barrato/", "Testo Barrato", "Il complemento naturale del sottolineato — per l'effetto «annullato»."),
            ("/it/grassetto/", "Grassetto", "Il grassetto Unicode che resta grassetto ovunque lo incolli."),
            ("/it/font-instagram/", "Font Instagram", "I font che rendono meglio su Instagram, con idee per la bio."),
        ],
    },
    "es": {
        "slug": "es/texto-subrayado", "lang": "es", "currency": "EUR",
        "home": "Inicio", "crumb": "Texto Subrayado",
        "title": "Texto Subrayado — Letras Subrayadas para Copiar (t̲e̲x̲t̲o̲)",
        "desc": "Generador de texto subrayado: convierte tu texto en t̲e̲x̲t̲o̲, t̳e̳x̳t̳o̳ y t̰ḛx̰t̰o̰. Copia y pega en la bio de Instagram, el estado de WhatsApp y tu nick — gratis, sin app.",
        "h1": "Texto subrayado — copiar y pegar",
        "tagline": "Escribe tu texto y se subraya al instante — línea simple, línea doble y línea ondulada. Pégalo en la bio de Instagram, el estado de WhatsApp, un título o un nick; la línea se mantiene en todas partes.",
        "og_desc": "Convierte tu texto en subrayado: línea simple, doble y ondulada. Copia y pega en la bio, el estado o el nick.",
        "tw_desc": "Todos los estilos de texto subrayado en una página — escribe, copia, pega. Gratis.",
        "app_name": "Generador de Texto Subrayado",
        "alt_names": ["Texto Subrayado", "Letras Subrayadas", "Subrayar Texto", "Fuente Subrayada", "Underline"],
        "app_desc": "Generador de texto subrayado: convierte tu texto en estilos Unicode de línea simple, doble y ondulada — para copiar y pegar en la bio de Instagram, el estado de WhatsApp y el nick de juego.",
        "demo": "prueba el texto subrayado.\\nescribe, copia, pega.",
        "deco_label": "Añade decoración al resultado",
        "deco_tabs": ["Símbolos", "Marcos", "Minimal"],
        "labels": ["Línea Simple", "Línea Doble", "Línea Ondulada", "Números Línea Simple", "Números Línea Doble"],
        "copy_aria": ["Copiar el alfabeto de línea simple", "Copiar el alfabeto de línea doble", "Copiar el alfabeto de línea ondulada", "Copiar los números de línea simple", "Copiar los números de línea doble"],
        "s1_h2": "Texto subrayado en Unicode: la línea que viaja contigo",
        "s1_intro": "El <strong>texto subrayado</strong> de aquí no es un formato como el de Word — a cada letra se le engancha un carácter combinante de Unicode cuyo dibujo ya es una línea. Por eso la línea viaja con el texto cuando copias: en una bio de Instagram que no tiene botón de subrayar, en el estado de WhatsApp, en la descripción de TikTok e incluso en el nick del juego.",
        "s1_example": "<strong>Ejemplo:</strong> «texto» → t̲e̲x̲t̲o̲ (línea simple), t̳e̳x̳t̳o̳ (línea doble), t̰ḛx̰t̰o̰ (línea ondulada)",
        "s1_after": "En Discord, dos guiones bajos (__texto__) generan un subrayado nativo de verdad — es un atajo propio de la app. WhatsApp, en cambio, no tiene ningún atajo para subrayar; el subrayado Unicode sigue subrayado allá donde lo pegues, porque la línea forma parte del carácter.",
        "s2_h2": "Alfabeto subrayado (A–Z) — cópialo entero",
        "s2_intro": "El alfabeto completo y los números en tres estilos de subrayado. Toca una fila y todo el estilo pasa al portapapeles.",
        "s2_after": "¿Cuál elegir? La <strong>línea simple</strong> es el subrayado clásico — el más legible para dar énfasis. La <strong>línea doble</strong> es más gruesa y llama más la atención. La <strong>línea ondulada</strong> recuerda al trazo rojo del corrector ortográfico — sirve para un énfasis irónico. ¿Dudas? Escribe tu palabra arriba y míralas una al lado de otra.",
        "s3_h2": "¿Para qué sirve el texto subrayado?",
        "s3_intro": "El trabajo del subrayado es enfatizar — la forma más limpia de separar una palabra del resto para que se vea.",
        "s3_example": "— <strong>Título / palabra clave</strong>: haz que una palabra sea i̲m̲p̲o̲r̲t̲a̲n̲t̲e̲ en tu bio o tu descripción<br>— <strong>Precio / promoción</strong>: destaca expresiones como «solo hoy»<br>— <strong>Nick y bio</strong>: subraya una parte de tu apodo<br>— <strong>Llamar la atención</strong>: resalta una palabra en un comentario o un mensaje",
        "faqs": [
            ("¿Cómo se escribe texto subrayado?", "Escribe tu texto en el cuadro de arriba — las versiones de línea simple (t̲e̲x̲t̲o̲), línea doble (t̳e̳x̳t̳o̳) y línea ondulada (t̰ḛx̰t̰o̰) aparecen al instante. Toca el botón de copiar y pégalo donde quieras. Como la línea es un carácter Unicode enganchado bajo la letra, se mantiene incluso en campos que no admiten subrayado."),
            ("¿Cómo subrayar texto en el móvil?", "WhatsApp tiene atajos para negrita (*texto*) y tachado (~texto~), pero ninguno para subrayar — así que Unicode es la única vía. Discord es distinto: encerrar el texto entre dos guiones bajos (__texto__) genera un subrayado nativo real dentro del mensaje. Para todo lo demás (Instagram, estado de WhatsApp, TikTok, nick), el camino es escribir aquí y copiar la versión subrayada."),
            ("¿Se puede usar texto subrayado en Instagram?", "Sí. Instagram no tiene botón de subrayar, pero los caracteres Unicode subrayados se ven sin problemas en la bio, el nombre visible, el pie de foto y los comentarios. Copia desde aquí y pega en Instagram. Solo el campo del nombre de usuario (@) no los acepta — allí solo valen letras simples, números, punto y guion bajo."),
            ("¿Qué diferencia hay entre los estilos de subrayado?", "La línea simple (t̲e̲x̲t̲o̲) es el subrayado clásico — el más legible para el énfasis y las palabras importantes. La línea doble (t̳e̳x̳t̳o̳) es más gruesa y más llamativa. La línea ondulada (t̰ḛx̰t̰o̰) recuerda al trazo rojo de error de los procesadores de texto — funciona para un énfasis irónico o un aire de «revisa esto». Las tres se copian y se pegan igual."),
            ("¿Funciona con tildes y ñ, y con otros alfabetos?", "Sí. La línea se apoya en un carácter combinante independiente y no en una tabla de letras sustitutas — así que pasa por debajo de cualquier letra, incluidas las vocales con tilde, la ñ y los alfabetos no latinos. A diferencia de la negrita Unicode, no tienes que quitar las tildes. En algunas apps antiguas la línea puede quedar algo desalineada — compruébalo después de pegar."),
        ],
        "related": [
            ("/es/letra-tachada/", "Letra Tachada", "El complemento natural del subrayado — para la idea de «cancelado»."),
            ("/es/letras-negritas/", "Letras en Negrita", "Negrita Unicode que sigue en negrita donde la pegues."),
            ("/es/fuentes-para-instagram/", "Fuentes para Instagram", "Las fuentes que mejor lucen en Instagram, con ideas de bio."),
        ],
    },
    "pl": {
        "slug": "pl/podkreslony-tekst", "lang": "pl", "currency": "PLN",
        "home": "Strona główna", "crumb": "Podkreślony Tekst",
        "title": "Podkreślony Tekst — Podkreślona Czcionka do Skopiowania (t̲e̲k̲s̲t̲)",
        "desc": "Generator podkreślonego tekstu: zamień swój tekst na t̲e̲k̲s̲t̲, t̳e̳k̳s̳t̳ i t̰ḛk̰s̰t̰. Skopiuj i wklej do bio na Instagramie, statusu WhatsApp i nicku — za darmo, bez aplikacji.",
        "h1": "Podkreślony tekst — kopiuj i wklej",
        "tagline": "Wpisz swój tekst, a od razu stanie się podkreślony — pojedyncza linia, podwójna linia i linia falowana. Wklej do bio na Instagramie, statusu WhatsApp, nagłówka i nicku; podkreślenie zostaje wszędzie.",
        "og_desc": "Zamień swój tekst na podkreślony: linia pojedyncza, podwójna i falowana. Skopiuj i wklej do bio, statusu lub nicku.",
        "tw_desc": "Wszystkie style podkreślonego tekstu na jednej stronie — wpisz, skopiuj, wklej. Za darmo.",
        "app_name": "Generator Podkreślonego Tekstu",
        "alt_names": ["Podkreślony Tekst", "Podkreślona Czcionka", "Podkreślone Litery", "Tekst z Podkreśleniem", "Underline"],
        "app_desc": "Generator podkreślonego tekstu: zamienia tekst na uniklodowe style z pojedynczą, podwójną i falowaną linią — do skopiowania do bio na Instagramie, statusu WhatsApp i nicku w grze.",
        "demo": "wypróbuj podkreślony tekst.\\nwpisz, skopiuj, wklej.",
        "deco_label": "Dodaj ozdobnik do wyniku",
        "deco_tabs": ["Symbole", "Ramki", "Minimal"],
        "labels": ["Pojedyncza Linia", "Podwójna Linia", "Linia Falowana", "Cyfry Pojedyncza", "Cyfry Podwójna"],
        "copy_aria": ["Skopiuj alfabet z pojedynczą linią", "Skopiuj alfabet z podwójną linią", "Skopiuj alfabet z falowaną linią", "Skopiuj cyfry z pojedynczą linią", "Skopiuj cyfry z podwójną linią"],
        "s1_h2": "Podkreślony tekst w Unicode: linia, która wędruje razem z tekstem",
        "s1_intro": "<strong>Podkreślony tekst</strong> na tej stronie to nie formatowanie jak w Wordzie — do każdej litery doczepiany jest łączący znak Unicode, którego kształtem jest już sama linia. Dlatego przy kopiowaniu linia wędruje razem z tekstem: do bio na Instagramie, które nie ma przycisku podkreślenia, do statusu WhatsApp, do opisu na TikToku, a nawet do nicku w grze.",
        "s1_example": "<strong>Przykład:</strong> «tekst» → t̲e̲k̲s̲t̲ (pojedyncza linia), t̳e̳k̳s̳t̳ (podwójna linia), t̰ḛk̰s̰t̰ (linia falowana)",
        "s1_after": "Na Discordzie dwa podkreślniki (__tekst__) dają prawdziwe, natywne podkreślenie — to skrót samej aplikacji. WhatsApp nie ma dla podkreślenia żadnego skrótu; wersja uniklodowa pozostaje podkreślona wszędzie, bo linia jest częścią samego znaku.",
        "s2_h2": "Podkreślony alfabet (A–Z) — skopiuj w całości",
        "s2_intro": "Pełny alfabet i cyfry w trzech stylach podkreślenia. Dotknij wiersza, a cały styl trafi do schowka.",
        "s2_after": "Który wybrać? <strong>Pojedyncza linia</strong> to klasyczne podkreślenie — najczytelniejsze do wyróżnienia. <strong>Podwójna linia</strong> jest grubsza i mocniej przyciąga wzrok. <strong>Linia falowana</strong> przypomina czerwone podkreślenie błędu w edytorze — sprawdza się przy ironicznym akcencie. Nie wiesz? Wpisz swoje słowo powyżej i zobacz wszystkie trzy obok siebie.",
        "s3_h2": "Do czego przydaje się podkreślony tekst?",
        "s3_intro": "Zadaniem podkreślenia jest wyróżnienie — najczystszy sposób, żeby oddzielić jedno słowo od reszty i sprawić, że zostanie zauważone.",
        "s3_example": "— <strong>Nagłówek / słowo kluczowe</strong>: zrób jedno słowo w̲a̲ż̲n̲y̲m̲ w bio albo opisie<br>— <strong>Cena / promocja</strong>: wyróżnij zwroty w rodzaju «tylko dziś»<br>— <strong>Nick i bio</strong>: podkreśl fragment swojego pseudonimu<br>— <strong>Przyciągnięcie uwagi</strong>: wyróżnij jedno słowo w komentarzu albo wiadomości",
        "faqs": [
            ("Jak zrobić podkreślony tekst?", "Wpisz swój tekst w pole powyżej — wersje z pojedynczą linią (t̲e̲k̲s̲t̲), podwójną linią (t̳e̳k̳s̳t̳) i falowaną linią (t̰ḛk̰s̰t̰) pojawią się od razu. Dotknij przycisku kopiowania i wklej, gdzie chcesz. Ponieważ linia jest znakiem Unicode doczepionym pod literą, zostaje nawet w polach, które nie obsługują podkreślenia."),
            ("Jak podkreślić tekst na telefonie?", "WhatsApp ma skróty na pogrubienie (*tekst*) i przekreślenie (~tekst~), ale nie na podkreślenie — dlatego Unicode jest jedynym wyjściem. Discord działa inaczej: otoczenie tekstu dwoma podkreślnikami (__tekst__) daje prawdziwe natywne podkreślenie w wiadomości. Poza tym (Instagram, status WhatsApp, TikTok, nick) sposobem jest wpisanie tekstu tutaj i skopiowanie podkreślonej wersji."),
            ("Czy podkreślonego tekstu można użyć na Instagramie?", "Można. Instagram nie ma przycisku podkreślenia, ale uniklodowe znaki z podkreśleniem wyświetlają się bez problemu w bio, nazwie wyświetlanej, opisie i komentarzach. Skopiuj stąd i wklej na Instagramie. Tylko pole nazwy użytkownika (@) ich nie przyjmuje — tam działają wyłącznie zwykłe litery, cyfry, kropka i podkreślnik."),
            ("Czym różnią się style podkreślenia?", "Pojedyncza linia (t̲e̲k̲s̲t̲) to klasyczne podkreślenie — najczytelniejsze przy wyróżnianiu i ważnych słowach. Podwójna linia (t̳e̳k̳s̳t̳) jest grubsza i bardziej rzuca się w oczy. Linia falowana (t̰ḛk̰s̰t̰) przypomina czerwone podkreślenie literówki w edytorach tekstu — przydaje się przy ironicznym akcencie albo w znaczeniu «sprawdź to». Wszystkie trzy kopiuje się i wkleja tak samo."),
            ("Czy działa z polskimi znakami (ą, ć, ę, ł, ń, ó, ś, ź, ż)?", "Tak. Linia opiera się na osobnym znaku łączącym, a nie na tabeli liter zastępczych — przechodzi więc pod każdą literą, łącznie z polskimi znakami diakrytycznymi, a także pod alfabetami niełacińskimi. W przeciwieństwie do pogrubienia uniklodowego nie musisz upraszczać polskich liter. W niektórych starszych aplikacjach linia może nie być idealnie wyrównana — sprawdź po wklejeniu."),
        ],
        "related": [
            ("/pl/przekreslony-tekst/", "Przekreślony Tekst", "Naturalne uzupełnienie podkreślenia — dla efektu «anulowane»."),
            ("/pl/pogrubiona-czcionka/", "Pogrubiona Czcionka", "Pogrubienie uniklodowe, które zostaje pogrubione wszędzie."),
            ("/pl/czcionki-na-instagram/", "Czcionki na Instagram", "Czcionki, które najlepiej wyglądają na Instagramie, plus pomysły na bio."),
        ],
    },
    "nl": {
        "slug": "nl/onderstreepte-tekst", "lang": "nl", "currency": "EUR",
        "home": "Home", "crumb": "Onderstreepte Tekst",
        "title": "Onderstreepte Tekst — Onderstreept Lettertype Kopiëren (t̲e̲k̲s̲t̲)",
        "desc": "Onderstreepte tekst generator: zet je tekst om naar t̲e̲k̲s̲t̲, t̳e̳k̳s̳t̳ en t̰ḛk̰s̰t̰. Kopiëren en plakken in je Instagram-bio, WhatsApp-status en nickname — gratis, zonder app.",
        "h1": "Onderstreepte tekst — kopiëren en plakken",
        "tagline": "Typ je tekst en hij wordt meteen onderstreept — enkele lijn, dubbele lijn en golvende lijn. Plak het in je Instagram-bio, WhatsApp-status, een kop of een nickname; de lijn blijft overal staan.",
        "og_desc": "Zet je tekst om naar onderstreept: enkele, dubbele en golvende lijn. Kopieer en plak in je bio, status of nickname.",
        "tw_desc": "Alle onderstreepte tekststijlen op één pagina — typen, kopiëren, plakken. Gratis.",
        "app_name": "Onderstreepte Tekst Generator",
        "alt_names": ["Onderstreepte Tekst", "Onderstreept Lettertype", "Tekst Onderstrepen", "Onderstreepte Letters", "Underline"],
        "app_desc": "Onderstreepte tekst generator: zet je tekst om naar Unicode-stijlen met een enkele, dubbele en golvende lijn — om te kopiëren naar je Instagram-bio, WhatsApp-status en game-nickname.",
        "demo": "probeer onderstreepte tekst.\\ntyp, kopieer, plak.",
        "deco_label": "Voeg een versiering toe aan het resultaat",
        "deco_tabs": ["Symbolen", "Kaders", "Minimaal"],
        "labels": ["Enkele Lijn", "Dubbele Lijn", "Golvende Lijn", "Cijfers Enkele Lijn", "Cijfers Dubbele Lijn"],
        "copy_aria": ["Kopieer het alfabet met enkele lijn", "Kopieer het alfabet met dubbele lijn", "Kopieer het alfabet met golvende lijn", "Kopieer de cijfers met enkele lijn", "Kopieer de cijfers met dubbele lijn"],
        "s1_h2": "Onderstreepte tekst in Unicode: de lijn die overal meegaat",
        "s1_intro": "De <strong>onderstreepte tekst</strong> hier is geen opmaak zoals in Word — aan elke letter wordt een combinerend Unicode-teken gehangen waarvan de vorm al een lijn is. Daarom reist de lijn mee als je kopieert: naar een Instagram-bio zonder onderstreepknop, naar je WhatsApp-status, naar een TikTok-beschrijving en zelfs naar een game-nickname.",
        "s1_example": "<strong>Voorbeeld:</strong> «tekst» → t̲e̲k̲s̲t̲ (enkele lijn), t̳e̳k̳s̳t̳ (dubbele lijn), t̰ḛk̰s̰t̰ (golvende lijn)",
        "s1_after": "Op Discord geven twee liggende streepjes (__tekst__) een echte, native onderstreping — dat is een snelkoppeling van de app zelf. WhatsApp heeft er helemaal geen; de Unicode-variant blijft daarentegen overal onderstreept, omdat de lijn deel uitmaakt van het teken.",
        "s2_h2": "Onderstreept alfabet (A–Z) — kopieer het in één keer",
        "s2_intro": "Het volledige alfabet en de cijfers in drie onderstreepstijlen. Tik op een rij en de hele stijl gaat naar je klembord.",
        "s2_after": "Welke kies je? De <strong>enkele lijn</strong> is de klassieke onderstreping — het best leesbaar om nadruk te leggen. De <strong>dubbele lijn</strong> is zwaarder en valt sterker op. De <strong>golvende lijn</strong> doet denken aan het rode streepje van de spellingcontrole — handig voor een ironische nadruk. Twijfel je? Typ je woord hierboven en zie ze naast elkaar.",
        "s3_h2": "Waar is onderstreepte tekst handig?",
        "s3_intro": "Onderstrepen doet één ding: nadruk leggen — de schoonste manier om één woord van de rest los te maken zodat het opvalt.",
        "s3_example": "— <strong>Kop / kernwoord</strong>: maak één woord b̲e̲l̲a̲n̲g̲r̲i̲j̲k̲ in je bio of beschrijving<br>— <strong>Prijs / actie</strong>: benadruk zinnen als «alleen vandaag»<br>— <strong>Nickname en bio</strong>: onderstreep een deel van je bijnaam<br>— <strong>Aandacht trekken</strong>: licht één woord uit in een reactie of bericht",
        "faqs": [
            ("Hoe maak je onderstreepte tekst?", "Typ je tekst in het vak hierboven — de versies met enkele lijn (t̲e̲k̲s̲t̲), dubbele lijn (t̳e̳k̳s̳t̳) en golvende lijn (t̰ḛk̰s̰t̰) verschijnen meteen. Tik op kopiëren en plak het waar je wilt. Omdat de lijn een Unicode-teken onder de letter is, blijft hij zelfs staan in velden die onderstrepen niet ondersteunen."),
            ("Hoe onderstreep je tekst op je telefoon?", "WhatsApp heeft snelkoppelingen voor vet (*tekst*) en doorgestreept (~tekst~), maar niet voor onderstrepen — daarom is Unicode de enige route. Discord werkt anders: tekst tussen twee liggende streepjes (__tekst__) geeft een echte native onderstreping in het bericht. Voor al het andere (Instagram, WhatsApp-status, TikTok, nickname) typ je hier en kopieer je de onderstreepte versie."),
            ("Kun je onderstreepte tekst op Instagram gebruiken?", "Ja. Instagram heeft geen onderstreepknop, maar onderstreepte Unicode-tekens worden gewoon getoond in je bio, weergavenaam, bijschrift en reacties. Kopieer hier en plak op Instagram. Alleen het gebruikersnaamveld (@) accepteert ze niet — daar gelden alleen gewone letters, cijfers, punt en liggend streepje."),
            ("Wat is het verschil tussen de onderstreepstijlen?", "De enkele lijn (t̲e̲k̲s̲t̲) is de klassieke onderstreping — het best leesbaar voor nadruk en belangrijke woorden. De dubbele lijn (t̳e̳k̳s̳t̳) is zwaarder en opvallender. De golvende lijn (t̰ḛk̰s̰t̰) doet denken aan het rode streepje voor een typfout in tekstverwerkers — handig voor een ironische nadruk of een «check dit even». Alle drie kopieer en plak je op dezelfde manier."),
            ("Werkt het ook met andere alfabetten en met accenten (é, ë, ï)?", "Ja. De lijn berust op een apart combinerend teken en niet op een tabel met vervangende letters — hij loopt dus onder elke letter door, inclusief Nederlandse accenten en niet-Latijnse alfabetten. Anders dan bij Unicode-vet hoef je je accenten niet weg te laten. In sommige oudere apps staat de lijn misschien niet precies uitgelijnd — controleer het na het plakken."),
        ],
        "related": [
            ("/nl/vetgedrukte-letters/", "Vetgedrukte Letters", "Unicode-vet dat vet blijft waar je het ook plakt."),
            ("/nl/sierlijke-letters/", "Sierlijke Letters", "Sierletters en kalligrafische stijlen om te kopiëren."),
            ("/nl/instagram-lettertype/", "Instagram Lettertype", "De lettertypes die het beste werken op Instagram, met bio-ideeën."),
        ],
    },
}


def art_slug(page_slug):
    return page_slug.replace("/", "-")


def build(code, spec, all_codes):
    slug, lang = spec["slug"], spec["lang"]
    url = f"{BASE}/{slug}/"
    art = art_slug(slug)
    og = f"{BASE}/assets/og/{art}.png"
    parent_url = f"{BASE}/{PARENT}/"

    # hreflang: en, every existing sibling, every locale in this batch, self, x-default.
    sibs = [("en", parent_url)]
    for c, s in EXISTING_SIBLINGS:
        sibs.append((c, f"{BASE}/{s}/"))
    for c in all_codes:
        sibs.append((c, f"{BASE}/{SPECS[c]['slug']}/"))
    seen, alts = set(), []
    for c, u in sibs:
        if c in seen:
            continue
        seen.add(c)
        alts.append(f'  <link rel="alternate" hreflang="{c}" href="{u}">')
    alts.append(f'  <link rel="alternate" hreflang="x-default" href="{parent_url}">')

    # language switcher, mirroring the hreflang set (own locale marked active)
    sw = ['      <a class="lang-option" href="/{}/" hreflang="en">EN</a>'.format(PARENT)]
    for c, s in EXISTING_SIBLINGS:
        sw.append(f'      <a class="lang-option" href="/{s}/" hreflang="{c}">{c.upper()}</a>')
    for c in all_codes:
        cls = "lang-option active" if c == code else "lang-option"
        sw.append(f'      <a class="{cls}" href="/{SPECS[c]["slug"]}/" hreflang="{c}">{c.upper()}</a>')

    rows = []
    marks = [UNDER, DOUBLE, WAVY]
    for i, mark in enumerate(marks):
        rows.append(
            f'      <div class="alpha-row">\n'
            f'        <span class="alpha-label">{spec["labels"][i]}</span>\n'
            f'        <button class="glyph-copy alpha-glyphs" type="button" data-text="{alpha_pair(mark)}" '
            f'aria-label="{spec["copy_aria"][i]}">{alpha_label(mark)}</button>\n'
            f'      </div>')
    for j, mark in enumerate([UNDER, DOUBLE]):
        i = 3 + j
        rows.append(
            f'      <div class="alpha-row">\n'
            f'        <span class="alpha-label">{spec["labels"][i]}</span>\n'
            f'        <button class="glyph-copy alpha-glyphs" type="button" data-text="{deco(DIGITS, mark)}" '
            f'aria-label="{spec["copy_aria"][i]}">{" ".join(d + mark for d in DIGITS)}</button>\n'
            f'      </div>')

    faq_json = ",\n".join(
        '    {\n      "@type": "Question",\n      "name": %s,\n'
        '      "acceptedAnswer": { "@type": "Answer", "text": %s }\n    }'
        % (jstr(q), jstr(a)) for q, a in spec["faqs"])

    faq_html = "\n".join(
        f'    <div class="faq-item"><button class="faq-question" type="button">{q}{FAQ_SVG}'
        f'</button><div class="faq-answer">{a}</div></div>' for q, a in spec["faqs"])

    cards = "\n".join(
        f'      <a href="{href}" class="compare-card variant-muted u-no-underline">\n'
        f'        <h4>{h4}</h4>\n        <p>{p}</p>\n      </a>'
        for href, h4, p in spec["related"])

    alt_json = ",\n".join(f'    {jstr(n)}' for n in spec["alt_names"])

    return f"""<!DOCTYPE html><html lang="{lang}"><head>
{HEAD_SCRIPTS}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{spec["title"]} | UltraTextGen</title>
  <meta name="description" content="{spec["desc"]}">
  <link rel="canonical" href="{url}">
{chr(10).join(alts)}

  <meta name="robots" content="index, follow">
  <meta property="og:site_name" content="UltraTextGen">
  <meta property="og:title" content="{spec["title"]}">
  <meta property="og:description" content="{spec["og_desc"]}">
  <meta property="og:url" content="{url}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{og}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:alt" content="{spec["title"]}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{spec["title"]}">
  <meta name="twitter:description" content="{spec["tw_desc"]}">
  <meta name="twitter:image" content="{og}">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/symbol-explorer.css">

<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": {jstr(spec["app_name"])},
  "alternateName": [
{alt_json}
  ],
  "url": "{url}",
  "inLanguage": "{lang}",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Any",
  "description": {jstr(spec["app_desc"])},
  "offers": {{
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "{spec["currency"]}"
  }},
  "image": "{og}"
}}
</script>

<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "inLanguage": "{lang}",
  "mainEntity": [
{faq_json}
  ]
}}
</script>

<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {{ "@type": "ListItem", "position": 1, "name": {jstr(spec["home"])}, "item": "{BASE}/{lang}/" }},
    {{ "@type": "ListItem", "position": 2, "name": {jstr(spec["crumb"])}, "item": "{url}" }}
  ]
}}
</script>
</head>
<body>
  <script>try{{if(localStorage.getItem("darkMode")==="true")document.body.classList.add("dark-mode")}}catch(e){{}}</script>
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P55HXK8Q" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->
  <div id="shared-header"></div>
<script src="/header.js" defer></script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
  <a href="/{lang}/">{spec["home"]}</a>
  <span class="breadcrumb-separator">›</span>
  <span class="breadcrumb-current">{spec["crumb"]}</span>
</nav>

<figure class="page-hero-figure" data-uthero aria-hidden="true">
  <img src="/assets/hero/{art}.svg" width="1200" height="340"
       fetchpriority="high" alt="">
</figure>
<section class="hero">
  <div class="hero-inner">
    <div class="hero-card">
      <h1 class="hero-headline">{spec["h1"]}</h1>
      <p class="hero-tagline">{spec["tagline"]}</p>
      <div class="input-wrapper">
        <textarea class="main-input" id="mainInput" placeholder="{spec["crumb"]}..." maxlength="500" autofocus=""></textarea>
        <span class="char-count"><span id="charCount">0</span>/500</span>
      </div>
      <div class="decoration-section">
        <div class="decoration-label">{spec["deco_label"]}</div>
        <div class="decoration-tabs">
          <button class="decoration-tab active" data-deco-tab="symbols">{spec["deco_tabs"][0]}</button>
          <button class="decoration-tab" data-deco-tab="frames">{spec["deco_tabs"][1]}</button>
          <button class="decoration-tab" data-deco-tab="minimal">{spec["deco_tabs"][2]}</button>
        </div>
        <div class="decoration-grid" id="decorationGrid"></div>
      </div>
    </div>
  </div>
</section>

<main class="container">
  <div class="category-section"><div class="category-tabs" id="categoryTabs"></div></div>
  <div class="results-grid" id="resultsGrid"></div>

  <section class="editorial-section">
    <h2>{spec["s1_h2"]}</h2>
    <p class="editorial-intro">{spec["s1_intro"]}</p>
    <div class="block-example">
      {spec["s1_example"]}
    </div>
    <p>{spec["s1_after"]}</p>
  </section>

  <section class="editorial-section glyph-section">
    <h2>{spec["s2_h2"]}</h2>
    <p class="editorial-intro">{spec["s2_intro"]}</p>
    <div class="alpha-list">
{chr(10).join(rows)}
    </div>
    <p class="u-mt-15">{spec["s2_after"]}</p>
  </section>

  <section class="editorial-section">
    <h2>{spec["s3_h2"]}</h2>
    <p class="editorial-intro">{spec["s3_intro"]}</p>
    <div class="block-example">
      {spec["s3_example"]}
    </div>
  </section>

  <section class="editorial-section">
    <h2>{spec["related_h2"]}</h2>
    <div class="compare-grid">
{cards}
    </div>
  </section>
</main>

<footer class="footer">
  <div class="footer-inner">
    <h2 class="faq-category">{spec["faq_h2"]}</h2>
{faq_html}

    <!-- Language Switcher -->
    <div class="lang-switcher" role="navigation" aria-label="Language switcher">
{chr(10).join(sw)}
    </div>
  </div>
</footer>

<div class="symbol-toast" id="symbolToast" aria-live="polite"></div>

<script>window.UTG_FAMILY = "underline-text";</script>
<script>window.UTG_DEMO_TEXT = "{spec["demo"]}";</script>
<script src="/styles.js"></script>
<script src="/renderer.js"></script>
<script src="/script.js" defer=""></script>
<script src="/symbol-explorer.js"></script>
<script src="/footer.js" defer></script>
</body></html>
"""


def jstr(s):
    """Minimal JSON string escaping — the copy contains quotes and «guillemets»."""
    out = s.replace("\\", "\\\\").replace('"', '\\"')
    return '"' + out.replace("\n", "\\n") + '"'


# Section headings that are the same shape in every locale live here rather than
# being repeated in each spec.
SECTION_HEADS = {
    "id": ("Gaya lain untuk disalin", "Pertanyaan tentang tulisan garis bawah"),
    "pt": ("Outros estilos para copiar", "Perguntas sobre texto sublinhado"),
    "de": ("Weitere Stile zum Kopieren", "Fragen zu unterstrichenem Text"),
    "fr": ("D'autres styles à copier", "Questions sur le texte souligné"),
    "it": ("Altri stili da copiare", "Domande sul testo sottolineato"),
    "es": ("Otros estilos para copiar", "Preguntas sobre el texto subrayado"),
    "pl": ("Inne style do skopiowania", "Pytania o podkreślony tekst"),
    "nl": ("Andere stijlen om te kopiëren", "Vragen over onderstreepte tekst"),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", action="append", help="locale code (repeatable)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    all_codes = list(SPECS)
    targets = a.only or all_codes
    for code in targets:
        if code not in SPECS:
            print(f"error: unknown locale {code}", file=sys.stderr)
            return 2
        spec = dict(SPECS[code])
        spec["related_h2"], spec["faq_h2"] = SECTION_HEADS[code]
        html = build(code, spec, all_codes)
        dest = os.path.join(ROOT, spec["slug"], "index.html")
        if a.dry_run:
            print(f"[dry-run] {dest}  ({len(html)} bytes)")
            continue
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        io.open(dest, "w", encoding="utf-8").write(html)
        print(f"wrote {dest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
