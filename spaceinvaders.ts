import { fromEvent,interval,Observable } from 'rxjs'; 
import { map,filter,flatMap,takeUntil, merge, scan, switchMap} from 'rxjs/operators';
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
    CANNON_HEIGHT:42,
    CANNON_SPEED:3,
    CANNON_STOP_SPEED:0,
    CANNON_ID:"cannon",
    CANVAS_WIDTH: 600,
    START_SCORE: 0,
    CANNON_Y_POS:565, //Y position of the cannon
    DEAD_CANNON_IMG_SRC:"./sprites/destroyedCannon.png",
    DEAD_CANNON_ID:"deadCannon",
    DEAD_CANNON_IMG_YGAP:5,
    //Bullet constants
    BULLET_CANNON_GAP:-10,
    BULLET_RADIUS: 2,
    BULLET_SPEED: 8,
    ALIEN_BULLET_SPEED:2,
    ALIEN_BULLET_IDENTIFIER:"A",
    BULLET_EXPIRY:70,
    ALIEN_BULLET_EXPIRY:260,
    //Ultimate constants
    ULTIMATE_SPEED:4,
    ULTIMATE_LENGTH:90,
    ULTIMATE_WIDTH:3,
    ULTIMATE_SCORE_THRESHOLD:55000,
    NO_OF_LASERS:5,
    LASER_EXPIRY:130,
    //Shield constants:
    SHIELD_HEIGHT:48,
    SHIELD_WIDTH:70,
    SHIELD_LEFT_XCOORD:55,
    SHIELD_BOTTOM_YCOORD:488,
    SHIELD_HORIZ_GAP:140,
    SHIELD_DENT_URL:"./sprites/shieldDamage.png",
    SHIELD_DENT_CLASS:"shieldDent",
    SHIELD_DENT_WIDTH:10,
    SHIELD_DENT_HEIGHT:12,
    INVINCIBLE_SHIELD_ICON_ID:"invincibleShields",
    //Aliens
    ALIEN_START_SPEED:0.2,
    LVL_SPEED_INCREMENT:0.1,
    LVL_Y_INCREMENT:10,
    BOT_ALIEN_PTS:10,
    MID_ALIEN_PTS:20,
    TOP_ALIEN_PTS:30,
    TOP_ALIEN_URL:"./sprites/thirtyAlien.png",
    MID_ALIEN_URL:"./sprites/twentyAlien.png",
    BOT_ALIEN_URL:"./sprites/tenAlien.png",
    DEAD_ALIEN_URL:"./sprites/destroyedAlien.png",
    BOT_ALIEN_CLASS:"alien10",
    MID_ALIEN_CLASS:"alien20",
    TOP_ALIEN_CLASS:"alien30",
    TOP_ALIEN_WIDTH:22,
    MID_ALIEN_WIDTH:28,
    BOT_ALIEN_WIDTH:34,
    ALIENS_PER_ROW:11, //start counting at 0, so it's actual
    NO_OF_ALIEN_ROWS: 5,
    START_ALIEN_XPOS:25,
    START_ALIEN_YPOS:55,
    ALIEN_XGAP:45,
    ALIEN_YGAP:45,
    ALIEN_HEIGHT:25,
    ALIEN_SHOOT_INTERVAL:800,
    //Score:
    SCORE_ID: "scoreValue",
    //UFO:
    UFO_ID:"ufo",
    UFO_START_SPEED:1,
    UFO_CREATION_SCORE:500,
    UFO_IMG_URL:"./sprites/ufo.png",
    UFO_CLASS:"ufoClass",
    UFO_WIDTH:40,
    UFO_PTS:1000,
    UFO_SPAWN_RATE:3000,
    //Sounds
    SHOOT_SOUND_ID: "shoot",
    INVADER_KILLED_SOUND_ID: "invaderKilled",
    CANNON_KILLED_SOUND_ID: "cannonDeath",
    UFO_SOUND_ID: "ufo",
    LASER_SOUND_ID:"laserSound",
    UFO_KILL_SOUND_ID:"ufoKill"
  } as const
  //Define type interfaces
  type Element = Readonly<{ //can be cannon, bullet or  alien
    id:string, //to identify whether cannon, bullet or alien
    xPos: number,
    yPos: number, 
    alienPts?: number, //optional as element could be bullet
    alienDir?: number, //for movement direction of aliens
    alienLvl?: number,
    alienEdgeCnt?:number,
    bulletYDir?:number,
    createTime?:number, //To delete bullets as we don't want too many, and also to time the ultimate
    cannonMotion?:number,
    killed?:boolean
  }>
  type ShieldPos = Readonly<{
    xPos: number, //top- left corner coordinates
    yPos:number,
  }>

  type State = Readonly<{
    cannon: Element,
    bullets:ReadonlyArray<Element>,
    ultimateReady: boolean,
    ultimate:ReadonlyArray<Element>,
    aliens:ReadonlyArray<Element>,
    shieldPositions:ReadonlyArray<ShieldPos>,
    ignoreShieldHit?:ReadonlyArray<Element>,//list of places hit by bullet
    disappear:ReadonlyArray<Element>,
    count: number,
    ultCount:number,
    lvl:number,
    score:number,
    time:number,
    iShield:boolean,
    isGameOver: boolean,
    UFO:ReadonlyArray<Element>,
    canRestart?:boolean,
    restarted?:boolean
  }>

  const INITIAL_SHIELD_POS:ShieldPos[]=
  [{xPos:constants.SHIELD_LEFT_XCOORD, yPos:constants.SHIELD_BOTTOM_YCOORD},
  {xPos:constants.SHIELD_LEFT_XCOORD+constants.SHIELD_HORIZ_GAP, yPos:constants.SHIELD_BOTTOM_YCOORD},
  {xPos:constants.SHIELD_LEFT_XCOORD+2*constants.SHIELD_HORIZ_GAP, yPos:constants.SHIELD_BOTTOM_YCOORD},
  {xPos:constants.SHIELD_LEFT_XCOORD+3*constants.SHIELD_HORIZ_GAP, yPos:constants.SHIELD_BOTTOM_YCOORD}]

  const startState:State={//Starting position of the cannon, middle-bottom of canvas
    cannon: createCannon(),
    bullets:[],
    ultimate:[],
    ultimateReady:true,
    aliens:[],
    shieldPositions:INITIAL_SHIELD_POS,
    ignoreShieldHit:[],
    disappear:[],
    count:0,
    ultCount:0,
    lvl: 0,
    score:constants.START_SCORE,
    time:0,
    iShield:true,
    isGameOver:false,
    UFO:[],
    canRestart: false,
    restarted: false
  }

