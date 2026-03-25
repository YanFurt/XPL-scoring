import React,{ useEffect,  useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
Paper,
TextField,Button,Dialog,DialogActions,DialogContent,DialogTitle
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useTimer } from 'react-timer-hook';

dayjs.extend(utc)
dayjs.extend(timezone)


async function getBets(match) {
  const host = window.location.origin
  //const host='http://127.0.0.1:8000'
  try {
    const response = await fetch(`${host}/bet/${match.replace(' ','_')}`,{
      method: "POST",
      credentials:'include',
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

async function setBets(match,body) {
  const host = window.location.origin
  //const host='http://127.0.0.1:8000'
  try {
    const response = await fetch(`${host}/setbet/${match.replace(' ','_')}`,{
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
    //console.log(data)
    return JSON.parse(data)
    //console.log(json);   i
  } catch (error) {
    console.error(error.message);
  }
}

function MyTimer({ expiryTimestamp,func }) {
 
  const {
    totalSeconds,
    milliseconds,
    seconds,
    minutes,
    hours,
    days,
    isRunning,
    restart
  } = useTimer({ expiryTimestamp, onExpire: () => func(true) });

  useEffect(()=>{
    restart(expiryTimestamp)
  },[expiryTimestamp])
  return (
    <div style={{textAlign: 'center'}}>

      <p>Deadline</p>
      <div style={{fontSize: '100px'}}>
        <span>{days}</span>:<span>{hours.toString().padStart(2, '0')}</span>:<span>{minutes.toString().padStart(2, '0')}</span>:<span>{seconds.toString().padStart(2, '0')}</span>
      </div>
    </div>
  );
}

const TextInputGrid = ({ matchobj }) => {
  const [inputs, setInputs] = useState(matchobj?.mybets||{});
  const [deadline,setDeadline]=useState(false)
  const [matchStart,setMatchStart]=useState(null)
  const [open,setOpen] = useState(false)

  useEffect(()=>{
    
    const d1 = dayjs.tz(matchobj.Start_Time, "Asia/Kolkata");
    setDeadline(d1.isBefore(dayjs().tz('Asia/Kolkata')))
    setMatchStart(d1.toDate())
    setInputs(matchobj?.mybets||{})
  },[matchobj])
  


  const getTotal = (obj) =>
    Object.values(obj).reduce((sum, val) => sum + Number(val || 0), 0);

  const total = getTotal(inputs);
  const handleChange = (key, value) => {

    const integerRegex = /^[0-9]*$/;


    if (value === "") {
    setInputs((prev) => ({
      ...prev,
      [key]: "",
    }));
    return;
    }
    if (!integerRegex.test(value)){
      return
    }
    const numericValue = Number(value);

    const updated = {
      ...inputs,
      [key]: numericValue,
    };

    if (getTotal(updated) <= 100) {
      setInputs(updated);
    }
  };
  const rows = Object.keys(matchobj?.Bets);

  const handleConfirm = async ()=>{
  console.log(inputs)
  const status = await setBets(matchobj.Match_No,inputs);
  setOpen(true)
  return
  
}

  const handleClose = async ()=>{
  
  setOpen(false)
  return
  
}

  console.log('ms',matchStart)
  console.log(inputs)
  return (<div>
    <h1>{matchobj?.Match_Description}</h1>
    <h3>{matchobj?.Venue}</h3>
    {matchStart&&<MyTimer expiryTimestamp={matchStart} func={setDeadline}></MyTimer>}
    <Box>
      <Typography variant="h6" mb={2}>
        Total: {total} / 100
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "200px 1fr 150px", // fixed + flexible + fixed
          gap: 2,
        }}
      >
        {rows.map((key, index) => (
          <React.Fragment key={index}>
            {/* Column 1 */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">{key}</Typography>
            </Paper>

            {/* Column 2 */}
            <Paper
              sx={{
                p: 2,
                wordBreak: "break-word",
              }}
            >
              <Typography>
                {matchobj.Bets[key]}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Chance: {(matchobj.Chances[key] * 100).toFixed(1)}%
              </Typography>
            </Paper>

            {/* Column 3 */}
            <Paper sx={{ p: 2 }}>
              <TextField
                fullWidth
                type="text" // Use type="text" for better control
                label="Your Bet"
                value={inputs[key]}
                onChange={(e) =>
                  handleChange(key, e.target.value)
                }
                disabled={total >= 100 && inputs[key] === 0}
              />
            </Paper>
          </React.Fragment>
        ))}
      </Box>
    </Box>
    <Button
            variant="contained"
            color="primary"
            disabled={deadline}
            onClick={handleConfirm}
          >
            Submit
    </Button>
    <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          Your bet has been submitted
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="primary" variant="contained">
            Understood
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export function BettingArena() {
  const [matchNo, setMatchNo] = useState("Match_1");
  const [rows,setRows]=useState({})

    useEffect( ()=>{ 
      (async () => {
        const bets = await getBets(matchNo);
        setRows(bets);
        console.log('setRows')
      })();}
      ,[matchNo])


  console.log(rows)

  return (Object.keys(rows).length>0? 
    <Box p={3}>
      <Typography variant="h6" mb={2}>
        Match Selector
      </Typography>

      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Match</InputLabel>
        <Select
          value={matchNo}
          label={matchNo.replace('_',' ')}
          onChange={(e) => setMatchNo(e.target.value)}
        >
          <MenuItem value="Match_1">Match 1</MenuItem>
          <MenuItem value="Match_2">Match 2</MenuItem>
          <MenuItem value="Match_3">Match 3</MenuItem>
        </Select>
      </FormControl>

      <TextInputGrid matchobj={rows} />
    </Box>
  :<div></div>)
}