# Space invaders written in functional and reactive Typescript
## Demo
[![Demo](https://img.youtube.com/vi/Q5M-Q1lxoAE/0.jpg)](https://www.youtube.com/watch?v=Q5M-Q1lxoAE)

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

## About The Game
 The overall structure of the game is a litany of functions that all return new State or Element
 objects. State objects are a reflection of the current state of the entire game, whereas element
 objects encode information about individual items in the game, such as the cannon or an alien.
 All the functions are pure except the last function, showItemsOnScreen, which is the final
 function to be performed in the final subscription. 

 ### Player Movement
 Originally I had only created “keydown” observable streams and mapped them into actions that
 corresponded to the respective controls of the key pressed. However, I discovered that when
 holding down an arrow key for example, there is a pause before the cannon moves, due to how
 held down key presses are handled in Windows. Gameplay is lackluster if the user’s reaction
 time is not fully harnessed due to an unresponsive game. Therefore I formulated a different
 method for cannon movement in which upon pressing an arrow key, the player will keep moving
 until a ‘keyup’ event for the same key is registered. This circumvented the lag in player
 movement. This was not implemented for held down shooting as that would make the game too
 easy.

 ### Shooting
 Bullets are elements that are created at the position of the cannon when the spacebar is
 pressed. This is done in a similar way to player movement. In a tick function that is called every
 10 milliseconds from an interval(10) observable stream, a new bullet element is created with
 new positions created by mapping the original bullet array

 ### Ultimate ability
 The ultimate ability is a powerful laserbeam. This can only be gained when the player has achieved a certain amount of points. For testing purposes, the points have been set above this level, but this can be changed in the code

 ## Set-up
 Build the Typescript file into Javascript files in order to execute the application