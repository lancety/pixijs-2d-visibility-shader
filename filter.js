// Step 1: Create PixiJS application
const app = new PIXI.Application({
    width: 800,
    height: 600,
    backgroundColor: 0x000000,
});
document.body.appendChild(app.view);

// Step 2: Implement the GLSL fragment shader for light casting
const fragmentShader = `
precision mediump float;
uniform sampler2D uLightmap;
uniform vec2 uResolution;
uniform vec2 uLightPos;
uniform float uTransmit;
uniform int uMaxSteps;

varying vec2 vTextureCoord;

void main(void) {
    vec2 lightPos = uLightPos / uResolution; // Light position (normalized to [0,1])
    vec2 fragPos = vTextureCoord;           // Current fragment position

    vec2 direction = normalize(fragPos - lightPos); // Direction of light
    vec2 step = direction / float(uMaxSteps);  // Light steps

    vec4 light = vec4(1.0);  // Initial light intensity
    vec2 currentPos = lightPos;

    // Use a constant as the maximum step limit
    const int maxSteps = 512;  // Set the maximum step count as constant

    // Loop to accumulate light intensity
    for (int i = 0; i < maxSteps; i++) {
        if (i >= uMaxSteps) break;  // Exit loop with uniform variable inside the loop

        vec4 currentSample = texture2D(uLightmap, currentPos);
        light.rgb *= (currentSample.a * currentSample.rgb) + (1.0 - currentSample.a) * uTransmit;

        if (length(currentPos - fragPos) <= 0.001 || light.r + light.g + light.b <= 0.001) {
            break;  // Light reaches the fragment position or light intensity decays to near 0
        }

        currentPos += step;
    }

    // case 1 - normal color
    // gl_FragColor = 0.9 * light + 0.1 * texture2D(uLightmap, fragPos);  // Render ambient light

    // case 2 - reverted black white, and set texture color to white
    gl_FragColor = 0.9 * light + 0.1 * vec4(1.0);  // Set texture color to white
}
`;

// Step 3: Load B&W texture as reference for light source
const texture = PIXI.Texture.from('./bg.png');

// Create a sprite to demonstrate the texture
const lightmapSprite = new PIXI.Sprite(texture);
lightmapSprite.width = app.screen.width;
lightmapSprite.height = app.screen.height;
app.stage.addChild(lightmapSprite);


// Step 4: Create PixiJS filter and pass uniform variable
const raycastingFilter = new PIXI.Filter(null, fragmentShader, {
    uLightmap: texture,
    uResolution: [app.screen.width, app.screen.height],
    uLightPos: [app.screen.width / 2, app.screen.height / 2], // Light emitted from texture center
    uTransmit: 0.99,   // Light transmission coefficient
    uMaxSteps: 512,    // Maximum step count
});

// Step 5: Apply the filter to the scene
lightmapSprite.filters = [raycastingFilter];

// Step 6: Update light source position (e.g. via mouse position)
app.stage.interactive = true;
app.stage.on('pointermove', (event) => {
    const mousePos = event.data.global;
    raycastingFilter.uniforms.uLightPos = [mousePos.x, mousePos.y];
});