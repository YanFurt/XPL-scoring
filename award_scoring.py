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