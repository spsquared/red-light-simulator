// Copyright (C) 2024 Sampleprovider(sp)

const canvasContainer = document.getElementById('canvasContainer');
const canvas = document.getElementById('canvas');
const NO_OFFSCREENCANVAS = typeof OffscreenCanvas == 'undefined';
function createCanvas() {
    if (NO_OFFSCREENCANVAS) {
        const canvas = document.createElement('canvas');
        canvas.width = canvasResolution;
        canvas.height = canvasResolution;
        return canvas;
    } else {
        return new OffscreenCanvas(canvasResolution, canvasResolution);
    }
};
const lightCanvas = createCanvas();
const bufferCanvas = createCanvas();
const ctx = canvas.getContext('2d');
const bufferctx = bufferCanvas.getContext('2d');
function resetCanvases() {
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
};
canvas.width = canvasResolution;
canvas.height = canvasResolution;
const sidebar = document.getElementById('sidebar');
const pixelPicker = document.getElementById('pixelPicker');
const pixelPickerDescription = document.getElementById('pixelPickerDescription');
canvasContainer.addEventListener('contextmenu', e => e.preventDefault());
pixelPicker.addEventListener('contextmenu', e => e.preventDefault());

// grid
let gridSize = 40;
let saveCode = '40;air-1600:';
let gridScale = canvasResolution / gridSize;
let canvasSize = window.innerWidth - 21;
let canvasScale = canvasResolution / canvasSize;
let screenScale = 1;
const grid = [];

// brush
const brush = {
    pixel: 'air',
    size: 1,
    lineMode: false,
    lineStartX: 0,
    lineStartY: 0,
    mouseButtonStack: [],
    mouseButton: -1,
    lastMouseButton: -1,
};
let mX = 0;
let mY = 0;
let mXGrid = 0;
let mYGrid = 0;
let prevMX = 0;
let prevMY = 0;
let prevMXGrid = 0;
let prevMYGrid = 0;
let mouseOver = false;
let removing = false;
let holdingAlt = false;