//##################################### Observing keys and performing actions ##################################  
  class Move {constructor(public readonly xDirection:number){}} //For moving cannon
  class Shoot {constructor(){}} //For shooting bullets
  class AlienShoot{constructor(){}}//alien fire
  class Tick { constructor(public readonly elapsed:number) {} } //unit of time
  class Restart {constructor(){}} //For when to spawn aliens
  class Ultimate{constructor(){}}
  class Ishield{constructor(){}}//toggle invincible shields

  type Event = 'keydown'|'keyup'
  type Key = 'ArrowLeft' | 'ArrowRight' | 'Space'| 'KeyX'|'KeyR'|'KeyI'
  const keyObs = <T>( key:Key, evnt: string, action:()=>T)=>
    fromEvent<KeyboardEvent>(document, evnt)
      .pipe(
        filter(({code})=>code === key),//filter keyboardEvent.codes for the correct key
        map(action)) //perform corresponding action
  const moveLeft = keyObs('ArrowLeft','keydown',()=>new Move(-constants.CANNON_SPEED)),
  stopMoveLeft =  keyObs('ArrowLeft','keyup',()=>new Move(constants.CANNON_STOP_SPEED)),
  moveRight= keyObs('ArrowRight','keydown',()=>new Move(constants.CANNON_SPEED)),
  stopMoveRight =  keyObs('ArrowRight','keyup',()=>new Move(constants.CANNON_STOP_SPEED)),
  startShoot = keyObs( 'Space','keydown', ()=>new Shoot()),
  restartGame = keyObs('KeyX','keydown', ()=>new Restart()),
  alienShoot= interval(constants.ALIEN_SHOOT_INTERVAL).pipe(map(()=>new AlienShoot())),
  toggleInvincibleShields=keyObs( 'KeyI','keydown', ()=>new Ishield()),
  fireUltimate = keyObs('KeyR','keydown', ()=>new Ultimate())

  // type Key = 'ArrowLeft' | 'ArrowRight' | 'Space'| 'KeyX'|'KeyR'
  // type Event = 'keydown' | 'keyup'
  // const keyObs = <T>(event:string, key:Key, registerRepeat:boolean, action:()=>T)=>
  //   fromEvent<KeyboardEvent>(document,event)
  //     .pipe(
  //       filter(({code})=>code === key),//filter keyboardEvent.codes for the correct key
  //       filter(({repeat})=>registerRepeat?repeat:!repeat), //Some controls like that arrow keys would be better if it registers repeat
  //       map(action)) //perform corresponding action

  // const moveLeft = keyObs('keydown','ArrowLeft',true,()=>new Move(-constants.CANNON_SPEED)),
  // moveRight= keyObs('keydown','ArrowRight',true,()=>new Move(constants.CANNON_SPEED)),
  // startShoot = keyObs('keydown', 'Space',false, ()=>new Shoot()),
  // stopShoot = keyObs('keyup', 'Space',false, ()=>new Shoot()),
  // startGame = keyObs('keydown','KeyX',true, ()=>new Spawn(true)),
  // fireUltimate = keyObs('keydown','KeyR',true, ()=>new Ultimate())

  //For horizontal wrapping around of cannon:
  const horizWrap =(xPos:number)=>{//Returns new x position if cannon reaches vertical borders
    const cWidth=constants.CANVAS_WIDTH;
    const newXPos = (x:number)=>
      x<0?x+cWidth: x> cWidth? x-cWidth: x;
    return newXPos(xPos)
  }

  function shouldCreateUFO(state:State):boolean{
    if (state.score&&state.UFO.length===0)
    { return randomInt(constants.UFO_SPAWN_RATE)===1}
    else return false
  }

  function createUFO(state:State):Element{
    console.log('creating UFO')
        return{
          id:constants.UFO_ID+String(state.count),
          xPos:constants.START_ALIEN_XPOS,
          yPos:constants.START_ALIEN_YPOS,
          alienLvl:state.lvl,
          alienPts: constants.UFO_PTS,
          killed:false
        }
      }
  

  //############################ Shooting, alien moving, collision+gameOver checks #################################
  const tick = (state:State, elapsed:number)=>{
    const endedB = (element:Element)=>
    (elapsed - element.createTime) > (isAlienBullet(element)?
    constants.ALIEN_BULLET_EXPIRY:constants.BULLET_EXPIRY),
    endedBullets:Element[] = state.bullets.filter(endedB),
    activeBullets = state.bullets.filter(_=>!endedB(_));
    const endedU = (element:Element)=>(elapsed - element.createTime) > constants.LASER_EXPIRY,
    endedLasers:Element[] = state.ultimate.filter(endedU),
    activeUltimate = state.ultimate.filter(_=>!endedU(_));

    // Implement bullets disappearing when hitting alien
    return(
      state.isGameOver?
      {
        ...startState,
        disappear:state.disappear.concat(state.bullets),
        canRestart:true,
        isGameOver:true,
        restarted:false
        
      }:
    state.aliens.length===0?
    // state.lvl===0? 
    checkHits(createAliens(0,state)): 
    baseInvaded(state)? //Check if base has been invaded
    <State>{
      ...state,
      bullets:[],
      aliens:[],
      isGameOver:true,
      restarted:false
    }:
      anyAlienAtEdge(state)? //Check if aliens are at the left or right borders, if so, shift them down
      checkHits({
        ...state,
        cannon:{...state.cannon, xPos:moveCannon(state.cannon)},
        bullets: activeBullets.map(moveBullet),
        ultimate: activeUltimate.map(moveUltimateLaser),
        aliens: state.aliens.map(alienMoveDownChangeDir),
        disappear:endedBullets.concat(endedLasers, alienAtEdge(state.UFO[0])?state.UFO:[]),
        time: elapsed,
        restarted:false,
        //Below checks if there are any ufo existing, if there are check if it's at the edge and delete it accordingly,
        //If there are none then don't check at edge and create if neccessary
        UFO: shouldCreateUFO(state)?[createUFO(state)]:alienAtEdge(state.UFO[0])?
      []:state.UFO.map(moveAlien)
    }):
    checkHits({
      ...state,
      cannon:{...state.cannon, xPos:moveCannon(state.cannon)},
      bullets: activeBullets.map(moveBullet),
      ultimate: activeUltimate.map(moveUltimateLaser),
      aliens: state.aliens.map(moveAlien),
      disappear:endedBullets.concat(endedLasers, alienAtEdge(state.UFO[0])?state.UFO:[]),
      time: elapsed,
      restarted:false,
      UFO: shouldCreateUFO(state)?[createUFO(state)]:alienAtEdge(state.UFO[0])?
      []:state.UFO.map(moveAlien)
    }))
  }

  function randomInt(max:number) {//Random integer from 0 to max number input (not incl.)
    return Math.floor(Math.random() * max)}

