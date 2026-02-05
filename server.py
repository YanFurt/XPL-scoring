from fastapi import FastAPI,  Body,Depends,Request
from dataclasses import dataclass
import uuid,os
import json,random
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse,FileResponse,Response
from security import verify_jwt_token,create_jwt_token,LoginReq

from pymongo import MongoClient ,UpdateOne, UpdateMany
import datetime as dt 
import numpy as np
from dotenv import load_dotenv
 
load_dotenv()  
mongostring=os.getenv("MONGO")
players = json.loads(os.getenv("FRANCHISES"))
print(players)
client = MongoClient(mongostring)


db_2025 = client['XPL_2025']
overall_2025 = db_2025['Overall']
live_status_2025 = db_2025['Live Status']
players_2025=db_2025['Players']

user_db = client['XPL_Users'].users
db_2026 = client['XPL_2026']
overall_2026 = db_2026['Overall']
live_status_2026 = db_2026['Live Status']
players_2026=db_2026['Players']
Squad_2026=db_2026['Squads']
class dbmanager(): 

    def __init__(self,df1,df2,player_info,status_dict): 
        self.df = df1
        self.stats=df2

        self.player_info=player_info
        self.update_time =status_dict[0]['Last Refresh']
        self.update_match = status_dict[0]['Last Match']

    

def load_db(coll):
    data = list(coll.find({}))
    df = pd.DataFrame(data)
    df.columns = df.columns.str.replace("_", " ")
    
    
    try:
        return_df = df.groupby(['Team','Player']).sum().reset_index()
        print(return_df.columns)
        return_df['Appearance Points'] = return_df['Appearance']
        return_df['Batting Points'] = return_df['Runs'] + return_df['Fours'] + return_df['Sixes'] + return_df['Ducks']\
                                    + return_df['SR'] + return_df['Thirty'] + return_df['Fifty'] + return_df['Hundred']
        return_df['Bowling Points'] = return_df['Wickets'] + return_df['Dots'] + return_df['Maidens'] + return_df['ER']\
                                    + return_df['Three W'] + return_df['Four W'] + return_df['Five W']
        return_df['Fielding Points'] = return_df['Catches'] + return_df['Runout'] + return_df['Direct Runout'] + return_df['Stumping']

        return_df['Points per Match'] = np.where(return_df['Total Matches']==0,0,return_df['Total Points']/return_df['Total Matches'])
        return_df = return_df[['Team','Player',
                            'Appearance Points','Batting Points','Bowling Points','Fielding Points','Total Points',
                            'Total Matches','C Matches','VC Matches','Points per Match']].sort_values(by=['Total Points','Player'])
    except:
        return_df = df.groupby(['Team','Player']).sum().reset_index()
        return_df['Appearance Points'] = return_df['Appearance']
        return_df['Batting Points'] = return_df['Runs'] + return_df['Fours'] + return_df['Sixes'] + return_df['Ducks']\
                                    + return_df['SR'] + return_df['Thirty'] + return_df['Fifty'] + return_df['Hundred']
        return_df['Bowling Points'] = return_df['Wickets'] + return_df['Dots'] + return_df['Maidens'] + return_df['ER']\
                                    + return_df['Three W'] + return_df['Four W'] + return_df['Five W']
        return_df['Fielding Points'] = return_df['Catches'] + return_df['Runout'] + return_df['Direct Runout'] + return_df['Stumping']
        return_df['Total Points'] = return_df['Total']
        return_df['Points per Match'] = np.where(return_df['Total Matches']==0,0,return_df['Total']/return_df['Total Matches'])
        return_df = return_df[['Team','Player','Type','IPL Team',
                            'Appearance Points','Batting Points','Bowling Points','Fielding Points','Total Points',
                            'Total Matches','C Matches','VC Matches','Points per Match']].sort_values(by=['Total Points','Player'])

    return df,return_df

def load_status(coll):
    live_data = list(coll.find({}))
    return pd.DataFrame(live_data).drop(columns={'_id'}).to_dict(orient='records')
 
def load_players(coll):

    data= coll.find({}).to_list()
    return pd.DataFrame(data).drop(columns={'_id'})

dbm_2026 = dbmanager(*load_db(overall_2026),load_players(players_2026),load_status(live_status_2026))

dbm_2025 = dbmanager(*load_db(overall_2025),load_players(players_2025),load_status(live_status_2025))