// save codes
function createGrid(size = 40) {
    if (size < 1) return;
    gridSize = size;
    gridScale = canvasResolution / gridSize;
    screenScale = gridSize / canvasSize / canvasScale;
    grid.length = 0;
    for (let i = 0; i < gridSize; i++) {
        grid[i] = new Array(gridSize);
        for (let j = 0; j < gridSize; j++) {
            grid[i][j] = pixNum.AIR;
        }
    }
    renderer.compileShaders();
};
function loadSaveCode(code = saveCode) {
    saveCode = code;
    if (saveCode.length > 0) {
        let sections = saveCode.split(';');
        function parseSaveCode(code, base) {
            let x = 0;
            let y = 0;
            let i = 0;
            const loopedPixels = [];
            function addPixels(pixel, amount) {
                let pixelTypeNum = pixNum[pixel.toUpperCase()];
                for (let j = 0; j < amount; j++) {
                    grid[y][x++] = pixelTypeNum;
                    if (x == gridSize) {
                        y++;
                        x = 0;
                        if (y == gridSize) return true;
                    }
                }
                return false;
            };
            load: while (i < code.length) {
                let nextDash = code.indexOf('-', i);
                let nextColon = code.indexOf(':', i);
                let nextOpenBracket = code.indexOf('{', i);
                let nextCloseBracket = code.indexOf('}', i);
                let nextPipeline = code.indexOf('|', i);
                if (nextDash == -1) nextDash = Infinity;
                if (nextColon == -1) nextColon = Infinity;
                if (nextOpenBracket == -1) nextOpenBracket = Infinity;
                if (nextCloseBracket == -1) nextCloseBracket = Infinity;
                if (nextPipeline == -1) nextPipeline = Infinity;
                let minNext = Math.min(nextDash, nextColon, nextOpenBracket, nextCloseBracket, nextPipeline);
                if (minNext == Infinity) break load;
                if (minNext == nextOpenBracket) {
                    loopedPixels.push([]);
                    i = nextOpenBracket + 1;
                } else if (minNext == nextCloseBracket) {
                    let loopedSection = loopedPixels.pop();
                    let iterations = parseInt(code.substring(nextCloseBracket + 1, nextPipeline), base);
                    if (loopedPixels.length) {
                        for (let i = 0; i < iterations; i++) {
                            loopedPixels[loopedPixels.length - 1].push(...loopedSection);
                        }
                    } else {
                        for (let i = 0; i < iterations; i++) {
                            for (let [pixel, amount] of loopedSection) {
                                if (addPixels(pixel, amount)) break load;
                            }
                        }
                    }
                    i = nextPipeline + 1;
                } else if (minNext == nextDash) {
                    let pixel = code.substring(i, nextDash);
                    let amount = parseInt(code.substring(nextDash + 1, nextColon), base);
                    if (loopedPixels.length) {
                        loopedPixels[loopedPixels.length - 1].push([pixel, amount])
                    } else {
                        if (addPixels(pixel, amount)) break load;
                    }
                    i = nextColon + 1;
                } else if (nextColon >= 0) {
                    let pixel = code.substring(i, nextColon);
                    if (loopedPixels.length) {
                        loopedPixels[loopedPixels.length - 1].push([pixel, 1])
                    } else {
                        if (addPixels(pixel, 1)) break load;
                    }
                    i = nextColon + 1;
                } else {
                    break load;
                }
            }
        };
        function parseBooleanCode(grid, code, base) {
            let x = 0;
            let y = 0;
            let i = 0;
            let pixel = false;
            place: while (i < code.length) {
                let next = code.indexOf(':', i);
                if (next == -1) break;
                let amount = parseInt(code.substring(i, next), base);
                for (let j = 0; j < amount; j++) {
                    grid[y][x++] = pixel;
                    if (x == gridSize) {
                        y++;
                        x = 0;
                        if (y == gridSize) break place;
                    }
                }
                pixel = !pixel;
                i = next + 1;
            }
        };
        if (isNaN(parseInt(sections[0]))) return;
        createGrid(parseInt(sections[0]));
        if (sections[1]) {
            // settings and stuff
        }
        if (sections[2]) parseSaveCode(sections[2], 16);
    }
    window.localStorage.setItem('saveCode', saveCode);
};
function generateSaveCode() {
    let saveCode = `${gridSize};;`;
    let pixel = -1;
    let amount = 0;
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            amount++;
            if (grid[i][j] != pixel) {
                if (pixel != -1 && amount != 0) {
                    if (amount == 1) {
                        saveCode += `${pixelData(pixel).id}:`;
                    } else {
                        saveCode += `${pixelData(pixel).id}-${amount.toString(16)}:`;
                    }
                }
                pixel = grid[i][j];
                amount = 0;
            }
        }
    }
    amount++;
    if (pixel != -1) {
        if (amount == 1) {
            saveCode += `${pixelData(pixel).id}:`;
        } else {
            saveCode += `${pixelData(pixel).id}-${amount}:`;
        }
    }
    function createBooleanCode(grid) {
        saveCode += ';';
        let pixel = grid[0][0];
        amount = -1;
        if (pixel) saveCode += '0:';
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                amount++;
                if (grid[i][j] != pixel) {
                    saveCode += `${amount.toString(16)}:`;
                    pixel = grid[i][j];
                    amount = 0;
                }
            }
        }
        amount++;
        if (amount == 1) {
            saveCode += `1:`;
        } else {
            saveCode += `${amount.toString(16)}:`;
        }
    };
    return saveCode;
};
function loadStoredSave() {
    let savedSaveCode = window.localStorage.getItem('saveCode');
    if (savedSaveCode !== null) loadSaveCode(savedSaveCode);
    else createGrid(40)
    let savedSaveText = window.localStorage.getItem('saveCodeText');
    if (savedSaveText !== null) saveCodeText.value = savedSaveText;
    saveCodeText.oninput();
};
window.addEventListener('load', (e) => {
    if (typeof window.requestIdleCallback == 'function') {
        setInterval(() => {
            window.requestIdleCallback(() => {
                window.localStorage.setItem('saveCode', generateSaveCode());
            }, { timeout: 5000 });
        }, 30000);
    } else {
        setInterval(() => {
            window.localStorage.setItem('saveCode', generateSaveCode());
        }, 30000);
    }
    window.addEventListener('beforeunload', (e) => {
        window.localStorage.setItem('saveCode', generateSaveCode());
    });
});

