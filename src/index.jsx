import React  from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route} from "react-router";
import {PointsTable,PlayerStat,AwardStat,Navbar,MiscStat} from './components.tsx'
import './styles.css'

//import { response } from 'express';

const domNode = document.getElementById('root');
const root = createRoot(domNode);




function Container() {
 
  return (
    
    <BrowserRouter>
    <Navbar></Navbar>
    <Routes>
      <Route path = '/:year' element={<PointsTable/>}></Route>
      <Route path='/:year/awards/:award' element={<AwardStat/>}></Route>
      <Route path='/:year/players/:name' element={<PlayerStat/>}></Route>
      <Route path='/:year/stats/:endpoint' element={<MiscStat/>}></Route>
    </Routes>
    </BrowserRouter>
  );
};





root.render(<Container />);



