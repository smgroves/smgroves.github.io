#!/bin/sh
# Download the input data (public, from github.com/smgroves/Groves-CellSys2021) into data/.
set -e
cd "$(dirname "$0")"; mkdir -p data
BASE=https://raw.githubusercontent.com/smgroves/Groves-CellSys2021/HEAD/data/bulk-rna-seq
curl -fL -o data/CCLE_Minna_Thomas_COMBAT.csv "$BASE/CCLE_Minna_Thomas_COMBAT.csv"   # ~33 MB, genes x samples
curl -fL -o data/combined_clusters_2020-05-27-MC_copy.csv "$BASE/combined_clusters_2020-05-27-MC%20copy.csv"