// shared pixel functions
function drawPixels(type, rectangles, ctx, brush = false) {
    (numPixels[type] ?? numPixels[pixNum.MISSING]).draw(rectangles, ctx, brush);
};
function forRectangles(rectangles, cb) {
    for (let rect of rectangles) {
        cb(...rect);
    }
};
function forEachPixel(x, y, width, height, cb) {
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            cb(x + j, y + i);
        }
    }
};
function fillPixels(x, y, width, height, ctx) {
    ctx.fillRect(x * gridScale, y * gridScale, width * gridScale, height * gridScale);
};
function clearPixels(x, y, width, height, ctx) {
    ctx.clearRect(x * gridScale, y * gridScale, width * gridScale, height * gridScale);
};
function imagePixels(x, y, width, height, source, ctx) {
    for (let i = y; i < y + height; i++) {
        for (let j = x; j < x + width; j++) {
            ctx.drawImage(source, j * gridScale, i * gridScale, gridScale, gridScale);
        }
    }
};
function pixelAt(x, y) {
    return numPixels[grid[y][x]] ?? numPixels[pixNum.MISSING];
};
function pixelData(numId) {
    return numPixels[numId] ?? numPixels[pixNum.MISSING];
};

// draw stuff for normal edit mode
let targetFps = 60;
const frameList = [];
const fpsList = [];
let lastFpsList = 0;
let backgroundColor = 'rgb(0, 0, 0)';
let renderLights = false;
async function draw() {
    // reset stuff
    ctx.resetTransform();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    updateBrush();
    drawFrame();
    if (renderLights) {
        renderer.render();
        ctx.drawImage(lightCanvas, 0, 0);
    }
    drawBrush();
    frameList.push(performance.now());

    let now = performance.now();
    while (frameList[0] + 1000 <= now) {
        frameList.shift();
    }
    drawUI();

    // mouse cursor
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.globalCompositeOperation = 'difference';
    ctx.fillRect(mX - 4, mY - 4, 8, 8);
    ctx.globalCompositeOperation = 'source-over';

    prevMXGrid = mXGrid;
    prevMYGrid = mYGrid;
    prevMX = mX;
    prevMY = mY;
};
function drawFrame() {
    // draw grid normally because who cares
    ctx.clearRect(0, 0, canvasResolution, canvasResolution);
    ctx.globalAlpha = 1;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasResolution, canvasResolution);
    for (let i in numPixels) {
        numPixels[i].rectangles.length = 0;
    }
    for (let y = 0; y < gridSize; y++) {
        let curr = grid[y][0];
        let amount = 0;
        for (let x = 1; x < gridSize; x++) {
            amount++;
            if (grid[y][x] != curr) {
                pixelData(curr).rectangles.push([x - amount, y, amount, 1]);
                curr = grid[y][x];
                amount = 0;
            }
        }
        pixelData(curr).rectangles.push([gridSize - amount - 1, y, amount + 1, 1]);
    }
    for (let i in numPixels) {
        if (numPixels[i].rectangles.length > 0) numPixels[i].draw(numPixels[i].rectangles, ctx, false);
    }
};
function drawBrush() {
    ctx.globalAlpha = 0.5;
    const placePixelNum = pixels[(brush.lastMouseButton == 2 || removing) ? 'remove' : brush.pixel].numId;
    if (brush.lineMode) {
        bufferctx.clearRect(0, 0, canvasResolution, canvasResolution);
        brushActionLine(brush.lineStartX, brush.lineStartY, mXGrid, mYGrid, brush.size, (rect) => {
            drawPixels(placePixelNum, [[rect.xmin, rect.ymin, rect.xmax - rect.xmin + 1, rect.ymax - rect.ymin + 1]], bufferctx, true);
        });
        ctx.drawImage(bufferCanvas, 0, 0);
    } else {
        let rect = calcBrushRectCoordinates(mXGrid, mYGrid);
        drawPixels(placePixelNum, [[rect.xmin, rect.ymin, rect.xmax - rect.xmin + 1, rect.ymax - rect.ymin + 1]], ctx, true);
    }
}
function drawUI() {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.font = '20px Source Code Pro';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    let fpsText = `FPS: ${frameList.length}`;
    let brushPixelText = `Brush Pixel: ${(pixels[brush.pixel] ?? numPixels[pixNum.MISSING]).name}`;
    let brushSizeText = `Brush Size: ${brush.size * 2 - 1}`;
    let brushLocationText = `${pixelAt(Math.max(0, Math.min(gridSize - 1, mXGrid)), Math.max(0, Math.min(gridSize - 1, mYGrid))).name} (${Math.max(0, Math.min(gridSize - 1, mXGrid))}, ${Math.max(0, Math.min(gridSize - 1, mYGrid))})`;
    ctx.fillStyle = '#FFF5';
    ctx.fillRect(4, 4, ctx.measureText(fpsText).width + 4, 20);
    ctx.fillRect(canvasResolution - 4, 4, -ctx.measureText(brushSizeText).width - 4, 20);
    ctx.fillRect(canvasResolution - 4, 25, -ctx.measureText(brushPixelText).width - 4, 20);
    ctx.fillRect(canvasResolution - 4, 46, -ctx.measureText(brushLocationText).width - 4, 20);
    ctx.fillStyle = '#000';
    ctx.fillText(fpsText, 6, 5);
    while (lastFpsList + 100 < performance.now()) {
        lastFpsList += 100;
        fpsList.push(frameList.length);
        while (fpsList.length > 100) {
            fpsList.shift();
        }
    }
    ctx.textAlign = 'right';
    ctx.fillText(brushSizeText, canvasResolution - 6, 5);
    ctx.fillText(brushPixelText, canvasResolution - 6, 26);
    ctx.fillText(brushLocationText, canvasResolution - 6, 47);
};
async function getRenderer() {
    window.getRenderer = undefined;
    // atrocities
    const renderer = new LightRenderer(lightCanvas);
    Object.defineProperty(window, 'renderer', {
        configurable: false,
        enumerable: true,
        value: await renderer,
        writable: false,
    });
    await renderer;
};
async function startDrawLoop() {
    window.startDrawLoop = undefined;
    await getRenderer();
    loadStoredSave();
    let start;
    while (true) {
        start = performance.now();
        await new Promise((resolve, reject) => {
            window.requestAnimationFrame(async () => {
                await draw(renderer);
                setTimeout(resolve, ~~(1000 / (document.hidden ? 1 : targetFps) - (performance.now() - start) - 1));
            });
        });
    }
};
window.addEventListener('load', startDrawLoop);

