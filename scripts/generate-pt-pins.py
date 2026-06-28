#!/usr/bin/env python3
"""
Generates the Portuguese (pt-BR) "fontes / letras diferentes" Pinterest board —
every pin drives to https://ultratextgen.com/pt/ (the Zalgo pin to the /pt/
zalgo use case page). Mirrors generate-es-pins.py via scripts/_locale_pin_kit.py:
the hero of each pin is the *literal* styled Unicode Brazilian searchers want to
see ("letras diferentes", "fontes"), laid onto the shared 1000x1500 brand pin.

Topics track the /pt/ page intent reinforced in the recent "fontes" PR: letras
diferentes / copiar e colar, gerador de fontes, Instagram bio, Free Fire nick,
WhatsApp, TikTok, símbolos aesthetic/y2k, góticas, negrito, Discord, zalgo.

Run:  python3 scripts/generate-pt-pins.py
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

LOCALE = "pt"
DEST = "https://ultratextgen.com/pt/"
ZALGO = "https://ultratextgen.com/pt/usecase/zalgo-text/"
BOARD = "Letras Diferentes e Fontes para Copiar e Colar ✨"
CAMPAIGN = "pt_howto_pins"
CTA = "TOQUE PARA COPIAR"
SUFFIX = "/pt"

PINS = [
    dict(slug="copiar-colar", kicker="ULTRATEXTGEN · COMO USAR",
         headline="Letras Diferentes para Copiar e Colar",
         benefit="Digite seu texto e copie em dezenas de estilos.",
         rows=[("normal", "estilo"), ("Cursiva", st("Script", "estilo")),
               ("Negrito", st("Bold", "estilo")), ("Vazada", st("Double-struck", "estilo"))],
         title="Letras Diferentes para Copiar e Colar — Grátis",
         kw=["letras diferentes para copiar e colar", "letras diferentes",
             "letras para copiar", "fontes para copiar", "copiar e colar"]),
    dict(slug="gerador-fontes", kicker="ULTRATEXTGEN · GERADOR",
         headline="Gerador de Fontes Online",
         benefit="Converte seu texto em várias fontes na hora.",
         rows=[("normal", "texto"), ("Cursiva", st("Script", "texto")),
               ("Negrito", st("Bold", "texto")), ("Mono", st("Monospace", "texto"))],
         title="Gerador de Fontes Online — Copiar e Colar",
         kw=["gerador de fontes", "fontes online", "gerador de letras",
             "fontes para copiar", "letras diferentes"]),
    dict(slug="tipos-de-letras", kicker="ULTRATEXTGEN · TIPOS",
         headline="Tipos de Letras para Copiar",
         benefit="Cursiva, gótica, vazada e muito mais num só lugar.",
         rows=[("Cursiva", st("Script", "estilo")), ("Gótica", st("Fraktur", "estilo")),
               ("Vazada", st("Double-struck", "estilo")), ("Versalete", smallcaps("estilo"))],
         title="Tipos de Letras para Copiar — Fontes Diferentes",
         kw=["tipos de letras", "estilos de letra", "fontes diferentes",
             "letras diferentes", "tipos de fonte"]),
    dict(slug="instagram", kicker="ULTRATEXTGEN · INSTAGRAM",
         headline="Fontes para Bio do Instagram",
         benefit="Decore sua bio, nome e stories do Instagram.",
         rows=[("Cursiva", wrap("✶", st("Script", "self love"))),
               ("Itálico", wrap("⊹", st("Italic", "boas vibes"))),
               ("Versalete", wrap("˚✧", smallcaps("seja feliz"), "✧˚"))],
         title="Fontes para Bio do Instagram — Copiar e Colar",
         kw=["fontes para instagram", "letras para bio do instagram",
             "bio do instagram", "fontes para bio", "aesthetic"]),
    dict(slug="cursiva", kicker="ULTRATEXTGEN · CURSIVA",
         headline="Letra Cursiva para Copiar",
         benefit="Cursiva elegante pronta para copiar e colar.",
         rows=[("Cursiva", st("Script", "ola")),
               ("Cursiva Negrito", st("Bold Script", "ola")),
               ("Itálico", st("Italic", "ola"))],
         title="Letra Cursiva para Copiar e Colar — Grátis",
         kw=["letra cursiva", "letra cursiva para copiar", "letras cursivas",
             "letras diferentes", "caligrafia"]),
    dict(slug="nomes", kicker="ULTRATEXTGEN · NOMES",
         headline="Seu Nome em Letras Diferentes",
         benefit="Converta seu nome para perfis, nicks e status.",
         rows=[("Cursiva", st("Script", "Sofia")), ("Negrito", st("Bold", "Sofia")),
               ("Gótica", st("Fraktur", "Sofia")), ("Vazada", st("Double-struck", "Sofia"))],
         title="Seu Nome em Letras Diferentes — Copiar e Colar",
         kw=["nome em letras diferentes", "nomes em letras diferentes",
             "nomes estilizados", "letras diferentes", "nome estilizado"]),
    dict(slug="free-fire", kicker="ULTRATEXTGEN · GAME",
         headline="Nick para Free Fire com Símbolos",
         benefit="Crie seu nome de jogador estiloso e único.",
         rows=[("Mono", wrap("≪", st("Monospace", "REIDOFF"), "≫")),
               ("Versalete", wrap("★", smallcaps("selvagem"))),
               ("Vazada", wrap("⊱", st("Double-struck", "Cacador"), "⊰"))],
         title="Nick para Free Fire com Símbolos — Copiar",
         kw=["nick free fire", "letras para free fire", "simbolos para free fire",
             "nick estiloso", "free fire"]),
    dict(slug="whatsapp", kicker="ULTRATEXTGEN · WHATSAPP",
         headline="Letras Diferentes para WhatsApp",
         benefit="Status, nome e mensagens do WhatsApp com estilo.",
         rows=[("Cursiva", st("Script", "boas vibes")),
               ("Negrito Itálico", st("Bold Italic", "seja feliz")),
               ("Mono", st("Monospace", "online"))],
         title="Letras Diferentes para WhatsApp — Copiar e Colar",
         kw=["letras para whatsapp", "status do whatsapp", "letras diferentes whatsapp",
             "letras diferentes", "copiar e colar"]),
    dict(slug="simbolos", kicker="ULTRATEXTGEN · SÍMBOLOS",
         headline="Símbolos para Copiar e Colar",
         benefit="Enfeites e símbolos para decorar seu texto num clique.",
         rows=[("Corações e estrelas", "♡ ✶ ⋆ ˚ ✧ ♥"),
               ("Flores e enfeites", "❀ ✿ ⊹ ☆ ✰ ◇"),
               ("Separadores", "✦ ── ✦   ⊱ ⋆ ⊰")],
         title="Símbolos para Copiar e Colar — Enfeites de Texto",
         kw=["simbolos para copiar e colar", "simbolos para copiar", "simbolos",
             "enfeites para texto", "letras diferentes"]),
    dict(slug="tiktok", kicker="ULTRATEXTGEN · TIKTOK",
         headline="Fontes para TikTok e Bio",
         benefit="Personalize seu nome e a bio do TikTok.",
         rows=[("Negrito", st("Bold", "usuario")), ("Mono", st("Monospace", "destaque")),
               ("Itálico", st("Italic", "vibe"))],
         title="Fontes para TikTok e Bio — Copiar e Colar",
         kw=["fontes para tiktok", "letras para tiktok", "nick para tiktok",
             "letras diferentes", "bio do tiktok"]),
    dict(slug="goticas", kicker="ULTRATEXTGEN · GÓTICAS",
         headline="Letras Góticas para Copiar",
         benefit="Estilo escuro e elegante para nicks, bios e posts.",
         rows=[("Gótica", st("Fraktur", "sombrio")), ("Gótica", st("Fraktur", "Reino")),
               ("Vazada", st("Double-struck", "noite"))],
         title="Letras Góticas para Copiar e Colar — Grátis",
         kw=["letras goticas", "letras goticas para copiar", "fonte gotica",
             "letras diferentes", "dark"]),
    dict(slug="negrito", kicker="ULTRATEXTGEN · NEGRITO",
         headline="Letras em Negrito para Copiar",
         benefit="Negrito que funciona em qualquer rede social.",
         rows=[("Negrito", st("Bold", "TITULO")), ("Negrito Itálico", st("Bold Italic", "destaque")),
               ("Vazada", st("Double-struck", "TITULO"))],
         title="Letras em Negrito para Copiar e Colar — Grátis",
         kw=["letras em negrito", "texto em negrito", "negrito para copiar",
             "letras diferentes", "copiar e colar"]),
    dict(slug="aesthetic-y2k", kicker="ULTRATEXTGEN · AESTHETIC",
         headline="Símbolos Aesthetic e Y2K",
         benefit="Estilo suave e símbolos y2k para suas redes.",
         rows=[("Cursiva", wrap("✶", st("Script", "vibes"))),
               ("Y2K", "★ ✮ ⋆ ࣪ ˖ ⊹ ✧"),
               ("Versalete", wrap("˚✧", smallcaps("aesthetic"), "✧˚"))],
         title="Símbolos Aesthetic e Y2K para Copiar e Colar",
         kw=["simbolos aesthetic", "simbolos y2k", "aesthetic", "y2k",
             "letras diferentes"]),
    dict(slug="discord", kicker="ULTRATEXTGEN · DISCORD",
         headline="Fontes e Símbolos para Discord",
         benefit="Nome, apelido e bio do Discord com estilo.",
         rows=[("Negrito", st("Bold", "servidor")), ("Mono", st("Monospace", "online")),
               ("Vazada", st("Double-struck", "guilda"))],
         title="Fontes e Símbolos para Discord — Copiar e Colar",
         kw=["fontes para discord", "letras para discord", "simbolos para discord",
             "letras diferentes", "discord"]),
    dict(slug="frases", kicker="ULTRATEXTGEN · FRASES",
         headline="Frases em Letras Diferentes",
         benefit="Para a sua bio, status e publicações.",
         rows=[("Cursiva", st("Script", "continue brilhando")),
               ("Itálico", st("Italic", "boas vibes")),
               ("Versalete", smallcaps("seja voce mesmo"))],
         title="Frases em Letras Diferentes — Copiar e Colar",
         kw=["frases em letras diferentes", "frases para status", "frases para bio",
             "letras diferentes", "copiar e colar"]),
    dict(slug="zalgo", kicker="ULTRATEXTGEN · ZALGO", dest=ZALGO,
         headline="Texto Zalgo (Glitch) para Copiar",
         benefit="Texto bugado e assustador para posts e nicks.",
         rows=[("Zalgo", "t̷e̷x̷t̷o̷"), ("Glitch", "g̸l̸i̸t̸c̸h̸"),
               ("Assustador", "a̶s̶s̶u̶s̶t̶a̶d̶o̶r̶")],
         title="Texto Zalgo (Glitch) para Copiar e Colar",
         kw=["texto zalgo", "gerador de texto zalgo", "texto glitch",
             "texto bugado", "letras diferentes"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Digite uma vez e copie todos os "
         f"estilos Unicode no UltraTextGen: grátis, no navegador, sem apps. "
         f"Ideal para bio, nome, nick, status e comentários.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pin vertical em português: {pin['headline']} — exemplos de letras "
            f"diferentes para copiar e colar do UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, DEST, CAMPAIGN, CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
