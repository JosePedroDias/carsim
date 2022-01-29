// @ts-check

const DISABLE_DEACTIVATION = 4;

function createTerrainShape(Ammo, terrainWidthExtents, terrainDepthExtents, terrainWidth, terrainDepth, terrainMinHeight, terrainMaxHeight, heightData) {
    // This parameter is not really used, since we are using PHY_FLOAT height data type and hence it is ignored
    const heightScale = 1;

    // Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
    const upAxis = 1;

    // hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
    const hdt = "PHY_FLOAT";

    // Set this to your needs (inverts the triangles)
    const flipQuadEdges = false;

    // Creates height data buffer in Ammo heap
    const ammoHeightData = Ammo._malloc(4 * terrainWidth * terrainDepth);

    // Copy the javascript height data array to the Ammo one.
    let p = 0;
    let p2 = 0;
    for (let j = 0; j < terrainDepth; j++) {
        for (let i = 0; i < terrainWidth; i++) {
            // write 32-bit float data to memory
            Ammo.HEAPF32[ammoHeightData + p2 >> 2] = heightData[p];
            p++;
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
    const scaleX = terrainWidthExtents / (terrainWidth - 1);
    const scaleZ = terrainDepthExtents / (terrainDepth - 1);
    heightFieldShape.setLocalScaling(new Ammo.btVector3(scaleX, 1, scaleZ));

    heightFieldShape.setMargin(0.05);

    return heightFieldShape;
}

/* function sinusHeightmap(width, depth, minHeight, maxHeight) {
    return new Promise(resolve => {
        // Generates the height data (a sinus wave)
        const size = width * depth;
        const data = new Float32Array(size);

        const hRange = maxHeight - minHeight;
        const w2 = width / 2;
        const d2 = depth / 2;
        const phaseMult = 12;

        let p = 0;
        for (let j = 0; j < depth; ++j) {
            for (let i = 0; i < width; ++i) {
                const radius = Math.sqrt(
                    Math.pow((i - w2) / w2, 2.0) +
                    Math.pow((j - d2) / d2, 2.0)
                );
                data[p++] = (Math.sin(radius * phaseMult) + 1) * 0.5 * hRange + minHeight;
            }
        }

        resolve(data);
    });
}

function simplexHeightmap(width, depth, minHeight, maxHeight) {
    return new Promise(resolve => {
        // Generates the height data (a sinus wave)
        const size = width * depth;
        const data = new Float32Array(size);

        const hRange = maxHeight - minHeight;
        const w2 = width / 2;
        const d2 = depth / 2;
        const phaseMult = 12;

        let p = 0;
        const s = 2.5;
        for (let j = 0; j < depth; ++j) {
            for (let i = 0; i < width; ++i) {
                const v = noise.simplex2(s*i/width, s*j/depth);
                data[p++] = v * 0.5 * hRange + minHeight;
            }
        }

        resolve(data);
    });
} */

function readHeightmap(width, depth, minHeight, maxHeight, heightmapUrl) {
    return new Promise(resolve => {
        const img = new Image();
        img.src = heightmapUrl;
        img.addEventListener('load', () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const size = width * depth;
            const data = new Float32Array(size);
            const hRange = maxHeight - minHeight;

            const id = ctx.getImageData(0, 0, img.width, img.height).data;

            let p = 0;
            for (let z = 0; z < depth; ++z) {
                for (let x = 0; x < width; ++x) {
                    const px = Math.round(x / width * img.width);
                    const py = Math.round(z / depth * img.height);
                    const i = (px + py * img.width) * 4;
                    const v = id[i];// + id[i+1] + id[i+2];
                    data[p++] = minHeight + hRange * (v / 255);
                }
            }

            resolve(data);
        });
    });
}

function createTerrainMesh(scene, terrainWidthExtents, terrainDepthExtents, terrainWidth, terrainDepth, heightData, textureUrl, repeat) {
    const geometry = new THREE.PlaneBufferGeometry(terrainWidthExtents, terrainDepthExtents, terrainWidth - 1, terrainDepth - 1);
        geometry.rotateX(- Math.PI / 2);

        const vertices = geometry.attributes.position.array;
        for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
            // j + 1 because it is the y component that we modify
            vertices[j + 1] = heightData[i];
        }
        geometry.computeVertexNormals();

        const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xC7C7C7 });
        const terrainMesh = new THREE.Mesh(geometry, groundMaterial);
        //terrainMesh.castShadow = true;
        terrainMesh.receiveShadow = true;
        scene.add(terrainMesh);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(`./textures/${textureUrl}`, (texture) => {
            if (repeat) {
                // @ts-ignore
                texture.wrapS = THREE.RepeatWrapping;
                // @ts-ignore
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(terrainWidth - 1, terrainDepth - 1);
            }
            groundMaterial.map = texture;
            groundMaterial.needsUpdate = true;
        });
}