function createBullet(state:State, friendly:boolean):Element{
 
  if(friendly)return{
    id:`bullet${state.count}`, //identify bullet
    xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
    yPos: state.cannon.yPos+constants.BULLET_CANNON_GAP, 
    bulletYDir:-1,
    createTime:state.time
  }
  else if (state.aliens){ //check if state.aliens is defined first
    const randomLiveAlien = state.aliens[randomInt(state.aliens.length)]
  return{
    id:`Abullet${state.count}`, //identify bullet
    xPos: randomLiveAlien.xPos,
    yPos: randomLiveAlien.yPos + constants.BULLET_CANNON_GAP,
    bulletYDir:1,
    createTime:state.time
  }
}}
function createCannon():Element{
  return{
    id:"constants.CANNON_ID", 
    xPos: (constants.CANVAS_WIDTH/2)-(constants.CANNON_WIDTH/2),
    yPos: constants.CANNON_Y_POS,
    alienPts:0,
    alienDir:0,
    createTime:0,
    cannonMotion:0
  }
}
function baseInvaded(state:State):boolean{
  //Checks if aliens have reached the cannon
  return ((state.aliens.length>0)?
  state.aliens[state.aliens.length-1].yPos>=constants.CANNON_Y_POS: //Check the y position of the last (very bottom) alien and see if it has reached the cannon's y position
  false
  )}

//############### ULTIMATE ######################
function createUltimate(state:State):Element[]{
  return [{
  id:`ultimateA${state.ultCount}`, 
  xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
  yPos: 600-state.cannon.yPos-constants.BULLET_CANNON_GAP-0*constants.ULTIMATE_LENGTH, 
  createTime:state.time
  }, 
  {
  id:`ultimateB${state.ultCount+1}`, 
  xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
  yPos: state.cannon.yPos+constants.BULLET_CANNON_GAP-1*constants.ULTIMATE_LENGTH, 
  createTime:state.time
  },
  {
  id:`ultimateC${state.ultCount+2}`, 
  xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
  yPos: state.cannon.yPos+constants.BULLET_CANNON_GAP-2*constants.ULTIMATE_LENGTH, 
  createTime:state.time
  },
  {
  id:`ultimateD${state.ultCount+3}`, 
  xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
  yPos: state.cannon.yPos+constants.BULLET_CANNON_GAP-3*constants.ULTIMATE_LENGTH, 
  createTime:state.time
  },
  {
  id:`ultimateE${state.ultCount+4}`, 
  xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
  yPos: state.cannon.yPos+constants.BULLET_CANNON_GAP-4*constants.ULTIMATE_LENGTH, 
  createTime:state.time
  },
  {id:`ultimateF${state.ultCount+5}`, 
  xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
  yPos: state.cannon.yPos+constants.BULLET_CANNON_GAP-5*constants.ULTIMATE_LENGTH, 
  createTime:state.time
  }] 
}
const moveUltimateLaser=(element:Element)=><Element>{//Only specially used for bullets for now
  ...element,
  yPos: element.yPos - constants.ULTIMATE_SPEED,
}
//######################################## Alien code #################################################
function intDiv(dividend:number):(divisor:number)=>number{
  //Performs integer divsion: rounds down the result
  return (divisor)=>(dividend-(dividend%divisor))/divisor
}

