// @ts-check

const materialDynamic = new THREE.MeshPhongMaterial({ color: 0xfca400 });
const materialStatic = new THREE.MeshPhongMaterial({ color: 0x999999 });

const ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);
let transformAux;

function createBox(physicsWorld, scene, syncList, pos, quat, w, l, h, mass, friction, receiveShadow) {
    if (!transformAux) {
        transformAux = new Ammo.btTransform();
    }

    const material = mass > 0 ? materialDynamic : materialStatic;
    const shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
    const geometry = new Ammo.btBoxShape(new Ammo.btVector3(w * 0.5, l * 0.5, h * 0.5));

    if (!mass) mass = 0;
    if (!friction) friction = 1;

    const mesh = new THREE.Mesh(shape, material);
    mesh.castShadow = true;
    if (receiveShadow) mesh.receiveShadow = true;
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
                ms.getWorldTransform(transformAux);
                const p = transformAux.getOrigin();
                const q = transformAux.getRotation();
                mesh.position.set(p.x(), p.y(), p.z());
                mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
            }
        }

        syncList.push(sync);
    }
}

function createBoxWall(physicsWorld, scene, syncList) {
    const size = .75;
    const nw = 8;
    const nh = 6;
    for (let j = 0; j < nw; j++)
        for (let i = 0; i < nh; i++)
            createBox(physicsWorld, scene, syncList, new THREE.Vector3(size * j - (size * (nw - 1)) / 2, size * i, 10), ZERO_QUATERNION, size, size, size, 10);
}

function generateObject(physicsWorld, scene, dynamicObjects, terrainWidth, terrainDepth, terrainMaxHeight) {
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
