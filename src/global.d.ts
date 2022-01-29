interface Three {
    CameraHelper: any;
    SpotLight: any;
    PCFSoftShadowMap: any;
    SphereGeometry: any;
    PlaneBufferGeometry: any;
    TextureLoader: any;
    RepeatWrapping: any;
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

class Stats {
    constructor();
    domElement:HTMLElement;
}

interface Ammo_ {
    btSphereShape: any;
    btCylinderShape: any;
    btConeShape: any;
    _malloc(arg0: number): any;
    HEAPF32: any;
    btHeightfieldTerrainShape: any;
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

interface Window {
    controller: {
        active: boolean,
        x: number,
        y: number,
        b1: boolean,
        b2: boolean
    }
}

const Ammo:() => Promise<Ammo_>;
