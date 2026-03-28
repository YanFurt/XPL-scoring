import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React,{ useEffect,  useState } from 'react';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,DragOverlay
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove
} from "@dnd-kit/sortable";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Typography,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

function SortableElement({ player, containerId }) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: player._id,
    data: { containerId }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  };

  return (
    <Paper
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      sx={{
        p: 1,
        cursor: 'grab'
      }}
      style={style}
    >
      {`${player.Player} (${player.Team_Matches})`}
    </Paper>
  );
}

function SortableContainer({ containerId, elements }) {
  const disabled=!!(containerId=='Bench'&elements.length==5)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isOver
  } = useDroppable({
    id: containerId,
    disabled :disabled
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: disabled ? "not-allowed" : "grab",
     color: isOver ? 'green' : undefined,
     touchAction: 'none' 
  };

  return (<Box
      ref={setNodeRef}
      sx={{...{
        display: 'grid',
        gridTemplateColumns: elements.length>=10?'1fr 1fr':'1fr',
        columnGap: 2,
        rowGap: 1,
        backgroundColor: isOver ? 'action.hover' : undefined,
      },...style}}
    >
      <SortableContext
        items={elements.map(p => p._id)}
        strategy={rectSortingStrategy}
      >
        {elements.map((player, index) => (
          <SortableElement
            key={player._id}
            player={player}
            containerId={containerId}
          />
        ))}
      </SortableContext>
    </Box>
  );
}

function generateBenchLogs(original,newbench,updater,lookup){
 

  if (original.size ==0){
    updater({out:newbench,in:[]})
    return newbench.map(p=>`You added ${lookup[p].Player} to the bench`)
  }
  else{
    const set = new Set(newbench)
    const out_players = Array.from(set.difference(original))
    const in_players=Array.from(original.difference(set))||[]
    
    updater({in:in_players,out:out_players})
    return in_players.length>0?in_players.map((c,i)=>`You transferred in ${lookup[c].Player} for ${lookup[out_players[i]].Player}`):[]
  }
}



