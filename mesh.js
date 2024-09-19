// Step 1: Create PixiJS application
const app = new PIXI.Application({
    width: 512,
    height: 512,
    backgroundColor: 0x000000,
});
document.body.appendChild(app.view);


// Step 2: Create PixiJS Mesh and custom filter
const vertexShader = `
attribute vec2 aVertexPosition;
attribute vec2 aUvs;
varying vec2 vUvs;

    uniform mat3 translationMatrix;
    uniform mat3 projectionMatrix;
void main(void) {
    vUvs = aUvs;
        gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
}
`;


// Step 3: Implement GLSL fragment shader for ray casting
const fragmentShader = `
precision mediump float;
uniform sampler2D uLightmap;
uniform vec2 uResolution;
uniform vec2 uLightPos;
uniform float uTransmit;
uniform int uMaxSteps;

varying vec2 vUvs;

void main(void) {
    vec2 lightPos = uLightPos / uResolution; // Position of the light source (normalized to [0,1])
    vec2 fragPos = vUvs;            // Current fragment position

    vec2 direction = normalize(fragPos - lightPos); // Light direction
    vec2 step = direction / float(uMaxSteps);       // Light step

    vec4 light = vec4(1.0);  // Initial light intensity
    vec2 currentPos = lightPos;

    // Use a constant as the maximum step limit
    const int maxSteps = 1024;  // Set maximum step to constant

    // Loop accumulates the intensity of light
    for (int i = 0; i < maxSteps; i++) {
        if (i >= uMaxSteps) break;  // Exit the loop with uniform variable inside the loop

        vec4 currentSample = texture2D(uLightmap, currentPos);
        light.rgb *= (currentSample.a * currentSample.rgb) + (1.0 - currentSample.a) * uTransmit;

        if (length(currentPos - fragPos) <= 0.001 || light.r + light.g + light.b <= 0.001) {
            break;  // Light reaches fragment position or light intensity decays to near 0
        }

        currentPos += step;
    }

    // case 1 - normal color
    // gl_FragColor = 0.9 * light + 0.1 * texture2D(uLightmap, fragPos);  // Render environmental light
    
    // case 2 - reversed black white, set the texture color to white at the same time
    gl_FragColor = 0.9 * light + 0.1 * vec4(1.0);  // Set texture color to white
}
`;


// Step 4: Load black and white texture map (as a reference texture for lighting)
const texture = PIXI.Texture.from('./bg.png');

const meshMaterial = PIXI.Shader.from(vertexShader, fragmentShader, {
    uLightmap: texture,
    uResolution: [app.screen.width, app.screen.height],
    uLightPos: [0, 0], // Light emits from the center of the texture
    uTransmit: 0.99,   // Light transmission coefficient
    uMaxSteps: 512,    // Maximum step number
});

// Create a full-screen Mesh and apply custom material
const geometry = new PIXI.Geometry()
    .addAttribute(
        'aVertexPosition', // the attribute name
        [
            0, 0,    // x, y
            512, 0,  // x, y
            512, 512,
            0, 512,
        ], // x, y
        2,
    ) // the size of the attribute
    .addAttribute(
        'aUvs', // the attribute name
        [
            0,
            0, // u, v
            1,
            0, // u, v
            1,
            1,
            0,
            1,
        ], // u, v
        2,
    ) // the size of the attribute
    .addIndex([0, 1, 2, 0, 2, 3])
    .interleave();

const mesh = new PIXI.Mesh(geometry, meshMaterial);
app.stage.addChild(mesh);

// Step 5: Update the position of the light source (e.g. via mouse position)
window.addEventListener('pointermove', (event) => {
    meshMaterial.uniforms.uLightPos = [event.clientX, event.clientY];
});