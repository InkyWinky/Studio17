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
    CANNON_SPEED:8,
    CANVAS_WIDTH: 600,
    START_SCORE: 0,
    CANNON_Y_POS:565, //Y position of the cannon
    //Bullet constants
    BULLET_CANNON_GAP:-10,
    BULLET_RADIUS: 2,
    BULLET_SPEED: 10,
    //Shield constants:
    SHIELD_HEIGHT:48,
    SHIELD_WIDTH:30,
    SHIELD_LEFT_XCOORD:55,
    SHIELD_BOTTOM_YCOORD:488,
    SHIELD_HORIZ_GAP:140,
    //Aliens
    ALIEN_START_SPEED:1,
    LVL_SPEED_INCREMENT:1,
    BOT_ALIEN_PTS:10,
    MID_ALIEN_PTS:20,
    TOP_ALIEN_PTS:30,
    TOP_ALIEN_URL:"/sprites/30Alien.png",
    MID_ALIEN_URL:"/sprites/20Alien.png",
    BOT_ALIEN_URL:"/sprites/10Alien.png",
    TOP_ALIEN_WIDTH:20,
    ALIENS_PER_ROW:11,
    NO_OF_ALIEN_ROWS: 5,
    START_ALIEN_XPOS:15,
    START_ALIEN_YPOS:55,
    ALIEN_XGAP:40,
    ALIEN_YGAP:30
  } as const

  //Define type interfaces
  type Element = Readonly<{ //can be cannon, bullet or  alien
    id:string, //to identify whether cannon, bullet or alien
    xPos: number,
    yPos: number, 
    alienPts: number
  }>
  type ShieldHitboxItem = Readonly<{
    xL: number,
    xU: number,
    yL: number,
    yU: number
  }>

  type State = Readonly<{
    cannon: Element,
    bullets:ReadonlyArray<Element>,
    aliens:ReadonlyArray<Element>,
    shieldHitBox:ReadonlyArray<ShieldHitboxItem>,
    disappear:ReadonlyArray<Element>,
    count: number,
    lvl:number,
    score:number

  }>

  let INITIAL_SHIELD_HITBOXES:ShieldHitboxItem[]=
  [{xL:constants.SHIELD_LEFT_XCOORD, xU: constants.SHIELD_LEFT_XCOORD+constants.SHIELD_WIDTH, yL:constants.SHIELD_BOTTOM_YCOORD, yU:constants.SHIELD_BOTTOM_YCOORD+constants.SHIELD_HEIGHT},
  {xL:constants.SHIELD_LEFT_XCOORD+constants.SHIELD_HORIZ_GAP, xU:constants.SHIELD_LEFT_XCOORD+constants.SHIELD_WIDTH, yL:constants.SHIELD_BOTTOM_YCOORD, yU:constants.SHIELD_BOTTOM_YCOORD+constants.SHIELD_HEIGHT},
  {xL:constants.SHIELD_LEFT_XCOORD+2*constants.SHIELD_HORIZ_GAP, xU:constants.SHIELD_LEFT_XCOORD+constants.SHIELD_WIDTH, yL:constants.SHIELD_BOTTOM_YCOORD, yU:constants.SHIELD_BOTTOM_YCOORD+constants.SHIELD_HEIGHT},
  {xL:constants.SHIELD_LEFT_XCOORD+3*constants.SHIELD_HORIZ_GAP, xU:constants.SHIELD_LEFT_XCOORD+constants.SHIELD_WIDTH, yL:constants.SHIELD_BOTTOM_YCOORD, yU:constants.SHIELD_BOTTOM_YCOORD+constants.SHIELD_HEIGHT}]

  const startState:State={//Starting position of the cannon, middle-bottom of canvas
    cannon: createCannon(),
    bullets:[],
    aliens:[],
    shieldHitBox:INITIAL_SHIELD_HITBOXES,
    disappear:[],
    count:0,
    lvl: 0,
    score:0
  }