async function getTeam() {
  const host = window.location.origin
  //const host = window.location.origin
  try {
    const response = await fetch(`${host}/teamdata`,{
      method: "POST",
      credentials:'include',
  });
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

function displayMsg(payload,lookup,limits) {
  
  const inplayers = payload?.in
  const outplayers = payload?.out
  const caps = payload?.cap_change
  const vcaps = payload?.vcap_change
  let caplog='';
  let vcaplog='';
  let caplog2='';
  let vcaplog2='';


  const transfer_delays = inplayers.map( (value, index) =>
              { const diff=lookup[outplayers[index]].Matches-lookup[value].Matches;
                if (diff>0){
                  return `${lookup[value].Player} will start scoring after ${diff} matches`
                }
                else {
                  return ''
                }
              } );

  if (caps){
  const diff=lookup[caps[1]]?.Matches||0-lookup[caps[0]]?.Matches||0;
  if (diff>0){
    caplog= `\n${lookup[caps[0]].Player} will start captaining after ${diff} matches`
  }
}

if (vcaps){
  
  const diff=lookup[vcaps[1]]?.Matches||0-lookup[vcaps[0]]?.Matches||0;
  if (diff>0){
    vcaplog= `\n${lookup[vcaps[0]].Player} will start vice-captaining after ${diff} matches`
  }
}

const transfer_costs=inplayers.map( (value, index) =>
              { const penalty=30*+(limits.transfers-index-1<0)+Math.max(5*(index-limits.transfers),0);
                if (penalty>0){
                  return `${lookup[value].Player} will cost ${penalty} per match due to transfer limit`
                }
                else {
                  return ''
                }
              } );

if (caps){
  const penalty=60*+(limits.cap-1<0)-Math.min(10*(limits.cap),0);
  if (penalty>0){
    caplog2= `\n${lookup[caps[0]].Player} will cost ${penalty} per match due to captain change limit`
  }
}

if (vcaps){
  
  const penalty=45*+(limits.vcap-1<0)-Math.min(7.5*(limits.vcap),0)
  if (penalty>0){
    vcaplog2= `\n${lookup[vcaps[0]].Player} will cost ${penalty} per match due to vc change limit`
  }
}

return transfer_delays.filter(i=>!!i).join('\n')+caplog+vcaplog+transfer_costs.filter(i=>!!i).join('\n')+caplog2+vcaplog2

}
async function setTeamState(body) {
  const host = window.location.origin
  //const host = window.location.origin
  try {
    const response = await fetch(`${host}/updateteam`,{
      method: "POST",
      credentials:'include',
      body:JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json' // Explicitly setting the content type
    }
  });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    
    const data = await response.text();
    console.log(data)
    return JSON.parse(data)
    //console.log(json);   i
  } catch (error) {
    console.error(error.message);
  }
}


export  function SquadSelector() {
  const MAX_BENCH = 5;

  const [players,setPlayers] = useState([])
  const [team, setTeam] = useState([]
  );
  const [bench, setBench] = useState(
    []
  );
  const [activeId,setActiveId]=useState(null)
  const [captain, setCaptain] = useState("");
  const [originalleaders,setOriginal]=useState({})
  const [viceCaptain, setViceCaptain] = useState("");
  const [caplog,setCaplog] = useState("")
  const [vcaplog,setVcaplog] = useState("")
  const [originalbench,setOriginalBench]=useState(new Set())
  const [benchlogs,setBenchlogs]=useState([])
  const [substitutions,setSubstitutions] = useState({})
  const [lookup,setLookup] = useState({})
  
  const [open,setOpen]=useState(false)
  const [payload,setPayload] = useState({in:[],out:[]})
  const [quota,setQuota]=useState({})

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 5 }
    })
  );

  
  useEffect( ()=>{ 
      (async () => {
        const {teamdata,limits} = await getTeam();
        const cap=teamdata.find(p=>p.Captain)||{}
        const vcap=teamdata.find(p=>p.Vice_Captain)||{}
        const bench = teamdata.filter(p => p.Bench);
        
        setPlayers(teamdata);
        setTeam(teamdata.filter(p => !p.Bench));
        setBench(bench);
        setCaptain(cap._id||"");
        setViceCaptain(vcap._id||"")
        setOriginal({cap,vcap})
        setOriginalBench(new Set(bench.map(p=>p._id)))
        setQuota(limits)
        setLookup(Object.fromEntries(
        teamdata.map(obj => [obj._id,{Player:obj.Player, Matches:obj.Team_Matches}])
        ))
      })();}
      ,[])

  useEffect(()=>{

    const logs=generateBenchLogs(originalbench,bench.map(p=>p._id),setSubstitutions,lookup)

    setBenchlogs(logs)
  },[bench])
  
  const handleCaptainChange = (event) => {
    const value = event.target.value;
    const caplog = []

    setCaptain(value);

    if (value!=originalleaders.cap?._id){
      setCaplog(`You changed the captain to ${lookup[value].Player}`)
    }
    else {
      setCaplog("")
    }
    
    // If the new captain was previously vice captain, clear vice captain
    if (value === viceCaptain) {
      setViceCaptain("");
      setVcaplog("You removed the vice-captain")
      setTeam(team.map((c) =>  c._id == value?{...c,Captain:true,Vice_Captain:false}:c ));
      return
    } 
    setTeam(team.map((c) =>  c._id == value?{...c,Captain:true}:{...c,Captain:false} ));
  };

  const handleViceCaptainChange = (event) => {
    const value = event.target.value;
    setViceCaptain(value);
    setTeam(team.map((c) =>  c._id == value?{...c,Vice_Captain:true}:{...c,Vice_Captain:false} ));
    
    if (value!=originalleaders.vcap?._id){
      setVcaplog(`You changed the vice-captain to ${lookup[value].Player}`)
    }
    else {
      setVcaplog("")
    }
    if (value === captain) {
      setCaptain("");
      setTeam(team.map((c) =>  c._id == value?{...c,Vice_Captain:true,Captain:false}:c ));
      setCaplog("You removed the Captain")
      return
  };
  setTeam(team.map((c) =>  c._id == value?{...c,Vice_Captain:true}:{...c,Vice_Captain:false} ));}
  

  function handleDragStart(event) {
    const {active} = event;
    
    setActiveId(active.id);
  }

  const handleDragEnd = ({ active, over }) => {
  if (!over) return;

  const activeid = active.id;
  const overId = over.id;

  const from = active.data.current?.containerId;
  const to = over?.data.current?.containerId||over.id;
  
  if (from === to) {
    if (from === "Bench") {
      const oldIndex = bench.findIndex(p => p._id === activeid);
      const newIndex = bench.findIndex(p => p._id === overId);
      setBench(arrayMove(bench, oldIndex, newIndex));
    }

    if (from === "Team") {
      const oldIndex = team.findIndex(p => p._id === activeid);
      const newIndex = team.findIndex(p => p._id === overId);
      setTeam(arrayMove(team, oldIndex, newIndex));
    }

    return;
  }

  // TEAM → BENCH
  if (from === "Team" && to === "Bench") {
    const player = team.find(p => p._id === activeid);
    if (player.Captain || player.Vice_Captain) return;

    if (bench.length === MAX_BENCH && overId!=='Bench'){
        const swap = bench.find(p => p._id === overId)
        
        setTeam(team.map((c) =>  c._id == activeid?{...swap,Bench:false}:c ));
        setBench(bench.map((c) =>  c._id == overId? {...player,Bench:true}:c ));
        return
    };



    

    setTeam(team.filter(p => p._id !== activeid));
    setBench([...bench, { ...player, Bench: true }]);
  }

  // BENCH → TEAM
  if (from === "Bench" && to === "Team") {
    const player = bench.find(p => p._id === activeid);
    const swap = team.find(p => p._id === overId)
    if (swap.Captain||swap.Vice_Captain) return    
    setTeam(team.map((c) =>  c._id == overId?{...player,Bench:false}:c ));
    setBench(bench.map((c) =>  c._id== activeid? {...swap,Bench:true}:c ));

  }
};

