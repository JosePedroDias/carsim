# carsim

This is me playing with ammo.js and threejs to attempt a KISS 3D physics car sim.
This is my nth attempt so don't expect too much...


## Tentative plan to rule the world 
- car
    - [ ] play with car rig (dimensions, materials and params)
    - [ ] car mods and visuals (rally, offroad, bus)
- physics
    - [ ] detect passing through waypoints
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
- bullet docs [1](https://pybullet.org/Bullet/BulletFull/), [2](https://github.com/bulletphysics/bullet3/blob/master/docs/Bullet_User_Manual.pdf)


## Tools used

- http://www.fracterra.com/wilbur.html - to create maps


## Run locally:

    npx http-server .


## Stuff to check out:

- https://github.com/josephg/noisejs
- https://github.com/image-js/fast-png TODO (16 bit heightmap loading)
- https://yoannmoi.net/nipplejs/ (touch virtual joystick)
- https://github.com/kripken/ammo.js/blob/main/ammo.idl
- https://github.com/giniedp/webidl2ts
- https://stackoverflow.com/questions/tagged/ammo.js
- https://stackoverflow.com/questions/tagged/bulletphysics

