// @ts-check

Ammo().then((Ammo) => {
    // - Global constiables -
    const DISABLE_DEACTIVATION = 4;
    const TRANSFORM_AUX = new Ammo.btTransform();
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
    let materialDynamic, materialStatic;

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

        materialDynamic = new THREE.MeshPhongMaterial({ color: 0xfca400 });
        materialStatic = new THREE.MeshPhongMaterial({ color: 0x999999 });

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
            generateObject();
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

    function createBox(pos, quat, w, l, h, mass, friction) {
        const material = mass > 0 ? materialDynamic : materialStatic;
        const shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
        const geometry = new Ammo.btBoxShape(new Ammo.btVector3(w * 0.5, l * 0.5, h * 0.5));

        if (!mass) mass = 0;
        if (!friction) friction = 1;

        const mesh = new THREE.Mesh(shape, material);
        mesh.castShadow = true;
        //mesh.receiveShadow = true;
        mesh.position.copy(pos);
        mesh.quaternion.copy(quat);
        scene.add(mesh);

        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        const motionState = new Ammo.btDefaultMotionState(transform);

        const localInertia = new Ammo.btVector3(0, 0, 0);
        geometry.calculateLocalInertia(mass, localInertia);

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, geometry, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);

        body.setFriction(friction);
        //body.setRestitution(.9);
        //body.setDamping(0.2, 0.2);

        physicsWorld.addRigidBody(body);

        if (mass > 0) {
            body.setActivationState(DISABLE_DEACTIVATION);
            // Sync physics and graphics
            function sync(dt) {
                const ms = body.getMotionState();
                if (ms) {
                    ms.getWorldTransform(TRANSFORM_AUX);
                    const p = TRANSFORM_AUX.getOrigin();
                    const q = TRANSFORM_AUX.getRotation();
                    mesh.position.set(p.x(), p.y(), p.z());
                    mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
                }
            }

            syncList.push(sync);
        }
    }

    function createBoxWall() {
        const size = .75;
        const nw = 8;
        const nh = 6;
        for (let j = 0; j < nw; j++)
            for (let i = 0; i < nh; i++)
                createBox(new THREE.Vector3(size * j - (size * (nw - 1)) / 2, size * i, 10), ZERO_QUATERNION, size, size, size, 10);
    }

    function generateObject() {
        const numTypes = 4;
        const objectType = Math.ceil(Math.random() * numTypes);

        let threeObject = null;
        let shape = null;

        const objectSize = 3;
        const margin = 0.05;

        switch (objectType) {
            case 1:
                {
                    // Sphere
                    const radius = 1 + Math.random() * objectSize;
                    threeObject = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 20), createObjectMaterial());
                    shape = new Ammo.btSphereShape(radius);
                    shape.setMargin(margin);
                    break;
                }
            case 2:
                {
                    // Box
                    const sx = 1 + Math.random() * objectSize;
                    const sy = 1 + Math.random() * objectSize;
                    const sz = 1 + Math.random() * objectSize;
                    threeObject = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), createObjectMaterial());
                    shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
                    shape.setMargin(margin);
                    break;
                }
            case 3:
                {
                    // Cylinder
                    const radius = 1 + Math.random() * objectSize;
                    const height = 1 + Math.random() * objectSize;
                    threeObject = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 20, 1), createObjectMaterial());
                    shape = new Ammo.btCylinderShape(new Ammo.btVector3(radius, height * 0.5, radius));
                    shape.setMargin(margin);
                    break;
                }
            default:
                {
                    // Cone
                    const radius = 1 + Math.random() * objectSize;
                    const height = 2 + Math.random() * objectSize;
                    threeObject = new THREE.Mesh(new THREE.CylinderGeometry(0, radius, height, 20, 2), createObjectMaterial());
                    shape = new Ammo.btConeShape(radius, height);
                    break;
                }
        }

        threeObject.castShadow = true;
        //threeObject.receiveShadow = true;

        threeObject.position.set((Math.random() - 0.5) * terrainWidth * 0.6, terrainMaxHeight + objectSize + 2, (Math.random() - 0.5) * terrainDepth * 0.6);

        const mass = objectSize * 5;
        const localInertia = new Ammo.btVector3(0, 0, 0);
        shape.calculateLocalInertia(mass, localInertia);
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        const pos = threeObject.position;
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);

        threeObject.userData.physicsBody = body;

        scene.add(threeObject);
        dynamicObjects.push(threeObject);

        physicsWorld.addRigidBody(body);
    }

    function createObjectMaterial() {
        var c = Math.floor(Math.random() * (1 << 24));
        return new THREE.MeshPhongMaterial({ color: c });
    }

    function createObjects() {
        // ground
        //createBox(new THREE.Vector3(0, -0.5, 0), ZERO_QUATERNION, 75, 1, 75, 0, 2);

        // ramp
        //const quaternion = new THREE.Quaternion(0, 0, 0, 1);
        //quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 18);
        //createBox(new THREE.Vector3(0, -1.5, 0), quaternion, 8, 4, 10, 0);

        // box wall
        //createBoxWall();

        // car
        createVehicle(physicsWorld, scene, syncList, actions, new THREE.Vector3(0, 4, -20), ZERO_QUATERNION);
    }

    // - Init -
    const hm1 = 'displacement-map.jpg';
    const hm2 = 'Heightmap1.png';
    // sinusHeightmap simplexHeightmap readHeightmap
    readHeightmap(terrainWidth, terrainDepth, terrainMinHeight, terrainMaxHeight, `./textures/${hm2}`).then((heightData_) => {
        heightData = heightData_;
        initGraphics();
        initPhysics();
        createObjects();
        tick();
    });
});