function isUFO(element:Element):boolean{
if(element.id){
  return element.id.startsWith(constants.UFO_ID);
}
  return false
}
function isKilledUFO(element:Element):boolean{
  if(element.id){
    return isUFO(element)&&element.killed
  }
    return false
  }

function createAliens(counter:number, state:State):State{
//function createAliens adds 55 aliens to the state
  return( (counter >= constants.ALIENS_PER_ROW*constants.NO_OF_ALIEN_ROWS)?{...state, lvl:state.lvl+1}:createAliens(counter+1, {
  ...state,
  aliens: state.aliens.length === constants.ALIENS_PER_ROW*constants.NO_OF_ALIEN_ROWS? 
          state.aliens:
          state.aliens.concat([{id:`alien${state.count}`, 
                              xPos:!state.aliens.length?
                              constants.START_ALIEN_XPOS: //first alien just use intial x pos
                              (state.aliens.length+1)%(constants.ALIENS_PER_ROW)?//Check if it's 11th alien
                              constants.START_ALIEN_XPOS+((state.aliens.length%(constants.ALIENS_PER_ROW))*constants.ALIEN_XGAP)://Calculate wihch alien in the row it is and calculate x position by multiplying result by xgap. Need to minues 1 as start counting at 0
                              constants.START_ALIEN_XPOS+((constants.ALIENS_PER_ROW-1)*constants.ALIEN_XGAP),//Calculate 11th alien position
                            yPos:!state.aliens.length?
                            constants.START_ALIEN_YPOS + (state.lvl)*constants.LVL_Y_INCREMENT: //first alien just use intial y pos + level gap
                            constants.START_ALIEN_YPOS+(intDiv(state.aliens.length)(constants.ALIENS_PER_ROW))*constants.ALIEN_YGAP+ state.lvl*constants.LVL_Y_INCREMENT,//calculate row number and multiply by ygap + level gap
                            alienPts: !intDiv(state.aliens.length)(constants.ALIENS_PER_ROW)?
                                      constants.TOP_ALIEN_PTS:
                                      intDiv(state.aliens.length)(constants.ALIENS_PER_ROW)===1||intDiv(state.aliens.length)(constants.ALIENS_PER_ROW)===2?
                                      constants.MID_ALIEN_PTS:
                                      constants.BOT_ALIEN_PTS,
                            alienDir: 1,
                            alienLvl: state.lvl,
                            alienEdgeCnt: 0
          }]),
          count: state.count+1,
   
        }))
};
function isAlienBullet(bullet:Element){
  if (bullet.id){
    if (bullet.id.startsWith(constants.ALIEN_BULLET_IDENTIFIER)){
      return true}
    return false
}
}

const alienMoveDownChangeDir = (element:Element)=><Element>{
  ...element,
  xPos: element.xPos + (-1*element.alienDir)*(constants.ALIEN_START_SPEED+element.alienLvl*constants. 
LVL_SPEED_INCREMENT),//Xpos increases by speed + the speed increase from the alien level
  yPos: element.yPos + constants.ALIEN_YGAP/2,
  alienDir: -1*element.alienDir,
};
const allAliensMoveDown = (state:State)=><State>{
    ...state,
    bullets: state.bullets.map(moveBullet),
    ulimate: state.ultimate.map(moveUltimateLaser),
    aliens: state.aliens.map(alienMoveDownChangeDir)
};

const alienAtEdge =(alien:Element)=>{//Returns true if alien is at border

  const cWidth=constants.CANVAS_WIDTH;  
  const isAtEdge = (a:Element)=> 
    a?(a.xPos<constants.BOT_ALIEN_WIDTH/2)|| a.xPos>(cWidth-constants.BOT_ALIEN_WIDTH)? true:false:false; //need to subtract bot alien width at right border as anchor point of img is top left
  return isAtEdge(alien)
}
const anyAlienAtEdge=(state:State)=>{ //Checks if any of the alien is at the border
  const reducer = (prev:number, curr:Element)=>alienAtEdge(curr)?prev+1:prev;
  return state.aliens.reduce(reducer, 0) //If return value >0, then at least one of the aliens is at border
}

const moveBullet=(element:Element)=><Element>{//moving bullet function
  ...element,
  //Check if it's an alien or cannon bullet and adjust speed accordingly
  yPos: element.yPos +element.bulletYDir*(isAlienBullet(element)?constants.ALIEN_BULLET_SPEED:constants.BULLET_SPEED),
}
const moveAlien=(element:Element)=><Element>{
...element,
  xPos: element.xPos + (isUFO(element)?1:element.alienDir)*
  ((isUFO(element)?constants.UFO_START_SPEED:constants.ALIEN_START_SPEED)+element.alienLvl*constants.LVL_SPEED_INCREMENT)
}
//####################### Bullet hitting things ####################################
function elementWidth(element:Element){ 
  //Return the width of the input element
  if(element.id){
  if (element.id.startsWith("alien")){
 return( element.alienPts===10?
  constants.BOT_ALIEN_WIDTH:
  element.alienPts===20?
  constants.MID_ALIEN_WIDTH:
  element.alienPts===30?
  constants.TOP_ALIEN_WIDTH:
  constants.BOT_ALIEN_WIDTH
 )
  }
  else if (element.id.startsWith(constants.CANNON_ID)){
    return constants.CANNON_WIDTH
  }
  else if (element.id.startsWith("shield")){
    return constants.SHIELD_WIDTH
  }
  else if (element.id.startsWith(constants.UFO_ID)){
    return constants.UFO_WIDTH
  }
}
  else return 0
}

