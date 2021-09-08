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
    CANNON_WIDTH:36, //Potentially turn these into capital case
    canvasWidth: 600,
    startScore: 0,
    CANNON_Y_POS:565, //Y position of the cannon
    bulletGapFromCannon:-10,
    BULLET_RADIUS: 2,
    BULLET_SPEED: 10,
    // SHIELD_PIXEL_POSITIONS:[(20,500), (22, 500)]
  } as const

  //Define type interfaces
  type Element = Readonly<{
    id:string, //to identify individual bullets
    xPos: number,
    yPos: number, 
  }>


  type State = Readonly<{
    cannon: Element,
    bullets:ReadonlyArray<Element>,
    shieldPixelPositions:ReadonlyArray<Element>,
    disappear:ReadonlyArray<Element>,
    count: number

  }>

  const startState:State={//Starting position of the cannon, middle-bottom of canvas
    cannon: createCannon(),
    bullets:[],
    shieldPixelPositions:[],
    disappear:[],
    count:0
  }

//##################################### Observing keys and performing actions ##################################  
  class Move {constructor(public readonly xDirection:number){}}
  class Shoot {constructor(){}} 
  class Tick { constructor(public readonly elapsed:number) {} }

  //Might not need keyup at all
  type Key = 'ArrowLeft' | 'ArrowRight' | 'Space'
  const keyObs = <T>( key:Key, action:()=>T)=>
    fromEvent<KeyboardEvent>(document,'keydown')
      .pipe(
        filter(({code})=>code === key),//filter keyboardEvent.codes for the correct key
        map(action)) //perform corresponding action
  const moveLeft = keyObs('ArrowLeft',()=>new Move(-5)),
  moveRight= keyObs('ArrowRight',()=>new Move(5)),
  startShoot = keyObs( 'Space', ()=>new Shoot())


  //For horizontal wrapping around of cannon:
  const horizWrap =(xPos:number)=>{//Returns new x position if cannon reaches vertical borders
    const cWidth=constants.canvasWidth;
    const newXPos = (x:number)=>
      x<0?x+cWidth: x> cWidth? x-cWidth: x;
    return newXPos(xPos)
  }

  //############################ Shooting #################################
  const tick = (state:State)=>{
    //Implement bullets disappearing when hitting alien
    return <State>{
      ...state,
      bullets: state.bullets.map(moveElement),
    }
  }
function createBullet(state:State):Element{
  return{
  id:`bullet${state.count}`, //identify bullet
  xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
  yPos: state.cannon.yPos+constants.bulletGapFromCannon , 
  }
}
function createCannon():Element{
  return{
    id:"cannon", 
    xPos: (constants.canvasWidth/2)-(constants.CANNON_WIDTH/2),
    yPos: constants.CANNON_Y_POS

  }
}
// function createShield():Element{

// }

const moveElement=(element:Element)=><Element>{//Only specially used for bullets for now
  ...element,
  yPos: element.yPos - constants.BULLET_SPEED,
}
// const moveObj = (element:Element) => <Element>{ //Do we need this?
//   ...element,
//   xPos: horizWrap(element.Xpos +)
//   pos:torusWrap(o.pos.sub(o.vel)),
//   vel:o.thrust?o.vel.sub(Vec.unitVecInDirection(o.angle).scale(0.05)):o.vel
// }
  const reduceState = (state: State, action:Move|Shoot|Tick)=>
    action instanceof Move ? {
      ...state,
      cannon: {...state, xPos: horizWrap(state.cannon.xPos+action.xDirection), yPos: constants.CANNON_Y_POS}
    }:
    action instanceof Shoot ? {
      ...state, 
      bullets:state.bullets.concat([createBullet(state)]),
      count: state.count + 1
    }:
    tick(state);
//############################### Showing changes on the screen ################################
  function showOnScreen(state:State): void{
    const canvas = document.getElementById("canvas")!;
    //Create bullets on canvas
    state.bullets.forEach(bullet=>{
      const drawBullet=()=>{
        const bulletSvg  = document.createElementNS(canvas.namespaceURI, "circle")!;
        bulletSvg.setAttribute("id", bullet.id);
        bulletSvg.classList.add("bullet")
        canvas.appendChild(bulletSvg)
        return bulletSvg
      }
      const bulletSvg = document.getElementById(bullet.id) || drawBullet();
      bulletSvg.setAttribute("cx",String(bullet.xPos))
      bulletSvg.setAttribute("cy",String(bullet.yPos))
      bulletSvg.setAttribute("r", String(constants.BULLET_RADIUS));
    })
    //Delete bullets from canvas
    state.disappear.forEach(bullet=>{
      const bulletSvg = document.getElementById(bullet.id);
      if(bullet) canvas.removeChild(bulletSvg);//Check if the bullet exists first just in case
    })
    

    const cannon = document.getElementById("cannon")!;
    cannon.setAttribute('transform',
     `translate(${state.cannon.xPos},${state.cannon.yPos})`)
  }
//################################# Final Merges and subscribe ###########################
  interval(10) 
  .pipe(
    map(elapsed=>new Tick(elapsed)),
    merge(
      moveLeft,moveRight),
    merge(startShoot),
    scan(reduceState, startState))
  .subscribe(showOnScreen);

}



  //Run function
  if (typeof window != 'undefined')
    window.onload = ()=>{
      spaceinvaders();
    }

 

