const materialInteractive = new THREE.MeshPhongMaterial({ color: 0x990000 });

const v = {
    chassis: {
        width: 1.8,
        height: 0.8,
        length: 3.6,
    },
    frontWheels: {
        axisPosition: 1.5,
        axisHeight: 0.2,
        radius: 0.45,
        width: 0.3,
        halfTrack: -0.9
    },
    backWheels: {
        axisPosition: -1,
        axisHeight: 0.2-0.1,
        radius: 0.45,
        width: 0.3,
        halfTrack: -0.9
    },
    suspension: {
        stiffness: 20.0,
        damping: 2.3,
        compression: 4.4,
        restLength: 0.6,
    },
    braking: {
        front: 1,
        back: 0.75
    },
    drive: {
        front: 1,
        back: 1
    },
    massVehicle: 1000,
    friction: 1000,
    rollInfluence: 0.1,
    steeringClamp: 0.5,
    maxEngineForce: 3000,
    maxBreakingForce: 120
};

function createVehicle(physicsWorld, scene, syncList, pos, quat) {
    // Vehicle constants

    const { chassis, frontWheels, backWheels, suspension, massVehicle, friction, braking, drive, rollInfluence, steeringClamp, maxEngineForce, maxBreakingForce } = v;

    // Chassis
    const geometry = new Ammo.btBoxShape(new Ammo.btVector3(chassis.width * 0.5, chassis.height * 0.5, chassis.length * 0.5));
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
    const chassisMesh = createChassisMesh(scene, chassis.width, chassis.height, chassis.length);

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
            suspension.restLength,
            radius,
            tuning,
            isFront);

        wheelInfo.set_m_suspensionStiffness(suspension.stiffness);
        wheelInfo.set_m_wheelsDampingRelaxation(suspension.damping);
        wheelInfo.set_m_wheelsDampingCompression(suspension.compression);
        wheelInfo.set_m_frictionSlip(friction);
        wheelInfo.set_m_rollInfluence(rollInfluence);

        wheelMeshes[index] = createWheelMesh(scene, radius, width);
    }

    addWheel(true,  new Ammo.btVector3( frontWheels.halfTrack, frontWheels.axisHeight, frontWheels.axisPosition), frontWheels.radius, frontWheels.width, FRONT_LEFT);
    addWheel(true,  new Ammo.btVector3(-frontWheels.halfTrack, frontWheels.axisHeight, frontWheels.axisPosition), frontWheels.radius, frontWheels.width, FRONT_RIGHT);
    addWheel(false, new Ammo.btVector3( -backWheels.halfTrack,  backWheels.axisHeight,  backWheels.axisPosition),  backWheels.radius,  backWheels.width, BACK_LEFT);
    addWheel(false, new Ammo.btVector3(  backWheels.halfTrack,  backWheels.axisHeight,  backWheels.axisPosition),  backWheels.radius,  backWheels.width, BACK_RIGHT);

    // Sync keyboard actions and physics and graphics
    function sync(dt) {
        const speed = vehicle.getCurrentSpeedKmHour();

        speedometer.innerHTML = (speed < 0 ? '(R) ' : '') + Math.abs(speed).toFixed(1) + ' km/h';

        breakingForce = 0;
        engineForce = 0;
        vehicleSteering = 0;

        const c = window.controller;

        const cuC = window.cuC;
        cuC.steer(c.x);
        cuC.accel(c.y < 0 ? -c.y : -c.y*0.5);
        cuC.brake(speed > 1 ? c.y : 0);
        cuC.b1(c.b1);

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

        // wheel drive
        drive.front && vehicle.applyEngineForce(engineForce * drive.front, FRONT_LEFT);
        drive.front && vehicle.applyEngineForce(engineForce * drive.front, FRONT_RIGHT);
        drive.back  && vehicle.applyEngineForce(engineForce * drive.back,  BACK_LEFT);
        drive.back  && vehicle.applyEngineForce(engineForce * drive.back,  BACK_RIGHT);

        // wheel brake
        braking.front && vehicle.setBrake(breakingForce * braking.front, FRONT_LEFT);
        braking.front && vehicle.setBrake(breakingForce * braking.front, FRONT_RIGHT);
        braking.back  && vehicle.setBrake(breakingForce * braking.back,  BACK_LEFT);
        braking.back  && vehicle.setBrake(breakingForce * braking.back,  BACK_RIGHT);

        // wheel steering
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

    return chassisMesh;
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
