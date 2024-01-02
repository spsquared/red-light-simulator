const pixels = {
    air: {
        name: 'Air',
        description: 'NO RAYLEIGH SCATTERING HERE!!!!!!!!!!',
        draw: (rectangles, ctx, brush) => {
            if (brush) {
                ctx.fillStyle = 'rgb(255, 255, 255)';
                forRectangles(rectangles, (x, y, w, h) => {
                    fillPixels(x, y, w, h, ctx);
                });
            }
        },
        refractiveIndex: 1.000293,
        extinctionCoefficient: 0,
        roughness: 0,
        spectrum: [],
        pickable: true,
        group: 0,
        id: '',
        numId: 0
    },
    concrete: {
        name: 'Concrete',
        description: 'Basic, versatile building pixel',
        draw: (rectangles, ctx, brush) => {
            ctx.fillStyle = 'rgb(75, 75, 75)';
            forRectangles(rectangles, (x, y, w, h) => {
                fillPixels(x, y, w, h, ctx);
            });
        },
        refractiveIndex: 2.45,
        extinctionCoefficient: 1.0,
        roughness: 170.8,
        spectrum: [],
        pickable: true,
        group: 0,
        id: '',
        numId: 0
    },
    glass: {
        name: 'Glass',
        description: 'Why can you still see it',
        draw: (rectangles, ctx, brush) => {
            ctx.fillStyle = 'rgba(180, 180, 210, 0.3)';
            forRectangles(rectangles, (x, y, w, h) => {
                fillPixels(x, y, w, h, ctx);
            });
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            forRectangles(rectangles, (x, y, w, h) => {
                forEachPixel(x, y, w, h, (x2, y2) => {
                    fillPixels(x2 + 1 / 25, y2 + 6 / 25, 1 / 5, 1 / 5, ctx);
                    fillPixels(x2 + 6 / 25, y2 + 1 / 25, 1 / 5, 1 / 5, ctx);
                    fillPixels(x2 + 19 / 25, y2 + 14 / 25, 1 / 5, 1 / 5, ctx);
                    fillPixels(x2 + 14 / 25, y2 + 19 / 25, 1 / 5, 1 / 5, ctx);
                });
            });
        },
        refractiveIndex: 1.4498,
        extinctionCoefficient: 0.01,
        roughness: 0.1,
        spectrum: [],
        pickable: true,
        group: 0,
        id: '',
        numId: 0
    },
    tinted_glass: {
        name: 'Tinted Glass',
        description: 'Absorbs some of the light that passes through it',
        draw: (rectangles, ctx, brush) => {
            ctx.fillStyle = 'rgba(120, 120, 140, 0.3)';
            forRectangles(rectangles, (x, y, w, h) => {
                fillPixels(x, y, w, h, ctx);
            });
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            forRectangles(rectangles, (x, y, w, h) => {
                forEachPixel(x, y, w, h, (x2, y2) => {
                    fillPixels(x2 + 1 / 25, y2 + 6 / 25, 1 / 5, 1 / 5, ctx);
                    fillPixels(x2 + 6 / 25, y2 + 1 / 25, 1 / 5, 1 / 5, ctx);
                    fillPixels(x2 + 19 / 25, y2 + 14 / 25, 1 / 5, 1 / 5, ctx);
                    fillPixels(x2 + 14 / 25, y2 + 19 / 25, 1 / 5, 1 / 5, ctx);
                });
            });
        },
        refractiveIndex: 1.4498,
        extinctionCoefficient: 0.01,
        roughness: 0.1,
        spectrum: [],
        pickable: true,
        group: 0,
        id: '',
        numId: 0
    },
    light_white: {
        name: 'White Light',
        description: 'Glowy white thing that lags',
        draw: (rectangles, ctx, brush) => {
            ctx.fillStyle = 'rgb(255, 255, 255)';
            forRectangles(rectangles, (x, y, w, h) => {
                fillPixels(x, y, w, h, ctx);
            });
        },
        refractiveIndex: 1.000293,
        extinctionCoefficient: 0,
        roughness: 0,
        spectrum: [400, 740],
        pickable: true,
        group: 1,
        id: '',
        numId: 0
    },
    light_yellow: {
        name: 'Yellow Glowstone',
        description: 'Stone that glows 590nm yellow',
        draw: (rectangles, ctx, brush) => {
            ctx.fillStyle = 'rgb(255, 200, 0)';
            forRectangles(rectangles, (x, y, w, h) => {
                fillPixels(x, y, w, h, ctx);
            });
        },
        refractiveIndex: 1.000293,
        extinctionCoefficient: 0,
        roughness: 0,
        spectrum: [590, 590],
        pickable: true,
        group: 1,
        id: '',
        numId: 0
    },
    missing: {
        name: 'Missing Pixel',
        description: 'Doesn\'t exist lol',
        draw: function (rectangles, ctx, brush) {
            forRectangles(rectangles, (x, y, w, h) => {
                ctx.fillStyle = 'rgb(0, 0, 0)';
                fillPixels(x, y, w, h, ctx);
                ctx.fillStyle = 'rgb(255, 0, 255)';
                forEachPixel(x, y, w, h, (x2, y2) => {
                    fillPixels(x2, y2, 1 / 2, 1 / 2, ctx);
                    fillPixels(x2 + 1 / 2, y2 + 1 / 2, 1 / 2, 1 / 2, ctx);
                });
            });
        },
        refractiveIndex: 1,
        extinctionCoefficient: 1,
        roughness: 0,
        spectrum: [],
        pickable: false,
        group: -1,
        id: '',
        numId: 0
    },
    remove: {
        name: 'Brush Remove',
        description: 'uhhh dont place it',
        draw: function (rectangles, ctx, brush) {
            forRectangles(rectangles, (x, y, w, h) => {
                ctx.fillStyle = 'rgb(255, 0, 0)';
                fillPixels(x, y, w, h, ctx);
            });
        },
        refractiveIndex: 0,
        extinctionCoefficient: 1,
        roughness: 0,
        spectrum: [],
        pickable: false,
        group: -1,
        id: '',
        numId: 0
    }
};
const numPixels = [];
const pixNum = {};
const pixelGroups = [];
const pixelAmounts = {};
const pixelSelectors = {};
let pixIndex = 0;
for (const id in pixels) {
    pixels[id].id = id;
    pixels[id].numId = pixIndex;
    pixNum[id.toUpperCase()] = pixIndex;
    numPixels[pixIndex] = pixels[id];
    numPixels[pixIndex].rectangles = [];
    pixIndex++;
}
window.addEventListener('load', async (e) => {
    function emmissionSpectrum(spectrum) {
        if (spectrum.length == 0) return 'None';
        let ret = '';
        for (let i = 0; i < spectrum.length; i += 2) {
            if (spectrum[i] == spectrum[i + 1]) ret += spectrum[i] + 'nm ';
            else ret += `${spectrum[i]}nm-${spectrum[i + 1]}nm `;
        }
        return ret;
    };
    const canvas2 = document.createElement('canvas');
    const ctx2 = canvas2.getContext('2d');
    canvas2.width = 50;
    canvas2.height = 50;
    ctx2.imageSmoothingEnabled = false;
    ctx2.webkitImageSmoothingEnabled = false;
    gridScale = 50;
    const promiseList = [];
    const groupNames = ['General', 'Lights'];
    for (const id in pixels) {
        const pixel = pixels[id];
        ctx2.fillStyle = 'rgb(0, 0, 0)';
        ctx2.fillRect(0, 0, 50, 50);
        pixel.draw([[0, 0, 1, 1]], ctx2, true);
        pixel.image = canvas2.toDataURL('image/png');
        pixel.generatedDescription = `<span style="font-size: 16px; font-weight: bold;">${pixel.name}</span><br>${pixel.description}<br>Refractive Index: ${pixel.refractiveIndex}<br>Extinction Coefficient: ${pixel.extinctionCoefficient}<br>Emission Spectrums: ${emmissionSpectrum(pixel.spectrum)}`;
        if (pixel.pickable) {
            const box = document.createElement('div');
            box.classList.add('pickerPixel');
            box.onclick = (e) => {
                pixelSelectors[brush.pixel].box.classList.remove('pickerPixelSelected');
                box.classList.add('pickerPixelSelected');
                brush.pixel = id;
                box.onmouseover();
            };
            box.onmouseover = (e) => {
                pixelPickerDescription.innerHTML = pixel.generatedDescription;
            };
            box.onmouseout = (e) => {
                pixelPickerDescription.innerHTML = pixels[brush.pixel].generatedDescription;
            };
            const img = new Image(50, 50);
            img.src = pixel.image;
            img.style.imageRendering = 'pixelated';
            box.appendChild(img);
            if (pixelGroups[pixel.group] === undefined) {
                const group = document.createElement('div');
                group.classList.add('pixelGroup');
                const groupHeader = document.createElement('div');
                groupHeader.classList.add('pixelGroupHeader');
                groupHeader.classList.add('bclick');
                const dropDown = document.createElement('div');
                dropDown.classList.add('pixelGroupHeaderDropdownIcon');
                groupHeader.appendChild(dropDown);
                const label = document.createElement('div');
                label.classList.add('pixelGroupHeaderLabel');
                label.innerText = groupNames[pixel.group];
                groupHeader.appendChild(label);
                group.appendChild(groupHeader);
                const groupBody = document.createElement('div');
                groupBody.classList.add('pixelGroupBody');
                const groupContents = document.createElement('div');
                groupContents.classList.add('pixelGroupContents');
                groupBody.appendChild(groupContents);
                group.appendChild(groupBody);
                let open = true;
                groupHeader.onclick = (e) => {
                    open = !open;
                    groupHeader._refresh();
                };
                groupHeader._refresh = () => {
                    if (open) groupBody.style.maxHeight = groupContents.getBoundingClientRect().height + 'px';
                    else groupBody.style.maxHeight = '0px';
                };
                pixelGroups[pixel.group] = group;
            }
            pixelGroups[pixel.group].children[1].children[0].appendChild(box);
            pixelSelectors[id] = {
                box: box,
                parentGroup: pixelGroups[pixel.group]
            };
        }
    }
    gridScale = canvasResolution / gridSize;
    for (const group of pixelGroups) {
        pixelPicker.appendChild(group)
    }
    pixelSelectors[brush.pixel].box.onclick();
    for (const group of pixelGroups) {
        group.children[0]._refresh();
    }
    window.addEventListener('resize', () => {
        for (const group of pixelGroups) {
            group.children[0]._refresh();
        }
    });
    await Promise.all(promiseList);
});