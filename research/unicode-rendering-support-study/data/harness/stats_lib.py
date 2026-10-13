import math
def wilson(k, n, z=1.96):
    if n == 0: return (float('nan'), float('nan'))
    p = k / n; d = 1 + z * z / n; c = p + z * z / (2 * n); h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return ((c - h) / d, (c + h) / d)
def rr_ci(a, n1, b, n2, z=1.96):
    """risk ratio (a/n1)/(b/n2) with log-normal CI (Katz); 0.5 continuity if a zero cell"""
    if a == 0 or b == 0: a += .5; b += .5; n1 += 1; n2 += 1
    rr = (a / n1) / (b / n2); se = math.sqrt(1 / a - 1 / n1 + 1 / b - 1 / n2)
    return rr, math.exp(math.log(rr) - z * se), math.exp(math.log(rr) + z * se)
def mh_rr(strata):
    """Mantel-Haenszel pooled risk ratio over strata [(a, n1, b, n2), ...] (a/n1 exposed, b/n2 unexposed) with Greenland-Robins CI"""
    num = den = 0.0; var_num = 0.0
    for a, n1, b, n2 in strata:
        n = n1 + n2
        if n == 0: continue
        num += a * n2 / n; den += b * n1 / n
    if num == 0 or den == 0: return float('nan'), float('nan'), float('nan')
    rr = num / den
    P = Q = R = S = 0.0
    for a, n1, b, n2 in strata:
        n = n1 + n2
        if n == 0: continue
        m = a + b; P += (n1 * n2 * m - a * b * n) / n ** 2; Q += (a * n2 / n); R += (b * n1 / n)
        S += 0
    # Greenland-Robins variance of ln(RR_MH)
    num_v = sum((n1 * n2 * (a + b) - a * b * (n1 + n2)) / (n1 + n2) ** 2 for a, n1, b, n2 in strata if n1 + n2 > 0)
    se = math.sqrt(num_v / (num * den))
    return rr, math.exp(math.log(rr) - 1.96 * se), math.exp(math.log(rr) + 1.96 * se)
def quantiles(xs, qs=(.25, .5, .75, .9)):
    xs = sorted(xs); n = len(xs)
    if n == 0: return {q: float('nan') for q in qs}
    out = {}
    for q in qs:
        pos = (n - 1) * q; lo = int(math.floor(pos)); hi = min(lo + 1, n - 1); out[q] = xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)
    return out