// brush
function calcBrushRectCoordinates(x, y, size = brush.size) {
    return {
        xmin: Math.max(0, Math.min(x - size + 1, gridSize)),
        xmax: Math.max(-1, Math.min(x + size - 1, gridSize - 1)),
        ymin: Math.max(0, Math.min(y - size + 1, gridSize)),
        ymax: Math.max(-1, Math.min(y + size - 1, gridSize - 1))
    };
};
function updateBrush() {
    if (acceptInputs) {
        if ((brush.mouseButton != -1 && holdingAlt) || brush.lineMode) {
            if (!brush.lineMode) {
                brush.lineMode = true;
                brush.lineStartX = mXGrid;
                brush.lineStartY = mYGrid;
            }
            if (brush.mouseButton == -1) {
                brush.lineMode = false;
                clickLine(brush.lineStartX, brush.lineStartY, mXGrid, mYGrid, brush.lastMouseButton == 2 || removing);
            }
        } else if (brush.mouseButton != -1) {
            if (brush.mouseButton == 1) {
                if (pixelAt(mXGrid, mYGrid).pickable && pixelSelectors[pixelAt(mXGrid, mYGrid).id].box.style.display != 'none') {
                    pixelSelectors[pixelAt(mXGrid, mYGrid).id].box.onclick();
                }
            } else {
                clickLine(prevMXGrid, prevMYGrid, mXGrid, mYGrid, brush.lastMouseButton == 2 || removing);
            }
        }
    } else if (brush.mouseButton == -1 && brush.lineMode && !(brush.isSelection && selection.grid[0] !== undefined) && !brush.startsInRPE) {
        brush.lineMode = false;
        clickLine(brush.lineStartX, brush.lineStartY, mXGrid, mYGrid, brush.lastMouseButton == 2 || removing);
    }
    brush.lastMouseButton = brush.mouseButton;
};
function traceGridLine(x1, y1, x2, y2, cb) {
    let slope = (y2 - y1) / (x2 - x1);
    if (!isFinite(slope)) {
        let start = Math.max(0, Math.min(y2, y1));
        let end = Math.min(gridSize - 1, Math.max(y2, y1));
        for (let y = start; y <= end; y++) {
            if (cb(x1, y)) break;
        }
    } else if (slope == 0) {
        let start = Math.max(0, Math.min(x2, x1));
        let end = Math.min(gridSize - 1, Math.max(x2, x1));
        for (let x = start; x <= end; x++) {
            if (cb(x, y1)) break;
        }
    } else if (Math.abs(slope) > 1) {
        slope = 1 / slope;
        let xmin = y2 < y1 ? x2 : x1;
        let start = Math.max(0, Math.min(y2, y1));
        let end = Math.min(gridSize - 1, Math.max(y2, y1));
        for (let y = start, x = 0; y <= end; y++) {
            x = Math.round(slope * (y - start)) + xmin;
            if (x < 0 || x >= gridSize || cb(x, y)) break;
        }
    } else {
        let ymin = x2 < x1 ? y2 : y1;
        let start = Math.max(0, Math.min(x2, x1));
        let end = Math.min(gridSize - 1, Math.max(x2, x1));
        for (let x = start, y = 0; x <= end; x++) {
            y = Math.round(slope * (x - start)) + ymin;
            if (y < 0 || y >= gridSize || cb(x, y)) break;
        }
    }
};
function brushActionLine(x1, y1, x2, y2, size, cb) {
    // THIS IS NOT SPAGHETTI
    let slope = (y2 - y1) / (x2 - x1);
    if (!isFinite(slope)) {
        cb({
            xmin: Math.max(0, Math.min(x1 - size + 1, gridSize)),
            xmax: Math.max(-1, Math.min(x1 + size - 1, gridSize - 1)),
            ymin: Math.max(0, Math.min(Math.min(y2, y1) - size + 1, gridSize)),
            ymax: Math.max(-1, Math.min(Math.max(y2, y1) + size - 1, gridSize - 1))
        });
    } else if (slope == 0) {
        cb({
            xmin: Math.max(0, Math.min(Math.min(x2, x1) - size + 1, gridSize)),
            xmax: Math.max(-1, Math.min(Math.max(x2, x1) + size - 1, gridSize - 1)),
            ymin: Math.max(0, Math.min(y1 - size + 1, gridSize)),
            ymax: Math.max(-1, Math.min(y1 + size - 1, gridSize - 1))
        });
    } else {
        traceGridLine(x1, y1, x2, y2, (x, y) => cb(calcBrushRectCoordinates(x, y, size)));
    }
};
function clickLine(x1, y1, x2, y2, remove, placePixel = brush.pixel, size = brush.size) {
    let placePixelNum = pixels[placePixel].numId;
    brushActionLine(x1, y1, x2, y2, size, (rect) => {
        function act(cb) {
            for (let i = rect.ymin; i <= rect.ymax; i++) {
                for (let j = rect.xmin; j <= rect.xmax; j++) {
                    cb(j, i);
                }
            }
            return false;
        };
        if (remove) {
            act((x, y) => {
                grid[y][x] = pixNum.AIR;
            });
        } else {
            act((x, y) => {
                grid[y][x] = placePixelNum;
            });
        }
    });
};

