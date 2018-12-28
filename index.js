
const canvas = document.getElementById("canvas");
const camera = new THREE.PerspectiveCamera(75, canvas.width/canvas.height, 0.001, 1000);
camera.position.set(0, 0, 1.5);
camera.up.set(0, 0, 1); // important for OrbitControls

const renderer = new THREE.WebGLRenderer({
    // alpha: true,
    canvas: canvas,
});

const controls = new THREE.OrbitControls(camera, renderer.domElement);

// https://stackoverflow.com/questions/29884485/threejs-canvas-size-based-on-container
const resizeCanvasToDisplaySize = (force=false) => {
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;

    // adjust displayBuffer size to match
    if (force || canvas.width != width || canvas.height != height) {
        // you must pass false here or three.js sadly fights the browser
        // console.log "resizing: #{canvas.width} #{canvas.height} -> #{width} #{height}"
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
};
resizeCanvasToDisplaySize(true); // first time

// object stuff --------
const scene = new THREE.Scene();
const walls = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxBufferGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({color: 0xcccccc}));
walls.position.set(0, 0, 0);
scene.add(walls);
scene.add(new THREE.AxesHelper(1));

// render stuff --------
const stats = new Stats();
stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);
const render = () => {
    stats.update();
    resizeCanvasToDisplaySize();
    renderer.render(scene, camera);
};


// main --------
render(); // first time
controls.addEventListener('change', render);

const fetchTile = (uri, cb) => {
    getPixels(uri, (err, pixels) => {
        if (err) {
            console.log("Bad image uri:", uri);
            cb(null);
            return;
        }
        console.log("got pixels", pixels.shape.slice());
        cb(pixels);
    });
};

const pixelsToMesh = (pixels, pos=[0,0,0], rot=[0,0,0], scale=[1,1,1]) => {
    const positions = [];
    const colors = [];

    // positions.push(0,0,0,  0.5,0,0,  0,0.5,0);
    // colors.push(0,255,0,100,  0,255,0,100,  0,255,0,100);
    //----
    let x = 0, y = pixels.shape[1] - 1, z = 0;
    for (let e = 0; e < pixels.data.length; e += 4) {
        let [r, g, b, a] = [pixels.data[e], pixels.data[e+1], pixels.data[e+2], pixels.data[e+3]];
        colors.push(r,g,b,a,  r,g,b,a,  r,g,b,a);

        z = (r + g + b) / (255*3) * 0.01; // "normalized" intensity x maxThickness
        positions.push(x/1000,y/1000,z,  x/1000+0.001,y/1000,z,  x/1000,y/1000+0.001,z);
        x++;
        if (x === pixels.shape[0]) { // wrap
            x = 0;
            y--;
        }
    }

    // console.log('positions:', positions);
    // console.log('colors:', colors);

    const colorAttribute = new THREE.Uint8BufferAttribute(colors, 4);
    colorAttribute.normalized = true; // map to 0.0f - +1.0f in the shader
    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position',
        new THREE.Float32BufferAttribute(positions, 3));
    geometry.addAttribute('color', colorAttribute);

    const vs = `
        precision mediump float;
        precision mediump int;
        uniform mat4 modelViewMatrix; // optional
        uniform mat4 projectionMatrix; // optional
        attribute vec3 position;
        attribute vec4 color;
        varying vec3 vPosition;
        varying vec4 vColor;
        void main()	{
            vPosition = position;
            vColor = color;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `;
    const fs = `
        precision mediump float;
        precision mediump int;
        uniform float time;
        varying vec3 vPosition;
        varying vec4 vColor;
        void main()	{
            vec4 color = vec4( vColor );
            //color.r += sin( vPosition.x * 10.0 + time ) * 0.5;
            gl_FragColor = color;
        }
    `;
    const uni = {
        time: { value: 1.0 },
    };
    const material = new THREE.RawShaderMaterial({
        uniforms: uni,
        vertexShader: vs,
        fragmentShader: fs,
        side: THREE.DoubleSide,
        transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.geometry.scale(...scale);

    return {
        mesh: mesh,
        uniforms: uni,
    };
};

const [w, s, e, n] = [
    [Math.PI/2,Math.PI/2,0],
    [Math.PI/2,Math.PI,0],
    [Math.PI/2,-Math.PI/2,0],
    [Math.PI/2,0,0],
];
const data = [
    // credits -- https://www.spacex.com/media
    ['./img/dragon.png',],
    ['./img/dragon.png', [-2,3,-1], n, [8,8,8]],
    ['./img/dragon.png', [3,0,-1], e, [8,8,8]],
    // credits -- https://github.com/twitter/twemoji
    ['./img/1f680.png', [0,1,0], n, [8,8,8]],
    ['./img/1f681.png', [0,-1,0], s, [8,8,8]],
    ['./img/1f682.png', [1,0,0], e, [8,8,8]],
    ['./img/1f683.png', [-1,0,0], w, [8,8,8]],
    //--
    ['./img/1f684.png', [0,2,0], n, [8,8,8]],
    ['./img/1f685.png', [0,-2,0], s, [8,8,8]],
    ['./img/1f686.png', [2,0,0], e, [8,8,8]],
    ['./img/1f687.png', [-2,0,0], w, [8,8,8]],
    //--
    ['./img/1f688.png', [0,1,1], n, [8,8,8]],
    ['./img/1f689.png', [0,-1,1], s, [8,8,8]],
    ['./img/1f68a.png', [1,0,1], e, [8,8,8]],
    ['./img/1f68b.png', [-1,0,1], w, [8,8,8]],
    //--
    ['./img/1f68c.png', [0,2,1], n, [8,8,8]],
    ['./img/1f68d.png', [0,-2,1], s, [8,8,8]],
    ['./img/1f68e.png', [2,0,1], e, [8,8,8]],
    ['./img/1f68f.png', [-2,0,1], w, [8,8,8]],
];

data.forEach(([uri, pos, rot, scale]) => {
    fetchTile(uri, (pixels) => {
        if (pixels) {
            scene.add(pixelsToMesh(pixels, pos, rot, scale).mesh);
            render();
        } else {
            console.log('fetch failed!!');
        }
    });
});
