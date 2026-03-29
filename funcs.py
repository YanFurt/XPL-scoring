import pandas as pd
from pymongo import MongoClient,UpdateOne, UpdateMany
from datetime import datetime,UTC,timedelta
from dotenv import load_dotenv
import os,json

load_dotenv()  



def get_player_games(db,pnames):
    players = db.find({'_id':{'$in':pnames}},{'_id':1,	'Player':1,	"IPL_Team":1,'Base_Matches':1}).to_list()
    return {i['_id']:[i['Base_Matches'],i['IPL_Team']] for i in players}

#Fetches last k matches after today involving franchise
def get_transfer_limits(db,user):
    lst = db.find({'username':user}).to_list()[0]
    return {'transfers':5-len(lst['transfer_history']), 'cap':2-len(lst['c_change_history']),'vcap':2-len(lst['vc_change_history'])}

def get_match_ids(franchise,schedf, num_valid=20):
    return list(schedf[(schedf.index >= pd.Timestamp.now()) & (schedf.home_team==franchise)|(schedf.away_team==franchise)].tail(num_valid)['index'].values)


def update_transfers(overall_db,audit_db,player,dct,schedf):
    inl=dct.get('in')
    outl=dct.get('out')
    cap_change = dct.get("cap_change")
    vcap_change = dct.get("vcap_change")
    overall_mongoupdate_objects = []
    squad_audit_update_objects=[]
    limits=get_transfer_limits(audit_db,player)

    if outl:
        transfer_games=get_player_games(overall_db,inl+outl)
        tlimit = limits.get('transfers')
        for i in range(len(outl)):
            
            playerout=outl[i]
            mpout,franchiseout=transfer_games[playerout]
            outgoing_remove_ids=get_match_ids(franchiseout,schedf)
            try:
                playerin=inl[i]
                mpin,franchisein=transfer_games[playerin]
                incoming_valid_games = 14-mpout

                new_incoming_valid_ids=get_match_ids(franchisein,schedf, incoming_valid_games)
                overall_mongoupdate_objects.append(UpdateOne(filter={ "_id": playerin },
                        update={ "$set": { "Bench": False }, '$addToSet': { 'Valid_Matches_List': { '$each': [int(j) for j in new_incoming_valid_ids] }  },'$addToSet':{ 'Penalty_Matches_List.Bench': { '$each': [int(j) for j in new_incoming_valid_ids if tlimit-i-1<0] }  }}))
                
                
        
                
                overall_mongoupdate_objects.append(UpdateOne(filter={ "_id": playerout },
                            update={ "$set": { "Bench": True }, '$pullAll': { 'Valid_Matches_List': [int(j) for j in outgoing_remove_ids] },'$pullAll': { 'Penalty_Matches_List.Bench': [int(j) for j in outgoing_remove_ids] } }))
            
                squad_audit_update_objects.append(UpdateOne(filter={ "username": player},
                            update={ '$push': {'transfer_history':{'in':playerin,'out':playerout,'time':str(datetime.now(UTC))}  } }))

            except IndexError:
                playerin = 'Nobody'
                overall_mongoupdate_objects.append(UpdateOne(filter={ "_id": playerout },
                            update={ "$set": { "Bench": True }, '$pullAll': { 'Valid_Matches_List': [int(i) for i in outgoing_remove_ids] } }))
            

            

            


    if cap_change:
        cap_games=get_player_games(overall_db,cap_change)
        climit = limits.get('cap')
        playerin=cap_change[0]
        playerout=cap_change[1]
        if playerout is None:
            playerout=''
        mpin,franchisein=cap_games[playerin]
        mpout,franchiseout=cap_games.get(playerout,(0,''))
        incoming_valid_games = 14-mpout

        new_incoming_valid_ids=get_match_ids(franchisein,schedf, incoming_valid_games)
        overall_mongoupdate_objects.append(UpdateOne(filter={ "_id": playerin },
                    update={ "$set": { "Captain": True }, '$addToSet': { 'C_Matches_List': { '$each': [int(i) for i in new_incoming_valid_ids] }  },'$addToSet':{ 'Penalty_Matches_List.C': { '$each': [int(j) for j in new_incoming_valid_ids if climit<=0] }  }}))

        outgoing_remove_ids=get_match_ids(franchiseout,schedf)
        overall_mongoupdate_objects.append(UpdateOne(filter={"_id": playerout },
                    update={ "$set": { "Captain": False }, '$pullAll': { 'C_Matches_List': [int(i) for i in outgoing_remove_ids] },'$pullAll': { 'Penalty_Matches_List.C': [int(j) for j in outgoing_remove_ids] } }))

        squad_audit_update_objects.append(UpdateOne(filter={ "username": player },
                    update={ '$push': {'c_change_history':{'in':playerin,'out':playerout,'time':str(datetime.now(UTC))}  } }))
        
    if vcap_change:
        vclimit = limits.get('vcap')
        vcap_games=get_player_games(overall_db,vcap_change)
        
        playerin=vcap_change[0]
        playerout=vcap_change[1]

        if playerout is None:
            playerout=''
        mpin,franchisein=vcap_games[playerin]
        mpout,franchiseout=vcap_games.get(playerout,(0,''))
        incoming_valid_games = 14-mpout

        new_incoming_valid_ids=get_match_ids(franchisein,schedf, incoming_valid_games)
        overall_mongoupdate_objects.append(UpdateOne(filter={ "_id": playerin },
                    update={ "$set": { "Vice_Captain": True }, '$addToSet': { 'VC_Matches_List': { '$each': [int(i) for i in new_incoming_valid_ids] }  },'$addToSet':{ 'Penalty_Matches_List.VC': { '$each': [int(j) for j in new_incoming_valid_ids if vclimit<=0] }  }}))

        outgoing_remove_ids=get_match_ids(franchiseout,schedf)
        overall_mongoupdate_objects.append(UpdateOne(filter={ "_id": playerout },
                    update={ "$set": { "Vice_Captain": False }, '$pullAll': { 'VC_Matches_List': [int(i) for i in outgoing_remove_ids] },'$pullAll': { 'Penalty_Matches_List.VC': [int(j) for j in outgoing_remove_ids] } }))

        squad_audit_update_objects.append(UpdateOne(filter={ "username": player },
                    update={ '$push': {'vc_change_history':{'in':playerin,'out':playerout,'time':str(datetime.now(UTC))}  } }))
        
    errors=[]
    if overall_mongoupdate_objects:
        overall_write=overall_db.bulk_write(requests=overall_mongoupdate_objects)
        errors.extend(overall_write.bulk_api_result['writeErrors'])
    if squad_audit_update_objects:
        squad_audit_write=audit_db.bulk_write(requests=squad_audit_update_objects)
        errors.extend(squad_audit_write.bulk_api_result['writeErrors'])


    if errors :
        return "Success"
    
    else:
        return 'Failure'