//##################################### Observing keys and performing actions ##################################  
  class Move {constructor(public readonly xDirection:number){}} //For moving cannon
  class Shoot {constructor(){}} //For shooting bullets
  class Tick { constructor(public readonly elapsed:number) {} } //unit of time
  class Spawn {constructor(public readonly spawn:boolean){}} //For when to spawn aliens

  //Might not need keyup at all
  type Key = 'ArrowLeft' | 'ArrowRight' | 'Space'
  const keyObs = <T>( key:Key, action:()=>T)=>
    fromEvent<KeyboardEvent>(document,'keydown')
      .pipe(
        filter(({code})=>code === key),//filter keyboardEvent.codes for the correct key
        map(action)) //perform corresponding action
  const moveLeft = keyObs('ArrowLeft',()=>new Move(-constants.CANNON_SPEED)),
  moveRight= keyObs('ArrowRight',()=>new Move(constants.CANNON_SPEED)),
  startShoot = keyObs( 'Space', ()=>new Shoot())


  //For horizontal wrapping around of cannon:
  const horizWrap =(xPos:number)=>{//Returns new x position if cannon reaches vertical borders
    const cWidth=constants.CANVAS_WIDTH;
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
  yPos: state.cannon.yPos+constants.BULLET_CANNON_GAP, 
  alienPts:0
  }
}
function createCannon():Element{
  return{
    id:"cannon", 
    xPos: (constants.CANVAS_WIDTH/2)-(constants.CANNON_WIDTH/2),
    yPos: constants.CANNON_Y_POS,
    alienPts:0

  }
}
function intDiv(dividend:number):(divisor:number)=>number{
  //Performs integer divsion: rounds down the result
  return (divisor)=>(dividend-(dividend%divisor))/divisor
}


function createAliens(counter:number, state:State):State{//need to change starting for each level

  (counter < constants.ALIENS_PER_ROW*constants.NO_OF_ALIEN_ROWS)?createAliens(counter+1, {
  ...state,
  aliens: state.aliens.length === constants.ALIENS_PER_ROW*constants.NO_OF_ALIEN_ROWS? 
          state.aliens:
          state.aliens.concat([{id:`alien${state.count}`, 
                              xPos:state.aliens.length?
                              constants.START_ALIEN_XPOS: //first alien just use intial x pos
                              state.aliens.length%constants.ALIENS_PER_ROW?//Check if it's 11th alien
                              constants.START_ALIEN_XPOS+(constants.ALIENS_PER_ROW*constants.ALIEN_XGAP)://Calculate 11th alien position
                              constants.START_ALIEN_XPOS+(state.aliens.length%11*constants.ALIEN_XGAP),//Calculate wihch alien in the row it is and calculate x position by multiplying result by xgap
                            yPos:state.aliens.length?
                            constants.START_ALIEN_YPOS + state.lvl*constants.ALIEN_YGAP: //first alien just use intial y pos + level gap
                            intDiv(state.aliens.length)(constants.ALIENS_PER_ROW*constants.ALIEN_YGAP)*constants.ALIEN_YGAP+ state.lvl*constants.ALIEN_YGAP,//calculate row number and multiply by ygap + level gap
                            alienPts: intDiv(state.aliens.length)(constants.ALIENS_PER_ROW)?
                                      constants.TOP_ALIEN_PTS:
                                      intDiv(state.aliens.length)(constants.ALIENS_PER_ROW)===1||intDiv(state.aliens.length)(constants.ALIENS_PER_ROW)===2?
                                      constants.MID_ALIEN_PTS:
                                      constants.BOT_ALIEN_PTS
          }])}):
          state
}
// function createShield():Element{

// }

const moveElement=(element:Element)=><Element>{//Only specially used for bullets for now
  ...element,
  yPos: element.yPos - constants.BULLET_SPEED,
}
//####################### Bullet hitting things ####################################
const bulletHit = (state: State) =>{
}

  const reduceState = (state: State, action:Move|Shoot|Tick|Spawn)=>
    action instanceof Move ? {
      ...state,
      cannon: {...state, xPos: horizWrap(state.cannon.xPos+action.xDirection), yPos: constants.CANNON_Y_POS}
    }:
    action instanceof Shoot ? {
      ...state, 
      bullets:state.bullets.concat([createBullet(state)]),
      count: state.count + 1
    }:
    action instanceof Spawn?{
      

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

 

