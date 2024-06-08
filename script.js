// W programie/ skrypcie:
// - wspierane jest poruszenie sie przy pomocy strzalek
// - rysowane jest dwuelementowe tlo dla lepszej orientacji w terenie
// - modele moga byc rysowane w wielu miejscach
// - modele obracaja sie
// - modele sa w prosty sposob oswietlane

const vertexShaderTxt = `
precision mediump float;

uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProjection;

attribute vec3 vertPosition;
attribute vec2 textureCoord;
attribute vec3 vertNormal;

varying vec2 fragTextureCoord;
varying vec3 fragNormal;

void main() {
    fragTextureCoord = textureCoord;
    fragNormal = (mWorld * vec4(vertNormal, 0.0)).xyz;
    gl_Position = mProjection * mView * mWorld * vec4(vertPosition, 1.0);
}
` // normalne wskazuja kierunki i dlatego jest 0.0, wektory wskaujace na kierunek dodaje sie ostatni komponent 0 poniewaz jak sie przemnozy wtedy przez cos to zostaje taki sam i one sa tez znormalizowane
const fragmentShaderTxt = `
precision mediump float;

varying vec2 fragTextureCoord;
varying vec3 fragNormal;

uniform vec3 ambientLight;
uniform vec3 lightDirection;
uniform vec3 lightColor;

uniform sampler2D sampler;

void main() {
    vec3 normFragNormal = normalize(fragNormal);
    vec3 normLightDirection = normalize(lightDirection);
    
    vec3 light = ambientLight + lightColor * max(dot(normFragNormal, normLightDirection), 0.0);
    
    vec4 tx = texture2D(sampler, fragTextureCoord);
    gl_FragColor = vec4(tx.rgb * light, tx.a);
}
`


const mat4 = glMatrix.mat4;

function startDraw() {
    OBJ.downloadMeshes({
        'sphere': 't4.obj'
    }, Triangle);
}

