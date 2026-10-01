"""Helper code for the Tuesday bootstrap notebook: the deals, loading your comps, tables, plots, and scoring."""
import hashlib, json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from IPython.display import display
from matplotlib.ticker import FuncFormatter

THOUSANDS = FuncFormatter(lambda v, _: f"{'-' if v < 0 else ''}${abs(v) / 1000:,.0f}K")   # 240000 -> $240K

HOUSES = 100    # houses per deal; a '2' bet buys twice as many
DEALS = pd.DataFrame({
    'deal':  list('ABCDEFGHIJKL'),
    'name':  ['Gilbert', 'Old Town', 'College Creek', 'Northridge Heights', 'Northridge Heights', 'Somerset',
              'North Ames', 'Gilbert', 'Crawford', 'Northwest Ames', 'Edwards', 'Mitchell'],
    'sq_ft': [1600, 2200, 2000, 2600, 1800, 1600, 2300, 2300, 1600, 2300, 1200, 1900],
    'cost':  [170_000, 176_000, 201_000, 445_000, 263_000, 200_000,
              210_000, 249_000, 200_000, 187_000, 100_000, 200_000],
}).set_index('deal')


# Regression line and prediction

def slr(x, y):
    w_x = x - x.mean()
    w_y = y - y.mean()
    beta_hat = np.inner(w_x, w_y) / np.inner(w_x, w_x)
    return beta_hat

def predict(sales, sq_ft):
    # ybar + beta_hat * (sq_ft - xbar), using the line fit to these sales
    x, y = sales['area'], sales['price']
    return y.mean() + slr(x, y) * (sq_ft - x.mean())

def size_percentile(sales, sq_ft):
    # percent of the sales with area <= sq_ft
    return 100 * (sales['area'] <= sq_ft).mean()

def scatter_sd(sales):
    # SD of prices around the fitted line
    x, y = sales['area'], sales['price']
    return np.std(y - (y.mean() + slr(x, y) * (x - x.mean())))


# Loading locked data

def _clean(code):
    return code.upper().replace('-', '').replace(' ', '')

def _key(code):
    return hashlib.sha256(('uu-key:' + _clean(code)).encode()).hexdigest()[:16]

def _mask(code, size):
    seed = int.from_bytes(hashlib.sha256(('uu-mask:' + _clean(code)).encode()).digest()[:8], 'big')
    return np.random.default_rng(seed).integers(0, 2**31, size=size)

def unlock_comps(code, path='./data/comps_locked.csv'):
    # returns {deal letter: DataFrame with columns area, price, year_sold, month_sold}
    locked = pd.read_csv(path)
    block = locked.loc[locked['key'] == _key(code)]
    if len(block) == 0:
        raise ValueError(f'"{code}" is not an analyst code. Check your slip.')
    values = np.column_stack([block['a'], block['p']]).astype(np.int64) ^ _mask(code, 2 * len(block)).reshape(-1, 2)
    when = np.column_stack([block['y'], block['m']]).astype(np.int64) ^ _mask(code + 'DATES', 2 * len(block)).reshape(-1, 2)
    comps = pd.DataFrame(np.column_stack([values, when]), columns=['area', 'price', 'year_sold', 'month_sold'])
    comps['deal'] = block['deal'].to_numpy()
    return {d: comps.loc[comps['deal'] == d, ['area', 'price', 'year_sold', 'month_sold']].reset_index(drop=True)
            for d in DEALS.index}

def unlock_truth(reveal_code, path='./data/reveal_locked.json'):
    # returns the true prices and 2,000 draws from Deal D's sampling distribution
    with open(path) as f:
        locked = json.load(f)
    if _key(reveal_code) != locked['key']:
        raise ValueError('That is not the reveal code.')
    truth = pd.Series(np.array(locked['values'], dtype=np.int64) ^ _mask(reveal_code, len(DEALS)),
                      index=DEALS.index).astype(float)
    d_sampling = (np.array(locked['d_sampling'], dtype=np.int64)
                  ^ _mask(reveal_code + 'SAMPLING', len(locked['d_sampling']))).astype(float)
    return truth, d_sampling


# Formatting

def dollars(v):
    return f"{'-' if v < 0 else ''}${abs(v):,.0f}"

def millions(v):
    return f"{'+' if v >= 0 else '-'}${abs(v) / 1e6:.1f}M"


# Predictions for each deal