dbm={"2025":dbm_2025,"2026":dbm_2026}
dbm2={"2025":players_2025,"2026":players_2026}

app = FastAPI()
app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:3000'],allow_methods=['GET','POST','OPTIONS'],allow_credentials=True)

app.mount('/script',StaticFiles(directory="dist"), name="static")

@app.get('/favicon.ico', include_in_schema=False)
async def favicon():
    return FileResponse('./favicon.ico')


@app.get('/{year:str}',response_class=HTMLResponse)
def test_react():
    content="""<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xavier's Premier League</title><script defer="defer" src="script/main.js"></script></head><body style="height: 95vh;"><div id="root" style="height: 100%;"></div></body></html>"""
    return HTMLResponse(content)


@app.exception_handler(404)
async def custom_404_handler(a,b):
    return RedirectResponse("/2026")

@app.exception_handler(405)
async def custom_405_handler(a,b):
    return RedirectResponse("/2026")

@app.post('/update_df')
async def getdata(key=Body(...)):
    try:
        
        if key == '123dfg456':
            df2=load_db(overall_2026)
            lf2 = load_status(overall_2025)
            dbm['2026'].df=df2
            dbm['2026'].update_time =lf2[0]['Last Refresh']
            dbm['2026'].update_match = lf2[0]['Last Match']
            return 'Success'
        return 'Incorrect key'
    except Exception as e:
        return e

@app.post('/latestupdate')
async def getdate():
    return f"Last updated: {dbm['2026'].update_time} ({dbm['2026'].update_match})"

@app.post('/login')
async def login(response:Response,login_req:LoginReq):
    if login_req.user not in players.keys():
        return {'Status':'Failure'}
    if login_req.signup:
        obj={'username':login_req.user,
            'password':login_req.password,
            'transfers':5,
            'transfer_history':[],
            'c_changes':2,
            'c_change_history':[],
            'vc_changes':2,
            'vc_change_history':[]}
        op=user_db.update_one({"username":login_req.user},{ '$setOnInsert': obj },upsert= True )
        response.set_cookie(key='XPL',value=create_jwt_token(login_req.user),httponly=True,secure=True,samesite="none")
        if op.did_upsert:
            return {'Status':'Success','User':login_req.user}
        else:
            return {'Status':'User exists'}
    else:
        pwd = user_db.find_one({'username':login_req.user,'password':login_req.password})
        
        if pwd:
            response.set_cookie(key='XPL',value=create_jwt_token(login_req.user),httponly=True,secure=True,samesite="none")
            return {'Status':'Success','User':login_req.user}
        else:
            return {'Status':'Failure'}
        
@app.post('/logout')
async def logout(response:Response):
    #response=RedirectResponse(url='http://localhost:3000')
    #response.body='LoggedOut'
    response.delete_cookie(key='XPL',httponly=True,secure=True,samesite="none")
    return 'LoggedOut'

@app.post('/validate_session')
async def validate_session(user=Depends(verify_jwt_token)):
    print(user)
    return user




@app.post('/updateteam')
async def update_team(request:Request,user=Depends(verify_jwt_token)):
    payload = await request.json()
    operations = []
    cap_change = payload.get("cap_change")
    if cap_change:
        operations.append(UpdateOne(filter={ "Player": cap_change[1] },
                    update={ "$set": { "Captain": False }}))
        
        operations.append(UpdateOne(filter={ "Player": cap_change[0] },
                update={ "$set": { "Captain": True }}))
    vcap_change = payload.get("vcap_change")
    if vcap_change:
        operations.append(UpdateOne(filter={ "Player": vcap_change[0] },
                    update={ "$set": { "Vice_Captain": True }}))
        
        operations.append(UpdateOne(filter={ "Player": vcap_change[1] },
                update={ "$set": { "Vice_Captain": False }}))
    if transferin:=payload.get("in"):
        operations.append(UpdateMany(filter={"Player":{"$in":transferin}},
                        update={ "$set": { "Bench": False }}))
    if transferout:=payload.get("out"):
        operations.append(UpdateMany(filter={"Player":{"$in":transferout}},
                        update={ "$set": { "Bench": True }}))  
    Squad_2026.bulk_write(requests=operations)
    return 'Success'



#Fantasy points table
@app.post('/{year:str}/standings')
def points_df(year):
    df = dbm[year].df
    return_df = df[(df['Team']!='Unsold')&(df['Team']!='')].groupby(['Team'])[['Total Points','Total Matches','C Matches','VC Matches']].sum().\
                sort_values(by=['Total Points','Total Matches'],ascending=[False,True]).reset_index()
    return return_df.to_dict(orient='records')