const Triangle = function(meshes) {
    const canvas = document.getElementById('main-canvas');
    const gl = canvas.getContext('webgl');
    let canvasColor = [0.2, 0.7, 0.5, 1.0];
    const lowerHalfColor = [0.2, 0.2, 0.7, 1.0];

    checkGl(gl);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vertexShaderTxt);
    gl.shaderSource(fragmentShader, fragmentShaderTxt);

    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);

    gl.validateProgram(program);

    OBJ.initMeshBuffers(gl, meshes.sphere);

    gl.bindBuffer(gl.ARRAY_BUFFER, meshes.sphere.vertexBuffer);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshes.sphere.indexBuffer);

    const posAttrLoc = gl.getAttribLocation(program, 'vertPosition');
    gl.vertexAttribPointer(
        posAttrLoc,
        meshes.sphere.vertexBuffer.itemSize,
        gl.FLOAT,
        gl.FALSE,
        0,
        0
    );

    gl.enableVertexAttribArray(posAttrLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, meshes.sphere.normalBuffer);

    const normalAttrLoc = gl.getAttribLocation(program, 'vertNormal');
    gl.vertexAttribPointer(
        normalAttrLoc,
        meshes.sphere.normalBuffer.itemSize,
        gl.FLOAT,
        gl.TRUE, // czy jest normalizowany - tutaj tak
        0,
        0
    );

    gl.enableVertexAttribArray(normalAttrLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, meshes.sphere.textureBuffer);

    const textureAttrLoc = gl.getAttribLocation(program, 'textureCoord');
    gl.vertexAttribPointer(
        textureAttrLoc,
        meshes.sphere.textureBuffer.itemSize,
        gl.FLOAT,
        gl.FALSE,
        0,
        0
    );

    gl.enableVertexAttribArray(textureAttrLoc);

    const img = document.getElementById('img');
    const boxTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, boxTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0, // level of detail
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        img
    );
    gl.bindTexture(gl.TEXTURE_2D, null);

    // render time

    gl.useProgram(program);

    const worldMatLoc = gl.getUniformLocation(program, 'mWorld');
    const viewMatLoc = gl.getUniformLocation(program, 'mView');
    const projMatLoc = gl.getUniformLocation(program, 'mProjection');

    const worldMatrix = mat4.create();

    const viewMatrix = mat4.create();
    let cameraPosition = [0, 0, -8];
    let cameraTarget = [0, 0, 0];
    let cameraUp = [0, 1, 0];
    let cameraRotation = [0, 0, 0];

    mat4.lookAt(viewMatrix, cameraPosition, cameraTarget, cameraUp);
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, glMatrix.glMatrix.toRadian(90), canvas.width / canvas.height, 0.1, 1000.0);

    gl.uniformMatrix4fv(worldMatLoc, gl.FALSE, worldMatrix);
    gl.uniformMatrix4fv(viewMatLoc, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(projMatLoc, gl.FALSE, projectionMatrix);

    let ambientUniformLoc = gl.getUniformLocation(program, "ambientLight");
    let lightDirectionUniformLoc = gl.getUniformLocation(program, "lightDirection");
    let lightColorUniformLoc = gl.getUniformLocation(program, "lightColor");
    let ambientLight = [0.2, 0.2, 0.2];
    let lightDirection = [1.0, 2.0, -2.0];
    let lightColor = [0.9, 0.9, 0.9];
    gl.uniform3f(ambientUniformLoc, ...ambientLight);
    gl.uniform3f(lightDirectionUniformLoc, ...lightDirection);
    gl.uniform3f(lightColorUniformLoc, ...lightColor);

    const identityMat = mat4.create();

    window.addEventListener(
        "keydown",
        (event) => {
            if (event.defaultPrevented) {
                return;
            }
            switch (event.code) {
                case "ArrowDown":
                    cameraPosition[0] -= (cameraTarget[0] - cameraPosition[0]) * 0.1;
                    cameraPosition[2] -= (cameraTarget[2] - cameraPosition[2]) * 0.1;
                    break;
                case "ArrowUp":
                    cameraPosition[0] += (cameraTarget[0] - cameraPosition[0]) * 0.1;
                    cameraPosition[2] += (cameraTarget[2] - cameraPosition[2]) * 0.1;
                    break;
                case "ArrowLeft":
                    cameraRotation[1] += 0.01;
                    break;
                case "ArrowRight":
                    cameraRotation[1] -= 0.01;
                    break;
            }
            updateCamera();
        },
        true,
    );

    function updateCamera() {
        cameraTarget[0] = cameraPosition[0] + Math.sin(cameraRotation[1]);
        cameraTarget[2] = cameraPosition[2] + Math.cos(cameraRotation[1]);
        mat4.lookAt(viewMatrix, cameraPosition, cameraTarget, cameraUp);
        gl.uniformMatrix4fv(viewMatLoc, gl.FALSE, viewMatrix);
    }

    positions = [];
    positions.push([2, 0, 0]);
    positions.push([-2, 0, 0]);
    positions.push([0, 2, 0]);
    positions.push([0, -2, 0]);

    const loop = function() {
        gl.clearColor(...canvasColor);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.CLEAR_DEPTH_BUFFER_BIT);
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(0, canvas.height / 2, canvas.width, canvas.height / 2); // set the scissor rectangle to the lower half
        gl.clearColor(...lowerHalfColor);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.disable(gl.SCISSOR_TEST);

        angle = performance.now() / 1000 / 60 * 23 * Math.PI;

        for (const onePosition of positions) {
            mat4.translate(worldMatrix, identityMat, onePosition);
            mat4.rotate(worldMatrix, worldMatrix, angle, [0, 1, -0.5]);

            gl.uniformMatrix4fv(worldMatLoc, gl.FALSE, worldMatrix);

            gl.bindTexture(gl.TEXTURE_2D, boxTexture);
            gl.activeTexture(gl.TEXTURE0);
            gl.drawElements(gl.TRIANGLES, meshes.sphere.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        }
        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

function checkGl(gl) {
    if (!gl) {
        console.log('WebGL not supported, use another browser');
    }
}

function checkShaderCompile(gl, shader) {
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('shader not compiled', gl.getShaderInfoLog(shader));
    }
}

function checkLink(gl, program) {
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('ERROR linking program!', gl.getProgramInfoLog(program));
    }
}