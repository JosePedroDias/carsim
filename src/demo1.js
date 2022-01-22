// @ts-check

Ammo().then((Ammo) => {
    // - Global constiables -
    const DISABLE_DEACTIVATION = 4;
    const TRANSFORM_AUX = new Ammo.btTransform();
    const ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);

    // Heightfield parameters
    const terrainWidthExtents = 100;
    const terrainDepthExtents = 100;
    const terrainWidth = 128;
    const terrainDepth = 128;
    const terrainMaxHeight = 1;
    const terrainMinHeight = -1;
    let terrainMesh;
    let heightData;
    let ammoHeightData;

    // Graphics constiables
    let stats, speedometer;
    let camera, controls, scene, renderer;
    //let terrainMesh, texture;
    const clock = new THREE.Clock();
    let materialDynamic, materialStatic, materialInteractive;

    // Physics constiables
    let collisionConfiguration;
    let dispatcher;
    let broadphase;
    let solver;
    let physicsWorld;

    const syncList = [];
    let time = 0;
    //const objectTimePeriod = 3;
    //const timeNextSpawn = time + objectTimePeriod;
    //const maxNumObjects = 30;

    // Keybord actions
    const actions = {};
    const keysActions = {
        "KeyW": 'acceleration',
        "KeyS": 'braking',
        "KeyA": 'left',
        "KeyD": 'right'
    };

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


        // new terrain
        {
            const geometry = new THREE.PlaneBufferGeometry( 100, 100, terrainWidth - 1, terrainDepth - 1 );
            geometry.rotateX( - Math.PI / 2 );

            const vertices = geometry.attributes.position.array;
            for ( let i = 0, j = 0, l = vertices.length; i < l; i ++, j += 3 ) {
                // j + 1 because it is the y component that we modify
                vertices[ j + 1 ] = heightData[ i ];
            }
            geometry.computeVertexNormals();

            const groundMaterial = new THREE.MeshPhongMaterial( { color: 0xC7C7C7 } );
            terrainMesh = new THREE.Mesh( geometry, groundMaterial );
            scene.add( terrainMesh );

            const textureLoader = new THREE.TextureLoader();
            textureLoader.load("../textures/grid.png", (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set( terrainWidth - 1, terrainDepth - 1 );
                groundMaterial.map = texture;
                groundMaterial.needsUpdate = true;
            });
        }
        

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setClearColor(0xbfd1e5);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 10, 5);
        scene.add(dirLight);

        materialDynamic = new THREE.MeshPhongMaterial({ color: 0xfca400 });
        materialStatic = new THREE.MeshPhongMaterial({ color: 0x999999 });
        materialInteractive = new THREE.MeshPhongMaterial({ color: 0x990000 });

        document.body.appendChild(renderer.domElement);

        stats = new Stats(); 
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        document.body.appendChild(stats.domElement);

        window.addEventListener('resize', onWindowResize, false);
        window.addEventListener('keydown', keydown);
        window.addEventListener('keyup', keyup);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
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
        const groundShape = createTerrainShape( heightData );
        const groundTransform = new Ammo.btTransform();
        groundTransform.setIdentity();
        // Shifts the terrain, since bullet re-centers it on its bounding box.
        groundTransform.setOrigin( new Ammo.btVector3( 0, ( terrainMaxHeight + terrainMinHeight ) / 2, 0 ) );
        const groundMass = 0;
        const groundLocalInertia = new Ammo.btVector3( 0, 0, 0 );
        const groundMotionState = new Ammo.btDefaultMotionState( groundTransform );
        const groundBody = new Ammo.btRigidBody( new Ammo.btRigidBodyConstructionInfo( groundMass, groundMotionState, groundShape, groundLocalInertia ) );
        physicsWorld.addRigidBody( groundBody );
    }

    function tick() {
        requestAnimationFrame(tick);
        const dt = clock.getDelta();
        for (let i = 0; i < syncList.length; i++)
            syncList[i](dt);
        physicsWorld.stepSimulation(dt, 10);
        controls.update(dt);
        renderer.render(scene, camera);
        time += dt;
        stats.update();
    }

    function keyup(e) {
        if (keysActions[e.code]) {
            actions[keysActions[e.code]] = false;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }
    function keydown(e) {
        if (keysActions[e.code]) {
            actions[keysActions[e.code]] = true;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    function createBox(pos, quat, w, l, h, mass, friction) {
        const material = mass > 0 ? materialDynamic : materialStatic;
        const shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
        const geometry = new Ammo.btBoxShape(new Ammo.btVector3(w * 0.5, l * 0.5, h * 0.5));

        if (!mass) mass = 0;
        if (!friction) friction = 1;

        const mesh = new THREE.Mesh(shape, material);
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

    function createWheelMesh(radius, width) {
        const t = new THREE.CylinderGeometry(radius, radius, width, 24, 1);
        t.rotateZ(Math.PI / 2);
        const mesh = new THREE.Mesh(t, materialInteractive);
        mesh.add(new THREE.Mesh(new THREE.BoxGeometry(width * 1.5, radius * 1.75, radius * .25, 1, 1, 1), materialInteractive));
        scene.add(mesh);
        return mesh;
    }

    function createChassisMesh(w, l, h) {
        const shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
        const mesh = new THREE.Mesh(shape, materialInteractive);
        scene.add(mesh);
        return mesh;
    }

    function createVehicle(pos, quat) {
        // Vehicle contants

        const chassisWidth = 1.8;
        const chassisHeight = .6;
        const chassisLength = 4;
        const massVehicle = 800;

        const wheelAxisPositionBack = -1;
        const wheelRadiusBack = .4;
        const wheelWidthBack = .3;
        const wheelHalfTrackBack = 1;
        const wheelAxisHeightBack = .3;

        const wheelAxisFrontPosition = 1.7;
        const wheelHalfTrackFront = 1;
        const wheelAxisHeightFront = .3;
        const wheelRadiusFront = .35;
        const wheelWidthFront = .2;

        const friction = 1000;
        const suspensionStiffness = 20.0;
        const suspensionDamping = 2.3;
        const suspensionCompression = 4.4;
        const suspensionRestLength = 0.6;
        const rollInfluence = 0.2;

        const steeringIncrement = .04;
        const steeringClamp = .5;
        const maxEngineForce = 2000;
        const maxBreakingForce = 100;

        // Chassis
        const geometry = new Ammo.btBoxShape(new Ammo.btVector3(chassisWidth * .5, chassisHeight * .5, chassisLength * .5));
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const localInertia = new Ammo.btVector3(0, 0, 0);
        geometry.calculateLocalInertia(massVehicle, localInertia);
        const body = new Ammo.btRigidBody(new Ammo.btRigidBodyConstructionInfo(massVehicle, motionState, geometry, localInertia));
        body.setActivationState(DISABLE_DEACTIVATION);
        physicsWorld.addRigidBody(body);
        const chassisMesh = createChassisMesh(chassisWidth, chassisHeight, chassisLength);

        // Raycast Vehicle
        let engineForce = 0;
        let vehicleSteering = 0;
        let breakingForce = 0;
        const tuning = new Ammo.btVehicleTuning();
        const rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
        const vehicle = new Ammo.btRaycastVehicle(tuning, body, rayCaster);
        vehicle.setCoordinateSystem(0, 1, 2);
        physicsWorld.addAction(vehicle);

        // Wheels
        const FRONT_LEFT = 0;
        const FRONT_RIGHT = 1;
        const BACK_LEFT = 2;
        const BACK_RIGHT = 3;
        const wheelMeshes = [];
        const wheelDirectionCS0 = new Ammo.btVector3(0, -1, 0);
        const wheelAxleCS = new Ammo.btVector3(-1, 0, 0);

        function addWheel(isFront, pos, radius, width, index) {
            const wheelInfo = vehicle.addWheel(
                pos,
                wheelDirectionCS0,
                wheelAxleCS,
                suspensionRestLength,
                radius,
                tuning,
                isFront);

            wheelInfo.set_m_suspensionStiffness(suspensionStiffness);
            wheelInfo.set_m_wheelsDampingRelaxation(suspensionDamping);
            wheelInfo.set_m_wheelsDampingCompression(suspensionCompression);
            wheelInfo.set_m_frictionSlip(friction);
            wheelInfo.set_m_rollInfluence(rollInfluence);

            wheelMeshes[index] = createWheelMesh(radius, width);
        }

        addWheel(true, new Ammo.btVector3(wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition), wheelRadiusFront, wheelWidthFront, FRONT_LEFT);
        addWheel(true, new Ammo.btVector3(-wheelHalfTrackFront, wheelAxisHeightFront, wheelAxisFrontPosition), wheelRadiusFront, wheelWidthFront, FRONT_RIGHT);
        addWheel(false, new Ammo.btVector3(-wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack), wheelRadiusBack, wheelWidthBack, BACK_LEFT);
        addWheel(false, new Ammo.btVector3(wheelHalfTrackBack, wheelAxisHeightBack, wheelAxisPositionBack), wheelRadiusBack, wheelWidthBack, BACK_RIGHT);

        // Sync keyboard actions and physics and graphics
        function sync(dt) {
            const speed = vehicle.getCurrentSpeedKmHour();

            speedometer.innerHTML = (speed < 0 ? '(R) ' : '') + Math.abs(speed).toFixed(1) + ' km/h';

            breakingForce = 0;
            engineForce = 0;

            if (actions.acceleration) {
                if (speed < -1)
                    breakingForce = maxBreakingForce;
                else engineForce = maxEngineForce;
            }
            if (actions.braking) {
                if (speed > 1)
                    breakingForce = maxBreakingForce;
                else engineForce = -maxEngineForce / 2;
            }
            if (actions.left) {
                if (vehicleSteering < steeringClamp)
                    vehicleSteering += steeringIncrement;
            }
            else {
                if (actions.right) {
                    if (vehicleSteering > -steeringClamp)
                        vehicleSteering -= steeringIncrement;
                }
                else {
                    if (vehicleSteering < -steeringIncrement)
                        vehicleSteering += steeringIncrement;
                    else {
                        if (vehicleSteering > steeringIncrement)
                            vehicleSteering -= steeringIncrement;
                        else {
                            vehicleSteering = 0;
                        }
                    }
                }
            }

            vehicle.applyEngineForce(engineForce, BACK_LEFT);
            vehicle.applyEngineForce(engineForce, BACK_RIGHT);

            vehicle.setBrake(breakingForce / 2, FRONT_LEFT);
            vehicle.setBrake(breakingForce / 2, FRONT_RIGHT);
            vehicle.setBrake(breakingForce, BACK_LEFT);
            vehicle.setBrake(breakingForce, BACK_RIGHT);

            vehicle.setSteeringValue(vehicleSteering, FRONT_LEFT);
            vehicle.setSteeringValue(vehicleSteering, FRONT_RIGHT);

            let tm, p, q, i;
            const n = vehicle.getNumWheels();
            for (i = 0; i < n; i++) {
                vehicle.updateWheelTransform(i, true);
                tm = vehicle.getWheelTransformWS(i);
                p = tm.getOrigin();
                q = tm.getRotation();
                wheelMeshes[i].position.set(p.x(), p.y(), p.z());
                wheelMeshes[i].quaternion.set(q.x(), q.y(), q.z(), q.w());
            }

            tm = vehicle.getChassisWorldTransform();
            p = tm.getOrigin();
            q = tm.getRotation();
            chassisMesh.position.set(p.x(), p.y(), p.z());
            chassisMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
        }

        syncList.push(sync);
    }

    function generateHeight( width, depth, minHeight, maxHeight) {
        // Generates the height data (a sinus wave)
        const size = width * depth;
        const data = new Float32Array( size );

        const hRange = maxHeight - minHeight;
        const w2 = width / 2;
        const d2 = depth / 2;
        const phaseMult = 12;

        let p = 0;
        for ( let j = 0; j < depth; j ++ ) {
            for ( let i = 0; i < width; i ++ ) {
                const radius = Math.sqrt(
                    Math.pow( ( i - w2 ) / w2, 2.0 ) +
                    Math.pow( ( j - d2 ) / d2, 2.0 ) );

                const height = ( Math.sin( radius * phaseMult ) + 1 ) * 0.5  * hRange + minHeight;
                data[ p ] = height;
                p++;
            }
        }

        return data;
    }

    function createTerrainShape(heightData) {
        // This parameter is not really used, since we are using PHY_FLOAT height data type and hence it is ignored
        const heightScale = 1;

        // Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
        const upAxis = 1;

        // hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
        const hdt = "PHY_FLOAT";

        // Set this to your needs (inverts the triangles)
        const flipQuadEdges = false;

        // Creates height data buffer in Ammo heap
        ammoHeightData = Ammo._malloc( 4 * terrainWidth * terrainDepth );

        // Copy the javascript height data array to the Ammo one.
        let p = 0;
        let p2 = 0;
        for ( let j = 0; j < terrainDepth; j ++ ) {
            for ( let i = 0; i < terrainWidth; i ++ ) {
                // write 32-bit float data to memory
                Ammo.HEAPF32[ammoHeightData + p2 >> 2] = heightData[ p ];
                p ++;
                // 4 bytes/float
                p2 += 4;
            }
        }

        // Creates the heightfield physics shape
        const heightFieldShape = new Ammo.btHeightfieldTerrainShape(
            terrainWidth,
            terrainDepth,

            ammoHeightData,

            heightScale,
            terrainMinHeight,
            terrainMaxHeight,

            upAxis,
            hdt,
            flipQuadEdges
        );

        // Set horizontal scale
        const scaleX = terrainWidthExtents / ( terrainWidth - 1 );
        const scaleZ = terrainDepthExtents / ( terrainDepth - 1 );
        heightFieldShape.setLocalScaling( new Ammo.btVector3( scaleX, 1, scaleZ ) );

        heightFieldShape.setMargin( 0.05 );

        return heightFieldShape;
    }

    function createObjects() {
        // ground
        //createBox(new THREE.Vector3(0, -0.5, 0), ZERO_QUATERNION, 75, 1, 75, 0, 2);

        // ramp
        const quaternion = new THREE.Quaternion(0, 0, 0, 1);
        quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 18);
        createBox(new THREE.Vector3(0, -1.5, 0), quaternion, 8, 4, 10, 0);

        // box wall
        if (false) {
            const size = .75;
            const nw = 8;
            const nh = 6;
            for (let j = 0; j < nw; j++)
                for (let i = 0; i < nh; i++)
                    createBox(new THREE.Vector3(size * j - (size * (nw - 1)) / 2, size * i, 10), ZERO_QUATERNION, size, size, size, 10);
        }
        
        // car
        createVehicle(new THREE.Vector3(0, 4, -20), ZERO_QUATERNION);
    }

    // - Init -
    heightData = generateHeight(terrainWidth, terrainDepth, terrainMinHeight, terrainMaxHeight);
    initGraphics();
    initPhysics();
    createObjects();
    tick();
});
