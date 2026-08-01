#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""event_occurrence.py — resolve an event spec's `occurrence` rule to dates.

Used by scripts/generate_event_page_from_spec.py to bake the next few real
dates into an event page at build time, so the page can say "Halloween 2026
falls on Saturday, October 31" instead of "check a current calendar for the
exact date, then come back" — which sent the reader away on the single
largest query cluster these pages touch.

Two kinds of rule, and the split matters:

  DETERMINISTIC (resolved here, in Python, at build time)
    fixed         — same month/day every year (Halloween, Christmas)
    nth_weekday   — the Nth <weekday> of a month (US Thanksgiving, Mother's Day)
    last_weekday  — the last <weekday> of a month
    easter        — computed via the anonymous Gregorian algorithm
    table         — an explicit list of ISO dates supplied by the spec

  LUNAR / OBSERVED (deliberately NOT resolved here)
    islamic, chinese, hindu — left to the browser, where
    Intl.DateTimeFormat's `islamic-umalqura` and `chinese` calendars are
    backed by real ICU data. Hardcoding those here would mean either shipping
    a conversion table this repo can't verify, or inventing dates. Eid and
    Diwali also move by local moon sighting, so a single global date would be
    wrong for some readers no matter how it was derived. See
    js/events/eventDates.js for the runtime half.

A spec with no `occurrence` block resolves to no dates at all, and the page
keeps its rule-based prose. Nothing here ever guesses.
"""

import datetime

WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}

LUNAR_TYPES = {"islamic", "chinese", "hindu"}


class OccurrenceError(ValueError):
    pass


def easter_date(year):
    """Gregorian Easter Sunday (anonymous Gregorian / Meeus algorithm)."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month, day = divmod(h + l - 7 * m + 114, 31)
    return datetime.date(year, month, day + 1)


def _nth_weekday(year, month, weekday, n):
    """Nth <weekday> of a month; n may be negative to count from the end."""
    if n > 0:
        first = datetime.date(year, month, 1)
        offset = (weekday - first.weekday()) % 7
        day = 1 + offset + (n - 1) * 7
        last_day = _days_in_month(year, month)
        if day > last_day:
            raise OccurrenceError(f"no {n}th weekday {weekday} in {year}-{month:02d}")
        return datetime.date(year, month, day)
    last_day = _days_in_month(year, month)
    last = datetime.date(year, month, last_day)
    offset = (last.weekday() - weekday) % 7
    return last - datetime.timedelta(days=offset + (abs(n) - 1) * 7)


def _days_in_month(year, month):
    if month == 12:
        nxt = datetime.date(year + 1, 1, 1)
    else:
        nxt = datetime.date(year, month + 1, 1)
    return (nxt - datetime.timedelta(days=1)).day


def _weekday_index(value):
    if isinstance(value, int):
        return value
    try:
        return WEEKDAYS[str(value).strip().lower()]
    except KeyError:
        raise OccurrenceError(f"unknown weekday {value!r}")


def is_lunar(occurrence):
    return bool(occurrence) and occurrence.get("type") in LUNAR_TYPES


def next_occurrences(occurrence, today=None, count=6):
    """Return up to `count` dates on/after `today`, ascending.

    Returns [] for a missing rule or a lunar one — the caller must fall back to
    rule-based prose rather than printing a date it can't stand behind.
    """
    if not occurrence or not isinstance(occurrence, dict):
        return []
    kind = occurrence.get("type")
    if kind in LUNAR_TYPES:
        return []

    today = today or datetime.date.today()

    if kind == "table":
        dates = []
        for raw in occurrence.get("dates", []):
            try:
                d = datetime.date.fromisoformat(raw)
            except (TypeError, ValueError):
                raise OccurrenceError(f"occurrence.dates entry {raw!r} is not an ISO date")
            if d >= today:
                dates.append(d)
        return sorted(dates)[:count]

    out = []
    year = today.year
    # +2 so a rule whose date has already passed this year still fills `count`.
    for y in range(year, year + count + 2):
        try:
            if kind == "fixed":
                d = datetime.date(y, int(occurrence["month"]), int(occurrence["day"]))
            elif kind == "nth_weekday":
                d = _nth_weekday(y, int(occurrence["month"]),
                                 _weekday_index(occurrence["weekday"]),
                                 int(occurrence["n"]))
            elif kind == "last_weekday":
                d = _nth_weekday(y, int(occurrence["month"]),
                                 _weekday_index(occurrence["weekday"]), -1)
            elif kind == "easter":
                d = easter_date(y)
                offset = int(occurrence.get("offset_days", 0))
                if offset:
                    d += datetime.timedelta(days=offset)
            else:
                raise OccurrenceError(f"unknown occurrence.type {kind!r}")
        except (KeyError, ValueError) as exc:
            raise OccurrenceError(f"bad occurrence rule {occurrence!r}: {exc}")
        if d >= today:
            out.append(d)
        if len(out) >= count:
            break
    return out


MONTHS = {
    "en": ["January", "February", "March", "April", "May", "June", "July",
           "August", "September", "October", "November", "December"],
    "es": ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
           "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
}
DAYS = {
    "en": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "es": ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
}


def format_date(d, language="en", with_weekday=True, with_year=True):
    lang = language if language in MONTHS else "en"
    month = MONTHS[lang][d.month - 1]
    weekday = DAYS[lang][d.weekday()]
    if lang == "es":
        core = f"{d.day} de {month}"
        if with_year:
            core += f" de {d.year}"
        return f"{weekday}, {core}" if with_weekday else core
    core = f"{month} {d.day}"
    if with_year:
        core += f", {d.year}"
    return f"{weekday}, {core}" if with_weekday else core
