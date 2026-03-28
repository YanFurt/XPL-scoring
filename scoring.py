import pandas as pd
from cricdata import CricinfoClient
from pymongo import MongoClient
import json
import datetime as dt
import pytz
from dotenv import load_dotenv
import os
import requests


load_dotenv()  







def live_match_scoring(db, match_data):



    ######################## Setup ########################



    #Reading in the match schedule
    

    #Parameters for MongoDB connection

    series_slug = os.environ.get('series_slug')


    overall_collection = db['Overall']
    squad_audit_collection = db['Squad Audit Trail']

    #Pulling data from the Overall collection
    df = pd.DataFrame([d for d in overall_collection.find({})])
    df.set_index('_id', inplace=True)


    #ESPNCricinfo Client
    ci = CricinfoClient()

    #Identifying the current match for scoring
    #Current time should be between 0.5 hours and 4.5 hours after the match start time
    match_id = match_data['index']
    current_match_id = int(match_id)
    current_match_slug = match_data['slug']
    title=match_data['title']
    home_team=match_data['home_team']
    away_team=match_data['away_team']

    current_match = f'{title}, {home_team} vs. {away_team}'

    #Match scorecard and info
    match_scorecard = ci.match_scorecard(series_slug, current_match_slug)
    match_info = match_scorecard['match']
    match_content = match_scorecard['content']
    stage = match_info['status']

    if stage == 'RESULT':
        print('calling scoring')
        match_check_wrapper(db,match_id)
        return df.reset_index(), current_match, 'Updating... Refresh the page'

    innings = match_info["liveInning"]
    if innings == 1:
        live_innings = '1st'
    if innings == 2:
        live_innings = '2nd'
    live_balls = match_info["liveBalls"]
    live_overs = live_balls//6
    live_over_balls = live_balls%6
    live_status = f'{live_innings} Innings: over no. {live_overs}.{live_over_balls}'

    #Initializing dataframe for current match scoring
    #Players from the 2 teams currently playing
    match_df = df[df['IPL_Team'].isin([home_team, away_team])].copy()
    match_df[['Appearance','POM_Awards','Team_Matches',
            'Runs','Balls_Faced','Fours','Sixes','Ducks','SR','Thirty','Fifty','Hundred',
            'Wickets','Balls_Bowled','Runs_Conceded','Dots','Maidens','ER','Three_W','Four_W','Five_W',
            'Catches','Runout','Direct_Runout','Stumping',
            'Base_Points','Valid_Points','Total_Points',
            'Base_Matches','Valid_Matches','Total_Matches','C_Matches','VC_Matches']] = 0
    match_df['Bench'] = match_df['Valid_Matches_List'].apply(lambda x: current_match_id not in x)
    match_df['Captain'] = match_df['C_Matches_List'].apply(lambda x: current_match_id in x)
    match_df['Vice_Captain'] = match_df['VC_Matches_List'].apply(lambda x: current_match_id in x)
    match_df['Bench_Penalty'] = match_df['Penalty_Matches_List'].apply(lambda x: current_match_id in x['Bench'])
    match_df['C_Penalty'] = match_df['Penalty_Matches_List'].apply(lambda x: current_match_id in x['C'])
    match_df['VC_Penalty'] = match_df['Penalty_Matches_List'].apply(lambda x: current_match_id in x['VC'])
    match_df[['Bench_Penalties','C_Penalties','VC_Penalties','Total_Penalties']] = 0



    ######################## Appearance, Team Matches and Player of the Match ########################



    #Assign a team match to all players in the squads of both the teams, irrespective of whether they are playing in the match or not
    match_df['Team_Matches'] = 1

    match_df['POM_Awards'] = 0

    #List of players in the playing XII for both teams
   
    players = match_content["matchPlayers"]["teamPlayers"][0]['players'] + match_content["matchPlayers"]["teamPlayers"][1]['players']

    #Assigning appearance points
    for p in players:
        player_name = p['player']['longName']
        player_id = p['player']['objectId']
        if player_id in match_df.index:
            match_df.loc[player_id, 'Appearance'] = 4


    ######################## Batting ########################



    #Obtaining batters from both the teams
    batters=[]
    team_1_batters = match_content['innings'][0]['inningBatsmen']
    team_2_batters = []
    batters.extend(team_1_batters)
    try:
        team_2_batters = match_content['innings'][1]['inningBatsmen']
        batters.extend(team_2_batters)
    except:
        pass

    #Determining batting positions
    batting_positions = {}
    for index, batter in enumerate(team_1_batters):
        player_id = batter['player']['objectId']
        batting_positions[player_id] = index + 1
    for index, batter in enumerate(team_2_batters):
        player_id = batter['player']['objectId']
        batting_positions[player_id] = index + 1

    #Assigning batting points
    for bat in batters:

        player_id = bat['player']['objectId']
        if (player_id in match_df.index and bat['battedType'] == 'yes'):
            bat_pos = batting_positions[player_id]
            out = bat['isOut']

            match_df.loc[player_id, 'Runs'] = bat['runs']
            match_df.loc[player_id, 'Balls_Faced'] = bat['balls']
            match_df.loc[player_id, 'Fours'] = bat['fours']
            match_df.loc[player_id, 'Sixes'] = 2*bat['sixes']
            match_df.loc[player_id, 'Ducks'] = -2 if bat['runs'] == 0 and bat_pos <= 7 and out else 0
            strike_rate = bat['strikerate']
            if bat['balls'] < 8:
                sr_points = 0
            else:
                if strike_rate > 180:
                    sr_points = 6
                elif strike_rate > 150:
                    sr_points = 4
                elif strike_rate > 130:
                    sr_points = 2
                elif strike_rate <= 70 and bat_pos <= 7:
                    sr_points = -6
                elif strike_rate <= 90 and bat_pos <= 7:
                    sr_points = -4
                elif strike_rate < 110 and bat_pos <= 7:
                    sr_points = -2
                else:
                    sr_points = 0
            match_df.loc[player_id, 'SR'] = sr_points
            match_df.loc[player_id, 'Thirty'] = 4 if bat['runs'] >= 30 else 0
            match_df.loc[player_id, 'Fifty'] = 4 if bat['runs'] >= 50 else 0
            match_df.loc[player_id, 'Hundred'] = 8 if bat['runs'] >= 100 else 0



    ######################## Bowling ########################



    #Obtaining bowlers from both the teams
    bowlers=[]
    team_1_bowlers = match_content['innings'][0]['inningBowlers']
    team_2_bowlers = []
    bowlers.extend(team_1_bowlers)
    try:
        team_2_bowlers = match_content['innings'][1]['inningBowlers']
        bowlers.extend(team_2_bowlers)
    except:
        pass

    #Assigning bowling points
    for bowl in bowlers:

        player_id = bowl['player']['objectId']
        if player_id in match_df.index:
            match_df.loc[player_id, 'Wickets'] = 20*bowl['wickets']
            match_df.loc[player_id, 'Balls_Bowled'] = bowl['balls']
            match_df.loc[player_id, 'Runs_Conceded'] = bowl['conceded']
            match_df.loc[player_id, 'Dots'] = 2*bowl['dots']
            match_df.loc[player_id, 'Maidens'] = 20*bowl['maidens']
            economy_rate = bowl['economy']
            if bowl['balls'] < 12:
                er_points = 0
            else:
                if economy_rate <= 7:
                    er_points = 6
                elif economy_rate <= 8:
                    er_points = 4
                elif economy_rate <= 9:
                    er_points = 2
                elif economy_rate > 13:
                    er_points = -6
                elif economy_rate > 12:
                    er_points = -4
                elif economy_rate > 11:
                    er_points = -2
                else:
                    er_points = 0
            match_df.loc[player_id, 'ER'] = er_points
            match_df.loc[player_id, 'Three_W'] = 5 if bowl['wickets'] >= 3 else 0
            match_df.loc[player_id, 'Four_W'] = 5 if bowl['wickets'] >= 4 else 0
            match_df.loc[player_id, 'Five_W'] = 10 if bowl['wickets'] >= 5 else 0



    ######################## Fielding ########################



    #Obtaining fall of wickets from both the teams, later used to find fielders involved
    wickets=[]
    team_1_wickets = match_content['innings'][0]['inningWickets']
    team_2_wickets=[]
    wickets.extend(team_1_wickets)
    try:
        team_2_wickets = match_content['innings'][1]['inningWickets']
        wickets.extend(team_2_wickets)
    except:
        pass

    
    #Obtaining dismissal counts of each type
    fielding_template = {'Catches': 0, 'Runout': 0, 'Direct_Runout': 0, 'Stumping': 0}
    fielding_dismissals = {id: fielding_template.copy() for id in match_df.index}
    for wicket in wickets:
        dismissal_type = wicket['dismissalText']['short']
        fielders = [f for f in wicket['dismissalFielders'] if f['player']]
        fielders_involved = len(fielders)
        for fielder in fielders:
            player_id = fielder['player']['objectId']
            if player_id in match_df.index:
                if dismissal_type == 'caught':
                    fielding_dismissals[player_id]['Catches'] += 1
                if dismissal_type == 'run out':
                    fielding_dismissals[player_id]['Runout'] += 1
                    if fielders_involved == 1:
                        fielding_dismissals[player_id]['Direct_Runout'] += 1
                if dismissal_type == 'stumped':
                    fielding_dismissals[player_id]['Stumping'] += 1

    #Assigning fielding points
    for player_id, dismissals in fielding_dismissals.items():
        match_df.loc[player_id, 'Catches'] = 8*dismissals['Catches']
        match_df.loc[player_id, 'Runout'] = 6*dismissals['Runout']
        match_df.loc[player_id, 'Direct_Runout'] = 6*dismissals['Direct_Runout']
        match_df.loc[player_id, 'Stumping'] = 6*dismissals['Stumping']



    ######################## Points and Matches ########################



    #Assigning total points
    match_df['Base_Points'] = match_df['Appearance'] \
                            + match_df['Runs'] + match_df['Fours'] + match_df['Sixes'] + match_df['Ducks'] + match_df['SR'] + match_df['Thirty'] + match_df['Fifty'] + match_df['Hundred'] \
                            + match_df['Wickets'] + match_df['Dots'] + match_df['Maidens'] + match_df['ER'] + match_df['Three_W'] + match_df['Four_W'] + match_df['Five_W'] \
                            + match_df['Catches'] + match_df['Runout'] + match_df['Direct_Runout'] + match_df['Stumping']
    match_df['Valid_Points'] = match_df['Base_Points'] * (~match_df['Bench'])
    match_df['Total_Points'] = match_df['Valid_Points'] * (2*match_df['Captain'] + 1.5*match_df['Vice_Captain'] + 1*(~match_df['Captain'] & ~match_df['Vice_Captain']))

    #Assigning total matches
    match_df['Base_Matches'] = (match_df['Appearance'] == 4).astype(int)
    match_df['Valid_Matches'] = match_df['Base_Matches'] * (~match_df['Bench'])
    match_df['Total_Matches'] = match_df['Valid_Matches'] * (2*match_df['Captain'] + 1.5*match_df['Vice_Captain'] + 1*(~match_df['Captain'] & ~match_df['Vice_Captain']))



    ######################## Penalties ########################



    #Pulling data from the squad audit collection
    squad_audit_df = pd.DataFrame([{k:v for k,v in d.items() if k in ['username','transfer_history','c_change_history','vc_change_history']} for d in squad_audit_collection.find({})])

    #Function to calculate penalties of different types based on change history
    def get_penalty_players(history, limit, multiplier):
        changes = len(history)
        if changes <= limit:
            return []
        
        penalty_players = []
        for n, p in enumerate(history[limit:]):
            p_in = p['in']
            penalty = (30 + 5*n)*multiplier
            penalty_players.append({p_in: penalty})
        return penalty_players

    #Calculating penalties
    squad_audit_df['transfer_penalties'] = squad_audit_df.apply(lambda x: get_penalty_players(x['transfer_history'],5,1), axis = 1)
    squad_audit_df['c_penalties'] = squad_audit_df.apply(lambda x: get_penalty_players(x['c_change_history'],2,2), axis = 1)
    squad_audit_df['vc_penalties'] = squad_audit_df.apply(lambda x: get_penalty_players(x['vc_change_history'],2,1.5), axis = 1)

    #Assigning penalties
    for bench_players in sum(squad_audit_df['transfer_penalties'],[]):
        for k,v in bench_players.items():
            if k in match_df.index and match_df['Bench_Penalty']:
                match_df.loc[k, 'Bench_Penalties'] = v

    for bench_players in sum(squad_audit_df['c_penalties'],[]):
        for k,v in bench_players.items():
            if k in match_df.index and match_df['C_Penalty']:
                match_df.loc[k, 'C_Penalties'] = v

    for bench_players in sum(squad_audit_df['vc_penalties'],[]):
        for k,v in bench_players.items():
            if k in match_df.index and match_df['VC_Penalty']:
                match_df.loc[k, 'VC_Penalties'] = v

    match_df['Total_Penalties'] = match_df['Bench_Penalties'] + match_df['C_Penalties'] + match_df['VC_Penalties']



    ######################## Incremental Load to Overall ########################



    final_df = df.copy()
  
    #Adding current match numeric columns to existing columns in Overall collection
    num_cols = ['Appearance','POM_Awards','Team_Matches',
                'Runs','Balls_Faced','Fours','Sixes','Ducks','SR','Thirty','Fifty','Hundred',
                'Wickets','Balls_Bowled','Runs_Conceded','Dots','Maidens','ER','Three_W','Four_W','Five_W',
                'Catches','Runout','Direct_Runout','Stumping',
                'Base_Points','Valid_Points','Total_Points',
                'Base_Matches','Valid_Matches','Total_Matches','C_Matches','VC_Matches',
                'Bench_Penalties','C_Penalties','VC_Penalties','Total_Penalties']
    final_df[num_cols] = df[num_cols].add(match_df[num_cols], fill_value = 0)


    #Converting columns to int
    for col in [nc for nc in num_cols if nc not in ['Total_Points','Total_Matches','VC_Penalties','Total_Penalties']]:
        final_df[col] = final_df[col].astype('int')

    return final_df.reset_index(), current_match, live_status

def match_check_wrapper(db,matchid):
    live_status_collection = db['Live Status']
    processed_matches=live_status_collection.find({}).to_list()[0]['Processed Matches']
    if processed_matches.get(matchid)==False:
    
        GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')
        OWNER = os.environ.get('OWNER')
        REPO = os.environ.get('REPO')
        WORKFLOW_FILE = "python-app.yml"  # or workflow ID
        BRANCH = "main"

        url = f"https://api.github.com/repos/{OWNER}/{REPO}/actions/workflows/{WORKFLOW_FILE}/dispatches"

        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {GITHUB_TOKEN}"
        }

        data = {
            "ref": BRANCH,
            "inputs": {
                "match_id": matchid
            }
        }

        response = requests.post(url, headers=headers, json=data)

        print(response.status_code)
        print(response.text)

            
    return