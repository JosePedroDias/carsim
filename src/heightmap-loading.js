// @ts-check

function sinusHeightmap(width, depth, minHeight, maxHeight) {
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
}

function readHeightmap(width, depth, minHeight, maxHeight, textureUrl) {
    return new Promise(resolve => {
        const img = new Image();
        img.src = textureUrl;
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