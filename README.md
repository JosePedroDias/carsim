# carsim

This is me playing with ammo.js and threejs to attempt a KISS 3D physics car sim.
This is my nth attempt so don't expect too much...


## log
- got everything from https://github.com/kripken/ammo.js
- copied raycast-vehicle-demo into demo1
- created simplest d.ts file
- changed things to const/let and dropped unused vars
- added heightmap terrain and raining objects from terrain demo


## potential todo list
- car
    - play with car rig (dimensions, materials and params)
    - car mods and visuals (rally, offroad, bus)
- physics
    - detect passing through waypoints
- controls
    - reposition car action
    - optional gamepad API
    - check if it works with wheel
- camera
    - implement cameras:
        - fixed point - look at car
        - driver - attached to car
        - chase cam
- gui
    - basic velocimeter overlay
- sound generation
    - engine sound
    - braking
    - collisions
- eyecandy
    - decals
    - particle generation for dirt and/or smoke
- track
    - custom heightmap and texture
    - parametric roads
- organization
    - refactor demo to abstract complexity


## reference

- [threejs docs](https://threejs.org/docs/)
- bullet docs [1](https://pybullet.org/Bullet/BulletFull/), [2](https://github.com/bulletphysics/bullet3/blob/master/docs/Bullet_User_Manual.pdf)


## bootstrap

    npx http-server .


https://github.com/josephg/noisejs
https://github.com/image-js/fast-png TODO (16 bit heightmap loading)
https://yoannmoi.net/nipplejs/ (touch virtual joystick)

bullet api WIP
https://github.com/kripken/ammo.js/blob/main/ammo.idl
https://github.com/giniedp/webidl2ts


https://stackoverflow.com/questions/tagged/ammo.js
https://stackoverflow.com/questions/tagged/bulletphysics

