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
    CANNON_HEIGHT:42,
    CANNON_SPEED:8,
    CANNON_ID:"cannon",
    CANVAS_WIDTH: 600,
    START_SCORE: 0,
    CANNON_Y_POS:565, //Y position of the cannon
    //Bullet constants
    BULLET_CANNON_GAP:-10,
    BULLET_RADIUS: 2,
    BULLET_SPEED: 8,
    //Ultimate constants
    ULTIMATE_SPEED:4,
    ULTIMATE_LENGTH:90,
    ULTIMATE_WIDTH:3,
    ULTIMATE_SCORE_THRESHOLD:55000,
    NO_OF_LASERS:5,
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
    ALIEN_SHOOT_INTERVAL:500,
    //Score:
    SCORE_ID: "scoreValue"
  }
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
    createTime?:number //To delete bullets as we don't want too many, and also to time the ultimate
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
    isGameOver: boolean
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
    score:0,
    time:0,
    iShield:true,
    isGameOver:false,
    
  }

//##################################### Observing keys and performing actions ##################################  
  class Move {constructor(public readonly xDirection:number){}} //For moving cannon
  class Shoot {constructor(){}} //For shooting bullets
  class AlienShoot{constructor(){}}//alien fire
  class Tick { constructor(public readonly elapsed:number) {} } //unit of time
  class Spawn {constructor(public readonly spawn:boolean){}} //For when to spawn aliens
  class Ultimate{constructor(){}}
  class Ishield{constructor(){}}//toggle invincible shields

  //Might not need keyup at all
  type Key = 'ArrowLeft' | 'ArrowRight' | 'Space'| 'KeyX'|'KeyR'|'KeyI'
  const keyObs = <T>( key:Key, action:()=>T)=>
    fromEvent<KeyboardEvent>(document,'keydown')
      .pipe(
        filter(({code})=>code === key),//filter keyboardEvent.codes for the correct key
        map(action)) //perform corresponding action
  const moveLeft = keyObs('ArrowLeft',()=>new Move(-constants.CANNON_SPEED)),
  moveRight= keyObs('ArrowRight',()=>new Move(constants.CANNON_SPEED)),
  startShoot = keyObs( 'Space', ()=>new Shoot()),
  startGame = keyObs('KeyX', ()=>new Spawn(true)),
  alienShoot= interval(constants.ALIEN_SHOOT_INTERVAL).pipe(map(()=>new AlienShoot())),
  toggleInvincibleShields=keyObs( 'KeyI', ()=>new Ishield()),
  fireUltimate = keyObs('KeyR', ()=>new Ultimate())

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

  //############################ Shooting, alien moving, collision+gameOver checks #################################
  const tick = (state:State, elapsed:number)=>{
    const endedB = (element:Element)=>(elapsed - element.createTime) > 70,
    endedBullets:Element[] = state.bullets.filter(endedB),
    activeBullets = state.bullets.filter(_=>!endedB(_));
    const endedU = (element:Element)=>(elapsed - element.createTime) > 30,
    endedLasers:Element[] = state.ultimate.filter(endedU),
    activeUltimate = state.ultimate.filter(_=>!endedU(_));
    // Implement bullets disappearing when hitting alien
    return(
    state.aliens.length===0?
    // state.lvl===0? 
    checkHits(createAliens(0,state)): 
    baseInvaded(state)? //Check if base has been invaded
    <State>{
      ...state,
      bullets:[],
      aliens:[],
      isGameOver:true
    }:
      anyAlienAtEdge(state)? //Check if aliens are at the left or right borders, if so, shift them down
      checkHits({
        ...state,
        bullets: activeBullets.map(moveBullet),
        ultimate: activeUltimate.map(moveUltimateLaser),
        aliens: state.aliens.map(alienMoveDownChangeDir),
        disappear:endedBullets,
        time: elapsed
    }):
    checkHits({
      ...state,
      bullets: activeBullets.map(moveBullet),
      ultimate: activeUltimate.map(moveUltimateLaser),
      aliens: state.aliens.map(moveAlien),
      disappear:endedBullets,
      time: elapsed
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
    id:constants.CANNON_ID, 
    xPos: (constants.CANVAS_WIDTH/2)-(constants.CANNON_WIDTH/2),
    yPos: constants.CANNON_Y_POS,
    alienPts:0,
    alienDir:0,
    createTime:0
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
  }, 
  {
  id:`ultimateB${state.ultCount+1}`, 
  xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
  yPos: state.cannon.yPos+constants.BULLET_CANNON_GAP-1*constants.ULTIMATE_LENGTH, 
  },
  {
  id:`ultimateC${state.ultCount+2}`, 
  xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
  yPos: state.cannon.yPos+constants.BULLET_CANNON_GAP-2*constants.ULTIMATE_LENGTH, 
  },
  {
  id:`ultimateD${state.ultCount+3}`, 
  xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
  yPos: state.cannon.yPos+constants.BULLET_CANNON_GAP-3*constants.ULTIMATE_LENGTH, 
  },
  {
  id:`ultimateE${state.ultCount+4}`, 
  xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
  yPos: state.cannon.yPos+constants.BULLET_CANNON_GAP-4*constants.ULTIMATE_LENGTH, 
  },
  {id:`ultimateF${state.ultCount+5}`, 
  xPos: state.cannon.xPos + constants.CANNON_WIDTH/2,
  yPos: state.cannon.yPos+constants.BULLET_CANNON_GAP-5*constants.ULTIMATE_LENGTH, 
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
    (a.xPos<constants.BOT_ALIEN_WIDTH/2)|| a.xPos>(cWidth-constants.BOT_ALIEN_WIDTH)? true: false; //need to subtract bot alien width at right border as anchor point of img is top left
  return isAtEdge(alien)
}
const anyAlienAtEdge=(state:State)=>{ //Checks if any of the alien is at the border
  const reducer = (prev:number, curr:Element)=>alienAtEdge(curr)?prev+1:prev;
  return state.aliens.reduce(reducer, 0) //If return value >0, then at least one of the aliens is at border
}

const moveBullet=(element:Element)=><Element>{//Only specially used for bullets for now
  ...element,
  yPos: element.yPos +element.bulletYDir*constants.BULLET_SPEED,
}
const moveAlien=(element:Element)=><Element>{
...element,
  xPos: element.xPos + element.alienDir*(constants.ALIEN_START_SPEED+element.alienLvl*constants.LVL_SPEED_INCREMENT)
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
  }}
  else return 0
}

function elementHeight(element:Element){ 
  //Return the height of the input element
  if(element.id){
  if (element.id.startsWith("alien")){
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
}

  const checkHits= (state:State) => {
    const
      mergeMap = <T, U>( //mergeMap function
        array: ReadonlyArray<T>,
        mappingFn: (array: T) => ReadonlyArray<U>
      ) => Array.prototype.concat(...array.map(mappingFn)),
         // Check if not in array:
         notIn = (searchKey:ReadonlyArray<Element>) => (searchEl:Element) => searchKey.findIndex(el=>el.id === searchEl.id) < 0,
         // everything in the first array that's not in b
         except = (arr1:ReadonlyArray<Element>) => (arr2:ReadonlyArray<Element>) => arr1.filter(notIn(arr2)),
    

      bulletHit = ([bullet,element]:[Element,Element]) => 
      bullet.id?
      !bullet.id.startsWith("A")?

        (bullet.xPos+constants.BULLET_RADIUS>element.xPos)&&
        (bullet.xPos+constants.BULLET_RADIUS<element.xPos+elementWidth(element))&&
        (bullet.yPos-constants.BULLET_RADIUS<element.yPos+elementHeight(element))&&
        (element.yPos+constants.BULLET_RADIUS>element.yPos):false:false,
      enemyBulletHit= ([bullet,element]:[Element,Element])=>
    
        bullet.id?
        bullet.id.startsWith("A")?
        (bullet.xPos+constants.BULLET_RADIUS>element.xPos)&&
        (bullet.xPos+constants.BULLET_RADIUS<element.xPos+elementWidth(element))&&
        (bullet.yPos+constants.BULLET_RADIUS>element.yPos)&&
        (element.yPos-constants.BULLET_RADIUS<element.yPos):false:false,
       
      cannonHit = 
      state.bullets.filter(bullet =>enemyBulletHit([bullet, state.cannon])).length >0,//check if cannon is hit
      
      //Shield hit checking
      shieldHit = ([element1, ignoreElement]:[Element, Element])=>
      (element1.xPos+constants.BULLET_RADIUS>ignoreElement.xPos)&&
      (element1.xPos+constants.BULLET_RADIUS<ignoreElement.xPos+constants.SHIELD_WIDTH)&&
      (((element1.yPos-constants.BULLET_RADIUS<ignoreElement.yPos+constants.SHIELD_HEIGHT)&&
      (element1.yPos-constants.BULLET_RADIUS>ignoreElement.yPos))||
      (element1.yPos+constants.BULLET_RADIUS>ignoreElement.yPos)&&
      (element1.yPos+constants.BULLET_RADIUS<ignoreElement.yPos+constants.SHIELD_HEIGHT)
      ),
      // ([bullet,element]:[Element,Element])=>bulletHit([bullet,element])?true:enemyBulletHit([bullet,element])?true:false, //Shield can be hit from both top and bottom

      notSamePosition =(element1:Element, ignoreElement:Element)=>
      !((element1.xPos+constants.BULLET_RADIUS>ignoreElement.xPos)&&
      (element1.xPos+constants.BULLET_RADIUS<ignoreElement.xPos+constants.SHIELD_DENT_WIDTH)&&
      (((element1.yPos-constants.BULLET_RADIUS<ignoreElement.yPos+constants.SHIELD_DENT_HEIGHT)&&
      (element1.yPos-constants.BULLET_RADIUS>ignoreElement.yPos))||
      (element1.yPos+constants.BULLET_RADIUS>ignoreElement.yPos)&&
      (element1.yPos+constants.BULLET_RADIUS<ignoreElement.yPos+constants.SHIELD_DENT_HEIGHT)
      )),
      
      allBulletsAndShields =mergeMap(state.bullets, bul=> state.shieldPositions.map(createShield).map<[Element,Element]>(al=>([bul,al]))),
      hitBulletsAndShields=allBulletsAndShields.filter(shieldHit),
      bulletsThatHitShield = hitBulletsAndShields.map(([bullet,_])=>bullet),

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
      bullets: except(state.bullets)(hitBullets.concat(bulletsThatHitShield)),
      aliens: except(state.aliens)(hitAliens.concat(laseredAliens)),
      disappear: state.disappear.concat(hitBullets,hitAliens,laseredAliens, bulletsThatHitShield),
      isGameOver: cannonHit,
      score:hitAliens.reduce(updateScore, state.score),
      ignoreShieldHit:state.ignoreShieldHit.concat(bulletsThatHitShield)
    }
}

  const reduceState = (state: State, action:Move|Shoot|Tick|Spawn)=>
    action instanceof Move ?{
      ...state,
      cannon: {id:constants.CANNON_ID, xPos: horizWrap(state.cannon.xPos+action.xDirection), yPos: constants.CANNON_Y_POS, }
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
    }:
    action instanceof Spawn?//To spawn new aliens at a new level, consider also increasing the level here?
   state.aliens.length===0?createAliens(0,state):state:
    tick(state, action.elapsed);
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
   
    //Create aliens on canvas
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
    //Create ultimate lasers on canvas
    state.ultimate.forEach(laser=>{
      const drawUltimate=()=>{
        // console.log(laser.id.slice(0,9))
     
        // console.log(JSON.stringify(state.ultimate))
        const laserSvg  = document.createElementNS(document.getElementById("canvas").namespaceURI, "rect")!;
        
        laserSvg.setAttribute("id", laser.id);
        document.getElementById("canvas").appendChild(laserSvg)
        return laserSvg

      }
      const laserSvg = document.getElementById(laser.id) || drawUltimate();
      laserSvg.classList.add(laser.id.slice(0,9))

      laserSvg.setAttribute("fill","white");
      laserSvg.setAttribute("x",String(laser.xPos))
      laserSvg.setAttribute("y",String(laser.yPos))
      laserSvg.setAttribute("width", String(constants.ULTIMATE_WIDTH));
      laserSvg.setAttribute("height", String(constants.ULTIMATE_LENGTH));
      // const drawBullet=()=>{
      //   console.log(JSON.stringify(state.ultimate))
      //   const bulletSvg  = document.createElementNS(canvas.namespaceURI, "circle")!;
      //   bulletSvg.setAttribute("id", laser.id);
      //   bulletSvg.classList.add("bullet")
      //   canvas.appendChild(bulletSvg)
      //   return bulletSvg
      // }
      // const bulletSvg = document.getElementById(laser.id) || drawBullet();

      // bulletSvg.setAttribute("cx",String(laser.xPos))
      // bulletSvg.setAttribute("cy",String(laser.yPos))
      // bulletSvg.setAttribute("r", String(constants.BULLET_RADIUS));
    });
    //Show Score
    document.getElementById(constants.SCORE_ID).innerHTML=String(state.score);
        //Delete elements from canvas
    state.disappear.forEach(element=>{
      // console.log(JSON.stringify(state.disappear))
      const elementSvg = document.getElementById(element.id);
      if(elementSvg) {
        if(element.id.startsWith("alien")){
        const drawDeadAlien=()=>{
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
    if (!state.iShield){
    document.getElementById("invincibleShields").style.display="none";
    state.ignoreShieldHit.forEach(element=>{
      // console.log(JSON.stringify(state.disappear))
     

        const drawShieldDent=()=>{
     
          // const shieldDentSvg = document.createElement('img')!; //Show death of alien
          // shieldDentSvg.src=constants.SHIELD_DENT_URL;
          const shieldDentSvg  = document.createElementNS( document.getElementById("canvas").namespaceURI, "circle")!;
          
          shieldDentSvg.setAttribute("id", "shield"+"element.xPos"+"element.yPos");
          shieldDentSvg.classList.add(constants.SHIELD_DENT_CLASS); //set width of the death picture to be the same as original alien (determiend by the number of points they're worth)
          document.getElementById("canvas").appendChild(shieldDentSvg) //Use div as cannot append image to svg canvas
          return shieldDentSvg
        }     
        const shieldDentSvg = drawShieldDent() || document.getElementById("shield"+"element.xPos"+"element.yPos")       
        shieldDentSvg.setAttribute("fill","black")
        shieldDentSvg.setAttribute("cx",String(element.xPos))
        shieldDentSvg.setAttribute("cy",String(element.yPos))
        shieldDentSvg.setAttribute("r", String(constants.SHIELD_DENT_WIDTH));
        // shieldDentSvg.style.position = 'absolute';
        // shieldDentSvg.style.top = String(element.yPos);
        // shieldDentSvg.style.left = String(element.xPos);
        // alienImg.style.animationName= "die";
        // alienImg.style.animationDuration="2s"
      
        })}
        else{
          document.getElementById("invincibleShields").style.display="block";
        }

    //Game over
    if(state.isGameOver){
    subscription$.unsubscribe();
    const gameOverText = document.createElement("h")!;
    gameOverText.style.position="absolute";
    gameOverText.style.left=String(constants.CANVAS_WIDTH/6);
    gameOverText.style.top=String(2*constants.CANVAS_WIDTH/5);
    gameOverText.setAttribute("id", "gameOverText")

    gameOverText.textContent = "Game Over";
    document.getElementById("svgWrapper").appendChild(gameOverText);
  
  }
    

    const cannon = document.getElementById(constants.CANNON_ID)!;
    cannon.setAttribute('transform',
     `translate(${state.cannon.xPos},${state.cannon.yPos})`)
  }
//################################# Final Merges and subscribe ###########################
 

  const subscription$=interval(10) 
  .pipe(
    map(elapsed=>new Tick(elapsed)),
    merge(
      moveLeft,moveRight),
    merge(startShoot,startGame,fireUltimate, alienShoot, toggleInvincibleShields),
    scan(reduceState, startState))
  .subscribe(showOnScreen);
 
}

  //Run function
  if (typeof window != 'undefined')
    window.onload = ()=>{
      spaceinvaders();
    }

 