@app.get('/updatename')
def rename_player(capi,cinfo):
    with open("player-renaming.json","r+") as rename_file:
        renaming = json.load(rename_file)
        renaming[capi]=cinfo
        rename_file.seek(0)
        json.dump(renaming, rename_file,indent=4)

    return 'Name updated'


#Orange Cap table
@app.post('/{year:str}/awards/Runs')
def runs_df(year):
    df = dbm[year].df
    return_df = df[(df['Team']!='Unsold')].groupby(['Team'])[['Runs','Total Matches']].sum().\
                sort_values(by=['Runs','Total Matches'],ascending=[False,True]).reset_index()
    return return_df.to_dict(orient='records')

#Purple Cap table
@app.post('/{year:str}/awards/Wickets')
def wickets_df(year):
    df = dbm[year].df
    return_df = df[(df['Team']!='Unsold')].groupby(['Team'])[['Wickets','Total Matches']].sum().\
                sort_values(by=['Wickets','Total Matches'],ascending=[False,True]).reset_index()
    return_df['Wickets'] //= 20
    
    return return_df.to_dict(orient='records')

#KFC Bucket Hands table
@app.post('/{year:str}/awards/Catches')
def catches_df(year):
    df = dbm[year].df
    return_df = df[(df['Team']!='Unsold')].groupby(['Team'])[['Catches','Total Matches']].sum().\
                sort_values(by=['Catches','Total Matches'],ascending=[False,True]).reset_index()
    return_df['Catches'] //= 8
    return return_df.to_dict(orient='records')

#ISRO Rocket Launcher table
@app.post('/{year:str}/awards/Sixes')
def sixes_df(year):
    df = dbm[year].df
    return_df = df[(df['Team']!='Unsold')].groupby(['Team'])[['Sixes','Total Matches']].sum().\
                sort_values(by=['Sixes','Total Matches'],ascending=[False,True]).reset_index()
    return_df['Sixes'] //= 2
    return return_df.to_dict(orient='records')

#Harry Dotter table
@app.post('/{year:str}/awards/Dots')
def dots_df(year):
    df = dbm[year].df
    return_df = df[(df['Team']!='Unsold')].groupby(['Team'])[['Dots','Total Matches']].sum().\
                sort_values(by=['Dots','Total Matches'],ascending=[False,True]).reset_index()   
    return return_df.to_dict(orient='records')

#Sold player by base points
@app.post('/{year:str}/stats/SoldPlayerStats')
def sold_df(year):
    df = dbm[year].df
    return_df = df[(df['Team']!='Unsold')].groupby(['Player','IPL Team','Team'])['Base Total'].sum().to_frame().\
                sort_values(by=['Base Total','Player'],ascending=[False,True]).reset_index()
    return return_df.to_dict(orient='records')
    
#Unsold players by base points
@app.post('/{year:str}/stats/UnsoldPlayerStats')
def unsold_df(year):
    df = dbm[year].df
    return_df = df[(df['Team']=='Unsold')].groupby(['Player','IPL Team'])['Base Total'].sum().to_frame().\
                sort_values(by=['Base Total','Player'],ascending=[False,True]).reset_index()
    return return_df.to_dict(orient='records')

#Overall player info by team 
@app.post('/{year:str}/player/{team}')
def team_player_df(team,year):
    df = dbm[year].stats
    return_df = df[(df['Team']==team)]
    return_df = return_df[['Player','Type','IPL Team',
                         'Appearance Points','Batting Points','Bowling Points','Fielding Points','Total Points',
                         'Total Matches','C Matches','VC Matches','Points per Match']]
    return_df['Points per Match'] = return_df['Points per Match'].astype('float').round(2)
    return_df = return_df.sort_values(by=['Total Points','Player'],ascending=[False,True])
    return return_df.to_dict(orient='records')

#Highest value for money players
@app.post('/{year:str}/stats/MVPs')
def value_df(year):
    df = dbm[year].df
    dfp=dbm[year].player_info[['Player','Sold_Price']]
    return_df = df[(df['Team']!='Unsold')].groupby(by=['Player','Type','IPL Team','Team'])['Base Total'].sum().to_frame().reset_index()
    df_new=pd.merge(return_df,dfp,left_on='Player',right_on='Player')
