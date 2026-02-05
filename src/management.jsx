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
    id: player.Player,
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
      {player.Player}
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
        items={elements.map(p => p.Player)}
        strategy={rectSortingStrategy}
      >
        {elements.map((player, index) => (
          <SortableElement
            key={player.Player}
            player={player}
            containerId={containerId}
          />
        ))}
      </SortableContext>
    </Box>
  );
}

function generateBenchLogs(original,newbench,updater){
 

  if (original.size ==0){
    updater({out:newbench,in:[]})
    return newbench.map(p=>`You added ${p} to the bench`)
  }
  else{
    const set = new Set(newbench)
    const out_players = Array.from(set.difference(original))
    const in_players=Array.from(original.difference(set))||[]

    updater({in:in_players,out:out_players})
    return in_players.length>0?in_players.map((c,i)=>`You transferred in ${c} for ${out_players[i]}`):[]
  }
}



async function getTeam() {
  const host = window.location.origin 
  //const host='http://127.0.0.1:8000'
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

async function setTeamState(body) {
  const host = window.location.origin 
  //const host='http://127.0.0.1:8000'
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
  
  const [open,setOpen]=useState(false)
  const [payload,setPayload] = useState({in:[],out:[]})
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
        const users = await getTeam();
        const cap=users.find(p=>p.Captain)||{}
        const vcap=users.find(p=>p.Vice_Captain)||{}
        const bench = users.filter(p => p.Bench);
        
        setPlayers(users);
        setTeam(users.filter(p => !p.Bench));
        setBench(bench);
        setCaptain(cap.Player||"");
        setViceCaptain(vcap.Player||"")
        setOriginal({cap,vcap})
        setOriginalBench(new Set(bench.map(p=>p.Player)))
      })();}
      ,[])

  useEffect(()=>{

    const logs=generateBenchLogs(originalbench,bench.map(p=>p.Player),setSubstitutions)

    setBenchlogs(logs)
  },[bench])
  
  const handleCaptainChange = (event) => {
    const value = event.target.value;
    const caplog = []

    setCaptain(value);

    if (value!=originalleaders.cap?.Player){
      setCaplog(`You changed the captain to ${value}`)
    }
    else {
      setCaplog("")
    }
    
    // If the new captain was previously vice captain, clear vice captain
    if (value === viceCaptain) {
      setViceCaptain("");
      setVcaplog("You removed the vice-captain")
      setTeam(team.map((c) =>  c.Player == value?{...c,Captain:true,Vice_Captain:false}:c ));
      return
    } 
    setTeam(team.map((c) =>  c.Player == value?{...c,Captain:true}:{...c,Captain:false} ));
  };

  const handleViceCaptainChange = (event) => {
    const value = event.target.value;
    setViceCaptain(value);
    setTeam(team.map((c) =>  c.Player == value?{...c,Vice_Captain:true}:{...c,Vice_Captain:false} ));
    
    if (value!=originalleaders.vcap?.Player){
      setVcaplog(`You changed the vice-captain to ${value}`)
    }
    else {
      setVcaplog("")
    }
    if (value === captain) {
      setCaptain("");
      setTeam(team.map((c) =>  c.Player == value?{...c,Vice_Captain:true,Captain:false}:c ));
      setCaplog("You removed the Captain")
      return
  };
  setTeam(team.map((c) =>  c.Player == value?{...c,Vice_Captain:true}:{...c,Vice_Captain:false} ));}
  

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
      const oldIndex = bench.findIndex(p => p.Player === activeid);
      const newIndex = bench.findIndex(p => p.Player === overId);
      setBench(arrayMove(bench, oldIndex, newIndex));
    }

    if (from === "Team") {
      const oldIndex = team.findIndex(p => p.Player === activeid);
      const newIndex = team.findIndex(p => p.Player === overId);
      setTeam(arrayMove(team, oldIndex, newIndex));
    }

    return;
  }

  // TEAM → BENCH
  if (from === "Team" && to === "Bench") {
    const player = team.find(p => p.Player === activeid);
    if (player.Captain || player.Vice_Captain) return;

    if (bench.length === MAX_BENCH && overId!=='Bench'){
        const swap = bench.find(p => p.Player === overId)
        
        setTeam(team.map((c) =>  c.Player == activeid?{...swap,Bench:false}:c ));
        setBench(bench.map((c) =>  c.Player == overId? {...player,Bench:true}:c ));
        return
    };



    

    setTeam(team.filter(p => p.Player !== activeid));
    setBench([...bench, { ...player, Bench: true }]);
  }

  // BENCH → TEAM
  if (from === "Bench" && to === "Team") {
    const player = bench.find(p => p.Player === activeid);
    const swap = team.find(p => p.Player === overId)
    if (swap.Captain||swap.Vice_Captain) return    
    setTeam(team.map((c) =>  c.Player == overId?{...player,Bench:false}:c ));
    setBench(bench.map((c) =>  c.Player == activeid? {...swap,Bench:true}:c ));

  }
};

const handleSubmit = ()=>{
  const temppayload = {}
  if (originalleaders.cap?.Player !== captain){
      temppayload.cap_change = [captain,originalleaders.cap?.Player]
  }
  if (originalleaders.vcap?.Player !==viceCaptain){
      temppayload.vcap_change = [viceCaptain,originalleaders.vcap?.Player]
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
                    {activeId}
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
              const value = option.Player ?? option;
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
              const value = option.Player ?? option;
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
            {payload.in.length? `In: ${payload.in.join(', ')}\n\n`:'' }
            {payload.out.length>0? `Out: ${payload.out.join(', ')}\n\n`:'' }
            {caplog?`${caplog}\n\n`:""}
            {vcaplog?`${vcaplog}\n\n`:""}
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

