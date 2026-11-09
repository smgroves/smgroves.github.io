"""Step 1. Subtype labels for v2.

Cell lines: Groves et al. (2022) calls (column NEW_10_2020). Each sample is also called by the
Gay et al. (2021) rule: ASCL1, NEUROD1 and POU2F3 each called on/off with a 2-component Gaussian
mixture fit separately per source (CCLE, Minna, tumor); a sample with all three off is SCLC-I,
otherwise it takes the "on" TF with the highest within-source z-score.
YAP1 is called on/off the same way.

SCLC-I markers: each sample is also matched to the four subtype profiles of Gay et al.'s 1,300-gene signature
(their Table S1, mean expression per subtype; data/gay2021_mmc2.xlsx). Genes are z-scored within source,
profiles centered per gene, and the sample takes the profile with the highest Spearman correlation.

v2 label
  cell lines: Groves 2022 call. A line becomes I only if it is triple-negative, YAP1-off and best matches the
              SCLC-I profile (none do; NCIH1339 is inflamed-like but YAP1-high, so it stays Y).
  tumors:     I if triple-negative AND best matching the SCLC-I profile. A triple-negative tumor without the
              inflamed profile is Y if YAP1 is on, otherwise it takes the TF with the highest z-score.
              Other tumors keep Gay's TF call (A, N or P).
Writes results/labels_v2.csv.
"""
import os, pandas as pd, numpy as np
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from sklearn.mixture import GaussianMixture
x=pd.read_csv('data/CCLE_Minna_Thomas_COMBAT.csv',index_col=0)
c=pd.read_csv('data/combined_clusters_2020-05-27-MC_copy.csv',index_col=0)
src=pd.Series({s:{'m':'Minna','c':'CCLE','t':'tumor'}[s[0]] for s in x.columns})
TF=['ASCL1','NEUROD1','POU2F3']
on=pd.DataFrame(False,index=x.columns,columns=TF+['YAP1']); thr={}
for s in src.unique():
    cols=src[src==s].index
    for g in TF+['YAP1']:
        v=x.loc[g,cols].values.reshape(-1,1)
        gm=GaussianMixture(2,random_state=0).fit(v)
        hi=np.argmax(gm.means_.ravel())
        p=gm.predict_proba(v)[:,hi]
        on.loc[cols,g]=p>0.5
        # threshold = midpoint where posterior crosses 0.5
        grid=np.linspace(v.min(),v.max(),2000).reshape(-1,1); pg=gm.predict_proba(grid)[:,hi]
        thr[(s,g)]=round(float(grid[np.argmax(pg>0.5)][0]),2)
print(thr)
gay=pd.Series('I',index=x.columns)
z=x.loc[TF].T.groupby(src).transform(lambda a:(a-a.mean())/a.std())
for smp in x.columns:
    act=[g for g in TF if on.loc[smp,g]]
    if act: gay[smp]={'ASCL1':'A','NEUROD1':'N','POU2F3':'P'}[max(act,key=lambda g:z.loc[smp,g])]
lab=c.NEW_10_2020.reindex(x.columns)
out=pd.DataFrame({'source':src,'groves2022':lab,'gay_rule':gay})
out[TF]=x.loc[TF].T.round(2); out['YAP1']=x.loc['YAP1'].round(2)
pd.set_option('display.width',200); pd.set_option('display.max_rows',300)
print(pd.crosstab(out.groves2022.fillna('tumor'), out.gay_rule))
print(out[(out.gay_rule=='I')|(out.groves2022=='Y')])

# SCLC-I markers: nearest Gay et al. (2021) signature profile
g=pd.read_excel('data/gay2021_mmc2.xlsx',header=None,skiprows=2,index_col=0); g.columns=['N','P','I','A']
g=g[~g.index.duplicated()]; g=g.loc[[q for q in g.index if q in x.index]]
C=g.sub(g.mean(1),axis=0)
Zs=x.loc[g.index].T.groupby(src).transform(lambda a:(a-a.mean())/(a.std()+1e-9)).T
cor=pd.DataFrame({k:Zs.corrwith(C[k],method='spearman') for k in C})
out['gay_profile']=cor.idxmax(1); out['r_I']=cor['I'].round(2)
print('signature genes used',len(g))

# v2 labels
out['YAP1_on']=on['YAP1']
tn=out.gay_rule=='I'; infl=out.gay_profile=='I'; tum=out.source=='tumor'
lab2=out.groves2022.copy()
lab2[(~tum)&(out.groves2022=='Y')&tn&infl&(~out.YAP1_on)]='I'
lab2[tum]=out.gay_rule[tum]
for smp in out.index[tum&tn&~infl]:
    lab2[smp]='Y' if out.YAP1_on[smp] else {'ASCL1':'A','NEUROD1':'N','POU2F3':'P'}[z.loc[smp,TF].idxmax()]
out['v2']=lab2
out.to_csv('results/labels_v2.csv')
print(pd.crosstab(out.v2,out.source,margins=True))