function elementHeight(element:Element){ 
  //Return the height of the input element
  if(element.id){
  if (element.id.startsWith("alien")||element.id.startsWith("ufo")){
  return constants.ALIEN_HEIGHT
  }
  else if (element.id.startsWith(constants.CANNON_ID)){
    return constants.CANNON_HEIGHT
  }
  else if (element.id.startsWith("shield")){
    return constants.SHIELD_HEIGHT
  }}
  else return 0
}


function createShield(shieldPos:ShieldPos):Element{
  return{
    id:"shield",
    xPos: shieldPos.xPos,
    yPos:shieldPos.yPos
  }
};

  const checkHits= (state:State) => {
    const
    //Utility functions:
      mergeMap = <T, U>( //maps and merges two arrays
        array: ReadonlyArray<T>,
        mappingFn: (array: T) => ReadonlyArray<U>
      ) => Array.prototype.concat(...array.map(mappingFn)),
      // Check if not in array:
      notIn = (searchKey:ReadonlyArray<Element>) => (searchEl:Element) => searchKey.findIndex(el=>el.id === searchEl.id) < 0,
      // everything in the first array that's not in b
      except = (arr1:ReadonlyArray<Element>) => (arr2:ReadonlyArray<Element>) => arr1.filter(notIn(arr2)),

      bulletHit = ([bullet,element]:[Element,Element]) =>  //Checking if a cannon bullet hit an element
      !isAlienBullet(bullet)?
        (bullet.xPos+constants.BULLET_RADIUS>element.xPos)&&
        (bullet.xPos+constants.BULLET_RADIUS<element.xPos+elementWidth(element))&&
        (bullet.yPos-constants.BULLET_RADIUS<element.yPos+elementHeight(element))&&
        (element.yPos+constants.BULLET_RADIUS>element.yPos):
        false,
      enemyBulletHit= ([bullet,element]:[Element,Element])=> //Checking if an alien bullet hit an non-alien element
        isAlienBullet(bullet)?
        (bullet.xPos+constants.BULLET_RADIUS>element.xPos)&&
        (bullet.xPos+constants.BULLET_RADIUS<element.xPos+elementWidth(element))&&
        (bullet.yPos+constants.BULLET_RADIUS>element.yPos)&&
        (element.yPos-constants.BULLET_RADIUS<element.yPos):
        false,
       
      cannonHit = 
      state.bullets.filter(bullet =>enemyBulletHit([bullet, state.cannon])).length >0,//check if cannon is hit
      //check if ufo is hit
      ufoHit =  state.UFO.length? state.bullets.filter(bullet =>bulletHit([bullet, state.UFO[0]])).length >0:false,
      //Shield hit checking
      // shieldHit = ([element1, ignoreElement]:[Element, Element])=>
      // (element1.xPos+constants.BULLET_RADIUS>ignoreElement.xPos)&&
      // (element1.xPos+constants.BULLET_RADIUS<ignoreElement.xPos+constants.SHIELD_WIDTH)&&
      // (((element1.yPos-constants.BULLET_RADIUS<ignoreElement.yPos+constants.SHIELD_HEIGHT)&&
      // (element1.yPos-constants.BULLET_RADIUS>ignoreElement.yPos))||
      // (element1.yPos+constants.BULLET_RADIUS>ignoreElement.yPos)&&
      // (element1.yPos+constants.BULLET_RADIUS<ignoreElement.yPos+constants.SHIELD_HEIGHT)
      // ),
      shieldHit=([bullet,element]:[Element,Element])=>bulletHit([bullet,element])?true:enemyBulletHit([bullet,element])?true:false, //Shield can be hit from both top and bottom

      notSamePosition =(element1:Element, ignoreElement:Element)=>
      !((element1.xPos+constants.BULLET_RADIUS>ignoreElement.xPos)&&
      (element1.xPos+constants.BULLET_RADIUS<ignoreElement.xPos+constants.SHIELD_DENT_WIDTH)&&
      (((element1.yPos-constants.BULLET_RADIUS<ignoreElement.yPos+constants.SHIELD_DENT_HEIGHT)&&
      (element1.yPos-constants.BULLET_RADIUS>ignoreElement.yPos))||
      (element1.yPos+constants.BULLET_RADIUS>ignoreElement.yPos)&&
      (element1.yPos+constants.BULLET_RADIUS<ignoreElement.yPos+constants.SHIELD_DENT_HEIGHT)
      )),
      //find bullets that hit the shields to remove
      allBulletsAndShields =mergeMap(state.bullets, bul=> state.shieldPositions.map(createShield).map<[Element,Element]>(al=>([bul,al]))),
      hitBulletsAndShields=allBulletsAndShields.filter(shieldHit),
      bulletsThatHitShield = hitBulletsAndShields.map(([bullet,_])=>bullet),
      //Find bullets that hit the ufo
      bulletsThatHitUfo = state.UFO.length?state.bullets.filter((bullet)=>bulletHit([bullet, state.UFO[0]])):[],
      UfoThatWasHit=ufoHit?[{...state.UFO[0], killed: true}]:[],

      filteredShieldBullets=state.ignoreShieldHit.forEach(elem=>bulletsThatHitShield.filter(bullet=>notSamePosition(bullet,elem))),
      
      allBulletsAndAliens = mergeMap(state.bullets, bul=> state.aliens.map<[Element,Element]>(al=>([bul,al]))),//
      hitBulletsAndAliens = allBulletsAndAliens.filter(bulletHit),
      hitBullets = hitBulletsAndAliens.map(([bullet,_])=>bullet),
      hitAliens = hitBulletsAndAliens.map(([_,alien])=>alien),
      laserHit =([laser,element]:[Element,Element]) => 
      (laser.xPos+constants.ULTIMATE_WIDTH >element.xPos)&&
      (laser.xPos+constants.ULTIMATE_WIDTH<element.xPos+elementWidth(element)), //Do when alien is hit
      allLasersAndAliens = mergeMap(state.ultimate, las=> state.aliens.map<[Element,Element]>(al=>([las,al]))),//
      hitLasersAndAliens =allLasersAndAliens.filter(laserHit),
      laseredAliens = hitLasersAndAliens.map(([_,alien])=>alien)
      
      //Check if bullet hit shield, if it has, add bullet to ignore list
      
      function updateScore(acc:number, alien:Element):number{ //accumulating function for score
        return acc+alien.alienPts
    };
    return <State>{             
      ...state,
      bullets: except(state.bullets)(hitBullets.concat(bulletsThatHitShield, bulletsThatHitUfo)),
      aliens: except(state.aliens)(hitAliens.concat(laseredAliens)),
      disappear: state.disappear.concat(hitBullets,hitAliens,laseredAliens, bulletsThatHitShield, UfoThatWasHit, bulletsThatHitUfo),
      isGameOver: cannonHit,
      score:hitAliens.concat(UfoThatWasHit).reduce(updateScore, state.score), //also add ufo that was hit to score
      ignoreShieldHit:state.ignoreShieldHit.concat(bulletsThatHitShield),
      UFO:except(state.UFO)(UfoThatWasHit),
      canRestart: false //If cannon is hit then activate restart option
    }
};

