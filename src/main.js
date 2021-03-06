// @ts-check

const uy = new THREE.Vector3(0, 1, 0);

const DEG2RAD = Math.PI / 180;

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

let CAMERA_MODE = CM_CHASE; // CM_STATIC CM_ONBOARD CM_CHASE

/** @type {{[name: string]: number }} */
window.userIndices = {
    TERRAIN: 1,
    OBJECT: 2,
    CAR: 3
};

/** @type {{[name: number]: string }} */
const userIndicesName = {};
for (let [k, v] of Object.entries(window.userIndices)) {
    userIndicesName[v] = k;
}


Ammo().then(
    /** @param {Ammo} Ammo */
    (Ammo) => {
    // Heightfield parameters

    const terrainWidthExtents = TERRAIN_EXTENT;
    const terrainDepthExtents = TERRAIN_EXTENT;

    const terrainWidth = TERRAIN_RESOLUTION;
    const terrainDepth = TERRAIN_RESOLUTION;

    const terrainMaxHeight = 0;
    const terrainMinHeight = -TERRAIN_DELTA_HEIGHT;

    /** @type {Float32Array} */
    let heightData;

    // Graphics constiables
    let stats;

    /** @type {THREE.PerspectiveCamera} */
    let camera;

    /** @type {THREE.Scene} */
    let scene;

    /** @type {THREE.WebGLRenderer} */
    let renderer;

    /** @type {THREE.Mesh} */
    let chassisMesh;

    const clock = new THREE.Clock();

    const ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);
 
    // Physics constiables
    let collisionConfiguration;
    let dispatcher;
    let broadphase;
    let solver;

    /** @type {Ammo.btDiscreteDynamicsWorld} */
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

    // Keyboard actions
    let lastNextCameraT = 0;
    const nextCameraIgnoreDeltaT = 500;
    window.nextCamera = () => {
        const t = Date.now();
        if (t-lastNextCameraT < nextCameraIgnoreDeltaT) return;
        lastNextCameraT = t;

        if (CAMERA_MODE === CM_STATIC) CAMERA_MODE = CM_ONBOARD;
        else if (CAMERA_MODE === CM_ONBOARD) CAMERA_MODE = CM_CHASE;
        else CAMERA_MODE = CM_STATIC;

        if (CAMERA_MODE === CM_STATIC) {
            camera.position.x = STATIC_CAM_POSITION[0];
            camera.position.y = STATIC_CAM_POSITION[1];
            camera.position.z = STATIC_CAM_POSITION[2];
        } else if (CAMERA_MODE === CM_ONBOARD) {
            camera.fov = 90;
        } else {
            camera.fov = 60;
        }
    }

    const keysActions = {
        KeyW:       { k:'y',  on:-1, off:0 },
        KeyS:       { k:'y',  on: 1, off:0 },
        KeyA:       { k:'x',  on:-1, off:0 },
        KeyD:       { k:'x',  on: 1, off:0 },

        ArrowUp:    { k:'y',  on:-1, off:0 },
        ArrowDown:  { k:'y',  on: 1, off:0 },
        ArrowLeft:  { k:'x',  on:-1, off:0 },
        ArrowRight: { k:'x',  on: 1, off:0 },

        Space:      { k:'b1', on: 1, off:0 },
        KeyC:       { k:'b2', on: 1, off:0 },
    };

    // - Functions -

    function initGraphics() {
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
        renderer.gammaInput = true;
        renderer.gammaOutput = true;
        // @ts-ignore
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
            if (!ka) return;// console.warn(ev.code);
            window.controller[ka.k] = ka.on;
            ev.preventDefault();
            ev.stopPropagation();
            return false;
        });
        window.addEventListener('keyup', (ev) => {
            if (window.controller.active) return;
            const ka = keysActions[ev.code];
            if (!ka) return;
            if (typeof ka === 'function') ka();
            else window.controller[ka.k] = ka.off;
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
        const groundShape = createTerrainShape(terrainWidthExtents, terrainDepthExtents, terrainWidth, terrainDepth, terrainMinHeight, terrainMaxHeight, heightData);
        const groundTransform = new Ammo.btTransform();
        groundTransform.setIdentity();
        // Shifts the terrain, since bullet re-centers it on its bounding box.
        groundTransform.setOrigin(new Ammo.btVector3(0, (terrainMaxHeight + terrainMinHeight) / 2, 0));
        const groundMass = 0;
        const groundLocalInertia = new Ammo.btVector3(0, 0, 0);
        const groundMotionState = new Ammo.btDefaultMotionState(groundTransform);
        const groundBody = new Ammo.btRigidBody(new Ammo.btRigidBodyConstructionInfo(groundMass, groundMotionState, groundShape, groundLocalInertia));
        groundBody.setUserIndex(window.userIndices.TERRAIN);
        physicsWorld.addRigidBody(groundBody);
    }

    function detectCollision(){
        let dispatcher = physicsWorld.getDispatcher();
        let numManifolds = dispatcher.getNumManifolds();
        for (let i = 0; i < numManifolds; ++i) {
            let contactManifold = dispatcher.getManifoldByIndexInternal(i);
            const b0 = contactManifold.getBody0();
            const b1 = contactManifold.getBody1();

            const u = b0.getUserIndex();
            const U = b1.getUserIndex();

            // see window.userIndices in the beginning of this file for number meanings
            if (u === 0 || U === 0) continue; // UNKNOWN
            if ( (u === 1 && U === 2) || (U === 1 && u === 2) ) continue; // TERRAIN/OBJECT
            if ( (u === 1 && U === 3) || (U === 1 && u === 3) ) continue; // TERRAIN/CAR
            console.warn(`collision ${userIndicesName[u]}/${userIndicesName[U]}`);
            
            /*const u0 = b0.getUserPointer();
            const u1 = b1.getUserPointer();
            console.warn(u0, u1);*/

            /* let numContacts = contactManifold.getNumContacts();
            for (let j = 0; j < numContacts; ++j) {
                let contactPoint = contactManifold.getContactPoint(j);
                //let distance = contactPoint.getDistance();
                //console.log({manifoldIndex: i, contactIndex: j, distance: distance});
            } */
        }
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
            camera.lookAt(chassisMesh.position);
        }
        else {
            const cob = CAMERA_MODE === CM_ONBOARD;

            const stiffness = cob ? 0.8 : 0.04;

            const qq = chassisMesh.quaternion.clone().multiply(dq);
            camera.quaternion.slerp(qq, stiffness);

            let sp = window.carStats.speed || 0;
            let spSign = Math.sign(sp);
            if (Math.abs(sp) < 2) {
                spSign = 1;
                sp = spSign * 2;
            }
            
            const chassisDir = new THREE.Vector3();
            chassisMesh.getWorldDirection(chassisDir);

            const camPos = chassisMesh.position.clone();
            const dy = 0.6 + (cob ? 0.2 : (Math.abs(sp)*0.1))
            camPos.y += dy;

            const deltaFront = chassisDir.clone().multiplyScalar(cob ? 0.4*spSign : (-0.9*spSign -0.1*sp) );
            camPos.add(deltaFront);
            
            camera.position.lerp(camPos, stiffness);

            const camTarget = chassisMesh.position.clone();
            camTarget.y += dy * (cob ? 1 : 0.33);
            const deltaTarget = chassisDir.clone().multiplyScalar(spSign);
            camTarget.add(deltaTarget);
            camera.lookAt(camTarget);
        }

        // detectCollision();

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
        // @ts-ignore
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
