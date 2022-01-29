// @ts-check

const uy = new THREE.Vector3(0, 1, 0);

const DEG2RAD = Math.PI / 180;

//const hm = 'displacement-map.jpg';
//const hm = 'Heightmap1.png';
const hm = '1h2.png';
const tm = '1t.png';
const gridTm = 'grid.png';
const SHOW_GRID = false;
const WITH_SHADOWS = false;

const TERRAIN_RESOLUTION = 128*2; // MESH RESOLUTION
const TERRAIN_EXTENT = 100*2; // ACTUAL DIMS
const TERRAIN_DELTA_HEIGHT = 5; // ACTUAL DIMS

const CAR_ORIENTATION_DEGREES = 90;
const CAR_POSITION = [0, 4, -31.5];
const STATIC_CAM_POSITION = [0, 12, -50];

const CM_STATIC = 0;
const CM_ONBOARD = 1;
const CM_CHASE = 2;

const CAMERA_MODE = CM_STATIC;
//const CAMERA_MODE = CM_ONBOARD;

Ammo().then((Ammo) => {
    // - Global constiables -
    const ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);

    // Heightfield parameters

    const terrainWidthExtents = TERRAIN_EXTENT;
    const terrainDepthExtents = TERRAIN_EXTENT;

    const terrainWidth = TERRAIN_RESOLUTION;
    const terrainDepth = TERRAIN_RESOLUTION;

    const terrainMaxHeight = 0;
    const terrainMinHeight = -TERRAIN_DELTA_HEIGHT;

    let heightData;

    // Graphics constiables
    let stats;
    let camera, scene, renderer;
    let chassisMesh;
    const clock = new THREE.Clock();

    // Physics constiables
    let collisionConfiguration;
    let dispatcher;
    let broadphase;
    let solver;
    let physicsWorld;
    const dynamicObjects = [];
    const transformAux1 = new Ammo.btTransform();

    const syncList = [];
    let time = 0;
    const objectTimePeriod = 3;
    let timeNextSpawn = time + objectTimePeriod;
    const maxNumObjects = 30;

    
    const dq = new THREE.Quaternion();
    dq.setFromAxisAngle(uy, Math.PI);

    let speedometer;

    // Keyboard actions
    const keysActions = {
        KeyW:  { k:'y',  on:-1, off:0 },
        KeyS:  { k:'y',  on: 1, off:0 },
        KeyA:  { k:'x',  on:-1, off:0 },
        KeyD:  { k:'x',  on: 1, off:0 },
        Space: { k:'b1', on: 1, off:0 }
    };

    // - Functions -

    function initGraphics() {
        speedometer = document.getElementById('speedometer');

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);
        camera.position.x = STATIC_CAM_POSITION[0];
        camera.position.y = STATIC_CAM_POSITION[1];
        camera.position.z = STATIC_CAM_POSITION[2];

        // terrain
        createTerrainMesh(scene, terrainWidthExtents, terrainDepthExtents, terrainWidth, terrainDepth, heightData, SHOW_GRID ? gridTm : tm, SHOW_GRID);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        if (WITH_SHADOWS) {
            renderer.shadowMap.enabled = true;
        }
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
        renderer.setClearColor(0xbfd1e5);

        //renderer.setPixelRatio(1/2); // LOW RES
        renderer.setPixelRatio(1); // REGULAR (MEDIUM)
        //renderer.setPixelRatio(window.devicePixelRatio); // RETINA (heavy)


        renderer.setSize(window.innerWidth, window.innerHeight);

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        const dirLight = new THREE.SpotLight(0xffffff);
        dirLight.position.set(0, 27, 0);
        dirLight.angle = Math.PI * 0.6;
        dirLight.castShadow = true; // default false
        dirLight.shadow.mapSize.width = 2048; // default 512
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5; // default
        dirLight.shadow.camera.far = 500; // default
        scene.add(dirLight);

        //const dirLightHelper = new THREE.CameraHelper(dirLight.shadow.camera);
        //scene.add(dirLightHelper);

        

        document.body.appendChild(renderer.domElement);

        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        document.body.appendChild(stats.domElement);

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }, false);

        window.addEventListener('keydown', (ev) => {
            if (window.controller.active) return;
            const ka = keysActions[ev.code];
            if (!ka) return;
            window.controller[ka.k] = ka.on;
            ev.preventDefault();
            ev.stopPropagation();
            return false;
        });
        window.addEventListener('keyup', (ev) => {
            if (window.controller.active) return;
            const ka = keysActions[ev.code];
            if (!ka) return;
            window.controller[ka.k] = ka.off;
            ev.preventDefault();
            ev.stopPropagation();
            return false;
        });
    }

    function initPhysics() {
        // Physics configuration
        collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        broadphase = new Ammo.btDbvtBroadphase();
        solver = new Ammo.btSequentialImpulseConstraintSolver();
        physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
        physicsWorld.setGravity(new Ammo.btVector3(0, -9.82, 0));

        // Create the terrain body
        const groundShape = createTerrainShape(Ammo, terrainWidthExtents, terrainDepthExtents, terrainWidth, terrainDepth, terrainMinHeight, terrainMaxHeight, heightData);
        const groundTransform = new Ammo.btTransform();
        groundTransform.setIdentity();
        // Shifts the terrain, since bullet re-centers it on its bounding box.
        groundTransform.setOrigin(new Ammo.btVector3(0, (terrainMaxHeight + terrainMinHeight) / 2, 0));
        const groundMass = 0;
        const groundLocalInertia = new Ammo.btVector3(0, 0, 0);
        const groundMotionState = new Ammo.btDefaultMotionState(groundTransform);
        const groundBody = new Ammo.btRigidBody(new Ammo.btRigidBodyConstructionInfo(groundMass, groundMotionState, groundShape, groundLocalInertia));
        physicsWorld.addRigidBody(groundBody);
    }

    function tick() {
        requestAnimationFrame(tick);
        const dt = clock.getDelta();

        if (dynamicObjects.length < maxNumObjects && time > timeNextSpawn) {
            generateObject(physicsWorld, scene, dynamicObjects, terrainWidth, terrainDepth, terrainMaxHeight);
            timeNextSpawn = time + objectTimePeriod;
        }

        for (let i = 0; i < syncList.length; i++)
            syncList[i](dt);

        physicsWorld.stepSimulation(dt, 10);

        // Update objects
        for (let i = 0, il = dynamicObjects.length; i < il; i++) {
            const objThree = dynamicObjects[i];
            const objPhys = objThree.userData.physicsBody;
            const ms = objPhys.getMotionState();
            if (ms) {
                ms.getWorldTransform(transformAux1);
                var p = transformAux1.getOrigin();
                var q = transformAux1.getRotation();
                objThree.position.set(p.x(), p.y(), p.z());
                objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
            }
        }

        if (CAMERA_MODE === CM_STATIC) {
            // static cam looking at car
            camera.lookAt(chassisMesh.position);
        }
        else if (CAMERA_MODE === CM_ONBOARD) {
            // camera in car
            const chassisPos = chassisMesh.position.clone();
            const chassisDir = chassisMesh.getWorldDirection();
            chassisDir.multiplyScalar(-2);
            chassisPos.add(chassisDir);

            camera.position.x = chassisPos.x;
            camera.position.y = chassisPos.y + 1.5;
            camera.position.z = chassisPos.z;
            
            // set camera direction same as chassis direction
            const qq = chassisMesh.quaternion.clone().multiply(dq);
            camera.quaternion.slerp(qq, 0.08);
        }
        else {
            // chase
        }

        renderer.render(scene, camera);

        time += dt;
        stats.update();
    }

    function createObjects() {
        // ground
        //createBox(physicsWorld, scene, syncList, new THREE.Vector3(0, -0.5, 0), ZERO_QUATERNION, 75, 1, 75, 0, 2);

        // ramp
        /* const quaternion = new THREE.Quaternion(0, 0, 0, 1);
        quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 18);
        createBox(physicsWorld, scene, syncList, new THREE.Vector3(0, -2, 0), quaternion, 8, 4, 10, 0, 0, true); */

        // box wall
        //createBoxWall(physicsWorld, scene, syncList);

        // car
        const carInitialQuat = new THREE.Quaternion();
        carInitialQuat.setFromAxisAngle(uy, CAR_ORIENTATION_DEGREES * DEG2RAD);
        chassisMesh = createVehicle(physicsWorld, scene, syncList, new THREE.Vector3(...CAR_POSITION), carInitialQuat);
    }

    // - Init -
    // sinusHeightmap simplexHeightmap readHeightmap
    readHeightmap(terrainWidth, terrainDepth, terrainMinHeight, terrainMaxHeight, `./textures/${hm}`).then((heightData_) => {
        heightData = heightData_;
        initGraphics();
        initPhysics();
        createObjects();
        tick();
    });
});
