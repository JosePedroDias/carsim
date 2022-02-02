
        /*
        const raycaster = new THREE.Raycaster();
        const mouseCoords = new THREE.Vector2()
        const pos = new THREE.Vector3();

        function createBall(pos){
            const radius = 0.6;
            const quat = { x: 0, y: 0, z: 0, w: 1 };
            const mass = 50;

            //threeJS Section
            let ball = new THREE.Mesh(new THREE.SphereBufferGeometry(radius), new THREE.MeshPhongMaterial({color: 0x05ff1e}));
            ball.position.set(pos.x, pos.y, pos.z);
            ball.castShadow = true;
            ball.receiveShadow = true;
            scene.add(ball);

            //Ammojs Section
            const transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin( new Ammo.btVector3(pos.x, pos.y, pos.z) );
            transform.setRotation( new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w) );
            const motionState = new Ammo.btDefaultMotionState(transform);

            const colShape = new Ammo.btSphereShape(radius);
            colShape.setMargin(0.05);

            const localInertia = new Ammo.btVector3(0, 0, 0);
            colShape.calculateLocalInertia(mass, localInertia);

            const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
            const body = new Ammo.btRigidBody(rbInfo);

            body.setFriction(4);
            body.setRollingFriction(10);

            body.setActivationState(DISABLE_DEACTIVATION);

            physicsWorld.addRigidBody(body);
            dynamicObjects.push(ball);
            
            ball.userData.physicsBody = body;
            ball.userData.tag = 'ball';
            
            return ball;
        }

        window.addEventListener('mousedown', (event) =>{
            mouseCoords.set( (event.clientX / window.innerWidth) * 2 -1, -(event.clientY / window.innerHeight ) * 2 + 1);
            raycaster.setFromCamera(mouseCoords, camera);

            // Create a ball 
            pos.copy(raycaster.ray.direction);
            pos.add(raycaster.ray.origin);
            const ball = createBall(pos);
            
            //shoot out the ball
            let ballBody = ball.userData.physicsBody;
            pos.copy(raycaster.ray.direction);
            pos.multiplyScalar(40);
            ballBody.setLinearVelocity( new Ammo.btVector3(pos.x, pos.y, pos.z) );
        });
        */