"""Step 4. Build apps/sclc-phenospace/data_v2.js (the v2 tab of the web app) from results/.

"Up in" rule (stricter than GSEA alone): a module is up in a subtype when
  (1) GSEA of the module gene set, genes ranked subtype vs. rest, gives NES > 0 and FDR < 0.05, and
  (2) that subtype's median eigengene is at least 75% of the highest subtype median (which must be > 0).

Module names: each v2 module is matched to at most one 2019 module by shared GO terms (Jaccard >= 0.05,
one-to-one, maximising total overlap) among 2019 modules whose subtypes agree (NE->A, NEv1->N, NEv2->A2,
Non-NE->P/Y/I). A matched module takes the 2019 name and color. An unmatched module whose WGCNA color is
also a 2019 module color is renamed (RENAME_FREE) so that no color means two different things.
"""
import json, os, re, subprocess
from scipy.optimize import linear_sum_assignment
os.chdir(os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd

OUT = "../../apps/sclc-phenospace/data_v2.js"
V1JS = "../../apps/sclc-phenospace/data.js"
TOP_FRAC = 0.75

lab = pd.read_csv("results/labels_v2.csv", index_col=0)
me = pd.read_csv("results/v2_eigengenes.csv", index_col=0)
kw = pd.read_csv("results/v2_kruskal.csv").set_index("module")
gs = pd.read_csv("results/v2_gsea.csv")
go = pd.read_csv("results/v2_go.csv")
ts = pd.read_csv("results/v2_tsne.csv")
mg = pd.read_csv("results/v2_module_genes.csv")
x = pd.read_csv("data/CCLE_Minna_Thomas_COMBAT.csv", index_col=0)

SUB_ORDER = ["A", "A2", "N", "P", "Y", "I"]
SUBTYPES = {
    "A":  {"label": "A",  "alt": "SCLC-A",  "desc": "ASCL1-high neuroendocrine subtype (NE in 2019)."},
    "A2": {"label": "A2", "alt": "SCLC-A2", "desc": "ASCL1-high variant (NEv2 in 2019). Called only in cell lines; Gay's rule has no A2, so no tumor is A2."},
    "N":  {"label": "N",  "alt": "SCLC-N",  "desc": "NEUROD1-high neuroendocrine subtype (NEv1 in 2019)."},
    "P":  {"label": "P",  "alt": "SCLC-P",  "desc": "POU2F3-high, tuft-cell-like, non-neuroendocrine subtype."},
    "Y":  {"label": "Y",  "alt": "SCLC-Y",  "desc": "YAP1-high, non-neuroendocrine subtype (Non-NE in 2019). The 9 Groves et al. (2022) Y lines (triple-negative but YAP1-high) plus 3 triple-negative, YAP1-high tumors without the inflamed profile."},
    "I":  {"label": "I",  "alt": "SCLC-I",  "desc": "Inflamed: ASCL1, NEUROD1 and POU2F3 all off AND best matching the SCLC-I profile of Gay et al. (2021)'s 1,300-gene signature. Only 2 tumors, so treat its modules with caution."},
}

sig = [m for m in kw.index if kw.loc[m, "kw_q"] < 0.05 and m in set(go.module)]

# colors from R names
pretty = lambda n: re.sub(r"(\D)(\d)", r"\1 \2", n).replace("light", "light ").replace("dark", "dark ").replace("midnight", "midnight ") \
    .replace("saddle", "saddle ").replace("sky", "sky ").replace("green yellow", "green-yellow").replace("greenyellow", "green-yellow").strip().capitalize()

# 2019 modules: GO sets, subtypes (S4 Table) and the colors used on the 2019 tab
v1 = json.loads(open(V1JS).read().split("window.PHENO = ", 1)[1].rstrip().rstrip(";"))
v1sets = {m: {v1["terms"][i][0] for i, _ in rows} for m, rows in v1["modules"].items()}
V1NAME = {"midnightblue": "Midnight blue"}
V1HEX = {"brown": "#8b4a1f", "yellow": "#f2e21b", "turquoise": "#3cc0c4", "black": "#111111", "blue": "#3a55a8", "green": "#5fb848",
         "midnightblue": "#1c1c5e", "salmon": "#f4857a", "red": "#e62a2a", "purple": "#a14aa3", "pink": "#f7b6c8"}
V1HIGH = {"brown": ["NE", "NEv2"], "yellow": ["NE", "NEv1"], "turquoise": ["NE"], "black": ["NEv2", "Non-NE"], "blue": ["Non-NE"],
          "green": ["NEv2"], "midnightblue": ["NEv2"], "salmon": ["NEv1"], "red": ["NEv1", "Non-NE"], "purple": ["Non-NE"], "pink": ["NEv1"]}
V1TOV2 = {"NE": {"A"}, "NEv1": {"N"}, "NEv2": {"A2"}, "Non-NE": {"P", "Y", "I"}}
RENAME_FREE = {"green": "darkolivegreen", "black": "saddlebrown", "yellow": "orange", "purple": "violet", "pink": "skyblue",
               "blue": "steelblue", "brown": "sienna3", "red": "orangered4", "salmon": "plum1", "turquoise": "paleturquoise",
               "midnightblue": "darkmagenta"}

terms = ts[["ID", "name", "x", "y"]].copy()
terms["x"] = terms.x.round(2); terms["y"] = terms.y.round(2)
terms = terms.sort_values(["x", "y"]).reset_index(drop=True)
idx = {t: i for i, t in enumerate(terms.ID)}

med = me.groupby(lab.loc[me.index, "v2"]).median()
med = med.rename(columns=lambda c: c[2:]).T[SUB_ORDER]
MARKERS = ["ASCL1", "NEUROD1", "POU2F3", "YAP1", "INSM1", "REST", "MYC", "MYCL", "MYCN", "NOTCH1", "CHGA", "SYP", "DLL3", "SOX2", "CD274", "HLA-A", "STAT1", "VIM", "TEAD4"]
expr = x.T  # samples x genes
modules, mods = {}, {}
for m in sig:
    rows = go[go.module == m].sort_values("pvalue")
    modules[m] = [[idx[i], float("%.3g" % p)] for i, p in zip(rows.ID, rows.pvalue) if i in idx]
    genes = mg.gene[mg.module == m].tolist()
    e = me["ME" + m]
    kme = expr[genes].corrwith(e).sort_values(ascending=False)
    hubs = kme.index[:8].tolist()
    mk = [g for g in MARKERS if g in genes]
    g = gs[(gs.module == m)]
    gsea_up = [s for s in SUB_ORDER if ((g.subtype == s) & (g.NES > 0) & (g.padj < 0.05)).any()]
    top = med.loc[m].max()
    high = [s for s in gsea_up if top > 0 and med.loc[m, s] >= TOP_FRAC * top]
    about = f"Median eigengene is highest in {SUBTYPES[med.loc[m].idxmax()]['alt']}. "
    if set(gsea_up) - set(high):
        about += f"GSEA alone also flags {', '.join(SUBTYPES[s]['alt'] for s in gsea_up if s not in high)}, but its median there is lower. "
    about += f"Hub genes (highest correlation with the eigengene): {', '.join(hubs)}."
    if mk: about += f" Subtype markers in this module: {', '.join(mk)}."
    mods[m] = {"name": m, "color": None, "q": float("%.3g" % kw.loc[m, "kw_q"]), "high": high,
               "genes": len(genes), "about": about}

# match v2 modules to 2019 modules and rename
v2sets = {m: {terms.ID[i] for i, _ in modules[m]} for m in mods}
M2, M1 = list(mods), list(v1sets)
J = np.array([[len(v2sets[a] & v1sets[b]) / len(v2sets[a] | v1sets[b]) for b in M1] for a in M2])
ok = np.array([[bool(set(mods[a]["high"]) & set().union(*(V1TOV2[h] for h in V1HIGH[b]))) for b in M1] for a in M2])
W = np.where(ok & (J >= 0.05), J, 0)
match = {M2[i]: (M1[j], J[i, j]) for i, j in zip(*linear_sum_assignment(-W)) if W[i, j] > 0}
newname = {m: match[m][0] if m in match else (RENAME_FREE[m] if m in V1HEX else m) for m in M2}
assert len(set(newname.values())) == len(M2), newname
rhex = subprocess.run(["Rscript", "-e", "cat(rgb(t(col2rgb(c(%s))), maxColorValue=255))" % ",".join('"%s"' % newname[m] for m in M2)],
                      capture_output=True, text=True, check=True).stdout.split()
for m, h in zip(M2, rhex):
    n = newname[m]
    mods[m]["name"] = V1NAME.get(n, pretty(n)); mods[m]["color"] = V1HEX.get(n, h) if m in match else h
    if m in match:
        mods[m]["about"] += f" Matched to the 2019 {V1NAME.get(n, n.capitalize())} module ({match[m][1]:.0%} of GO terms shared), so it takes that name and color; WGCNA called it {m} in this rerun."
    elif n != m:
        mods[m]["about"] += f" No 2019 match; WGCNA called it {m}, renamed so it is not confused with the 2019 {V1NAME.get(m, m.capitalize())} module."
    else:
        mods[m]["about"] += " No 2019 module shares enough of its GO terms to count as a match."
print("matches", {m: (n, round(j, 2)) for m, (n, j) in match.items()})
print("renamed", {m: n for m, n in newname.items() if m not in match and n != m})
modules = {newname[m]: v for m, v in modules.items()}
mods = {newname[m]: v for m, v in mods.items()}
me = me[["ME" + m for m in M2]].rename(columns=lambda c: "ME" + newname[c[2:]])
assert not (set(newname.values()) & (set(mg.module) - set(M2))), "renamed onto an existing WGCNA module name"

# order modules: by subtype of first "high", then q
def key(m):
    h = mods[m]["high"]
    return (SUB_ORDER.index(h[0]) if h else 9, mods[m]["q"])
order = sorted(mods, key=key)
mods = {m: mods[m] for m in order}

# region labels: the app reuses the hand-placed Fig. 3B labels from the 2019 tab, since the map is in the 2019 frame

# samples (eigengenes for the heatmap)
srcname = {"CCLE": "CCLE", "Minna": "Minna", "tumor": "tumor"}
samples = {
    "names": [n.split(".", 1)[1] for n in me.index],
    "source": [srcname[lab.loc[n, "source"]] for n in me.index],
    "subtype": [lab.loc[n, "v2"] for n in me.index],
    "me": {m: [round(float(v), 3) for v in me["ME" + m]] for m in order},
}

n_cl = int((lab.source != "tumor").sum()); n_t = int((lab.source == "tumor").sum())
counts = lab.v2.value_counts()
intro = (f"<strong>What this shows.</strong> A rerun of the 2019 method on {n_cl} SCLC cell lines (CCLE and Minna) plus {n_t} human tumors (George et al. 2015), "
         f"with the newer subtypes SCLC-P and SCLC-I (SCLC-Y kept for YAP1-high lines). Each dot is one of {len(terms):,} GO biological processes enriched in a v2 WGCNA module; "
         "colored dots are the terms in the selected modules, sized by enrichment p-value. "
         "Modules that share GO terms with a 2019 module take its name and color; the rest have new colors. "
         "The map is seeded from the 2019 layout, so regions sit roughly where they did on the 2019 tab and carry the same labels. Switch to <em>Eigengenes by sample</em> to see each module in every cell line and tumor.")
mod_note = ("&#9679; = module up in that subtype: enriched by GSEA (genes ranked by subtype vs. rest; FDR &lt; 0.05) "
            "<em>and</em> that subtype's median eigengene is at least 75% of the highest. GO = number of enriched processes.")
credits = (
    "<p class=\"small\"><b>How v2 was made.</b> Expression: the batch-corrected CCLE + Minna cell line + George et al. tumor matrix from Groves et al. (2022) "
    f"({x.shape[0]:,} genes). Subtypes: cell lines use the Groves et al. (2022) calls; lines with ASCL1, NEUROD1 and POU2F3 all off (Gay et al. 2021) were relabeled SCLC-I, "
    "unless YAP1 was high. All 9 SCLC-Y lines are triple-negative but YAP1-high, so they stay Y and no cell line is I. "
    "Tumors take Gay's TF call (A, N or P); a triple-negative tumor is SCLC-I only if it also best matches the SCLC-I profile of Gay's 1,300-gene signature, otherwise Y if YAP1-high. That gives 2 SCLC-I tumors. "
    "Counts: " + ", ".join(f"{s} {counts.get(s, 0)}" for s in SUB_ORDER) + ".</p>"
    "<p class=\"small\">Pipeline, following Wooten et al. (2019): signed WGCNA (power 12, min module size 100, deepSplit 2, merge height 0.15); "
    "Kruskal&ndash;Wallis on eigengenes across subtypes (BH FDR &lt; 0.05); GSEA of module gene sets per subtype (fgsea), "
    "plus a stricter call than 2019: the subtype's median eigengene must be within 75% of the top subtype's; "
    "GO biological process over-representation with clusterProfiler (BH FDR &lt; 0.05; the 2019 paper used ConsensusPathDB); "
    "GoSemSim (Wang) distances projected with t-SNE (perplexity 30), started from the 2019 map: the 640 terms shared with 2019 begin at their 2019 positions and new terms "
    "next to their most similar shared terms, then the result is scaled onto the 2019 frame (shared terms end a median 6 units from their 2019 spot, on a map about 70 wide). "
    "Module names: a v2 module that shares at least 5% of its GO terms with a 2019 module high in the matching subtype takes that module's name and color (one-to-one); "
    "others keep their WGCNA color, renamed if that color was a 2019 module. Region labels are the hand-placed Fig. 3B labels from the 2019 tab; "
    "they fit where the shared terms sit, and areas made mostly of new terms may not match their label. This is an unpublished reanalysis.</p>"
    "<p class=\"small\">SCLC-I is defined in tumors by an inflamed signature; here it needs both the triple-negative call and the closest match to Gay's SCLC-I profile, and it has only 2 samples. "
    "Several SCLC-Y lines have since been reclassified as SMARCA4-deficient tumors (Ng et al. 2024, <i>Clin Cancer Res</i>).</p>")

data = {"intro": intro, "modNote": mod_note, "credits": credits,
        "terms": terms.values.tolist(), "modules": modules, "mods": mods, "subtypes": SUBTYPES,
        "start": order[:2], "samples": samples}
js = "// SCLC Phenospace v2: unpublished rerun of the Wooten et al. (2019) pipeline. Built by analysis/sclc-phenospace-v2/04_build_app_data.py.\n"
js += "window.PHENO_V2 = " + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n"
open(OUT, "w").write(js)
print("modules", len(mods), {m: (v["high"], len(modules[m])) for m, v in mods.items()})
print("terms", len(terms), "size KB", len(js) // 1024)