def show_deals(comps):
    pred = pd.Series({d: predict(comps[d], DEALS.loc[d, 'sq_ft']) for d in DEALS.index})
    display(pd.DataFrame({
        'deal':                  DEALS['name'] + ', ' + DEALS['sq_ft'].map('{:,} sq ft'.format),
        'cost':                  DEALS['cost'].map(dollars),
        'my prediction':         pred.map(dollars),
        'margin per house':      (pred - DEALS['cost']).map(dollars),
        'if BUY (projected)':    (HOUSES * (pred - DEALS['cost'])).map(millions),
        'scatter around line':   pd.Series({d: scatter_sd(comps[d]) for d in DEALS.index}).map(dollars),
        'house size percentile': [f"{size_percentile(comps[d], DEALS.loc[d, 'sq_ft']):.0f}%" for d in DEALS.index],
    }))
    fig, axes = plt.subplots(3, 4, figsize=(16, 10))
    for ax, d in zip(axes.flat, DEALS.index):
        c, sq_ft = comps[d], DEALS.loc[d, 'sq_ft']
        grid = np.array([c['area'].min(), max(c['area'].max(), sq_ft)])
        ax.scatter(c['area'], c['price'], s=15, alpha=0.7)
        ax.plot(grid, c['price'].mean() + slr(c['area'], c['price']) * (grid - c['area'].mean()), color='k')
        ax.axhline(DEALS.loc[d, 'cost'], color='red', ls='--', lw=1)
        ax.plot(sq_ft, pred[d], 'o', color='red', markersize=9)
        ax.set_title(f"{d}: {DEALS.loc[d, 'name']}, {sq_ft:,} sq ft")
        ax.yaxis.set_major_formatter(THOUSANDS)
    fig.suptitle('Comps and fitted line. Red dot: prediction. Dashed line: cost')
    plt.tight_layout(); plt.show()
    return pred


# Checking for dependence

def lag_plot(sales, title):
    # same two panels as ar1sim, with the sales in the order they sold
    s = sales.assign(t=sales['year_sold'] + (sales['month_sold'] - 1) / 12).sort_values('t', kind='stable')
    p, t = s['price'].to_numpy(), s['t'].to_numpy()
    fig, ax = plt.subplots(1, 2, figsize=(12, 4))
    ax[0].plot(t, p, 'o-', ms=4)
    ax[0].set_xlabel('date sold'); ax[0].set_ylabel('price'); ax[0].set_title(f'{title}, in the order sold')
    ax[0].yaxis.set_major_formatter(THOUSANDS)
    ax[1].scatter(p[:-1], p[1:], alpha=0.7)
    ax[1].set_xlabel('price of sale t'); ax[1].set_ylabel('price of sale t+1')
    ax[1].xaxis.set_major_formatter(THOUSANDS); ax[1].yaxis.set_major_formatter(THOUSANDS)
    ax[1].set_title(f'Correlation between consecutive sales: {np.corrcoef(p[:-1], p[1:])[0, 1]:+.2f}')
    plt.tight_layout(); plt.show()


# Bootstrap intervals

def show_intervals(reps, pred):
    # returns the lower and upper ends of each deal's 95% interval
    lo = pd.Series({d: np.quantile(reps[d], .025) for d in DEALS.index})
    hi = pd.Series({d: np.quantile(reps[d], .975) for d in DEALS.index})
    def where(d):
        if lo[d] > DEALS.loc[d, 'cost']:  return 'interval above cost'
        if hi[d] < DEALS.loc[d, 'cost']:  return 'interval below cost'
        return 'cost inside interval'
    display(pd.DataFrame({
        'deal':            DEALS['name'] + ', ' + DEALS['sq_ft'].map('{:,}'.format),
        'cost':            DEALS['cost'].map(dollars),
        'my prediction':   pred.map(dollars),
        'bootstrap SD':    pd.Series({d: reps[d].std() for d in DEALS.index}).map(dollars),
        'my 95% interval': [f'({dollars(lo[d])}, {dollars(hi[d])})' for d in DEALS.index],
        'cost vs. interval': [where(d) for d in DEALS.index],
    }))
    fig, axes = plt.subplots(3, 4, figsize=(16, 9))
    for ax, d in zip(axes.flat, DEALS.index):
        sns.kdeplot(reps[d], ax=ax)
        ax.axvspan(lo[d], hi[d], alpha=0.15)
        ax.axvline(DEALS.loc[d, 'cost'], color='red', ls='--')
        ax.set_title(f"{d}: {DEALS.loc[d, 'name']}, {DEALS.loc[d, 'sq_ft']:,} sq ft")
        ax.set_yticks([]); ax.set_ylabel('')
        ax.xaxis.set_major_formatter(THOUSANDS)
    fig.suptitle('Bootstrap distributions. Shaded: 95% interval. Dashed line: cost')
    plt.tight_layout(); plt.show()
    return lo, hi


# Bets

def make_bets(choice, comps, pred, cushion=10_000, lo=None):
    # choice is a strategy name or 12 letters (B/S); returns a B/S Series indexed by deal
    cost, sq_ft = DEALS['cost'], DEALS['sq_ft']
    margin = pred - cost
    rule = choice.strip().lower()
    if rule == 'model':
        buy = margin > 0
    elif rule == 'cushion':
        buy = margin > cushion
    elif rule == 'middle':
        in_iqr = pd.Series({d: comps[d]['area'].quantile(.25) <= sq_ft[d] <= comps[d]['area'].quantile(.75)
                            for d in DEALS.index})
        buy = (margin > 0) & in_iqr
    elif rule == 'interval':
        if lo is None:
            raise ValueError('"interval" needs bootstrap intervals, so it can only be used in Round 2.')
        buy = lo > cost
    else:
        letters = choice.upper().replace(' ', '')
        if len(letters) != len(DEALS) or not set(letters) <= {'B', 'S', '2'}:
            raise ValueError('Use "model", "cushion", "middle", "interval", or twelve characters '
                             '(B = buy, 2 = buy double, S = skip), one per deal A-L.')
        return pd.Series(list(letters), index=DEALS.index)
    return buy.map({True: 'B', False: 'S'})