// inputs
window.addEventListener('DOMContentLoaded', (e) => {
    document.onkeydown = (e) => {
        if (e.target.matches('button') || e.key == 'Tab') {
            e.preventDefault();
            e.target.blur();
        }
        if (e.target.matches('input') || e.target.matches('textarea') || !acceptInputs) return;
        const key = e.key.toLowerCase();
        if (key == 'arrowup') {
            let bsize = brush.size;
            brush.size = Math.min(Math.ceil(gridSize / 2 + 1), brush.size + 1);
        } else if (key == 'arrowdown') {
            let bsize = brush.size;
            brush.size = Math.max(1, brush.size - 1);
        } else if (key == 'shift') {
            removing = true;
        } else if (key == 'alt') {
            holdingAlt = true;
        }
        if ((key != 'i' || !e.shiftKey || !e.ctrlKey) && key != 'f11' && key != '=' && key != '-') e.preventDefault();
    };
    document.onkeyup = (e) => {
        if (e.target.matches('input') || e.target.matches('textarea') || !acceptInputs) return;
        const key = e.key.toLowerCase();
        if (key == 'shift') {
            removing = false;
        } else if (key == 'alt') {
            holdingAlt = false;
        } else if (key == 'r' && e.ctrlKey) {
            sidebar.scrollTo({ top: 0, behavior: 'smooth' });
        }
        e.preventDefault();
    };
    document.onmousedown = (e) => {
        brush.mouseButtonStack.unshift(e.button);
        brush.mouseButton = brush.mouseButtonStack[0];
        brush.lastMouseButton = brush.mouseButton;
    };
    document.onmouseup = (e) => {
        // most efficient code ever
        if (brush.mouseButtonStack.indexOf(e.button) != -1) {
            brush.mouseButtonStack.splice(brush.mouseButtonStack.indexOf(e.button), 1);
            brush.mouseButton = brush.mouseButtonStack[0] ?? -1;
        }
    };
    document.onmousemove = (e) => {
        mX = Math.round((e.pageX - 10) * canvasScale);
        mY = Math.round((e.pageY - 10) * canvasScale);
        mXGrid = Math.floor((mX) * screenScale);
        mYGrid = Math.floor((mY) * screenScale);
        mouseOver = mX >= 0 && mX < canvasResolution && mY >= 0 && mY < canvasResolution;
    };
    document.addEventListener('wheel', (e) => {
        if (mouseOver && acceptInputs) {
            if (e.deltaY > 0) {
                brush.size = Math.max(1, brush.size - 1);
            } else {
                brush.size = Math.min(Math.ceil(gridSize / 2 + 1), brush.size + 1);
            }
        }
    }, { passive: false });
    hasFocus = false;
    if (typeof window.requestIdleCallback == 'function') {
        setInterval(() => {
            window.requestIdleCallback(() => {
                if (hasFocus && !document.hasFocus()) {
                    holdingAlt = false;
                    removing = false;
                    brush.lineMode = false;
                    brush.mouseButtonStack.length = 0;
                    brush.mouseButton = -1;
                }
                hasFocus = document.hasFocus();
            }, { timeout: 40 });
        }, 50);
    } else {
        setInterval(() => {
            if (hasFocus && !document.hasFocus()) {
                holdingAlt = false;
                removing = false;
                brush.lineMode = false;
                brush.mouseButtonStack.length = 0;
                brush.mouseButton = -1;
            }
            hasFocus = document.hasFocus();
        }, 50);
    }
});

