// @ts-check

Ammo().then((Ammo) => {
    // - Global constiables -
    const ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);

    // Heightfield parameters
    const terrainRes = 128;
    const terrainExtent = 100;

    const terrainWidthExtents = terrainExtent;
    const terrainDepthExtents = terrainExtent;

    const terrainWidth = terrainRes;
    const terrainDepth = terrainRes;

    const terrainMaxHeight = 0;
    const terrainMinHeight = -5;

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

    const uy = new THREE.Vector3(0, 1, 0);
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
        camera.position.y = 12;
        camera.position.z = -30;
        camera.lookAt(new THREE.Vector3(0.33, -0.40, 0.85));
        //controls = new THREE.OrbitControls(camera);


        // terrain
        createTerrainMesh(scene, terrainWidthExtents, terrainDepthExtents, terrainWidth, terrainDepth, heightData);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        //renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
        renderer.setClearColor(0xbfd1e5);
        renderer.setPixelRatio(window.devicePixelRatio);
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

        window.controller.x = 0;
        window.controller.y = 0;
        window.controller.b1 = 0;

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



        // static cam looking at car
        camera.lookAt(chassisMesh.position);

        // camera in car
        /*const cmp = chassisMesh.position.clone();
        camera.position.x = cmp.x;
        camera.position.y = cmp.y;
        camera.position.z = cmp.z;

        const qq = chassisMesh.quaternion.clone().multiply(dq);
        camera.quaternion.slerp(qq, 0.1);*/



        renderer.render(scene, camera);

        time += dt;
        stats.update();
    }

    function createObjects() {
        // ground
        //createBox(physicsWorld, scene, syncList, new THREE.Vector3(0, -0.5, 0), ZERO_QUATERNION, 75, 1, 75, 0, 2);

        // ramp
        const quaternion = new THREE.Quaternion(0, 0, 0, 1);
        quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 18);
        createBox(physicsWorld, scene, syncList, new THREE.Vector3(0, -2, 0), quaternion, 8, 4, 10, 0, 0, true);

        // box wall
        createBoxWall(physicsWorld, scene, syncList);

        // car
        chassisMesh = createVehicle(physicsWorld, scene, syncList, new THREE.Vector3(0, 4, -20), ZERO_QUATERNION);
        
        // for camera inside the car
        //chassisMesh.addChild(camera);
    }

    // - Init -
    const hm1 = 'displacement-map.jpg';
    const hm2 = 'Heightmap1.png';
    // sinusHeightmap simplexHeightmap readHeightmap
    readHeightmap(terrainWidth, terrainDepth, terrainMinHeight, terrainMaxHeight, `./textures/${hm1}`).then((heightData_) => {
        heightData = heightData_;
        initGraphics();
        initPhysics();
        createObjects();
        tick();
    });
});