#df_new=df_new[(df_new['
    df_new['Points per Lakh'] =  np.round(df_new['Base Total']/df_new['Sold_Price'],2)
    df_new=df_new.fillna(0).replace(np.inf,0)
    df_new.sort_values(by=['Points per Lakh','Player'],ascending=[False,True],inplace=True)
    #print(return_df.to_dict(orient='records'))
    return df_new.to_dict(orient='records')

#Highest value for money players
@app.post('/{year:str}/stats/PlayerStatus')
def status(year):
    dfp=pd.DataFrame(dbm2[year].find({"Sold_To":{"$ne":""}}).to_list()).drop(columns={'_id'})
    dfp['Sold_Price']=dfp['Sold_Price'].astype(str).str.replace('.0','')+np.where(dfp['Set']=='Retained',' (Retained)','')
    
    #print(return_df.to_dict(orient='records'))
    return dfp.fillna('').sort_values(by=[ "Sold_Time", "Sold_To", "Sold_Price",],ascending=[True,True,False ])[['Player',"Type",'Category','Base_Price','Sold_Price','Sold_To','Sold_Time']].to_dict(orient='records')
 
#Current squad in team sheet format
@app.post('/{year:str}/stats/squad')
def current_squad(year,):
    df = pd.DataFrame(dbm2[year].find({}).to_list())
    df_filtered = df[(df['Sold_To']!='Unsold')&(df['Sold_To']!='')]
    return_df = df_filtered.groupby(['Sold_To'])['Player'].apply(list).apply(pd.Series).reset_index()
    return_df = return_df.transpose()
    return_df.columns = return_df.iloc[0]
    return_df = return_df[1:].reset_index(drop=True).fillna('')
    #return_df = return_df.reindex(sorted(df_filtered['Team'].unique()),axis=1)
    return return_df.to_dict(orient='records')

#Current squad in team sheet format
@app.post('/teamdata')
def my_squad(user=Depends(verify_jwt_token)):
    print(user)
    df = pd.DataFrame(Squad_2026.find({"Team":user}).to_list())
    print(df)
    df=df[['Player','Bench','Captain','Vice_Captain']]
    #return_df = return_df.reindex(sorted(df_filtered['Team'].unique()),axis=1)
    return df.to_dict(orient='records')

@app.post('/{year:str}/graph/{team}/pie')
def pie_graph(team:str,year):
    df = dbm[year].stats
    return_df = df[(df['Team']==team)]
    #return_df['Captaincy Points']=return_df['Total Points'] - return_df['Appearance Points'] - return_df['Batting Points'] - return_df['Bowling Points'] - return_df['Fielding Points']
    return_df1 = return_df[['Appearance Points','Batting Points','Bowling Points','Fielding Points']].sum()
    return_df2 = return_df.groupby('IPL Team')[['Appearance Points','Batting Points','Bowling Points','Fielding Points']].sum().sum(axis=1)
    return {'solo':return_df1.to_dict(),'team':return_df2.to_dict()}
    
@app.post('/{year:str}/graph/{award}/sun')
def sun_graph(award:str,year):
    df = dbm[year].df
    multipliers={'Wickets':20,'Catches':8,'Sixes':2}

    df=df[['Team','Player',award]]
    df[award]//=multipliers.get(award,1)
    df1=df.groupby('Team').sum()
    labels = ['Total']
    parents=['']
    values=[int(df1[award].sum())]
    for i,j in df1.iterrows():
        labels.append(i)
        parents.append('Total')
        values.append(int(j[award])) 
    for i,j in df.set_index('Player').iterrows():
        labels.append(i)
        parents.append(j['Team'])
        values.append(int(j[award]))
    return {'labels':labels,'values':values,'parents':parents}



#Detailed info on a single player
def detailed_df(player):
    df = dbm[year].df
    return_df = df[df['Player']==player]
    return return_df.to_dict(orient='records')

def live_df():
    live_data = list(live_status.find({}))
    return pd.DataFrame(live_data).drop(columns={'_id'}).to_dict(orient='records')

@app.get('/{year:str}/{path:path}',response_class=HTMLResponse)
def test_react_fallback():
    content="""<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xavier's Premier League</title><script defer="defer" src="/script/main.js"></script></head><body style="height: 95vh;"><div id="root" style="height: 100%;"></div></body></html>"""
    return HTMLResponse(content)
