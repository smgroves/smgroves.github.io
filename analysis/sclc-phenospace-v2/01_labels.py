"""Step 1. Subtype labels for v2.

Cell lines: Groves et al. (2022) calls (column NEW_10_2020). Each sample is also called by the
Gay et al. (2021) rule: ASCL1, NEUROD1 and POU2F3 each called on/off with a 2-component Gaussian
mixture fit separately per source (CCLE, Minna, tumor); a sample with all three off is SCLC-I,
otherwise it takes the "on" TF with the highest within-source z-score.
YAP1 is called on/off the same way. v2 label: Groves 2022 call for cell lines, except that an SCLC-Y line
with YAP1 off and all three TFs off would become I (none do: all 9 Y lines are YAP1-high, so they stay Y).
Tumors use Gay's rule (A, N, P or I).
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

# v2 labels
lab2=out.groves2022.copy()
out['YAP1_on']=on['YAP1']
lab2[(out.groves2022=='Y')&(out.gay_rule=='I')&(~out.YAP1_on)]='I'
lab2[out.source=='tumor']=out.gay_rule[out.source=='tumor']
out['v2']=lab2
out.to_csv('results/labels_v2.csv')
print(pd.crosstab(out.v2,out.source,margins=True))
