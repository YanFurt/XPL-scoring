import jwt
from datetime import datetime, UTC, timedelta
import json,os
from dotenv import load_dotenv
from fastapi import Depends,Request,Cookie
from jwt import ExpiredSignatureError, InvalidTokenError
from typing import Annotated
load_dotenv()

from pydantic import BaseModel
# Your secret key for signing the JWT. Keep this secure.
SECRET_KEY = os.getenv('SECRET_KEY')
ALGORITHM = "HS256"

def create_jwt_token(user_id: str):
    
    expiration_time = datetime.now(UTC) + timedelta(days=7)
    
    # Create the payload with standard claims
    payload = {
        "sub": user_id,  
        "exp": expiration_time,  
        "iat": datetime.now(UTC) 
    }
    
    # Encode the JWT
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token






def verify_jwt_token(XPL:Annotated[str|None,Cookie()]=None):
    if not XPL:
        return 'Invalid'
    try:
        # Decode the token (verification is done automatically by default)
        decoded_payload = jwt.decode(XPL, SECRET_KEY, algorithms=[ALGORITHM])
        print("Token is valid.")
        return decoded_payload['sub']
        
    except ExpiredSignatureError:
        print("Error: The token has expired.")
        return 'Expired'
    except InvalidTokenError as e:
        print(f"Error: Invalid token - {e}")
        return 'Invalid'




class LoginReq(BaseModel):
    user:str
    password:str
    signup:bool=False