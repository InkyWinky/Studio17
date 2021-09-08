import { fromEvent,interval,Observable } from 'rxjs'; 
import { map,filter,flatMap,takeUntil, merge, scan} from 'rxjs/operators';
function spaceinvaders() {
    // Inside this function you will use the classes and functions 
    // from rx.js
    // to add visuals to the svg element in pong.html, animate them, and make them interactive.
    // Study and complete the tasks in observable exampels first to get ideas.
    // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/ 
    // You will be marked on your functional programming style
    // as well as the functionality that you implement.
    // Document your code!  

  //################################### Starting constants ####################################
  const constants ={
    cannonWidth:36,
    canvasWidth: 600,
    startScore: 0

  } as const
  
  //Define type interfaces
  type State = Readonly<{
    xPos: number,
    yPos: number,
  }>

  const startState:State={//Starting position of the cannon, middle-bottom of canvas
    xPos: (constants.canvasWidth/2)-(constants.cannonWidth/2),
    yPos: 565
  }

//##################################### Observing keys and performing actions ##################################  
  class Move {constructor(public readonly direction:number){}}
  class Shoot {constructor(public readonly fire:boolean){}} //IDK how to implement this yet so it's just a copy of the above
  class Tick { constructor(public readonly elapsed:number) {} }

  type Event = 'keydown' | 'keyup'
  type Key = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp'
  const keyObs = <T>(event:string, key:Key, action:()=>T)=>
    fromEvent<KeyboardEvent>(document,event)
      .pipe(
        filter(({code})=>code === key),//filter keyboardEvent.codes for the correct key
        map(action)) //perform corresponding action
  const moveLeft = keyObs('keydown','ArrowLeft',()=>new Move(-5)),
  moveRight= keyObs('keydown','ArrowRight',()=>new Move(5)),
  stopLeft = keyObs('keyup','ArrowLeft',()=>new Move(0)),
  stopRight = keyObs('keyup','ArrowRight',()=>new Move(0)),
  startShoot = keyObs('keydown','ArrowUp', ()=>new Shoot(true)),
  stopShoot = keyObs('keyup','ArrowUp', ()=>new Shoot(false));

  //For horizontal wrapping around of cannon:
  const horizWrap =(xPos:number)=>{//Returns new x position if cannon reaches vertical borders
    const cWidth=constants.canvasWidth;
    const newXPos = (x:number)=>
      x<0?x+cWidth: x> cWidth? x-cWidth: x;
    return newXPos(xPos)
  }

  const reduceState = (state: State, action:Move|Shoot|Tick)=>
    action instanceof Move ? {
      ...state,
      xPos: horizWrap(state.xPos+action.direction)
    }:
    action instanceof Shoot ? {
      ...state //I don't know what to do with this yet
    }:
    {
      ...state //If there are any other actions put in here
    }  

//############################### update changes on the screen ################################
  function showOnScreen(state:State): void{
    const cannon = document.getElementById("cannon")!;
    console.log('state:'+state.xPos+","+state.yPos)
    cannon.setAttribute('transform',
     `translate(${state.xPos},${state.yPos})`)
  }
//################################# Final Merges and subscribe ###########################
  interval(10) 
  .pipe(
    map(elapsed=>new Tick(elapsed)),
    merge(
      moveLeft,moveRight,stopLeft,stopRight),
    merge(startShoot,stopShoot),
    scan(reduceState, startState))
  .subscribe(showOnScreen);

}



  //Run function
  if (typeof window != 'undefined')
    window.onload = ()=>{
      spaceinvaders();
    }

 