const handleSubmit = ()=>{
  const temppayload = {}
  if (originalleaders.cap?._id !== captain){
      temppayload.cap_change = [captain,originalleaders.cap?._id]
  }
  if (originalleaders.vcap?._id !==viceCaptain){
      temppayload.vcap_change = [viceCaptain,originalleaders.vcap?._id]
  }
  const finalpayload = {...temppayload,...substitutions}
  console.log(finalpayload)
  setPayload(finalpayload)
  setOpen(true)
}

const handleClose = ()=>{setOpen(false)}

const handleConfirm = async ()=>{
  setOpen(false);
  const status = await setTeamState(payload);
  if(status=='Success'){
    const cap=team.find(p=>p.Captain)||{}
    const vcap=team.find(p=>p.Vice_Captain)||{}
    setOriginal({cap,vcap})
    setOriginalBench(new Set(bench.map(p=>p.Player)))
    setBenchlogs([])
    setCaplog('')
    setVcaplog('');
    setPayload({in:[],out:[]})
  }
  
}

  return (
    <div>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
            <DragOverlay>
        {activeId ? (
        <Table size="small">
            <TableBody>
            <TableRow>
                <TableCell>
                <Typography fontWeight={500}>
                    {lookup[activeId].Player}
                </Typography>
                </TableCell>
            </TableRow>
            </TableBody>
        </Table>
        ) : null}
        </DragOverlay>
      <Stack direction="row" spacing={3} justifyContent="center">
        <Paper elevation={3} sx={{ p: 3, width: 200 }}>
      <Typography variant="h6" gutterBottom>
        Team Leadership
      </Typography>

      <Stack spacing={2}>
        <FormControl fullWidth>
          <InputLabel id="captain-label">Captain</InputLabel>
          <Select
            labelId="captain-label"
            value={captain}
            label="Captain"
            onChange={handleCaptainChange}
          >
            {team.map((option) => {
              const value = option._id ?? option;
              const label = option.Player ?? option;

              return (
                <MenuItem
                  key={value}
                  value={value}
                  
                >
                  {label}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="vice-captain-label">Vice Captain</InputLabel>
          <Select
            labelId="vice-captain-label"
            value={viceCaptain}
            label="Vice Captain"
            onChange={handleViceCaptainChange}
          >
            {team.map((option) => {
              const value = option._id ?? option;
              const label = option.Player ?? option;

              return (
                <MenuItem
                  key={value}
                  value={value}
                >
                  {label}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        <Typography variant="h8" gutterBottom justifyContent='center' display='grid'>
            {caplog}
          </Typography>
        <Typography variant="h8" gutterBottom justifyContent='center' display='grid'>
            {vcaplog}
          </Typography>
      </Stack>
    </Paper>
        {/* TEAM */}
        <Paper sx={{width:400, p: 2 }}>
          <Typography variant="h6" gutterBottom justifyContent='center' display='grid'>
            Playing Squad
          </Typography>

          <SortableContext
            items={team.map(p => p.Player)}
            strategy={verticalListSortingStrategy}
          >
            <SortableContainer key='Team' containerId="Team" elements={team}>
            </SortableContainer>
          </SortableContext>
        </Paper>

        {/* BENCH */}
        <Paper sx={{ width: 200, p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-around"
            alignItems="center"
            mb={1}
          >
            <Typography variant="h6" >Bench</Typography>
            <Chip label={`${bench.length} / ${MAX_BENCH}`} />
          </Stack>

          <SortableContext
            items={bench.map(p => p.Player)}
            strategy={verticalListSortingStrategy}
          >
            <SortableContainer key='Bench' containerId="Bench" elements={bench}>
            </SortableContainer>
          </SortableContext>
            <Divider sx={{ my: 2 }} />
          {benchlogs.map(a=><Typography key={a} variant="h8" gutterBottom justifyContent='center' display='grid'>
            {a}
          </Typography>)}
        </Paper>
      </Stack>
    </DndContext>
    <div style={{display:"flex",justifyContent:"center",paddingTop:'10px'}}>
    <Button
            variant="contained"
            color="primary"
            disabled={!captain || !viceCaptain || bench.length<5||!(caplog||vcaplog||substitutions.out.length>0)}
            onClick={handleSubmit}
          >
            Submit
    </Button>
    <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Summary</DialogTitle>
        <DialogContent>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>
            {payload.in.length? `In: ${payload.in.map(i=>lookup[i].Player).join(', ')}\n\n`:'' }
            {payload.out.length>0? `Out: ${payload.out.map(i=>lookup[i].Player).join(', ')}\n\n`:'' }
            {caplog?`${caplog}\n\n`:""}
            {vcaplog?`${vcaplog}\n\n`:""}
            {displayMsg(payload,lookup,quota)}
          </Typography>
          <br></br>
          <Typography>
            Do you want to confirm these changes?
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirm} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
    </div>
  );
}