def double(bets, *deals):
    # returns a copy of bets with the listed deals changed to '2' (buy 200 houses instead of 100)
    bets = bets.copy()
    for d in deals:
        if d not in bets.index:
            raise ValueError(f'"{d}" is not a deal letter (A-L).')
        bets[d] = '2'
    return bets

def show_bets(bets, label):
    print(f'{label}:  ' + '  '.join(f"{d}={'2x' if b == '2' else b}" for d, b in bets.items()))


# Scoring

def reveal(reveal_code, round_1, round_2, lo, hi, reps):
    truth, d_sampling = unlock_truth(reveal_code)
    result = HOUSES * (truth - DEALS['cost'])
    size = {'S': 0, 'B': 1, '2': 2}
    score = lambda bets: pd.Series([size[bets[d]] * result[d] for d in DEALS.index], index=DEALS.index).astype(float)
    s1, s2 = score(round_1), score(round_2)
    winner = result > 0

    def call(bets, d):
        bought = bets[d] in ('B', '2')
        if bought and winner[d]:       return 'right (bought a winner)'
        if not bought and not winner[d]: return 'right (skipped a loser)'
        if bought:                     return 'WRONG (bought a loser)'
        return 'WRONG (skipped a winner)'

    table = pd.DataFrame({
        'deal':          DEALS['name'] + ', ' + DEALS['sq_ft'].map('{:,}'.format),
        'cost':          DEALS['cost'].map(dollars),
        'true price':    truth.map(dollars),
        'winner?':       winner.map({True: 'winner', False: 'loser'}),
        'if BUY (100)':  result.map(millions),
        'round 1 bet':   round_1 + '  ' + s1.map(millions),
        'round 1 call':  [call(round_1, d) for d in DEALS.index],
        'round 2 bet':   round_2 + '  ' + s2.map(millions),
        'round 2 call':  [call(round_2, d) for d in DEALS.index],
        'truth in my interval?': ['yes' if lo[d] <= truth[d] <= hi[d] else 'no' for d in DEALS.index],
    })
    def color(v):
        if isinstance(v, str) and v.startswith('WRONG'): return 'color: #b00020; font-weight: bold'
        if isinstance(v, str) and v.startswith('right'): return 'color: #1b7f3b'
        return ''
    styler = table.style
    styler = styler.map(color) if hasattr(styler, 'map') else styler.applymap(color)
    display(styler)

    def summary(bets):
        bought_losers = [d for d in DEALS.index if bets[d] in ('B', '2') and not winner[d]]
        skipped_winners = [d for d in DEALS.index if bets[d] == 'S' and winner[d]]
        n_right = len(DEALS) - len(bought_losers) - len(skipped_winners)
        wrong = []
        if bought_losers:   wrong.append('bought losers ' + ', '.join(bought_losers))
        if skipped_winners: wrong.append('skipped winners ' + ', '.join(skipped_winners))
        return f"{n_right} of {len(DEALS)} right" + (f"; wrong: {'; '.join(wrong)}" if wrong else '')

    best = 2 * result.clip(lower=0).sum()      # doubling every profitable deal, skipping the rest
    print(f'Round 1: {summary(round_1)}')
    print(f'Round 2: {summary(round_2)}')
    print()
    print(f'Round 1 total: {millions(s1.sum())}      (best possible {millions(best)})')
    print(f'Round 2 total: {millions(s2.sum())}      (best possible {millions(best)})')
    print(f'Both rounds:   {millions(s1.sum() + s2.sum())}')
    print(f'Intervals containing the true price: {int(((lo <= truth) & (truth <= hi)).sum())} of {len(DEALS)}')

    fig, ax = plt.subplots(figsize=(9, 3.5))
    sns.kdeplot(d_sampling, ax=ax, color='k', lw=2, label='true sampling distribution (2,000 samples of 30)')
    sns.kdeplot(reps['D'], ax=ax, color='C0', lw=2, label='my bootstrap distribution')
    ax.axvline(truth['D'], color='k', ls=':', label=f"true price {dollars(truth['D'])}")
    ax.axvline(DEALS.loc['D', 'cost'], color='red', ls='--', label=f"cost {dollars(DEALS.loc['D', 'cost'])}")
    ax.set_xlabel('predicted price, Deal D'); ax.set_yticks([]); ax.set_ylabel('')
    ax.xaxis.set_major_formatter(THOUSANDS)
    ax.set_title(f"Deal D. SD of sampling distribution: {dollars(d_sampling.std())}. "
                 f"SD of my bootstrap: {dollars(reps['D'].std())}".replace('$', r'\$'))
    ax.legend(fontsize=8, loc='upper left'); plt.tight_layout(); plt.show()
    return truth
