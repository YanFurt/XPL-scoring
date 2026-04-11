#Function to calculate bet score based on multiplier, success, and bet amount 
from collections import Counter
import pandas as pd
import numpy as np

def get_bet_score(cancel, multiplier, success, bet):

    score = {k: (not cancel[k]) * ((multiplier[k] * success[k] * bet[k]) - bet[k]) for k in multiplier}
    sum_score = sum(0 if np.isnan(v) else v for v in score.values())
    return sum_score

def get_bet_metrics(p, metric, df):
    result = Counter()
    for d in df[f'{p}_{metric}']:
        cleaned = {k: (0 if pd.isna(v) else v)for k, v in d.items()}
        result.update(cleaned)

    return dict(result)

#Awards metrics
def get_valid_metric(p, metric, df):
    div = 1
    if metric == 'Wickets':
        div = 20
    if metric == 'Catches':
        div = 8
    if metric in ['Sixes','Dots']:
        div = 2
    metric_sum = sum(d.get(metric)/div for l in df[p+'_Players'] for d in l if not d['Bench'])
    return metric_sum