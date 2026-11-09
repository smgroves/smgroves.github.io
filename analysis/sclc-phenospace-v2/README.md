# SCLC Phenospace v2 analysis

This folder holds the analysis behind the v2 tab of `/apps/sclc-phenospace/`. It reruns the Wooten, Groves et al. (2019, *PLoS Comput Biol*, doi:10.1371/journal.pcbi.1007343) module pipeline on cell lines plus tumors, with the subtypes A, A2, N, P, Y and I. It is an unpublished reanalysis. The folder is excluded from the Jekyll build (`exclude:` in `_config.yml`).

Run every step from this folder:

| Step | Script | Output (in `results/`) | Time |
|---|---|---|---|
| 0 | `sh 00_download.sh` | `data/` (inputs, gitignored: expression ~33 MB, Groves 2022 labels, Gay 2021 signature) | |
| 1 | `python3 01_labels.py` | `labels_v2.csv` | seconds |
| 2 | `Rscript 02_pipeline.R` | `v2_module_genes.csv`, `v2_eigengenes.csv`, `v2_kruskal.csv`, `v2_gsea.csv`, `v2_go.csv` (+ `v2_net.rds`, gitignored) | ~10 min |
| 3 | `Rscript 03_tsne.R` | `v2_tsne.csv` (+ `v2_sim.rds`, gitignored) | ~3 min first time, seconds after |
| 4 | `python3 04_build_app_data.py` | writes `../../apps/sclc-phenospace/data_v2.js` | seconds |

## Data
`CCLE_Minna_Thomas_COMBAT.csv` comes from [smgroves/Groves-CellSys2021](https://github.com/smgroves/Groves-CellSys2021). It is batch-corrected expression for 14,546 genes in 201 samples: 50 CCLE lines (`c.`), 70 Minna lines (`m.`) and 81 George et al. (2015) tumors (`t.`). The cell line subtype calls are the `NEW_10_2020` column of `combined_clusters_2020-05-27-MC copy.csv` from the same repo.

## Labels (step 1)
- **Gay et al. (2021) rule.** ASCL1, NEUROD1, POU2F3 and YAP1 are each called on or off with a 2-component Gaussian mixture, fit separately for each source. A sample with ASCL1, NEUROD1 and POU2F3 all off is SCLC-I. Otherwise it takes the "on" TF with the highest z-score within its source.
- **Cell lines** keep the Groves et al. (2022) call. A Y line would become I only if it were triple-negative *and* YAP1-low. All 9 Y lines are triple-negative but YAP1-high (3.5–6.7, against an "on" cutoff of about 0.7–0.9), so they stay Y.
- **SCLC-I markers.** Each sample is also matched to the four subtype profiles of Gay et al.'s 1,300-gene signature (their Table S1; 1,092 of the genes are in this data). Genes are z-scored within source, and the sample takes the profile with the highest Spearman correlation.
- **Tumors** are SCLC-I only if they are triple-negative *and* best match the SCLC-I profile. A triple-negative tumor without the inflamed profile becomes Y if YAP1 is on, otherwise it takes its highest TF. Other tumors keep Gay's TF call (A, N or P).
- **NCIH1339** is the one cell line that best matches the SCLC-I profile, but it is YAP1-high, so it stays Y.

Counts: A 87, A2 28, N 49, P 23, Y 12 (9 cell lines and 3 tumors), I 2 (tumors S02328 and S02242). With only 2 samples, treat the SCLC-I module calls with caution.

Notes for follow-up:
- HCC33 and H2227 (N in Groves 2022) fall just under the NEUROD1 cutoff.
- S02246 has many inflamed genes high, but its best overall match is the P profile, and it is YAP1-high, so it is Y.

## Pipeline (steps 2–3), following Wooten et al. (2019)
- **Modules:** signed WGCNA (power 12, min module size 100, deepSplit 2, pamRespectsDendro, merge height 0.15, a single block).
- **Module test:** Kruskal–Wallis on the eigengenes across subtypes (BH FDR < 0.05).
- **GSEA:** fgsea of each module gene set, with genes ranked by Welch t for that subtype vs. the rest.
- **GO:** biological process over-representation with clusterProfiler `enrichGO`, against the universe of all genes (BH FDR < 0.05). The 2019 paper used ConsensusPathDB instead.
- **Map:** GOSemSim Wang similarity between terms, then t-SNE on 1 − similarity (perplexity 30, 1,000 iterations, seed 4355).
  - The t-SNE is seeded from the 2019 map so the two tabs line up. The 640 GO terms in both maps start at their 2019 coordinates. Each new term starts at the similarity-weighted mean position of its 5 most similar shared terms.
  - Rtsne skips early exaggeration when given a starting layout, so it refines the map rather than rebuilding it.
  - The result is then scaled, rotated and shifted onto the 2019 frame. Shared terms end up a median 6.4 units (90th percentile 12.8) from their 2019 positions, on a map about 70 units wide. Of each shared term's 10 nearest shared neighbors in 2019, about half are still among its 10 nearest in v2.

## "Up in" rule (step 4)
A module is marked up in a subtype when both of these hold:
1. GSEA gives NES > 0 and FDR < 0.05.
2. That subtype's median eigengene is at least 75% of the highest subtype median, and that highest median is > 0.

The 2019 paper used GSEA alone. With 201 samples, GSEA alone flags most modules in two or three subtypes.

## Module names and colors (step 4)
To keep the two tabs comparable, v2 modules are matched to 2019 modules. The 2019 gene lists aren't published, so the match uses shared GO terms: Jaccard ≥ 0.05, one-to-one, maximizing the total overlap. A pair only counts if the two modules are high in corresponding subtypes (NE→A, NEv1→N, NEv2→A2, Non-NE→P/Y/I).

Each matched module takes the 2019 name and color:

| v2 name | WGCNA color in rerun | shared GO terms | v2 subtypes | 2019 subtypes |
|---|---|---|---|---|
| Yellow | turquoise | 16% | A, N | NE, NEv1 |
| Brown | red | 7% | A2 | NE, NEv2 |
| Black | brown | 14% | A2, Y | NEv2, Non-NE |
| Salmon | royalblue | 30% | N | NEv1 |
| Purple | salmon | 22% | P, Y | Non-NE |
| Red | magenta | 6% | P, Y | NEv1, Non-NE |
| Blue | blue | 19% | Y | Non-NE |

Unmatched modules whose WGCNA color is also a 2019 color were renamed:
- green → dark olive green
- black → saddle brown
- yellow → orange
- purple → violet
- pink → sky blue

No v2 module matches the 2019 Turquoise, Green, Midnight blue or Pink modules.

## Region labels
Both tabs use the hand-placed Fig. 3B labels (`ALL_REGIONS` in `index.html`), keeping only those whose nearby GO terms match.
- **2019 tab:** Ion transport and Learning are dropped. The terms under them are transport/localization and muscle/digestive processes.
- **v2 tab:** Cell cycle, Homeostasis, Ion transport, Response to stimulus and Learning are dropped (`DROP_V2`). Adhesion is moved onto its v2 cluster (`V2_MOVE`).

## Versions
R 4.6.1 with WGCNA 1.74, fgsea 1.38.0, clusterProfiler 4.20.3, org.Hs.eg.db 3.23.1, GO.db 3.23.1, GOSemSim 2.38.3 and Rtsne 0.17. Python 3 with pandas 2.3.3 and scikit-learn 1.7.2.