// controls
const renderButton = document.getElementById('render');
const raycastButton = document.getElementById('raycast');
const quicksaveButton = document.getElementById('quicksave');
const quickloadButton = document.getElementById('quickload');
let writeSaveTimeout = setTimeout(() => { });
const saveSaveButton = document.getElementById('saveSave');
const loadSaveButton = document.getElementById('loadSave');
const saveCodeText = document.getElementById('saveCode');
renderButton.onclick = (e) => {
    renderLights = !renderLights;
    if (renderLights) renderButton.innerText = 'Stop Rendering';
    else renderButton.innerText = 'Render';
};
quicksaveButton.onclick = (e) => {
    if (!acceptInputs) return;
    quicksave = generateSaveCode();
    quickloadButton.disabled = false;
};
quickloadButton.onclick = (e) => {
    if (!acceptInputs) return;
    if (quicksave != null) loadSaveCode(quicksave);
};
saveCodeText.oninput = (e) => {
    if (!acceptInputs) return;
    saveCode = saveCodeText.value.replace('\n', '');
    clearTimeout(writeSaveTimeout);
    writeSaveTimeout = setTimeout(() => {
        window.localStorage.setItem('saveCodeText', saveCode);
    }, 1000);
};
saveSaveButton.onclick = (e) => {
    if (!acceptInputs) return;
    saveCode = generateSaveCode();
    saveCodeText.value = saveCode;
    window.localStorage.setItem('saveCode', generateSaveCode());
    window.localStorage.setItem('saveCodeText', saveCode);
};
loadSaveButton.onclick = async (e) => {
    if (!acceptInputs) return;
    loadSaveCode(saveCodeText.value.replace('\n', ''));
    quicksave = null;
    quickloadButton.disabled = true;
};

// resizing
window.onresize = (e) => {
    canvasSize = Math.min(window.innerWidth, window.innerHeight) - 21;
    canvasScale = canvasResolution / canvasSize;
    resetCanvases();
    let pickerWidth = (Math.round((window.innerWidth - canvasSize - 20) / 62) - 1) * 62 + 1;
    pixelPicker.style.width = pickerWidth + 2 + 'px';
    pixelPickerDescription.style.width = pickerWidth - 14 + 'px';
};
window.addEventListener('load', window.onresize);