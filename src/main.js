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
    let stats, speedometer;
    let camera, controls, scene, renderer;
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

    // Keyboard actions
    const keysActions = {
        KeyW: 'acceleration',
        KeyS: 'braking',
        KeyA: 'left',
        KeyD: 'right',
        Space: 'recover'
    };
    const actions = {};

    // - Functions -

    function initGraphics() {
        speedometer = document.getElementById('speedometer');

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);
        camera.position.x = -4.84;
        camera.position.y = 4.39;
        camera.position.z = -35.11;
        camera.lookAt(new THREE.Vector3(0.33, -0.40, 0.85));
        controls = new THREE.OrbitControls(camera);


        // terrain
        createTerrainMesh(scene, terrainWidthExtents, terrainDepthExtents, terrainWidth, terrainDepth, heightData);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
        renderer.setClearColor(0xbfd1e5);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        /*const dirLight = new THREE.DirectionalLight(0xffffff, 1, 100);
        //dirLight.position.set(10, 10, 5);
        dirLight.position.set(0, 1, 0);
        dirLight.castShadow = true; // default false
        scene.add(dirLight);*/

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
            if (!keysActions[ev.code]) {
                console.warn(ev.code);
                return;
            }
            actions[keysActions[ev.code]] = true;
            ev.preventDefault();
            ev.stopPropagation();
            return false;
        });
        window.addEventListener('keyup', (ev) => {
            if (!keysActions[ev.code]) return;
            actions[keysActions[ev.code]] = false;
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

        controls.update(dt);
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
        createBox(physicsWorld, scene, syncList, new THREE.Vector3(0, -2, 0), quaternion, 8, 4, 10, 0);

        // box wall
        createBoxWall(physicsWorld, scene, syncList);

        // car
        createVehicle(physicsWorld, scene, syncList, actions, new THREE.Vector3(0, 4, -20), ZERO_QUATERNION);
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