function moveCannon(cannon:Element):number{
   return horizWrap(cannon.xPos+cannon.cannonMotion)
}

  const reduceState = (state: State, action:Move|Shoot|Tick|Restart)=>
  
  state.isGameOver?
  action instanceof Restart?
    {...startState,
      restarted:true,}:
    {...startState,
    
      isGameOver: true,
      canRestart: true,
      restarted:false,
      disappear:state.disappear.concat(state.bullets),
    }:
    action instanceof Move ?{
      ...state,
      cannon: {id:constants.CANNON_ID, xPos: moveCannon(state.cannon), yPos: constants.CANNON_Y_POS, cannonMotion: action.xDirection}
    }:
    action instanceof Shoot ?  {
      ...state, 
     
      bullets:state.bullets.concat([createBullet(state, true)]),
      count: state.count + 1
    }:action instanceof Ultimate ? (state.score>=constants.ULTIMATE_SCORE_THRESHOLD)? {
      ...state, 
     
      ultimate:state.ultimate.concat(createUltimate(state)),
      ultCount: state.ultCount + constants.NO_OF_LASERS
    }:
    state: 
    action instanceof AlienShoot?
    {
      ...state, 
      bullets:state.bullets.concat([createBullet(state, false)]),
      count: state.count + 1
    }: action instanceof Ishield?
    {
      ...state, 
      iShield:state.iShield?false:true //Toggle invincible shields on and off
    }: action instanceof Restart?
    state.canRestart?startState:state:
    //Only restart if canRestart is true
    tick(state, action.elapsed);
