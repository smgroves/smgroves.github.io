suppressMessages(library(WGCNA))
options(stringsAsFactors=FALSE); allowWGCNAThreads(8); set.seed(4355)
x <- read.csv("data/CCLE_Minna_Thomas_COMBAT.csv", row.names=1, check.names=FALSE)
lab <- read.csv("results/labels_v2.csv", row.names=1)
stopifnot(all(colnames(x)==rownames(lab)))
datExpr <- t(as.matrix(x))
gsg <- goodSamplesGenes(datExpr, verbose=0); datExpr <- datExpr[gsg$goodSamples, gsg$goodGenes]
cat("genes", ncol(datExpr), "samples", nrow(datExpr), "\n")
cor <- WGCNA::cor
net <- blockwiseModules(datExpr, power=12, networkType="signed", TOMType="signed", corType="pearson",
  maxBlockSize=20000, minModuleSize=100, deepSplit=2, pamRespectsDendro=TRUE, mergeCutHeight=0.15,
  numericLabels=FALSE, saveTOMs=FALSE, verbose=2)
cols <- net$colors; print(table(cols))
saveRDS(net, "results/v2_net.rds")
suppressMessages({library(fgsea); library(clusterProfiler); library(org.Hs.eg.db)})
MEs <- orderMEs(net$MEs)
write.csv(data.frame(gene=colnames(datExpr), module=cols), "results/v2_module_genes.csv", row.names=FALSE)
write.csv(MEs, "results/v2_eigengenes.csv")
sub <- factor(lab$v2)
mods <- setdiff(sub("^ME","",colnames(MEs)), "grey")
kw <- sapply(mods, function(m) kruskal.test(MEs[[paste0("ME",m)]] ~ sub)$p.value)
kwq <- p.adjust(kw, "BH")
write.csv(data.frame(module=mods, kw_p=kw, kw_q=kwq), "results/v2_kruskal.csv", row.names=FALSE)
# GSEA: rank genes by Welch t (subtype vs rest); module gene sets
sets <- split(colnames(datExpr), cols); sets <- sets[names(sets)!="grey"]
gs <- do.call(rbind, lapply(levels(sub), function(s) {
  g1 <- datExpr[sub==s,,drop=FALSE]; g0 <- datExpr[sub!=s,,drop=FALSE]
  t <- (colMeans(g1)-colMeans(g0))/sqrt(apply(g1,2,var)/nrow(g1)+apply(g0,2,var)/nrow(g0))
  t[!is.finite(t)] <- 0
  r <- fgsea(sets, sort(t, decreasing=TRUE), minSize=10, maxSize=5000, nPermSimple=10000)
  data.frame(subtype=s, module=r$pathway, NES=r$NES, pval=r$pval, padj=r$padj, size=r$size)
}))
write.csv(gs, "results/v2_gsea.csv", row.names=FALSE)
# GO BP enrichment per significant module
sig <- mods[kwq < 0.05]
ent <- bitr(colnames(datExpr), fromType="SYMBOL", toType="ENTREZID", OrgDb=org.Hs.eg.db)
univ <- unique(ent$ENTREZID)
go <- do.call(rbind, lapply(sig, function(m) {
  g <- unique(ent$ENTREZID[ent$SYMBOL %in% sets[[m]]])
  e <- enrichGO(g, OrgDb=org.Hs.eg.db, ont="BP", universe=univ, pAdjustMethod="BH", pvalueCutoff=0.05, qvalueCutoff=1, minGSSize=10, maxGSSize=1000)
  r <- as.data.frame(e); if (!nrow(r)) return(NULL)
  data.frame(module=m, ID=r$ID, Description=r$Description, pvalue=r$pvalue, p.adjust=r$p.adjust, Count=r$Count)
}))
write.csv(go, "results/v2_go.csv", row.names=FALSE)
cat("sig modules:", paste(sig, collapse=", "), "\nGO rows", nrow(go), "unique terms", length(unique(go$ID)), "\n")
