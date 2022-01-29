# carsim

This is me playing with ammo.js and threejs to attempt a KISS 3D physics car sim.
This is my nth attempt so don't expect too much...


## Tentative plan to rule the world
- intro
    - [ ] load/save params to localStorage, reloading page (toggle shadows, map, quality, etc.)
    - [ ] present dialog with basic intro text
- car
    - [ ] play with car rig (dimensions, materials and params)
    - [ ] car mods and visuals (rally, offroad, bus)
    - [ ] EVENTUALLY gears/rpms and their overlays (more relevant once engine sounds exist)
- physics
    - [ ] detect passing through waypoints ONGOING
- controls
    - [ ] reposition car ONGOING
    - [x] support keys
    - [x] support gamepad
    - [x] support virtual gamepad with touch
- camera
    - [x] fixed point - look at car
    - [ ] driver - attached to car WIP
    - [ ] chase cam
- GUI
    - [ ] basic velocimeter overlay
- sound generation
    - [ ] engine sound
    - [ ] braking
    - [ ] collisions
- eyecandy
    - [ ] decals
    - [ ] particle generation for dirt and/or smoke
- track
    - [x] load from heightmap + texture map
    - [ ] load objects (trees, buildings, etc.)
    - [ ] parametric roads


## Reference

- [threejs docs](https://threejs.org/docs/)
- bullet docs  
[API](https://pybullet.org/Bullet/BulletFull/),  
[pdf](https://github.com/bulletphysics/bullet3/blob/master/docs/Bullet_User_Manual.pdf)
[SO [ammo.js]](https://stackoverflow.com/questions/tagged/ammo.js)
[SO [bulletphysics]](https://stackoverflow.com/questions/tagged/bulletphysics)


## Run locally:

    npx http-server .


## Strategy so far

What triggered this was watching a twitch stream of some crazy Euro Truck Simulator 2 custom map (possibly promods?) where the bus was in
the edge of rolling over. It's interesting that I started this experiment with fun in mind, assuming I would plateau super fast and drop it.
Started from ammo.js examples, heavily refactoring them. Then started to tackle small objectives, trying to keep the game fun and stable.
It's coming along great!

One thing that is helping a lot is using this lazy TypeScript inference with `// @ts-check`. (one has to open all relevant js and d.ts files and vscode does the rest).
Imported/hacked some typings in `global.d.ts`.


### controller input

One abstraction that has been paying off is abstracting input as a generic structure of axis and buttons (exposed in window.controller).
Both keyboard, gamepad and virtual gamepad (via touch events) interfaces are updating this structure.
TODO: Manage button up/down immediate events being polled in a simple manner.


## Stuff to check out:

- noise generation
    - https://github.com/josephg/noisejs

- texture loading
    - https://github.com/image-js/fast-png TODO (16 bit heightmap loading)

- helping samples and articles on ammo.js / bulletphysics
    - https://medium.com/@bluemagnificent/collision-detection-in-javascript-3d-physics-using-ammo-js-and-three-js-31a5569291ef

- d.ts
    - https://www.typescriptlang.org/dt/search?search=
    - https://github.com/kripken/ammo.js/blob/main/ammo.idl
    - https://github.com/giniedp/webidl2ts
    - https://github.com/giniedp/ammojs-typed
    - https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/three

- terrain/map generation
    - http://www.fracterra.com/wilbur.html
    - https://www.world-machine.com/features.php

- engine sounds
    - https://github.com/Antonio-R1/engine-sound-generator
    - https://antonio-r1.github.io/engine-sound-generator/src/engine_sound_generator/sounds_worklet.htm
