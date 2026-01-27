import React,{ useEffect,  useState } from 'react';
import Plot from 'react-plotly.js';
import {useParams,NavLink} from 'react-router'
import { useNavigate } from 'react-router-dom';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import './styles.css'

const franchises = JSON.parse(process.env.FRANCHISES||"{}")

async function getAucData(url:String) {
  const host = window.location.origin 
  //const host='http://127.0.0.1:8000'
  try {
    const response = await fetch(`${host}/${url}`,{
      method: "POST"});
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    
    const data = await response.text();
    //console.log(data)
    return JSON.parse(data)
    //console.log(json);   i
  } catch (error:any) {
    console.error(error.message);
  }
}

function BasicTable({rows}) {
     return ( 
       <TableContainer component={Paper} >
         <Table sx={{ width: 800 }} aria-label="simple table">
           <TableHead>
             <TableRow>
               <TableCell>Team</TableCell>
               <TableCell align="center">Points</TableCell>
               <TableCell align="center">Matches</TableCell>
               <TableCell align="center">C Matches</TableCell>
               <TableCell align="right">VC Matches</TableCell>
             </TableRow>
           </TableHead>
           <TableBody>
             {rows.map((row) => (
               <TableRow
                 key={row.Team}
                 sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
               >
                 <TableCell component="th" scope="row">
                   {franchises[row.Team]}
                 </TableCell>
                 <TableCell align="center">{row['Total']}</TableCell>
                 <TableCell align="center">{row['Total Matches']}</TableCell>
                 <TableCell align="center">{row['C Matches']}</TableCell>
                 <TableCell align="right">{row['VC Matches']}</TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </TableContainer>
     );
   }

   function AwardTable({rows, colname}) {
    return ( 
      <div >
      <TableContainer component={Paper}  >
        <Table sx={{ width: '100%' }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Team</TableCell>
              <TableCell align="center">{colname}</TableCell>
              <TableCell align="right">Matches</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.Team}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {franchises[row.Team]}
                </TableCell>
                <TableCell align="center">{row[colname]}</TableCell>
                <TableCell align="center">{row['Total Matches']}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </div>
    );
  }






export function PointsTable  () {
  const [data,setData] = useState([])
  //const [plotdata, setPlotdata]= useState({})
  //const [interval,setInterval] = useState([])
  const {year} = useParams()
  

  useEffect( ()=>{ 
    (async () => {
      const users = await getAucData(`${year}/standings`);
      setData(users);
    })();
    /*(async () => {
      const {int,users2} = await getAucData('graphs/overall/line');
      setPlotdata(users2);
      setInterval(int)
    })();*/
    }
    ,[year])
  
  return      <div style={{ height: '100%', width: '100%' }}>

    <h1 style={{textAlign:'center'}}>Standings</h1>
   <div style={{ display: 'flex', flexDirection: 'column',maxHeight:800,maxWidth:800 ,margin:'20px auto'}}>
   <BasicTable rows={data}></BasicTable>
   </div>
   {/* <div>
   <Plot
    data={Object.keys(plotdata).map((a)=> ({
      x: plotdata[a],
      y: interval,
      type: 'scatter',
      mode: 'lines+markers',
      marker: {color: 'red'} }))}
    layout={{width: 2000, height: 600, title: {text: 'A Fancy Plot'}} }>
    </Plot>
   </div> */}
       

     </div>
};

export const Navbar =()=>{
  const [time,setTime] = useState('Last updated: -')
   //const arr = ['Spartan Warriors', 'Merciless Strikers','Fireballs','Trailblazers','Knight Riders','Invincibles','Storm Troopers']
   const awards = ['Runs', 'Wickets', 'Dots','Sixes','Catches']
   const misc = ['Sold Player Stats', 'Unsold Player Stats','MVPs','Player Status']
   const year=window.location.href.split('/')[3]
   const [fetchyear,setFetchYear] = useState(year)
   const navigate=useNavigate() 
  
   useEffect( ()=>{ 
    (async () => {
      const users = await getAucData("latestupdate");
      setTime(users);
    })();}
    ,[])

    const handleSelect = (e) => {
        const selectedyear = e.target.value;
        console.log(selectedyear);
        setFetchYear(selectedyear);
        navigate(`/${selectedyear}`);
    };

   return <div className="navbar">
    <nav>
    <NavLink className='Navlink' style={{ margin: 10 }} to={`/${fetchyear}`} end>Standings</NavLink>
    <NavLink className='Navlink' style={{ margin: 10 }} to={`/${fetchyear}/stats/squad`}>Squads</NavLink>
    <div className="dropdown">
      <button className="dropbtn">Awards
        <i className="fa fa-caret-down"></i>
      </button>
      <div className="dropdown-content">
      {awards.map((a)=><NavLink className='Navlink' style={{ margin: 10 }} to={`/${fetchyear}/awards/${a}`}>{a}</NavLink>)}
      </div>
    </div>
    <div className="dropdown">
      <button className="dropbtn">Team Stats
        <i className="fa fa-caret-down"></i>
      </button>
      <div className="dropdown-content">
      {Object.keys(franchises).map((a)=><NavLink className='Navlink' style={{ marginRight: 10 }} to={`/${fetchyear}/players/${a}`}>{franchises[a]}</NavLink>)}
      </div>
    </div>
    <div className="dropdown">
      <button className="dropbtn">Player Info
        <i className="fa fa-caret-down"></i>
      </button>
      <div className="dropdown-content">
      {misc.map((a)=><NavLink className='Navlink' style={{ marginRight: 10 }} to={`/${fetchyear}/stats/${a.replaceAll(' ','')}`}>{a}</NavLink>)}
      </div>
    </div>
    <div className="dropdown">
      <select className="dropbtn" onChange={handleSelect}>
        <option value="2026">XPL 2026</option>
        <option value="2025">XPL 2025</option>
    </select>
    </div>
    </nav>
    <h5 style={{fontSize:12, textAlign:'right',color:'white'}}>{time}</h5>
  </div> 

}



function TeamTable({rows}) {
  const cols: String[] = ['Player','Type','IPL Team',
    'Appearance Points','Batting Points','Bowling Points','Fielding Points','Total Points',
    'Total Matches','C Matches','VC Matches','Points per Match']
  return ( 
    <TableContainer component={Paper} >
      <Table sx={{ width: 1000,margin:'auto' }} aria-label="simple table">
        <TableHead style={{position:'sticky',backgroundColor:'grey',top:0}}>
          <TableRow>
            {cols.map((a)=><TableCell align="center">{a}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row:any) => (
            <TableRow
              key={row.Player}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              {cols.map((a)=><TableCell align="center">{row[a]}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SquadTable({rows}) {
  const cols: String[] = Object.keys(rows[0])

  return ( 
    <TableContainer component={Paper} >
      <Table sx={{ width: 1000,margin:'auto' }} aria-label="simple table">
        <TableHead style={{position:'sticky',backgroundColor:'grey',top:0}}>
          <TableRow>
            {cols.map((a)=><TableCell align="center">{a}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.Jinto}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              {cols.map((a)=><TableCell align="center">{row[a]}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}


function MiscTable({rows}) {
  const [sortcol, setSortcol] = useState('Sold_Time')
  const [sortOrder, setSortOrder] = useState(1)
  const cols: String[] = Object.keys(rows[0])

  rows.sort((a1, a2) => sortOrder*String(a1[sortcol]).localeCompare(String(a2[sortcol])))
  

  return ( 
    <TableContainer component={Paper} >
      <Table sx={{ width: 1000,margin:'auto' }} aria-label="simple table">
        <TableHead style={{position:'sticky',backgroundColor:'grey',top:0}}>
          <TableRow>
            {cols.map((a)=><TableCell align="center" onClick={()=>{setSortcol(a);setSortOrder(-1)}} onDoubleClick={()=>[setSortcol(a),setSortOrder(1)]}>{a.replace('_',' ')}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.Jinto}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              {cols.map((a)=>a!='Sold_Time'?<TableCell align="center">{row[a]}</TableCell>:<TableCell align="center">{(new Date(row[a]*1000)).toJSON().slice(0,16)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}




export function AwardStat(){
  const [awrd,setAwrd] = useState([])
    const {award,year} = useParams()
     

     useEffect( ()=>{ 
      (async () => {
        const users = await getAucData(`${year}/awards/${award}`);
        setAwrd(users);
      })();}
      ,[award])
    
    
     return   <div style={{ height: '100%', width: '100%' }}>

      <h1 style={{textAlign:'center'}}>{award}</h1>
     <div style={{ display: 'flex',margin:'20px auto', justifyContent:'space-around'}}>
     <AwardTable rows={awrd} colname={award}></AwardTable>
     <Sunburst award={award}></Sunburst>
     </div>
       </div>
};
 
export function MiscStat(){
  const [data,setData] = useState([{}])
  const [searchTerm, setSearchTerm] = useState("");
  const {endpoint,year} = useParams()
  const endpointmap = {'SoldPlayerStats':'Sold Player Stats', 'UnsoldPlayerStats':'Unsold Player Stats','MVPs':'MVPs','PlayerStatus':'Player Status'}
  console.log(endpoint,year)

     useEffect( ()=>{ 
      (async () => {
        const users = await getAucData(`${year}/stats/${endpoint}`);
        setData(users);
      })();}
      ,[endpoint])

    
    
    const filteredData = data.filter(
        (item) =>
          ((item.Player??"").toLowerCase().includes(searchTerm.toLowerCase())));

     return   <div style={{ height: '100%', width: '100%' }}>

      <h1 style={{textAlign:'center'}}>{endpointmap[endpoint||'']?.toUpperCase()}</h1>
      { endpoint=='squad'? <div style={{ display: 'flex', flexDirection: 'column',maxHeight:1000,maxWidth:1100 ,margin:'20px auto'}}>
     <SquadTable rows={data} ></SquadTable>
     </div>:
     <div style={{ display: 'flex', flexDirection: 'column',maxHeight:800,maxWidth:1100 ,margin:'20px auto'}}>
      <input
        type="text"
        placeholder="Search Player name"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
     <MiscTable rows={filteredData.length?filteredData:[{}]} ></MiscTable>
     </div>}
       </div>
};

function Sunburst ({award}){
  const [labs,setLabs] = useState([])
  const [vals,setVals] = useState([])
  const [pars,setPars] = useState([])
  const {year} = useParams()
  useEffect( ()=>{ 
    (async () => {
      const {values,parents,labels} = await getAucData(`${year}/graph/${award}/sun`);
      setLabs(labels);
      setVals(values);
      setPars(parents);
    })();    
      }
    ,[award])


  return <div >
  <Plot data={[{
  type: "sunburst",
  labels: labs,
  parents: pars,
  values: vals,
  insidetextorientation: 'radial',
  branchvalues:'total'}]} layout={{margin: {l: 0, r: 0, b: 0, t:0}}}></Plot>
  </div>


}

export const PlayerStat =() => {
     const {name} = useParams()
     const [data,setData] = useState([])
     const [pie1,setPie1] = useState([{}])
     const [pie2,setPie2] = useState([{}])
     const {year} = useParams()
     const slabels = ['Appearance Points','Batting Points','Bowling Points', 'Fielding Points']
     const flabels = ['DC','CSK',  'GT',  'MI', 'PBKS','LSG', 'RCB', 'RR', 'SRH','KKR']
     const palette = ["rgb(1, 22, 207)","rgb(255, 241, 0)",'rgb(8,22,64)',
       "rgb(71, 156, 212)","rgb(207, 47, 47)","rgb(101,192,201)","rgb(170, 10, 10)",
       "rgb(227,73,227)","rgb(255,102,0)","rgb(98, 7, 147)"]
     useEffect( ()=>{ 
      (async () => {
        const users = await getAucData(`${year}/player/${name}`);
        setData(users);
      })();
      (async () => {
        const {solo, team} = await getAucData(`${year}/graph/${name}/pie`);
        setPie1(solo);
        setPie2(team)
      })()
      
        }
      ,[name])
     
    return  <div style={{ height: '100%', width: '100%' }}>

    <h1 style={{textAlign:'center'}}>{franchises[name||'']}</h1>
    <div id='Charts' style={{height:'520px',width:'100%',margin:'auto',overflowX:'scroll',display:'flex'}}>
    <Plot
        data={[
          {
            values: slabels.map((a)=> pie1[a]),
            labels: slabels,
            type: 'pie',
            textinfo: "label+percent",
            hoverinfo: "value",
            textposition: "auto",
            automargin: true, title: {text: 'Points by Aspect',font:{size:20,weight:4}}
          }
        ]}
        layout={ {width:  790, height: 500,showlegend: false,margin:{l:20,r:20,t:20,b:20} }}
      />
    <Plot
        data={[
          {
            values: flabels.map((a)=> pie2[a]??0),
            labels: flabels,
            marker:{ colors:palette},
            type: 'pie',
            textinfo: "label+percent",
            hoverinfo: "value",
            textposition: "auto",
            automargin: true,
           title: {text: 'Points by Franchise',font:{size:20,weight:4}}
          }
        ]}
        layout={ {width: 790, height: 500,margin:{l:20,r:20,t:10,b:10},showlegend: false }}
      />
    </div>
   <div style={{ display: 'flex', flexDirection: 'column',maxHeight:'100%',maxWidth:'100%' ,margin:'20px auto'}}>
   <TeamTable rows={data}></TeamTable>
   </div>
     </div>
};



 