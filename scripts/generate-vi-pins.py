#!/usr/bin/env python3
"""
Vietnamese "chữ kiểu đẹp / kí tự đặc biệt" Pinterest board — every pin drives to
https://ultratextgen.com/vi/ (the Zalgo pin to the /vi/ zalgo use case page).
Mirrors generate-es-pins.py via scripts/_locale_pin_kit.py. Topics track the
/vi/ page intent reinforced in the recent "chữ kiểu queries + có dấu" PR:
chữ kiểu đẹp, font chữ aesthetic, kí tự đặc biệt, tên Free Fire / Liên Quân,
bio Facebook / Instagram / Zalo, caption TikTok.

Styled row samples use tone-free words because the Unicode Mathematical-
Alphanumeric block can't style Vietnamese diacritics; headlines use the brand
sans, which renders Vietnamese fully (the page's "có dấu" promise).

Run:  python3 scripts/generate-vi-pins.py
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

LOCALE = "vi"
DEST = "https://ultratextgen.com/vi/"
ZALGO = "https://ultratextgen.com/vi/usecase/zalgo-text/"
BOARD = "Chữ Kiểu Đẹp & Kí Tự Đặc Biệt — Copy Paste ✨"
CAMPAIGN = "vi_howto_pins"
CTA = "CHẠM ĐỂ SAO CHÉP"
SUFFIX = "/vi"

PINS = [
    dict(slug="chu-kieu-dep", kicker="ULTRATEXTGEN · CÁCH DÙNG",
         headline="Chữ Kiểu Đẹp để Copy Paste",
         benefit="Gõ chữ của bạn và copy theo hàng chục kiểu.",
         rows=[("thường", "kieu"), ("Viết Tay", st("Script", "kieu")),
               ("Đậm", st("Bold", "kieu")), ("Rỗng", st("Double-struck", "kieu"))],
         title="Chữ Kiểu Đẹp để Copy Paste Online — Miễn Phí",
         kw=["chữ kiểu đẹp", "chữ kiểu", "tạo chữ kiểu", "chữ đẹp copy paste",
             "copy paste"]),
    dict(slug="tao-chu-kieu", kicker="ULTRATEXTGEN · TẠO CHỮ",
         headline="Tạo Chữ Kiểu Online",
         benefit="Chuyển chữ của bạn thành nhiều font ngay lập tức.",
         rows=[("thường", "chu"), ("Viết Tay", st("Script", "chu")),
               ("Đậm", st("Bold", "chu")), ("Mono", st("Monospace", "chu"))],
         title="Tạo Chữ Kiểu Online — Copy Paste Miễn Phí",
         kw=["tạo chữ kiểu", "tạo font chữ", "tạo chữ đẹp",
             "chữ kiểu đẹp", "font chữ"]),
    dict(slug="ki-tu-dac-biet", kicker="ULTRATEXTGEN · KÍ TỰ",
         headline="Kí Tự Đặc Biệt để Copy",
         benefit="Trang trí và kí tự đặc biệt cho chữ chỉ một chạm.",
         rows=[("Tim & sao", "♡ ✶ ⋆ ˚ ✧ ♥"),
               ("Hoa & trang trí", "❀ ✿ ⊹ ☆ ✰ ◇"),
               ("Phân cách", "✦ ── ✦   ⊱ ⋆ ⊰")],
         title="Kí Tự Đặc Biệt để Copy Paste — Trang Trí Chữ",
         kw=["kí tự đặc biệt", "ký tự đặc biệt", "kí tự đặc biệt đẹp",
             "kí tự copy", "chữ kiểu đẹp"]),
    dict(slug="free-fire", kicker="ULTRATEXTGEN · GAME",
         headline="Tên Free Fire Kí Tự Đặc Biệt",
         benefit="Tạo tên nhân vật chất và độc cho game thủ.",
         rows=[("Mono", wrap("≪", st("Monospace", "VUAFF"), "≫")),
               ("Chữ Nhỏ", wrap("★", smallcaps("man ro"))),
               ("Rỗng", wrap("⊱", st("Double-struck", "ThoSan"), "⊰"))],
         title="Tên Free Fire Kí Tự Đặc Biệt — Copy Paste",
         kw=["tên free fire", "tên ff kí tự đặc biệt", "kí tự đặc biệt free fire",
             "tên nhân vật free fire", "free fire"]),
    dict(slug="lien-quan", kicker="ULTRATEXTGEN · LIÊN QUÂN",
         headline="Tên Liên Quân Kí Tự Đẹp",
         benefit="Tạo tên Liên Quân nổi bật với kí tự đặc biệt.",
         rows=[("Mono", wrap("≪", st("Monospace", "CAOTHU"), "≫")),
               ("Chữ Nhỏ", wrap("★", smallcaps("vo danh"))),
               ("Rỗng", wrap("⊱", st("Double-struck", "Kiem"), "⊰"))],
         title="Tên Liên Quân Kí Tự Đặc Biệt — Copy Paste Đẹp",
         kw=["tên liên quân", "tên liên quân kí tự đặc biệt", "kí tự đặc biệt liên quân",
             "tên game đẹp", "liên quân"]),
    dict(slug="viet-tay", kicker="ULTRATEXTGEN · VIẾT TAY",
         headline="Chữ Viết Tay để Copy",
         benefit="Chữ viết tay mềm mại, sẵn sàng để dán.",
         rows=[("Viết Tay", st("Script", "xin chao")),
               ("Viết Tay Đậm", st("Bold Script", "xin chao")),
               ("Nghiêng", st("Italic", "xin chao"))],
         title="Chữ Viết Tay để Copy Paste — Chữ Kiểu Đẹp",
         kw=["chữ viết tay", "chữ viết tay đẹp", "font viết tay",
             "chữ kiểu đẹp", "chữ thư pháp"]),
    dict(slug="ten", kicker="ULTRATEXTGEN · TÊN",
         headline="Tên Bạn theo Chữ Kiểu Đẹp",
         benefit="Chuyển tên của bạn cho trang cá nhân và nick.",
         rows=[("Viết Tay", st("Script", "Linh")), ("Đậm", st("Bold", "Linh")),
               ("Gô-tích", st("Fraktur", "Linh")), ("Rỗng", st("Double-struck", "Linh"))],
         title="Tên Bạn theo Chữ Kiểu Đẹp — Copy Paste Miễn Phí",
         kw=["tên chữ kiểu", "tên kiểu đẹp", "tên đẹp",
             "chữ kiểu đẹp", "tên copy paste"]),
    dict(slug="facebook", kicker="ULTRATEXTGEN · FACEBOOK",
         headline="Chữ Kiểu Đẹp cho Facebook",
         benefit="Trang trí tên, bio và bài đăng Facebook.",
         rows=[("Đậm", st("Bold", "noi bat")), ("Viết Tay", st("Script", "vibe tot")),
               ("Rỗng", st("Double-struck", "tho"))],
         title="Chữ Kiểu Đẹp cho Facebook — Copy Paste Miễn Phí",
         kw=["chữ kiểu facebook", "chữ đẹp facebook", "font chữ facebook",
             "chữ kiểu đẹp", "facebook"]),
    dict(slug="instagram-bio", kicker="ULTRATEXTGEN · INSTAGRAM",
         headline="Chữ Kiểu cho Bio Instagram",
         benefit="Trang trí bio, tên và story Instagram của bạn.",
         rows=[("Viết Tay", wrap("✶", st("Script", "self love"))),
               ("Nghiêng", wrap("⊹", st("Italic", "good vibes"))),
               ("Chữ Nhỏ", wrap("˚✧", smallcaps("la chinh minh"), "✧˚"))],
         title="Chữ Kiểu cho Bio Instagram — Copy Paste Đẹp",
         kw=["chữ kiểu instagram", "bio instagram đẹp", "font chữ instagram",
             "chữ kiểu đẹp instagram", "aesthetic"]),
    dict(slug="tiktok", kicker="ULTRATEXTGEN · TIKTOK",
         headline="Chữ Kiểu Đẹp cho TikTok",
         benefit="Cá nhân hóa tên và bio TikTok của bạn.",
         rows=[("Đậm", st("Bold", "nguoi dung")), ("Mono", st("Monospace", "noi bat")),
               ("Nghiêng", st("Italic", "vibe"))],
         title="Chữ Kiểu Đẹp cho TikTok — Tên & Bio Copy",
         kw=["chữ kiểu tiktok", "font chữ tiktok", "bio tiktok đẹp",
             "chữ kiểu đẹp", "tên tiktok"]),
    dict(slug="aesthetic", kicker="ULTRATEXTGEN · AESTHETIC",
         headline="Font Chữ Aesthetic để Copy",
         benefit="Phong cách nhẹ nhàng với kí tự đẹp cho mạng xã hội.",
         rows=[("Viết Tay", wrap("✶", st("Script", "vibes"))),
               ("Nghiêng", st("Italic", "soft")),
               ("Chữ Nhỏ", wrap("˚✧", smallcaps("aesthetic"), "✧˚"))],
         title="Font Chữ Aesthetic để Copy Paste — Chữ Kiểu Đẹp",
         kw=["font chữ aesthetic", "chữ aesthetic", "chữ kiểu aesthetic",
             "aesthetic", "chữ kiểu đẹp"]),
    dict(slug="chu-dam", kicker="ULTRATEXTGEN · CHỮ ĐẬM",
         headline="Chữ Đậm để Copy Paste",
         benefit="Chữ đậm hoạt động trên mọi mạng xã hội.",
         rows=[("Đậm", st("Bold", "TIEU DE")), ("Đậm Nghiêng", st("Bold Italic", "noi bat")),
               ("Rỗng", st("Double-struck", "TIEU DE"))],
         title="Chữ Đậm để Copy Paste — Chữ Kiểu Đẹp Miễn Phí",
         kw=["chữ đậm", "chữ in đậm", "chữ đậm copy paste",
             "chữ kiểu đẹp", "copy paste"]),
    dict(slug="chu-gothic", kicker="ULTRATEXTGEN · GÔ-TÍCH",
         headline="Chữ Gô-tích để Copy",
         benefit="Phong cách tối và sang cho nick, bio và bài đăng.",
         rows=[("Gô-tích", st("Fraktur", "bong toi")), ("Gô-tích", st("Fraktur", "Vuong Quoc")),
               ("Rỗng", st("Double-struck", "dem"))],
         title="Chữ Gô-tích để Copy Paste — Chữ Kiểu Đẹp",
         kw=["chữ gô tích", "chữ gothic", "font gothic",
             "chữ kiểu đẹp", "dark"]),
    dict(slug="zalgo", kicker="ULTRATEXTGEN · ZALGO", dest=ZALGO,
         headline="Chữ Zalgo (Lỗi) để Copy",
         benefit="Chữ lỗi rùng rợn cho bài đăng và nick.",
         rows=[("Zalgo", "c̷h̷u̷"), ("Glitch", "g̸l̸i̸t̸c̸h̸"),
               ("Rùng Rợn", "r̶u̶n̶g̶r̶o̶n̶")],
         title="Chữ Zalgo (Lỗi) để Copy Paste — Chữ Kiểu",
         kw=["chữ zalgo", "tạo chữ zalgo", "chữ lỗi", "chữ rùng rợn",
             "chữ kiểu đẹp"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Gõ một lần và copy mọi kiểu chữ "
         f"Unicode trên UltraTextGen: miễn phí, ngay trên trình duyệt, không cần "
         f"app. Hợp cho bio, tên, nick, status và bình luận.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pin dọc tiếng Việt: {pin['headline']} — ví dụ chữ kiểu đẹp để "
            f"copy paste từ UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, DEST, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
