# Step 3. GO term map, seeded from the 2019 map so the two tabs line up.
# Wang semantic similarity between all v2 GO terms, then t-SNE on 1 - similarity.
# Initial layout: terms that were also in the 2019 map start at their 2019 coordinates; new terms start at
# the similarity-weighted mean position of their 5 most similar shared terms. Starting from this layout
# (Rtsne skips early exaggeration when Y_init is given), t-SNE refines rather than rebuilds the map.
# The result is then scaled/rotated/shifted onto the 2019 frame using the shared terms.
suppressMessages({library(GOSemSim); library(Rtsne); library(GO.db); library(jsonlite)})
go <- read.csv("results/v2_go.csv")
ids <- unique(go$ID); cat("terms", length(ids), "\n")
if (file.exists("results/v2_sim.rds")) {
  S <- readRDS("results/v2_sim.rds")
} else {
  sd <- godata(annoDb="org.Hs.eg.db", ont="BP", computeIC=FALSE)
  S <- termSim(ids, ids, semData=sd, method="Wang")
  S[is.na(S)] <- 0; diag(S) <- 1
  saveRDS(S, "results/v2_sim.rds")
}
stopifnot(identical(rownames(S), ids))
D <- 1 - S

# 2019 coordinates (from the app's data.js, which holds the published S1 File map)
js <- readLines("../../apps/sclc-phenospace/data.js", warn=FALSE)
js <- sub(";\\s*$", "", sub("^window.PHENO = ", "", paste(js[grepl("^window.PHENO", js)], collapse="")))
v1 <- fromJSON(js)$terms
v1 <- data.frame(ID=v1[,1], x=as.numeric(v1[,3]), y=as.numeric(v1[,4]))
shared <- ids %in% v1$ID
cat("shared with 2019:", sum(shared), "of", length(ids), "\n")

Y0 <- matrix(NA_real_, length(ids), 2)
Y0[shared, ] <- as.matrix(v1[match(ids[shared], v1$ID), c("x", "y")])
set.seed(4355)
for (i in which(!shared)) {
  s <- S[i, shared]; top <- order(s, decreasing=TRUE)[1:5]; w <- pmax(s[top], 1e-6)
  Y0[i, ] <- colSums(Y0[shared, , drop=FALSE][top, ] * w) / sum(w) + rnorm(2, 0, 1)
}
ts <- Rtsne(as.dist(D), is_distance=TRUE, Y_init=Y0, perplexity=30, theta=0.5, max_iter=1000, check_duplicates=FALSE)
# put the result in the 2019 frame: best scale + rotation + shift of the shared terms onto their 2019 positions
A <- Y0[shared, ]; B <- ts$Y[shared, ]
ma <- colMeans(A); mb <- colMeans(B)
sv <- svd(t(sweep(B, 2, mb)) %*% sweep(A, 2, ma)); R <- sv$u %*% t(sv$v)
sc <- sum(sv$d) / sum(sweep(B, 2, mb)^2)
Y <- sc * sweep(ts$Y, 2, mb) %*% R + matrix(ma, nrow(ts$Y), 2, byrow=TRUE)
cat("scale", round(sc, 2), "\n")
move <- sqrt(rowSums((Y[shared, ] - Y0[shared, ])^2))
cat("shared terms moved from their 2019 position: median", round(median(move), 1), "| 90th pct", round(quantile(move, .9), 1),
    "| map span", round(diff(range(Y0[shared, 1])), 1), "\n")
out <- data.frame(ID=ids, name=Term(GOTERM[ids]), x=Y[,1], y=Y[,2], in2019=shared)
write.csv(out, "results/v2_tsne.csv", row.names=FALSE)
cat("done\n")
