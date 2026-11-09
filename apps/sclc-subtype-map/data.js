// SCLC subtype map: data
// Curated from Sarah Groves's SCLC Plasticity Wiki and fact-checked on 2026-11-08 against
// PubMed abstracts (all papers) and full text where available (Groves 2022, Gay 2021, Gopal 2022,
// Shields 2026, Stewart 2026, Bhattacharya 2026). DOIs verified via Crossref.
//
// rel types for label -> state edges:
//   "same"    = the label is essentially this state (renamed or rediscovered)
//   "partial" = overlaps / is a subset / covers this state among others
// authors: full author lists from PubMed (Crossref for bioRxiv), used for search
// data: kinds of data each paper used (see DATA_TYPES in index.html); a label's own data overrides its paper's
// conflicts: contested claims, label <-> label (or label -> state)
// zone: where an unlinked label sits (ne / nonne / mid), from how its own paper describes it
// tx: treatment findings, state level [text, source, evidence]; label level is a sentence
// markers: gene -> state, level "high" | "low"

window.SCLC_MAP = {
  states: [
    { id: "A",  name: "SCLC-A",  x: 0.20, y: 0.30, ne: true,
      tf: "ASCL1 (ISL1-high)",
      desc: "Classic neuroendocrine state: ASCL1-high, with the highest ISL1 of the five archetypes (Groves 2022). The most common subtype (69–78% of tumors by IHC). L-MYC drives ISL1, which drives ASCL1 (Shields 2026); ISL1-high tumors respond durably to lurbinectedin.",
      tx: [["More sensitive to DNA alkylators and cell-cycle inhibitors: cell lines closest to the SCLC-A archetype", "Groves 2022", "cell lines"], ["Sensitive to BCL2 inhibitors; BCL2 protein is higher in SCLC-A tumors", "Gay 2021", "cell lines, tumors"], ["Cisplatin and olaparib response varies; SLFN11-high SCLC-A lines are much more sensitive than SLFN11-low ones", "Gay 2021", "cell lines"], ["ISL1-high tumors (ASCL1+ or NEUROD1+ background) predicted durable response to lurbinectedin", "Shields 2026", "patients (n=16), cell lines"], ["NE tumors were more likely to respond to replication-stress-targeted therapies", "Lissa 2022", "patients"]] },
    { id: "A2", name: "SCLC-A2", x: 0.08, y: 0.62, ne: true,
      tf: "ASCL1 + CALCA/CGRP",
      desc: "Second ASCL1+ state, first described by Wooten et al. 2019 (there called NEv2). Lower ISL1 than SCLC-A, highest CALCA (CGRP); its task is neuro- and immuno-modulatory signaling, and A2-like cell lines are most sensitive to MAPK inhibitors (Groves 2022). Representative lines DMS53 and DMS454.",
      tx: [["Cell lines closest to SCLC-A2 are most sensitive to MAPK-pathway inhibitors", "Groves 2022", "cell lines"], ["NEv2 (A2) was consistently the least drug-sensitive subtype", "Wooten 2019", "cell lines"], ["NEv2-like (hybrid NE/non-NE) metastatic tumors were chemotherapy-resistant with very poor outcomes", "Lissa 2022", "patients"]] },
    { id: "N",  name: "SCLC-N",  x: 0.40, y: 0.15, ne: true,
      tf: "NEUROD1",
      desc: "NEUROD1-high 'variant' NE state, often MYC-driven and vulnerable to Aurora kinase inhibition (Mollaoglu 2017). Archetype task: slithering and axon-like protrusions (Groves 2022). Less immune infiltrate than SCLC-A (Chan 2021).",
      tx: [["Highly sensitive to Aurora kinase inhibitors; cMYC protein predicts response", "Gay 2021", "cell lines"], ["MYC-high, NEUROD1-high tumors respond to Aurora kinase inhibition combined with chemotherapy", "Mollaoglu 2017", "mouse"], ["Relatively resistant to cisplatin", "Gay 2021", "cell lines"], ["MYC-driven SCLC depends on arginine; arginine depletion (ADI-PEG 20) outperformed standard chemotherapy (linked to N by curator)", "Chalishazar 2019", "mouse, PDX"], ["NE tumors were more likely to respond to replication-stress-targeted therapies", "Lissa 2022", "patients"]] },
    { id: "AN", name: "A/N hybrid", x: 0.31, y: 0.52, ne: true, hybrid: true,
      tf: "ASCL1 + NEUROD1",
      desc: "Not a formal subtype, but ASCL1/NEUROD1 co-expression is common: 37% of tumors by IHC (Baine 2020). Intermediate and admixed identities also recur in single-cell data (Chan 2021).",
      tx: [] },
    { id: "At", name: "SCLC-At", x: 0.30, y: 0.84, ne: true,
      tf: "ATOH1",
      desc: "ATOH1-high state. First reported in CDX models (Simpson 2020), also seen in metastatic biopsies (Lissa 2022) and as an Atoh1+ state in basal-cell-derived mouse tumors (Ireland 2025).",
      tx: [] },
    { id: "Int", name: "Intermediate", lines: ["Inter-", "mediate"], x: 0.53, y: 0.68, ne: null,
      tf: "NCAM1+ ICAM1+",
      desc: "Low-identity, cycling state between the NE and non-NE programs, found in mouse RPR2 tumors (Bhattacharya 2026). Cells co-express the NE marker NCAM1 and the non-NE marker ICAM1, and have high MHC and antigen-presentation genes and strong SCLC-I signature activity. Sorted NCAM1+ICAM1+ cells regenerated NE, non-NE and Intermediate cells in organoids, while NE and non-NE cells did not convert directly, so NE ↔ non-NE switching appears to go through this state. Also seen in RPM/RPMA mouse tumors and in LUAD-to-SCLC transformation; in human tumors the evidence so far is bulk RNA signature scores (112 tumors).",
      tx: [["RORB loss pushes NE cells into the Intermediate state, turns on immune programs and slowed tumor growth in immunocompetent mice, but not in immunodeficient mice", "Bhattacharya 2026", "mouse"]] },
    { id: "I",  name: "SCLC-I",  x: 0.70, y: 0.60, ne: false,
      tf: "none (inflamed)",
      desc: "Inflamed subtype defined by Gay et al. 2021: low ASCL1, NEUROD1 and POU2F3 signatures with an inflamed gene signature. Benefits most from adding immunotherapy. YAP1 is higher here but does not define it (Gay 2021); in relapsed biopsies, no SCLC-I biopsy had YAP1+ cells (Stewart 2026).",
      tx: [["Greatest benefit from adding immunotherapy (atezolizumab) to chemotherapy", "Gay 2021", "patients (IMpower133)"], ["Most resistant to cisplatin; cisplatin also pushed SCLC-A PDXs toward SCLC-I", "Gay 2021", "cell lines, PDX"], ["Among immune-infiltrated tumors, NE tumors with low macrophage signals gained the most from atezolizumab; non-NE, macrophage-high tumors gained less", "Nabet 2024", "patients (IMpower133)"], ["Patients with non-NE tumors preferentially benefited from immunotherapy", "Lissa 2022", "patients"]] },
    { id: "Y",  name: "SCLC-Y",  x: 0.85, y: 0.33, ne: false,
      tf: "YAP1",
      desc: "YAP1-high, non-NE state. Largely absent from treatment-naive SCLC but emerges with treatment resistance, with LCNEC-like features (Stewart 2026). Archetype task: injury response (Groves 2022). In Ng 2024, 6 of 8 YAP1+ 'SCLC-Y' cell lines looked like SMARCA4-deficient tumors rather than SCLC.",
      tx: [["YAP1+ cells at relapse lack the DLL3 and SEZ6 targets but are enriched for B7-H3 and TROP2", "Stewart 2026", "patients, CTCs"], ["YAP1+ non-NE organoids depend on IGF-1-driven YAP1/AP1; blocking IGF-1, YAP1 or AP1 suppressed growth", "Fukushima 2025", "organoids"], ["Patients with non-NE tumors preferentially benefited from immunotherapy", "Lissa 2022", "patients"]] },
    { id: "P",  name: "SCLC-P",  x: 0.86, y: 0.84, ne: false,
      tf: "POU2F3",
      desc: "POU2F3-driven tuft-cell-like, non-NE subtype (Huang 2018), mutually exclusive with ASCL1 and NEUROD1 by IHC (Baine 2020). Archetype task: chemosensation and metabolism (Groves 2022). ISL1 is negatively correlated with POU2F3 (Shields 2026).",
      tx: [["Most sensitive to PARP inhibitors (all five tested) and to anti-metabolites (anti-folates, nucleoside analogues); trend toward greatest cisplatin sensitivity", "Gay 2021", "cell lines"], ["POU2F3+ lines depend on IGF1R (also SOX9 and ASCL2)", "Huang 2018", "cell lines"], ["POU2F3+ non-NE organoids depend on IGF-1-driven YAP1/AP1; blocking IGF-1, YAP1 or AP1 suppressed growth", "Fukushima 2025", "organoids"]] }
  ],

  schemes: [
    { id: "carney", authors: ["D N Carney", "A F Gazdar", "G Bepler", "J G Guccion", "P J Marangos", "T W Moody", "M H Zweig", "J D Minna"],
      short: "Carney 1985", year: 1985, title: "Establishment and identification of small cell lung cancer cell lines having classic and variant features",
      journal: "Cancer Res", doi: null, pmid: "2985257", data: ["cl"], basis: "Biochemical NE markers + morphology (50 lines)",
      labels: [
        { name: "Classic", maps: [["A", "partial"]], note: "35 of 50 lines; express all four NE biomarkers (L-dopa decarboxylase, bombesin-like immunoreactivity, NSE, CK-BB). Linked to SCLC-A on the basis of the models used (curator's call; the abstract does not name TFs)." },
        { name: "Variant", maps: [["N", "partial"]], note: "15 of 50 lines; lack L-dopa decarboxylase and bombesin-like immunoreactivity but keep NSE and CK-BB. Linked to SCLC-N because Mollaoglu 2017 uses 'variant' for NEUROD1-high, MYC-driven SCLC (curator's call); Zhang 2018 also uses it for NE-low SCLC." }
      ] },
    { id: "calbo", authors: ["Joaquim Calbo", "Erwin van Montfort", "Natalie Proost", "Ellen van Drunen", "H Berna Beverloo", "Ralph Meuwissen", "Anton Berns"],
      short: "Calbo 2011", year: 2011, title: "A functional role for tumor cell heterogeneity in a mouse model of small cell lung cancer",
      journal: "Cancer Cell", doi: "10.1016/j.ccr.2010.12.021", data: ["mt"], basis: "NE vs. mesenchymal marker profiles",
      labels: [
        { name: "NE", maps: [["A", "partial"]], note: "Mouse tumor cells with a neuroendocrine marker profile. Linked to SCLC-A on the basis of the models used (curator's call; the abstract does not name TFs)." },
        { name: "Mesenchymal", maps: [["Y", "partial"]], note: "Cells with a mesenchymal marker profile, sharing genomic aberrations with the NE cells; they gave NE cells metastatic capacity when co-engrafted. Linked partially to SCLC-Y (curator's call); TFs were not measured." }
      ] },
    { id: "borromeo", authors: ["Mark D Borromeo", "Trisha K Savage", "Rahul K Kollipara", "Min He", "Alexander Augustyn", "Jihan K Osborne", "Luc Girard", "John D Minna", "Adi F Gazdar", "Melanie H Cobb", "Jane E Johnson"],
      short: "Borromeo 2016", year: 2016, title: "ASCL1 and NEUROD1 reveal heterogeneity in pulmonary neuroendocrine tumors and regulate distinct genetic programs",
      journal: "Cell Rep", doi: "10.1016/j.celrep.2016.06.081", data: ["cl", "mt"], basis: "ASCL1 vs. NEUROD1 binding and targets",
      labels: [
        { name: "ASCL1-high", maps: [["A", "same"], ["A2", "partial"]], note: "ASCL1 targets include MYCL1, RET, SOX2, NFIB and DLL3. Covers both ASCL1+ archetypes." },
        { name: "NEUROD1-high", maps: [["N", "same"]], note: "NEUROD1 targets MYC. Established the A/N split." }
      ] },
    { id: "mollaoglu", authors: ["Gurkan Mollaoglu", "Matthew R Guthrie", "Stefanie Bohm", "Johannes Bragelmann", "Ismail Can", "Paul M Ballieu", "Annika Marx", "Julie George", "Christine Heinen", "Milind D Chalishazar", "Haixia Cheng", "Abbie S Ireland", "Kendall E Denning", "Anandaroop Mukhopadhyay", "Jeffery M Vahrenkamp", "Kristofer C Berrett", "Timothy L Mosbruger", "Jun Wang", "Jessica L Kohan", "Mohamed E Salama", "Benjamin L Witt", "Martin Peifer", "Roman K Thomas", "Jason Gertz", "Jane E Johnson", "Adi F Gazdar", "Robert J Wechsler-Reya", "Martin L Sos", "Trudy G Oliver"],
      short: "Mollaoglu 2017", year: 2017, title: "MYC drives progression of SCLC to a variant neuroendocrine subtype with vulnerability to Aurora kinase inhibition",
      journal: "Cancer Cell", doi: "10.1016/j.ccell.2016.12.005", data: ["mt", "htb"], basis: "MYC-driven mouse tumors (RPM)",
      labels: [
        { name: "MYC 'variant NE'", tx: "Vulnerable to Aurora kinase inhibition; combined with chemotherapy it suppressed tumor progression and extended survival (mouse).", maps: [["N", "same"]], note: "NE-low, NEUROD1-high, MYC-driven. Aurora kinase inhibitor vulnerability." }
      ] },
    { id: "lim", authors: ["Jing Shan Lim", "Alvaro Ibaseta", "Marcus M Fischer", "Belinda Cancilla", "Gilbert O'Young", "Sandra Cristea", "Vincent C Luca", "Dian Yang", "Nadine S Jahchan", "Cecile Hamard", "Martine Antoine", "Marie Wislez", "Christina Kong", "Jennifer Cain", "Yu-Wang Liu", "Ann M Kapoun", "K Christopher Garcia", "Timothy Hoey", "Christopher L Murriel", "Julien Sage"],
      short: "Lim 2017", year: 2017, title: "Intratumoural heterogeneity generated by Notch signalling promotes small-cell lung cancer",
      journal: "Nature", doi: "10.1038/nature22323", data: ["mt", "htb"], basis: "Notch pathway activity",
      labels: [
        { name: "NE (Notch-inactive)", maps: [["A", "partial"]], note: "Neuroendocrine tumor cells. Linked to SCLC-A on the basis of the models used (curator's call; the abstract does not name TFs)." },
        { name: "Non-NE (Notch-active)", tx: "Relatively chemoresistant; Notch blockade plus chemotherapy suppressed growth and delayed relapse in preclinical models.", maps: [["Y", "partial"]], note: "Notch activation switches 10–50% of tumor cells to a non-NE fate, partly via Rest. These cells are slow-growing, relatively chemoresistant, and support NE cells. Linked partially to SCLC-Y (curator's call)." }
      ] },
    { id: "zhang", authors: ["Wei Zhang", "Luc Girard", "Yu-An Zhang", "Tomohiro Haruki", "Mahboubeh Papari-Zareei", "Victor Stastny", "Hans K Ghayee", "Karel Pacak", "Trudy G Oliver", "John D Minna", "Adi F Gazdar"],
      short: "Zhang 2018", year: 2018, title: "SCLC tumors and preclinical models display heterogeneity of neuroendocrine phenotypes",
      journal: "Transl Lung Cancer Res", doi: "10.21037/tlcr.2018.02.02", data: ["htb", "cl", "mt"], basis: "50-gene NE score",
      labels: [
        { name: "NE-high", maps: [["A", "partial"], ["A2", "partial"], ["N", "partial"]], note: "Express ASCL1 or NEUROD1 with NKX2-1 and lack REST; grow as floating aggregates. Linked to the ASCL1+ and NEUROD1+ states because the paper defines it by those TFs." },
        { name: "NE-low", maps: [["Y", "partial"], ["P", "partial"]], note: "16% of tumors and 10% of cell lines. Lost most NE markers, ASCL1 and NEUROD1, express REST, underwent EMT, with Notch, Hippo, TGFβ and MYC active. Linked partially to SCLC-Y and SCLC-P: later papers describe the NE-low/variant group as YAP1- or POU2F3-driven (Patel 2021, Olsen 2021)." }
      ] },
    { id: "huang", authors: ["Yu-Han Huang", "Olaf Klingbeil", "Xue-Yan He", "Xiaoli S Wu", "Gayatri Arun", "Bin Lu", "Tim D D Somerville", "Joseph P Milazzo", "John E Wilkinson", "Osama E Demerdash", "David L Spector", "Mikala Egeblad", "Junwei Shi", "Christopher R Vakoc"],
      short: "Huang 2018", year: 2018, title: "POU2F3 is a master regulator of a tuft cell-like variant of small cell lung cancer",
      journal: "Genes Dev", doi: "10.1101/gad.314815.118", data: ["cl", "hti"], basis: "CRISPR dependency screen + tumor staining",
      labels: [
        { name: "Tuft-like (POU2F3)", tx: "POU2F3+ lines depend on IGF1R, SOX9 and ASCL2.", maps: [["P", "same"]], note: "Discovered SCLC-P: POU2F3-expressing tumors lack NE markers and express tuft cell markers. POU2F3 lines also depend on SOX9, ASCL2 and IGF1R." }
      ] },
    { id: "rudin", authors: ["Charles M Rudin", "John T Poirier", "Lauren Averett Byers", "Caroline Dive", "Afshin Dowlati", "Julie George", "John V Heymach", "Jane E Johnson", "Jonathan M Lehman", "David MacPherson", "Pierre P Massion", "John D Minna", "Trudy G Oliver", "Vito Quaranta", "Julien Sage", "Roman K Thomas", "Christopher R Vakoc", "Adi F Gazdar"],
      short: "Rudin 2019", year: 2019, title: "Molecular subtypes of small cell lung cancer: a synthesis of human and mouse model data",
      journal: "Nat Rev Cancer", doi: "10.1038/s41568-019-0133-9", data: ["rev"], basis: "Relative expression of four TFs",
      labels: [
        { name: "SCLC-A", maps: [["A", "same"], ["A2", "partial"]], note: "Consensus ASCL1 subtype; does not separate A and A2." },
        { name: "SCLC-N", maps: [["N", "same"]] },
        { name: "SCLC-P", maps: [["P", "same"]] },
        { name: "SCLC-Y", maps: [["Y", "same"]], note: "YAP1 subtype. Gay 2021 later replaced it with the inflamed SCLC-I." }
      ] },
    { id: "wooten", authors: ["David J Wooten", "Sarah M Groves", "Darren R Tyson", "Qi Liu", "Jing S Lim", "Reka Albert", "Carlos F Lopez", "Julien Sage", "Vito Quaranta"],
      short: "Wooten 2019", year: 2019, title: "Systems-level network modeling of SCLC subtypes identifies master regulators and destabilizers",
      journal: "PLOS Comput Biol", doi: "10.1371/journal.pcbi.1007343", data: ["cl", "htb", "mt"], basis: "Clustering of cell line expression + Boolean TF network (BooleaBayes)", ours: true,
      labels: [
        { name: "SCLC-A", maps: [["A", "same"]], note: "ISL1-high ASCL1+ subtype." },
        { name: "NEv2 (SCLC-A2)", tx: "Consistently the least drug-sensitive subtype (cell lines).", maps: [["A2", "same"]], note: "First description of SCLC-A2: a previously undescribed ASCL1+ NE variant with lower ISL1, consistently the least drug-sensitive subtype. ELF3 and NR0B1 predicted as master regulators." },
        { name: "SCLC-N", maps: [["N", "same"]] },
        { name: "SCLC-Y", maps: [["Y", "same"]] }
      ] },
    { id: "chalishazar", authors: ["Milind D Chalishazar", "Sarah J Wait", "Fang Huang", "Abbie S Ireland", "Anandaroop Mukhopadhyay", "Younjee Lee", "Sophia S Schuman", "Matthew R Guthrie", "Kristofer C Berrett", "Jeffery M Vahrenkamp", "Zeping Hu", "Marek Kudla", "Katarzyna Modzelewska", "Guoying Wang", "Nicholas T Ingolia", "Jason Gertz", "David H Lum", "Sabina C Cosulich", "John S Bomalaski", "Ralph J DeBerardinis", "Trudy G Oliver"],
      short: "Chalishazar 2019", year: 2019, title: "MYC-driven SCLC is metabolically distinct and vulnerable to arginine depletion",
      journal: "Clin Cancer Res", doi: "10.1158/1078-0432.ccr-18-4140", data: ["mt", "cl", "pdx"], basis: "Metabolomics of MYC vs. MYCL tumors",
      labels: [
        { name: "MYC-driven (arginine-dependent)", tx: "Arginine depletion with ADI-PEG 20 suppressed MYC-driven tumors and was more effective than standard chemotherapy (mouse, PDX).", maps: [["N", "partial"]], note: "MYC-driven SCLC depends on arginine-regulated pathways; arginine depletion (ADI-PEG 20) suppresses these tumors. Linked to SCLC-N: MYC-driven mouse SCLC is the NEUROD1-high variant (Mollaoglu 2017; curator's call)." }
      ] },
    { id: "baine2020", authors: ["Marina K Baine", "Min-Shu Hsieh", "W Victoria Lai", "Jacklynn V Egger", "Achim A Jungbluth", "Yahya Daneshbod", "Amanda Beras", "Rowanne Spencer", "Jessica Lopardo", "Francis Bodd", "Joseph Montecalvo", "Jennifer L Sauter", "Jason C Chang", "Darren J Buonocore", "William D Travis", "Triparna Sen", "John T Poirier", "Charles M Rudin", "Natasha Rekhtman"],
      short: "Baine 2020", year: 2020, title: "SCLC subtypes defined by ASCL1, NEUROD1, POU2F3, and YAP1: a comprehensive immunohistochemical and histopathologic characterization",
      journal: "J Thorac Oncol", doi: "10.1016/j.jtho.2020.09.009", data: ["hti"], basis: "IHC for four TFs (174 tumors)",
      labels: [
        { name: "ASCL1+/NEUROD1+", maps: [["AN", "same"]], note: "37% of tumors co-expressed ASCL1 and NEUROD1. YAP1 was low and mostly in combined SCLC; POU2F3 (7%) was mutually exclusive with ASCL1/NEUROD1." }
      ] },
    { id: "simpson", authors: ["Kathryn L Simpson", "Ruth Stoney", "Kristopher K Frese", "Nicole Simms", "William Rowe", "Simon P Pearce", "Sam Humphrey", "Laura Booth", "Derrick Morgan", "Marek Dynowski", "Francesca Trapani", "Alessia Catozzi", "Mitchell Revill", "Thomas Helps", "Melanie Galvin", "Luc Girard", "Daisuke Nonaka", "Louise Carter", "Matthew G Krebs", "Natalie Cook", "Mathew Carter", "Lynsey Priest", "Alastair Kerr", "Adi F Gazdar", "Fiona Blackhall", "Caroline Dive"],
      short: "Simpson 2020", year: 2020, title: "A biobank of SCLC CDX models elucidates inter- and intratumoral phenotypic heterogeneity",
      journal: "Nat Cancer", doi: "10.1038/s43018-020-0046-2", data: ["pdx"], basis: "Transcriptomics of 38 CDX models",
      labels: [
        { name: "ATOH1+", maps: [["At", "same"]], note: "A previously unreported subtype based on ATOH1. Confirmed A, N and P; YAP1 subtype not found." }
      ] },
    { id: "gay", authors: ["Carl M Gay", "C Allison Stewart", "Elizabeth M Park", "Lixia Diao", "Sarah M Groves", "Simon Heeke", "Barzin Y Nabet", "Junya Fujimoto", "Luisa M Solis", "Wei Lu", "Yuanxin Xi", "Robert J Cardnell", "Qi Wang", "Giulia Fabbri", "Kasey R Cargill", "Natalie I Vokes", "Kavya Ramkumar", "Bingnan Zhang", "Carminia M Della Corte", "Paul Robson", "Stephen G Swisher", "Jack A Roth", "Bonnie S Glisson", "David S Shames", "Ignacio I Wistuba", "Jing Wang", "Vito Quaranta", "John Minna", "John V Heymach", "Lauren Averett Byers"],
      short: "Gay 2021", year: 2021, title: "Patterns of transcription factor programs and immune pathway activation define four major subtypes of SCLC with distinct therapeutic vulnerabilities",
      journal: "Cancer Cell", doi: "10.1016/j.ccell.2020.12.014", data: ["htb", "pdx"], basis: "NMF on tumor expression data",
      labels: [
        { name: "SCLC-A", data: ["htb"], maps: [["A", "same"], ["A2", "partial"]] },
        { name: "SCLC-N", data: ["htb"], maps: [["N", "same"]] },
        { name: "SCLC-P", data: ["htb"], maps: [["P", "same"]] },
        { name: "SCLC-I", data: ["htb"], id: "gay-I", tx: "Greatest benefit from adding immunotherapy to chemotherapy; SCLC-I models were resistant to cisplatin.", maps: [["I", "same"]], note: "Low in all three TF signatures with an inflamed signature. YAP1 was higher in SCLC-I and SCLC-P but did not define a subtype, so SCLC-Y was dropped." }
      ] },
    { id: "owonikoko", authors: ["Taofeek K Owonikoko", "Bhakti Dwivedi", "Zhengjia Chen", "Chao Zhang", "Benjamin Barwick", "Vinicius Ernani", "Guojing Zhang", "Melissa Gilbert-Ross", "Jennifer Carlisle", "Fadlo R Khuri", "Walter J Curran", "Andrey A Ivanov", "Haian Fu", "Sagar Lonial", "Suresh S Ramalingam", "Shi-Yong Sun", "Edmund K Waller", "Gabriel L Sica"],
      short: "Owonikoko 2021", year: 2021, title: "YAP1 expression in SCLC defines a distinct subtype with T-cell-inflamed phenotype",
      journal: "J Thorac Oncol", doi: "10.1016/j.jtho.2020.11.006", data: ["htb", "hti", "cl"], basis: "RNA-seq + IHC",
      labels: [
        { name: "YAP1+ T-cell inflamed", id: "owo-Y", maps: [["Y", "same"]], note: "SCLC-Y had high interferon-γ response and T-cell-inflamed scores. YAP1 protein was more common in limited-stage than extensive-stage disease (30.6% vs. 8.5%)." }
      ] },
    { id: "chan", authors: ["Joseph M Chan", "Alvaro Quintanal-Villalonga", "Vianne Ran Gao", "Yubin Xie", "Viola Allaj", "Ojasvi Chaudhary", "Ignas Masilionis", "Jacklynn Egger", "Andrew Chow", "Thomas Walle", "Marissa Mattar", "Dig V K Yarlagadda", "James L Wang", "Fathema Uddin", "Michael Offin", "Metamia Ciampricotti", "Besnik Qeriqi", "Amber Bahr", "Elisa de Stanchina", "Umesh K Bhanot", "W Victoria Lai", "Matthew J Bott", "David R Jones", "Arvin Ruiz", "Marina K Baine", "Yanyun Li", "Natasha Rekhtman", "John T Poirier", "Tal Nawy", "Triparna Sen", "Linas Mazutis", "Travis J Hollmann", "Dana Pe'er", "Charles M Rudin"],
      short: "Chan 2021", year: 2021, title: "Signatures of plasticity, metastasis, and immunosuppression in an atlas of human SCLC",
      journal: "Cancer Cell", doi: "10.1016/j.ccell.2021.09.008", data: ["hts"], basis: "Single-cell atlas (21 specimens)",
      labels: [
        { name: "SCLC-A", maps: [["A", "same"]] },
        { name: "SCLC-N", maps: [["N", "same"]] },
        { name: "SCLC-P", maps: [["P", "same"]] },
        { name: "Intermediate / admixed", maps: [["AN", "partial"]], note: "Intermediate cancer cells along the SCLC-A to SCLC-N spectrum, which the paper ties to ASCL1+/NEUROD1+ cells (Baine 2020); also tumors of admixed subtype." },
        { name: "PLCG2-high", maps: [], zone: "mid", note: "Stem-like, pro-metastatic population that recurs across subtypes and predicts worse overall survival; associated with a profibrotic, immunosuppressive macrophage population. Cross-cutting, so not linked to one state." }
      ] },
    { id: "patel", authors: ["Ayushi S Patel", "Seungyeul Yoo", "Ranran Kong", "Takashi Sato", "Abhilasha Sinha", "Sarah Karam", "Li Bao", "Maya Fridrikh", "Katsura Emoto", "German Nudelman", "Charles A Powell", "Mary Beth Beasley", "Jun Zhu", "Hideo Watanabe"],
      short: "Patel 2021", year: 2021, title: "Prototypical oncogene family Myc defines unappreciated distinct lineage states of SCLC",
      journal: "Sci Adv", doi: "10.1126/sciadv.abc2578", data: ["cl"], basis: "Transcriptomic and epigenomic profiling",
      labels: [
        { name: "L-Myc", maps: [["A", "partial"]], note: "L-Myc imparts neuronal programs. L-Myc-classified cell lines expressed only ASCL1, and L-Myc was enriched in the ASCL1 subtype in cell lines and tumors; replacing c-Myc with L-Myc alone did not induce ASCL1-SCLC." },
        { name: "c-Myc", maps: [["N", "partial"], ["Y", "partial"], ["P", "partial"]], note: "c-Myc imparts non-NE programs and induces an ASCL1 → NEUROD1 transition. c-Myc was higher in the NEUROD1, POU2F3 and YAP1 subtypes in cell lines and tumors, and anticorrelated with ASCL1 (r = −0.53)." }
      ] },
    { id: "olsen", authors: ["Rachelle R Olsen", "Abbie S Ireland", "David W Kastner", "Sarah M Groves", "Kyle B Spainhower", "Karine Pozo", "Demetra P Kelenis", "Christopher P Whitney", "Matthew R Guthrie", "Sarah J Wait", "Danny Soltero", "Benjamin L Witt", "Vito Quaranta", "Jane E Johnson", "Trudy G Oliver"],
      short: "Olsen 2021", year: 2021, title: "ASCL1 represses a SOX9+ neural crest stem-like state in small cell lung cancer",
      journal: "Genes Dev", doi: "10.1101/gad.348295.121", data: ["mt", "cl"], basis: "ASCL1 loss in MYC-driven mice",
      labels: [
        { name: "SOX9+ neural-crest-like", maps: [], zone: "nonne", note: "ASCL1 loss promotes a SOX9+ mesenchymal/neural crest stem-like state (SOX9/RUNX1/RUNX2) and osteosarcoma/chondroid tumors. The paper does not tie it to an existing subtype." }
      ] },
    { id: "groves", authors: ["Sarah M Groves", "Geena V Ildefonso", "Caitlin O McAtee", "Patricia M M Ozawa", "Abbie S Ireland", "Philip E Stauffer", "Perry T Wasdin", "Xiaomeng Huang", "Yi Qiao", "Jing Shan Lim", "Jackie Bader", "Qi Liu", "Alan J Simmons", "Ken S Lau", "Wade T Iams", "Doug P Hardin", "Edward B Saff", "William R Holmes", "Darren R Tyson", "Christine M Lovly", "Jeffrey C Rathmell", "Gabor Marth", "Julien Sage", "Trudy G Oliver", "Alissa M Weaver", "Vito Quaranta"],
      short: "Groves 2022", year: 2022, title: "Archetype tasks link intratumoral heterogeneity to plasticity and cancer hallmarks in SCLC",
      journal: "Cell Syst", doi: "10.1016/j.cels.2022.07.006", data: ["cl", "htb", "hts"], basis: "5-vertex archetype polytope with tasks", ours: true,
      labels: [
        { name: "A: proliferation", tx: "Cell lines near this archetype are more sensitive to DNA alkylators and cell-cycle inhibitors.", maps: [["A", "same"]], note: "ISL1 is highest at this archetype." },
        { name: "A2: signaling", tx: "Cell lines near this archetype are most sensitive to MAPK-pathway inhibitors.", maps: [["A2", "same"]], note: "Neuro- and immuno-modulatory signaling; highest CALCA; nearby cell lines most sensitive to MAPK inhibitors. Confirms A2 in human data." },
        { name: "N: slithering", maps: [["N", "same"]], note: "Slithering and axon-like protrusions." },
        { name: "P: chemosensation", maps: [["P", "same"]], note: "Chemosensation and metabolism." },
        { name: "Y: injury repair", maps: [["Y", "same"]], note: "Transdifferentiation to a non-NE state in response to injury." }
      ] },
    { id: "gopal", authors: ["Priyanka Gopal", "Aaron Petty", "Kevin Rogacki", "Titas Bera", "Rohan Bareja", "Craig D Peacock", "Mohamed E Abazeed"],
      short: "Gopal 2022", year: 2022, title: "Multivalent state transitions shape the intratumoral composition of small cell lung carcinoma",
      journal: "Sci Adv", doi: "10.1126/sciadv.abp8674", data: ["cl", "pdx"], basis: "k-means on 53 cell lines; live-cell ASCL1, NEUROD1 and YAP1 reporters showed bidirectional state transitions",
      labels: [
        { name: "Cluster I (DMS53)", data: ["cl"], maps: [["A2", "same"]], note: "ASCL1-high cluster. Linked to SCLC-A2 because its representative line, DMS53, is an A2 archetype line in Groves 2022 (curator's call)." },
        { name: "Cluster II (H446)", data: ["cl"], maps: [["N", "same"]], note: "NEUROD1-high." },
        { name: "Cluster III (H1092)", data: ["cl"], maps: [["A", "same"]], note: "Second ASCL1-high cluster; grows in suspension. Linked to SCLC-A as the ASCL1 cluster that is not A2 (curator's call)." },
        { name: "Cluster IV (DMS114)", data: ["cl"], maps: [["Y", "same"]], note: "YAP1+, adherent, mesenchymal. No separate P cluster." }
      ] },
    { id: "lissa", authors: ["Delphine Lissa", "Nobuyuki Takahashi", "Parth Desai", "Irena Manukyan", "Christopher W Schultz", "Vinodh Rajapakse", "Moises J Velez", "Deborah Mulford", "Nitin Roper", "Samantha Nichols", "Rasa Vilimas", "Linda Sciuto", "Yuanbin Chen", "Udayan Guha", "Arun Rajan", "Devon Atkinson", "Rajaa El Meskini", "Zoe Weaver Ohler", "Anish Thomas"],
      short: "Lissa 2022", year: 2022, title: "Heterogeneity of neuroendocrine transcriptional states in metastatic SCLC and patient-derived models",
      journal: "Nat Commun", doi: "10.1038/s41467-022-29517-9", data: ["htb", "pdx"], basis: "Transcriptome, exome and histology of metastatic SCLC",
      labels: [
        { name: "Hybrid NE/non-NE", tx: "Chemotherapy-resistant, with very poor outcomes.", data: ["htb"], maps: [["A2", "partial"]], note: "A clinical subtype with hybrid NE and non-NE phenotypes (11 of 72 tumors, mostly liver metastases), chemotherapy-resistant with very poor outcomes. Enriched for xenobiotic-metabolism and drug-transporter gene sets; the paper calls these tumors NEv2-like, reminiscent of SCLC-A2." },
        { name: "ATOH1+", data: ["htb"], maps: [["At", "same"]], note: "ATOH1 subtype also seen in metastatic biopsies." }
      ] },
    { id: "qu", authors: ["Song Qu", "Patricia Fetsch", "Anish Thomas", "Yves Pommier", "David S Schrump", "Markku M Miettinen", "Haobin Chen"],
      short: "Qu 2022", year: 2022, title: "Molecular subtypes of primary SCLC tumors and their associations with neuroendocrine and therapeutic markers",
      journal: "J Thorac Oncol", doi: "10.1016/j.jtho.2021.08.763", data: ["hti"], basis: "IHC (146 tumors) + MYC paralogs, SLFN11, T cells",
      labels: [
        { name: "Quadruple-negative", tx: "SLFN11, a marker of PARP-inhibitor and platinum response, was absent in most of these tumors (median H-score 0).", maps: [], zone: "nonne", note: "6.3% of tumors were negative for all four TFs. Not linked to SCLC-I: the paper does not call these SCLC-I. Non-ASCL1/NEUROD1 tumors had more CD8+ T cells and an inflamed phenotype; SLFN11 was absent in 40% of tumors, especially quadruple-negative ones." }
      ] },
    { id: "cho", authors: ["Hae Jin Cho", "Soon Auck Hong", "Daeun Ryu", "Sook-Hee Hong", "Tae-Min Kim"],
      short: "Cho 2022", year: 2022, title: "Transcriptional profiling reveals mesenchymal subtypes of SCLC with activation of EMT and worse clinical outcomes",
      journal: "Cancers", doi: "10.3390/cancers14225600", data: ["htb", "cl", "hti"], basis: "Gene expression profiling",
      labels: [
        { name: "SCLC-M (mesenchymal)", id: "cho-M", maps: [["Y", "partial"]], note: "High EMT and YAP1 activity, low anti-tumor immunity, worse outcomes than SCLC-I; 3.2–7.4% of primary tumors. Separates a mesenchymal non-NE group from SCLC-I; linked partially to SCLC-Y through its YAP1 activity." }
      ] },
    { id: "nabet", authors: ["Barzin Y Nabet", "Habib Hamidi", "Myung Chang Lee", "Romain Banchereau", "Stefanie Morris", "Leah Adler", "Velimir Gayevskiy", "Ahmed M Elhossiny", "Minu K Srivastava", "Namrata S Patil", "Kiandra A Smith", "Rajiv Jesudason", "Caleb Chan", "Patrick S Chang", "Matthew Fernandez", "Sandra Rost", "Lisa M McGinnis", "Hartmut Koeppen", "Carl M Gay", "John D Minna", "John V Heymach", "Joseph M Chan", "Charles M Rudin", "Lauren A Byers", "Stephen V Liu", "Martin Reck", "David S Shames"],
      short: "Nabet 2024", year: 2024, title: "Immune heterogeneity in small-cell lung cancer and vulnerability to immune checkpoint blockade",
      journal: "Cancer Cell", doi: "10.1016/j.ccell.2024.01.010", data: ["htb"], basis: "NMF on 271 IMpower133 tumors",
      labels: [
        { name: "Inflamed NE (TAM-low)", tx: "Longest overall survival when atezolizumab was added to chemotherapy (IMpower133).", maps: [["A", "partial"], ["I", "partial"]], note: "NE tumors with high T-effector and low macrophage signals lived longest with atezolizumab added to chemotherapy. Linked partially to SCLC-A (NE) and SCLC-I (immune-infiltrated) (curator's call); the paper does not say which of its four subsets this group is." },
        { name: "Inflamed non-NE (TAM-high)", tx: "Less benefit from adding atezolizumab than inflamed NE tumors (IMpower133).", maps: [["I", "partial"]], note: "Non-NE tumors with high T-effector and high macrophage signals benefited less from atezolizumab. Linked partially to SCLC-I (immune-infiltrated) (curator's call); the paper does not say which of its four subsets this group is." }
      ] },
    { id: "ng", authors: ["Jin Ng", "Ling Cai", "Luc Girard", "Owen W J Prall", "Neeha Rajan", "Christine Khoo", "Ahida Batrouney", "David J Byrne", "Danielle K Boyd", "Ariena J Kersbergen", "Michael Christie", "John D Minna", "Marian L Burr", "Kate D Sutherland"],
      short: "Ng 2024", year: 2024, title: "Molecular and pathologic characterization of YAP1-expressing SCLC cell lines leads to reclassification as SMARCA4-deficient malignancies",
      journal: "Clin Cancer Res", doi: "10.1158/1078-0432.CCR-23-2360", data: ["cl", "hti"], basis: "Mutation + pathology review",
      labels: [
        { name: "SMARCA4-deficient tumor", id: "smarca4-ut", maps: [], zone: "nonne", note: "6 of 8 SCLC-Y cell lines carried pathogenic SMARCA4 mutations and resembled thoracic SMARCA4-deficient undifferentiated tumors rather than SCLC." }
      ] },
    { id: "ireland2025", authors: ["Abbie S Ireland", "Daniel A Xie", "Sarah B Hawgood", "Margaret W Barbier", "Lisa Y Zuo", "Benjamin E Hanna", "Scarlett Lucas-Randolph", "Darren R Tyson", "Benjamin L Witt", "Ramaswamy Govindan", "Afshin Dowlati", "Justin C Moser", "Anish Thomas", "Sonam Puri", "Charles M Rudin", "Joseph M Chan", "Andrew Elliott", "Trudy G Oliver"],
      short: "Ireland 2025", year: 2025, title: "Basal cell of origin resolves neuroendocrine–tuft lineage plasticity in cancer",
      journal: "Nature", doi: "10.1038/s41586-025-09503-z", data: ["mts", "htb"], basis: "Single-cell clonal analysis in mouse models; transcriptomics of 944 human SCLCs",
      labels: [
        { name: "Atoh1+ (basal-derived)", data: ["mts"], maps: [["At", "same"]], note: "Unexpected Atoh1+ state in basal-cell-derived mouse SCLC." },
        { name: "Tuft-like (basal-derived)", data: ["mts"], maps: [["P", "same"]], note: "Basal cells, not NE cells, generate NE-tuft-like tumors; high MYC, PTEN loss and ASCL1 suppression promote tuft-like tumors." },
        { name: "Basal-like subset", data: ["htb"], maps: [["Y", "partial"]], note: "Human tumors (944 transcriptomes) with a normal basal cell signature. The paper says basal-like phenotypes are minor but present across subtypes, and that YAP1+ tumors may be enriched for them Linked partially to SCLC-Y (curator's call)." },
        { name: "Tuft–ionocyte-like", data: ["htb"], maps: [["P", "partial"]], note: "A human tumor state resembling normal tuft–ionocyte progenitors, which are marked by POU2F3 with FOXI1 or ASCL3; linked partially to SCLC-P through POU2F3." }
      ] },
    { id: "fukushima", authors: ["Takahiro Fukushima", "Kazuhiro Togasaki", "Junko Hamamoto", "Katsura Emoto", "Toshiki Ebisudani", "Akifumi Mitsuishi", "Kai Sugihara", "Taro Shinozaki", "Masahiko Okada", "Ayaka Saito", "Hatsuyo Takaoka", "Fumimaro Ito", "Lisa Shigematsu", "Yuki Ohta", "Sirirat Takahashi", "Mami Matano", "Yutaka Kurebayashi", "Keiko Ohgino", "Takashi Sato", "Ichiro Kawada", "Keisuke Asakura", "Tomoyuki Hishida", "Hisao Asamura", "Shinnosuke Ikemura", "Hideki Terai", "Kenzo Soejima", "Mayumi Oda", "Masayuki Fujii", "Koichi Fukunaga", "Hiroyuki Yasuda", "Toshiro Sato"],
      short: "Fukushima 2025", year: 2025, title: "An organoid library unveils subtype-specific IGF-1 dependency via a YAP–AP1 axis in human SCLC",
      journal: "Nat Cancer", doi: "10.1038/s43018-025-00945-y", data: ["org"], basis: "Transcriptomes of 40 patient-derived organoids",
      labels: [
        { name: "NE-type organoid", maps: [["A", "partial"], ["N", "partial"]], note: "Grow without alveolar niche factors." },
        { name: "Non-NE organoid", tx: "Blocking IGF-1, YAP1 or AP1 suppressed growth of these organoids.", maps: [["Y", "partial"], ["P", "partial"]], note: "YAP1 or POU2F3-expressing; depend on IGF-1-driven YAP1 and AP1 activation." }
      ] },
    { id: "shields", authors: ["Misty D Shields", "Katherine G Minton", "Hilal Ozakinci", "Tianhao Zhou", "Olivia C Terry", "Paresh Kumar", "Reem Akel", "Luc Girard", "John D Minna", "Theresa A Boyle", "John M Koomen", "Michael Shafique"],
      short: "Shields 2026", year: 2026, title: "ISL1: a novel neuroendocrine subtype in SCLC predicts durable response to lurbinectedin",
      journal: "Mol Cancer Ther", doi: "10.1158/1535-7163.MCT-25-0663", data: ["hti", "cl"], basis: "Tumor proteomics, IHC, cell line validation",
      labels: [
        { name: "ISL1+ subtype", tx: "ISL1 level predicted durable response to lurbinectedin (16 patients) and ISL1-high lines are dependent on ISL1; SLFN11 did not predict response.", id: "shields-isl1", maps: [["A", "partial"], ["N", "partial"]], note: "Presented as a new subtype. The paper reports ISL1-high tumors in ASCL1+ or NEUROD1+ backgrounds (hence the partial links); separately, ISL1 is highest at the SCLC-A archetype in Groves 2022 and lower in A2. In tumors ISL1 correlates with ASCL1 and NEUROD1 and negatively with POU2F3. L-MYC drives ISL1, which drives ASCL1 and SOX5; ISL1 predicts lurbinectedin response." }
      ] },
    { id: "stewart2026", authors: ["C Allison Stewart", "Kavya Ramkumar", "Runsheng Wang", "Yuanxin Xi", "Alexa Halliday", "Lixia Diao", "Qi Wang", "Alejandra Serrano", "Sarah Groves", "Simon Heeke", "Azusa Tanimoto", "Laura Kaiser", "Whitney Lewis", "Mukulika Bose", "Pedro Rocha", "Loukia Karacosta", "Vito Quaranta", "Jing Wang", "Julie George", "Luisa Maren Solis Soto", "Bingnan Zhang", "John V Heymach", "Lauren A Byers", "Carl M Gay"],
      short: "Stewart 2026", year: 2026, title: "YAP1 defines an emergent, plastic population of relapsed SCLC",
      journal: "J Thorac Oncol", doi: "10.1016/j.jtho.2026.103730", data: ["hti", "hts", "pdx"], basis: "Relapsed biopsies, CTCs, ctDNA, preclinical models",
      labels: [
        { name: "YAP1+ at relapse", tx: "Lacks the clinically relevant surface targets DLL3 and SEZ6, but is enriched for B7-H3 and TROP2.", id: "stewart-Y", maps: [["Y", "same"]], note: "YAP1+ cells emerge with treatment resistance, look like drug-tolerant persisters, and shift toward LCNEC features (lose DLL3 and SEZ6, gain B7-H3 and TROP2). None of the SCLC-I biopsies had YAP1+ cells." }
      ] },
    { id: "bhattacharya", authors: ["Debadrita Bhattacharya", "Sarah M. Groves", "Cameron Walker", "Gina N. Duronio", "Marcus Hsieh", "Yamina Chtourou", "Griffin G. Hartmann", "Wen-Hao Hsu", "Candace C. Liu", "Michael Angelo", "Vito Quaranta", "Julien Sage"],
      short: "Bhattacharya 2026", year: 2026, title: "Transcriptional networks underlying tumour plasticity in small-cell lung cancer",
      journal: "bioRxiv", doi: "10.64898/2026.09.26.754526", data: ["mts", "org"], basis: "Archetype analysis of scRNA-seq + scATAC-seq; BoBa-T TF network", ours: true,
      labels: [
        { name: "NE1", id: "bhatt-ne1", data: ["mts"], maps: [["A", "partial"]], note: "NCAM1+ (NE marker). Ascl1-high NE archetype (linked to SCLC-A by Ascl1); NE1 and NE2 differ in the pro-metastatic TF Nfib." },
        { name: "NE2", id: "bhatt-ne2", data: ["mts"], maps: [["A", "partial"]], note: "NCAM1+ (NE marker). Ascl1-high NE archetype; NE1 and NE2 differ in Nfib." },
        { name: "Secretory", data: ["mts"], maps: [["A2", "same"]], note: "Closely resembles the human SCLC-A2 archetype." },
        { name: "Intermediate", tx: "RORB loss drives NE cells into this state and slowed tumor growth in immunocompetent mice.", data: ["mts", "org"], id: "bhatt-int", maps: [["Int", "same"], ["I", "partial"]], note: "NCAM1+ICAM1+ low-identity, cycling state between NE and non-NE, with high MHC and antigen-presentation genes and strong SCLC-I signature activity. Sorted double-positive cells regenerated NE, non-NE and Intermediate cells in organoids; NE and non-NE cells did not convert directly. RORB loss pushes NE cells into this state." },
        { name: "nonNE1", id: "bhatt-nonne1", data: ["mts"], maps: [["Y", "partial"], ["I", "partial"]], note: "ICAM1+ (non-NE marker). Notch- and Hippo-active non-NE state; the human SCLC-I signature is active here. Partial link to SCLC-Y (curator's call)." },
        { name: "nonNE2", id: "bhatt-nonne2", data: ["mts"], maps: [["Y", "partial"], ["I", "partial"]], note: "ICAM1+ (non-NE marker). Second Notch- and Hippo-active non-NE state; the human SCLC-I signature is active here. Partial link to SCLC-Y (curator's call)." }
      ] }
  ],

  // contested: papers that disagree about what a state is
  conflicts: [
    { a: "owo-Y", b: "gay-I", note: "Is there a YAP1 subtype? Owonikoko 2021 found YAP1+ tumors form a distinct T-cell-inflamed SCLC-Y subtype; Gay 2021 found YAP1 higher in SCLC-I and SCLC-P but not defining a subtype, and replaced SCLC-Y with SCLC-I. Stewart 2026 sides with Gay: in relapsed biopsies, no SCLC-I biopsy had YAP1+ cells. Stage may matter: Owonikoko saw YAP1 more often in limited-stage disease." },
    { a: "smarca4-ut", state: "Y", note: "Are SCLC-Y cell lines SCLC? Ng 2024 found most carry SMARCA4 mutations and resemble SMARCA4-deficient tumors. YAP1+ cells in patient biopsies are still considered SCLC-Y." }
  ],

  markers: [
    { gene: "ISL1", edges: [["A", "high"], ["A2", "low"], ["N", "low"], ["P", "low"]],
      note: "Highest at the SCLC-A archetype and lower at A2, as shown by Wooten 2019 and in the Groves 2022 archetype signatures (A 7.5, A2 3.4, N 2.6, P 1.4, Y 0.1). In tumors, ISL1 correlates with ASCL1 and NEUROD1 and negatively with POU2F3 (Shields 2026)." },
    { gene: "CALCA", edges: [["A2", "high"]], note: "CGRP; highest at the SCLC-A2 archetype (Groves 2022)." },
    { gene: "MYCL", edges: [["A", "high"], ["N", "high"]], note: "Drives ISL1 (Shields 2026); L-Myc imparts neuronal programs (Patel 2021) and L-MYC protein is associated with ASCL1 and NEUROD1 tumors (Qu 2022)." },
    { gene: "MYC", edges: [["N", "high"], ["Y", "high"]], note: "Drives the ASCL1 → NEUROD1 → YAP1 shift in mouse tumors (Ireland 2020) and the NEUROD1 'variant' state (Mollaoglu 2017); associated with non-ASCL1/NEUROD1 tumors (Qu 2022)." },
    { gene: "REST", edges: [["A", "low"], ["N", "low"], ["Y", "high"]], note: "NE gene repressor: absent from NE-high SCLC (which expresses ASCL1 or NEUROD1) and expressed in NE-low SCLC (Zhang 2018); mediates part of the Notch-driven NE → non-NE switch (Lim 2017)." },
    { gene: "NCAM1", edges: [["Int", "high"], ["bhatt-ne1", "high"], ["bhatt-ne2", "high"]], note: "CD56; NE cell-surface marker. In RPR2 mouse tumors its RNA is restricted to NE cells, and Intermediate cells co-express it with ICAM1 (Bhattacharya 2026)." },
    { gene: "ICAM1", edges: [["Int", "high"], ["bhatt-nonne1", "high"], ["bhatt-nonne2", "high"]], note: "Non-NE cell-surface marker. In RPR2 mouse tumors its RNA is restricted to non-NE cells, and Intermediate cells co-express it with NCAM1 (Bhattacharya 2026)." },
    { gene: "RORB", edges: [["A", "high"]], note: "Promotes the NE state and represses the non-NE state; its loss pushes NE cells into the Intermediate state (mouse). In human tumors RORB expression was confined to SCLC-A (Bhattacharya 2026)." },
  ],

  transitions: [
    { from: "A", to: "N", src: "Ireland 2020", doi: "10.1016/j.ccell.2020.05.001", authors: ["Abbie S Ireland", "Alexi M Micinski", "David W Kastner", "Bingqian Guo", "Sarah J Wait", "Kyle B Spainhower", "Christopher C Conley", "Opal S Chen", "Matthew R Guthrie", "Danny Soltero", "Yi Qiao", "Xiaomeng Huang", "Szabolcs Tarapcsak", "Siddhartha Devarakonda", "Milind D Chalishazar", "Jason Gertz", "Justin C Moser", "Gabor Marth", "Sonam Puri", "Benjamin L Witt", "Benjamin T Spike", "Trudy G Oliver"], data: ["mts"], note: "MYC activates Notch and shifts tumors from ASCL1+ to NEUROD1+ to YAP1+ states (mouse and human models)." },
    { from: "N", to: "Y", src: "Ireland 2020", doi: "10.1016/j.ccell.2020.05.001", authors: ["Abbie S Ireland", "Alexi M Micinski", "David W Kastner", "Bingqian Guo", "Sarah J Wait", "Kyle B Spainhower", "Christopher C Conley", "Opal S Chen", "Matthew R Guthrie", "Danny Soltero", "Yi Qiao", "Xiaomeng Huang", "Szabolcs Tarapcsak", "Siddhartha Devarakonda", "Milind D Chalishazar", "Jason Gertz", "Justin C Moser", "Gabor Marth", "Sonam Puri", "Benjamin L Witt", "Benjamin T Spike", "Trudy G Oliver"], data: ["mts"], note: "Second step of the MYC-driven shift." },
    { from: "A", to: "N", src: "Patel 2021", doi: "10.1126/sciadv.abc2578", data: ["cl"], note: "c-Myc induced a transition from ASCL1-SCLC to NEUROD1-SCLC." },
    { from: "A", to: "I", src: "Gay 2021", doi: "10.1016/j.ccell.2020.12.014", data: ["pdx"], note: "Cisplatin treatment of SCLC-A PDXs shifted tumors toward SCLC-I." },
    { from: "A", to: "Int", src: "Bhattacharya 2026", doi: "10.64898/2026.09.26.754526", data: ["mts", "org"], bidir: true, note: "NE cells gave rise to Intermediate cells, which regenerated NE cells (mouse tumor organoids)." },
    { from: "Int", to: "bhatt-nonne1", src: "Bhattacharya 2026", doi: "10.64898/2026.09.26.754526", data: ["mts", "org"], bidir: true, note: "Intermediate cells regenerated ICAM1+ non-NE cells, and non-NE cells gave rise to Intermediate cells; NE ↔ non-NE switching goes through this state rather than directly (mouse tumor organoids)." }
  ]
};