//###################################### Showing changes on the screen ################################
  function showOnScreen(state:State): void{ 
    const canvas = document.getElementById("canvas")!;

     //function to play sound
    const playAudio = (audioId:string)=>{
      const audio=<HTMLVideoElement>document.getElementById(audioId);
      audio.play()
    }
    //Create bullets on canvas
    state.bullets.forEach(bullet=>{
      const drawBullet=()=>{ //Function for creating a bullet on canvas
        const bulletSvg  = document.createElementNS(canvas.namespaceURI, "circle")!;
        bulletSvg.setAttribute("id", bullet.id);
        if (isAlienBullet(bullet)){bulletSvg.setAttribute("fill", "white")}
        else{
        {bulletSvg.classList.add("bullet");   //Play audio upon bullet creation
        playAudio(constants.SHOOT_SOUND_ID)}
        }
        canvas.appendChild(bulletSvg)
        return bulletSvg
      }
      const bulletSvg = document.getElementById(bullet.id) || drawBullet();//Check if the svg
      //element has already been created, if not call the drawBullet() function
      //Set the position of bullet canvas
      bulletSvg.setAttribute("cx",String(bullet.xPos))
      bulletSvg.setAttribute("cy",String(bullet.yPos))
      bulletSvg.setAttribute("r", String(constants.BULLET_RADIUS));
    })
    //Show aliens on screen
    state.aliens.forEach(alien=>{
      const drawAlien=()=>{
        console.log("drawDent")
        const alienSvg = document.createElement('img')!;
        alienSvg.src=alien.alienPts===constants.BOT_ALIEN_PTS?
              constants.BOT_ALIEN_URL:
              alien.alienPts===constants.MID_ALIEN_PTS?
              constants.MID_ALIEN_URL:
              constants.TOP_ALIEN_URL;
        alienSvg.setAttribute("id", alien.id);
        alienSvg.classList.add(alien.alienPts===constants.BOT_ALIEN_PTS?
          constants.BOT_ALIEN_CLASS:
          alien.alienPts===constants.MID_ALIEN_PTS?
          constants.MID_ALIEN_CLASS:
          constants.TOP_ALIEN_CLASS)
        document.getElementById("svgWrapper").appendChild(alienSvg) //Use div as cannot append image to svg canvas
        return alienSvg
      }
      const alienImg = document.getElementById(alien.id) || drawAlien();
      alienImg.style.position = 'absolute';
      alienImg.style.top = String(alien.yPos);
      alienImg.style.left = String(alien.xPos);
    })
    //Show UFO on screen
  
    state.UFO.forEach(ufo=>{

      const drawUFO=()=>{
        const ufoImg = document.createElement('img')!;
        ufoImg.src=constants.UFO_IMG_URL;
        ufoImg.setAttribute("id", ufo.id);
        ufoImg.classList.add(constants.UFO_CLASS)
      console.log(ufo.id)
        document.getElementById("svgWrapper").appendChild(ufoImg) //Use div as cannot append image to svg canvas
        return ufoImg
      }

      const ufoImg =  document.getElementById(ufo.id)||drawUFO();
      ufoImg.style.position = 'absolute';
      ufoImg.style.top = String(ufo.yPos);
      ufoImg.style.left = String(ufo.xPos);
      playAudio(constants.UFO_SOUND_ID);
    })

    //Create ultimate lasers on canvas
    state.ultimate.forEach(laser=>{
      const drawUltimate=()=>{
      
        const laserSvg  = document.createElementNS(document.getElementById("canvas").namespaceURI, "rect")!;
        laserSvg.setAttribute("id", laser.id);
        document.getElementById("canvas").appendChild(laserSvg)
        playAudio(constants.LASER_SOUND_ID)
        return laserSvg
      }
      const laserSvg = document.getElementById(laser.id) || drawUltimate();
      laserSvg.classList.add(laser.id.slice(0,9))

      laserSvg.setAttribute("fill","white");
      laserSvg.setAttribute("x",String(laser.xPos))
      laserSvg.setAttribute("y",String(laser.yPos))
      laserSvg.setAttribute("width", String(constants.ULTIMATE_WIDTH));
      laserSvg.setAttribute("height", String(constants.ULTIMATE_LENGTH));
    });
    //Show Score
    document.getElementById(constants.SCORE_ID).innerHTML=String(state.score);
    //Delete bullets and aliens from canvas
    state.disappear.forEach(element=>{
      // console.log(JSON.stringify(state.disappear))
      const elementSvg = document.getElementById(element.id);
      if(elementSvg) {
        if(element.id.startsWith("alien")||isKilledUFO(element)){ //Delete aliens
        const drawDeadAlien=()=>{ //Show dead alien and play invader killed sound
         
          const alienImg = document.getElementById(element.id)
          alienImg.remove() //remove original alien
          const deadAlienSvg = document.createElement('img')!; //Show death of alien
          deadAlienSvg.src=constants.DEAD_ALIEN_URL;
          deadAlienSvg.setAttribute("id", "dead"+element.id);
          deadAlienSvg.classList.add(element.alienPts===constants.BOT_ALIEN_PTS? 
            constants.BOT_ALIEN_CLASS:
            element.alienPts===constants.MID_ALIEN_PTS?
            constants.MID_ALIEN_CLASS:
            constants.TOP_ALIEN_CLASS) //set width of the death picture to be the same as original alien (determiend by the number of points they're worth)
          document.getElementById("svgWrapper").appendChild(deadAlienSvg) //Use div as cannot append image to svg canvas
          if(isUFO(element)){ //Play sound of kill
            playAudio(constants.UFO_KILL_SOUND_ID)
          }
          else{    //Normal alien kill sound
             playAudio(constants.INVADER_KILLED_SOUND_ID)
            }
          return deadAlienSvg
        }     
        const alienImg = drawDeadAlien() || document.getElementById("dead"+element.id)       
 
        alienImg.style.position = 'absolute';
        alienImg.style.top = String(element.yPos);
        alienImg.style.left = String(element.xPos);
        // alienImg.style.animationName= "die";
        // alienImg.style.animationDuration="2s"
        const removeSvg = ()=>alienImg.remove();
        if(elementSvg) setInterval(removeSvg,100);//Check if the element hasn't already been removed first
      
      }  
    else{
      const elementSvg = document.getElementById(element.id);
      if(elementSvg) elementSvg.remove();
    }}
    })
    if (!state.iShield){ //If shields are invincible don't show shield deterioation
    document.getElementById("invincibleShields").style.display="none";
    state.ignoreShieldHit.forEach(element=>{
      // console.log(JSON.stringify(state.disappear))

        const drawShieldDent=()=>{
     
          const shieldDentSvg = document.createElement('img')!; 
          shieldDentSvg.src=constants.SHIELD_DENT_URL;
          // const shieldDentSvg  = document.createElementNS( document.getElementById("canvas").namespaceURI, "circle")!;
          
          shieldDentSvg.setAttribute("id", "shield"+"element.xPos"+"element.yPos");
          shieldDentSvg.classList.add(constants.SHIELD_DENT_CLASS); //set width of the death picture to be the same as original alien (determiend by the number of points they're worth)
          document.getElementById("svgWrapper").appendChild(shieldDentSvg) //Use div as cannot append image to svg canvas
          return shieldDentSvg
        }     
        const shieldDentSvg = drawShieldDent() || document.getElementById("shield"+"element.xPos"+"element.yPos")       
        // shieldDentSvg.setAttribute("fill","black")
        // shieldDentSvg.setAttribute("cx",String(element.xPos))
        // shieldDentSvg.setAttribute("cy",String(element.yPos))
        // shieldDentSvg.setAttribute("r", String(constants.SHIELD_DENT_WIDTH));
        shieldDentSvg.style.position = 'absolute';
        shieldDentSvg.style.top = String(element.yPos);
        shieldDentSvg.style.left = String(element.xPos);
        // alienImg.style.animationName= "die";
        // alienImg.style.animationDuration="2s"
      
        })}
        else{
          //Show invincible shield toggle change
          document.getElementById("invincibleShields").style.display="block"; 
        }
    //Game over
    if(state.isGameOver&&!state.canRestart){
    // game$.unsubscribe();

    //Show game over text
    const gameOverText = document.createElement("h")!;
    gameOverText.style.position="absolute";
    gameOverText.style.left=String(constants.CANVAS_WIDTH/6);
    gameOverText.style.top=String(2*constants.CANVAS_WIDTH/5);
    gameOverText.setAttribute("id", "gameOverText")
    gameOverText.textContent = "Game Over";
    document.getElementById("svgWrapper").appendChild(gameOverText);
    //Show restart text
    const restartText = document.createElement("h")!;
    restartText.style.position="absolute";
    restartText.style.left=String(constants.CANVAS_WIDTH/4);
    restartText.style.top=String(2*constants.CANVAS_WIDTH/4);
    restartText.setAttribute("id", "restartText")
    restartText.textContent = "Press x to restart";
    document.getElementById("svgWrapper").appendChild(restartText);
    //Remove cannon sprite
    document.getElementById(constants.CANNON_ID).style.display="none";
    //Show destroyed cannon
    const deadCannonImg = document.createElement("img");
    deadCannonImg.src = constants.DEAD_CANNON_IMG_SRC;
    deadCannonImg.setAttribute("id", constants.DEAD_CANNON_ID);
    deadCannonImg.style.position="absolute";
    deadCannonImg.style.top=String(state.cannon.yPos+constants.DEAD_CANNON_IMG_YGAP);
    deadCannonImg.style.left=String(state.cannon.xPos);
    document.getElementById("svgWrapper").appendChild(deadCannonImg);
    //Play cannon death audio
    playAudio(constants.CANNON_KILLED_SOUND_ID)
    }
  if (state.restarted){
    if(document.getElementById(constants.DEAD_CANNON_ID)){document.getElementById(constants.DEAD_CANNON_ID).remove()}
    document.getElementById(constants.CANNON_ID).style.display="inline";
    if(document.getElementById("gameOverText")){
      document.getElementById("gameOverText").remove()
    }
    if(document.getElementById("restartText")){
      document.getElementById("restartText").remove()
  }

}
    //Show cannon motion
    const cannon = document.getElementById(constants.CANNON_ID)!;
    cannon.setAttribute('transform',
     `translate(${state.cannon.xPos},${state.cannon.yPos})`)
  }
