interface Three {
    Quaternion: any;
    Clock: any;
    Scene: any;
    PerspectiveCamera: any;
    Vector3: any;
    OrbitControls: any;
    WebGLRenderer: any;
    AmbientLight: any;
    DirectionalLight: any;
    MeshPhongMaterial: any;
    BoxGeometry: any;
    Mesh: any;
    CylinderGeometry: any;
}
const THREE:Three;

interface Detector_ {
    webgl: any;
    addGetWebGLMessage();
}
const Detector:Detector_;

class Stats {
    constructor();
    domElement:HTMLElement;
}
// const Stats:Stats_;

interface Ammo_ {
    btTransform: any;
    btDefaultCollisionConfiguration: any;
    btCollisionDispatcher: any;
    btDbvtBroadphase: any;
    btSequentialImpulseConstraintSolver: any;
    btDiscreteDynamicsWorld: any;
    btVector3: any;
    btBoxShape: any;
    btQuaternion: any;
    btDefaultMotionState: any;
    btRigidBodyConstructionInfo: any;
    btRigidBody: any;
    btVehicleTuning: any;
    btDefaultVehicleRaycaster: any;
    btRaycastVehicle: any;
}

const Ammo:() => Promise<Ammo_>;
