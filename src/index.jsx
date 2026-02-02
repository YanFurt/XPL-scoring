import React, { useState,useEffect }  from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route,Navigate} from "react-router";
import {PointsTable,PlayerStat,AwardStat,Navbar,MiscStat, AuthForm} from './components.tsx'
import './styles.css'

import {SquadSelector} from './management.jsx'
//import { response } from 'express';

const domNode = document.getElementById('root');
const root = createRoot(domNode);

async function validate_session() {
  const host = window.location.origin 
  //const host='http://127.0.0.1:8000'
  try {
    const response = await fetch(`${host}/validate_session`,{
      method: "POST",
      credentials: "include"}
      );
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    
    const data = await response.text();
    //console.log(data)
    return JSON.parse(data)
    //console.log(json);   i
  } catch (error) {
    console.error(error.message);
  }
}



function Container() {
  const [userIn,setUserIn] = useState('')
  //const urlyear=window.location.href.split('/')[3]
  const [fetchyear,setFetchYear] = useState(2026)

 
  useEffect( ()=>{ 
      (async () => {
        const user=await validate_session()
        const user2= ['Expired','Invalid'].includes(user)?'':user
        setUserIn(user2);
      })();}
      ,[])


  return (
    
    <BrowserRouter>
    <Navbar user={userIn} updater={setUserIn} year={fetchyear} yearupdater={setFetchYear}></Navbar>
    <Routes>
      <Route path = '/:year' element={<PointsTable/>}></Route>
      <Route path='/:year/awards/:award' element={<AwardStat/>}></Route>
      <Route path='/:year/players/:name' element={<PlayerStat/>}></Route>
      <Route path='/:year/stats/:endpoint' element={<MiscStat/>}></Route>
      <Route path='/login' element={<AuthForm updater={setUserIn}/>}></Route>
      <Route path='/manageteam' element={<SquadSelector/>}></Route>
      <Route path="*" element={<Navigate to={`/${fetchyear}`} replace />} />
      
    </Routes>
    </BrowserRouter>
  );
};





root.render(<Container />);