//################################# Final Merges and subscribe ###########################
 
// const playPause$ = 
//     fromEvent<KeyboardEvent>(document, "keydown")
//       .pipe(
//         filter(({code})=>code === "KeyP"||code === "KeyO"),//filter keyboardEvent.codes for the correct key
//         map(({code})=>code==='KeyP'?true:false)),
// playing =  <HTMLInputElement>document.getElementById("playing"),
// restart$=fromEvent(playing, 'change')
//   .pipe(map(e =>e.target.checked));
// const game$=playPause$
//     .filter(x => x === true)
//                     .startWith(true)
//                     .flatMap(() => mainStream.takeUntil(toggleStream));
 
// var resultStream = toggleStream
//                     .filter(x => x === true)
//                     .startWith(true)
//                     .flatMap(() => mainStream.takeUntil(toggleStream));



const 
gamePlay$=interval(10) 
  .pipe(
    map(elapsed=>new Tick(elapsed)),
    merge(
      moveLeft,moveRight, stopMoveLeft, stopMoveRight, restartGame),
    merge(startShoot,fireUltimate, alienShoot, toggleInvincibleShields),
    scan(reduceState, startState)).subscribe(showOnScreen)
  }
 
//  game$=gamePlay$.pipe(takeUntil(playPause$)).subscribe(showOnScreen)}

//  playPause$.filter(x => x === true)
//                     .startWith(true)
//                     .flatMap(() => gamePlay$.takeUntil());
// }

// gamePlay$.filter(x => x === true)
//                     .startWith(true)
//                     .flatMap(() => mainStream.takeUntil(toggleStream));
  //Run function
  if (typeof window != 'undefined')
    window.onload = ()=>{
      spaceinvaders();
    }

 

