#!/usr/bin/env python3
"""
French "police d'écriture par réseau & par style" Pinterest board — the
dedicated top-level FR style/platform pages (police-instagram, police-tiktok,
police-snapchat, police-linkedin, ecriture-facebook, police-d-ecriture,
ecriture-style, petite-ecriture, ecriture-italique, belle-ecriture,
changeur-de-police, ecriture-speciale, texte-en-gras, majuscules-et-minuscules,
combos-emoji, generateur-de-texte, compteur-de-mots-et-de-caracteres). None of
these have ever had a dedicated pin — the existing 14-pin board sends its
"gras"/generic pins to the /fr/ homepage instead.

Strongest leftover opportunity by real GSC evidence: police-d-ecriture is the
3rd-highest-impression French page on the site after the homepage and
ecriture-aesthetic. ecriture-style and petite-ecriture are similarly real and
unpinned.
Uses the shared scripts/_locale_pin_kit.py renderer with per-pin destinations.

Run:  python3 scripts/generate-fr-style-reseau-pins.py
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

LOCALE = "fr_style_reseau"
BASE = "https://ultratextgen.com"

BOARD = "Police d'Écriture par Réseau & par Style ✨"
CAMPAIGN = "fr_style_reseau_pins"
CTA = "APPUYEZ POUR COPIER"
SUFFIX = "/fr"

PINS = [
    dict(slug="police-instagram", dest=f"{BASE}/fr/police-instagram/",
         kicker="ULTRATEXTGEN · INSTAGRAM",
         headline="Police Instagram Stylée",
         benefit="Bio et nom Instagram avec du style — copier-coller.",
         rows=[("Cursive", st("Script", "self love")), ("Italique", st("Italic", "good vibes")),
               ("Petites capitales", smallcaps("sois toi"))],
         title="Police Instagram Stylée — Bio & Nom à Copier",
         kw=["police instagram", "police pour instagram", "écriture instagram"]),
    dict(slug="police-tiktok", dest=f"{BASE}/fr/police-tiktok/",
         kicker="ULTRATEXTGEN · TIKTOK",
         headline="Police TikTok Stylée",
         benefit="Bio et pseudo TikTok avec du style — copier-coller.",
         rows=[("Gras", st("Bold", "pseudo")), ("Mono", st("Monospace", "highlight")),
               ("Italique", st("Italic", "vibe"))],
         title="Police TikTok Stylée — Bio & Pseudo à Copier",
         kw=["police tiktok", "police pour tiktok", "écriture tiktok"]),
    dict(slug="police-snapchat", dest=f"{BASE}/fr/police-snapchat/",
         kicker="ULTRATEXTGEN · SNAPCHAT",
         headline="Police Snapchat Stylée",
         benefit="Nom et bio Snapchat avec du style — copier-coller.",
         rows=[("Cursive", st("Script", "snap")), ("Gras", st("Bold", "snap")),
               ("Ajouré", st("Double-struck", "snap"))],
         title="Police Snapchat Stylée — Copier-Coller Gratuit",
         kw=["police snapchat", "police pour snapchat", "écriture snapchat"]),
    dict(slug="police-linkedin", dest=f"{BASE}/fr/police-linkedin/",
         kicker="ULTRATEXTGEN · LINKEDIN",
         headline="Police LinkedIn Professionnelle",
         benefit="Texte stylé sobre pour ton profil LinkedIn.",
         rows=[("Petites capitales", smallcaps("profil")), ("Italique", st("Italic", "expertise")),
               ("Mono", st("Monospace", "compétences"))],
         title="Police LinkedIn Professionnelle — Texte Stylé à Copier",
         kw=["police linkedin", "écriture linkedin professionnelle"]),
    dict(slug="ecriture-facebook", dest=f"{BASE}/fr/ecriture-facebook/",
         kicker="ULTRATEXTGEN · FACEBOOK",
         headline="Écriture Stylée pour Facebook",
         benefit="Nom, bio et publications Facebook avec du style.",
         rows=[("Gras", st("Bold", "statut")), ("Cursive", st("Script", "souvenir")),
               ("Italique", st("Italic", "merci"))],
         title="Écriture Stylée pour Facebook — Copier-Coller",
         kw=["écriture facebook", "police facebook", "texte stylé facebook"]),
    dict(slug="police-d-ecriture-1", dest=f"{BASE}/fr/police-d-ecriture/",
         kicker="ULTRATEXTGEN · POLICES",
         headline="Police d'Écriture à Copier",
         benefit="Toutes les polices d'écriture stylées, en un clic.",
         rows=[("Cursive", st("Script", "texte")), ("Gras", st("Bold", "texte")),
               ("Gothique", st("Fraktur", "texte")), ("Ajouré", st("Double-struck", "texte"))],
         title="Police d'Écriture à Copier-Coller — Toutes les Polices",
         kw=["police d'écriture", "police d'écriture copier coller", "police ecriture"]),
    dict(slug="police-d-ecriture-2", dest=f"{BASE}/fr/police-d-ecriture/",
         kicker="ULTRATEXTGEN · GRATUIT",
         headline="Police d'Écriture Gratuite",
         benefit="Change ton style de texte en un instant, sans appli.",
         rows=[("Petites capitales", smallcaps("essaie moi")), ("Italique", st("Italic", "élégant")),
               ("Mono", st("Monospace", "unique"))],
         title="Police d'Écriture Gratuite — Change ton Style de Texte",
         kw=["police d'écriture", "générateur de police d'écriture"]),
    dict(slug="ecriture-style-1", dest=f"{BASE}/fr/ecriture-style/",
         kicker="ULTRATEXTGEN · STYLE",
         headline="Style d'Écriture à Copier",
         benefit="Des dizaines de styles d'écriture, gratuits et instantanés.",
         rows=[("Cursive", st("Script", "style")), ("Gras Italique", st("Bold Italic", "style")),
               ("Ajouré", st("Double-struck", "style"))],
         title="Style d'Écriture à Copier-Coller — Gratuit",
         kw=["style d'écriture", "style d'écriture à copier coller"]),
    dict(slug="ecriture-style-2", dest=f"{BASE}/fr/ecriture-style/",
         kicker="ULTRATEXTGEN · GÉNÉRATEUR",
         headline="Change ton Style d'Écriture",
         benefit="Générateur gratuit, aucun résultat identique.",
         rows=[("Gothique", st("Fraktur", "sombre")), ("Petites capitales", smallcaps("simple")),
               ("Italique", st("Italic", "doux"))],
         title="Change ton Style d'Écriture — Générateur Gratuit",
         kw=["style d'écriture", "changer style d'écriture"]),
    dict(slug="petite-ecriture", dest=f"{BASE}/fr/petite-ecriture/",
         kicker="ULTRATEXTGEN · PETITE ÉCRITURE",
         headline="Petite Écriture (Small Caps)",
         benefit="Petites majuscules élégantes à copier-coller.",
         rows=[("Petites capitales", smallcaps("petit texte")),
               ("Petites capitales gras", smallcaps("audacieux"))],
         title="Petite Écriture (Small Caps) à Copier-Coller",
         kw=["petite ecriture", "petite écriture copier coller"]),
    dict(slug="ecriture-italique", dest=f"{BASE}/fr/ecriture-italique/",
         kicker="ULTRATEXTGEN · ITALIQUE",
         headline="Écriture Italique à Copier",
         benefit="Texte italique élégant, prêt à copier-coller.",
         rows=[("Italique", st("Italic", "élégance")), ("Gras Italique", st("Bold Italic", "confiance")),
               ("Cursive Italique", st("Italic", "douceur"))],
         title="Écriture Italique à Copier-Coller — Gratuit",
         kw=["ecriture italique", "texte italique copier coller"]),
    dict(slug="belle-ecriture", dest=f"{BASE}/fr/belle-ecriture/",
         kicker="ULTRATEXTGEN · BELLE ÉCRITURE",
         headline="Belle Écriture à Copier",
         benefit="Des styles élégants pour tous tes réseaux sociaux.",
         rows=[("Cursive", st("Script", "gracieux")), ("Petites capitales", smallcaps("raffiné")),
               ("Italique", st("Italic", "doux"))],
         title="Belle Écriture à Copier-Coller pour tes Réseaux",
         kw=["belle ecriture", "belle écriture copier coller"]),
    dict(slug="changeur-de-police", dest=f"{BASE}/fr/changeur-de-police/",
         kicker="ULTRATEXTGEN · CHANGEUR",
         headline="Changeur de Police en Ligne",
         benefit="Change la police de ton texte gratuitement, sans appli.",
         rows=[("Gras", st("Bold", "avant")), ("Cursive", st("Script", "après")),
               ("Gothique", st("Fraktur", "transformé"))],
         title="Changeur de Police en Ligne — Gratuit et Rapide",
         kw=["changeur de police", "changeur de police en ligne"]),
    dict(slug="ecriture-speciale", dest=f"{BASE}/fr/ecriture-speciale/",
         kicker="ULTRATEXTGEN · SPÉCIALE",
         headline="Écriture Spéciale à Copier",
         benefit="Caractères et styles uniques pour te démarquer.",
         rows=[("Ajouré", st("Double-struck", "unique")), ("Gothique", st("Fraktur", "spécial")),
               ("Mono", st("Monospace", "différent"))],
         title="Écriture Spéciale à Copier-Coller — Caractères Uniques",
         kw=["ecriture speciale", "écriture spéciale copier coller"]),
    dict(slug="texte-en-gras-deep", dest=f"{BASE}/fr/texte-en-gras/",
         kicker="ULTRATEXTGEN · GRAS",
         headline="Texte en Gras — Toutes Plateformes",
         benefit="Du gras qui fonctionne sur Instagram, WhatsApp et plus.",
         rows=[("Gras", st("Bold", "TITRE")), ("Gras Italique", st("Bold Italic", "accent")),
               ("Ajouré", st("Double-struck", "TITRE"))],
         title="Texte en Gras à Copier-Coller — Toutes Plateformes",
         kw=["texte en gras", "texte en gras copier coller"]),
    dict(slug="majuscules-et-minuscules", dest=f"{BASE}/fr/majuscules-et-minuscules/",
         kicker="ULTRATEXTGEN · CONVERTISSEUR",
         headline="Majuscules et Minuscules",
         benefit="Convertis ton texte instantanément, gratuitement.",
         rows=[("MAJUSCULES", "TEXTE CONVERTI"), ("minuscules", "texte converti"),
               ("Petites capitales", smallcaps("texte converti"))],
         title="Majuscules et Minuscules — Convertisseur Gratuit",
         kw=["majuscules et minuscules", "convertisseur majuscules minuscules"]),
    dict(slug="combos-emoji", dest=f"{BASE}/fr/combos-emoji/",
         kicker="ULTRATEXTGEN · EMOJI",
         headline="Combos Emoji à Copier",
         benefit="Des combinaisons d'emoji prêtes pour ta bio.",
         rows=[("Séparateurs", "✦ ── ✦   ⊱ ⋆ ⊰"), ("Cœurs & étoiles", "♡ ✶ ⋆ ˚ ✧ ♥")],
         title="Combos Emoji à Copier-Coller — Pour ta Bio",
         kw=["combos emoji", "combo emoji copier coller"]),
    dict(slug="generateur-de-texte", dest=f"{BASE}/fr/generateur-de-texte/",
         kicker="ULTRATEXTGEN · GÉNÉRATEUR",
         headline="Générateur de Texte en Ligne",
         benefit="Tous les styles Unicode, gratuits et instantanés.",
         rows=[("Cursive", st("Script", "créer")), ("Gothique", st("Fraktur", "générer")),
               ("Ajouré", st("Double-struck", "copier"))],
         title="Générateur de Texte en Ligne — Tous les Styles",
         kw=["générateur de texte", "générateur de texte en ligne"]),
    dict(slug="compteur-de-mots", dest=f"{BASE}/fr/compteur-de-mots-et-de-caracteres/",
         kicker="ULTRATEXTGEN · COMPTEUR",
         headline="Compteur de Mots & Caractères",
         benefit="Vérifie la longueur de ton texte, en temps réel.",
         rows=[("Compte", "1 234 mots"), ("Compte", "7 890 caractères")],
         title="Compteur de Mots et Caractères — Gratuit",
         kw=["compteur de mots", "compteur de caractères en ligne"]),
]


def describe(pin):
    d = (f"{pin['headline']} — {pin['benefit']} Tape une fois et copie tous les "
         f"styles Unicode sur UltraTextGen : gratuit, dans le navigateur, sans "
         f"appli.")
    return d if len(d) <= 500 else d[:497].rsplit(" ", 1)[0] + "…"


def alt(pin):
    return (f"Pin vertical en français : {pin['headline']} — exemples de texte "
            f"stylé à copier-coller depuis UltraTextGen.")


def main():
    build_board(LOCALE, PINS, BOARD, f"{BASE}/fr/police-d-ecriture/", CAMPAIGN,
                CTA, SUFFIX, describe, alt)


if __name__ == "__main__":
    main()
