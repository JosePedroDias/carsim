let materialInteractive = new THREE.MeshPhongMaterial({ color: 0x990000 });

function createVehicle(physicsWorld, scene, syncList, actions, pos, quat) {
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
    const chassisMesh = createChassisMesh(scene, chassisWidth, chassisHeight, chassisLength);

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

        wheelMeshes[index] = createWheelMesh(scene, radius, width);
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
        vehicleSteering = 0;

        /*if (actions.recover) {
            //TODO btRaycastVehicle btRigidBody btMotionState
            
            const rb = vehicle.getRigidBody();

            const ms = rb.getMotionState();
            const wt = new Ammo.btTransform();
            ms.getWorldTransform(wt);
            const orig = wt.getOrigin();

            // move closer to origin +6y
            const vec = new Ammo.btVector3( -orig.x(), 6 -orig.y(), -orig.z() );
            rb.setLinearVelocity(vec);
            
            // TODO rotate it
        } else {
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
        }*/

        const c = window.controller;
        if (c.active) {
            if (c.y < 0) {
                engineForce = maxEngineForce * -c.y;
                breakingForce = 0;
            } else {
                if (speed > 1) breakingForce = maxBreakingForce * c.y;
                else           engineForce = maxEngineForce * c.y * -0.5;
            }
            vehicleSteering = -c.x * steeringClamp;
            if (c.b1) {
                const rb = vehicle.getRigidBody();

                const ms = rb.getMotionState();
                const wt = new Ammo.btTransform();
                ms.getWorldTransform(wt);
                const orig = wt.getOrigin();
    
                // move closer to origin +6y
                const vec = new Ammo.btVector3( -orig.x(), 6 -orig.y(), -orig.z() );
                rb.setLinearVelocity(vec);
                
                // TODO rotate it
            }
        }

        // rear wheel drive
        vehicle.applyEngineForce(engineForce, BACK_LEFT);
        vehicle.applyEngineForce(engineForce, BACK_RIGHT);

        // all wheels brake
        vehicle.setBrake(breakingForce / 2, FRONT_LEFT);
        vehicle.setBrake(breakingForce / 2, FRONT_RIGHT);
        vehicle.setBrake(breakingForce, BACK_LEFT);
        vehicle.setBrake(breakingForce, BACK_RIGHT);

        // front wheels steer
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

function createWheelMesh(scene, radius, width) {
    const t = new THREE.CylinderGeometry(radius, radius, width, 24, 1);
    t.rotateZ(Math.PI / 2);
    const mesh = new THREE.Mesh(t, materialInteractive);
    mesh.add(new THREE.Mesh(new THREE.BoxGeometry(width * 1.5, radius * 1.75, radius * .25, 1, 1, 1), materialInteractive));
    mesh.castShadow = true;
    //mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}

function createChassisMesh(scene, w, l, h) {
    const shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
    const mesh = new THREE.Mesh(shape, materialInteractive);
    mesh.castShadow = true;
    //mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
}
