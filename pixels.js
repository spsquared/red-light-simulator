const pixels = {
    air: {
        name: 'Air',
        description: 'NO RAYLEIGH SCATTERING HERE!!!!!!!!!!',
        draw: (rectangles, ctx) => { },
        refractiveIndex: 1.000293,
        extinctionCoefficient: 0,
        pickable: true,
        group: 0,
        id: '',
        numId: 0
    },
    missing: {
        name: 'Missing Pixel',
        description: 'Doesn\'t exist lol',
        draw: function (rectangles, ctx) {
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
    const canvas2 = document.createElement('canvas');
    const ctx2 = canvas2.getContext('2d');
    canvas2.width = 50;
    canvas2.height = 50;
    ctx2.imageSmoothingEnabled = false;
    ctx2.webkitImageSmoothingEnabled = false;
    gridScale = 50;
    const promiseList = [];
    const groupNames = ['General'];
    for (const id in pixels) {
        const pixel = pixels[id];
        ctx2.fillStyle = 'rgb(255, 255, 255)';
        ctx2.fillRect(0, 0, 50, 50);
        pixel.draw([[0, 0, 1, 1]], ctx2);
        pixel.image = canvas2.toDataURL('image/png');
        pixel.generatedDescription = `<span style="font-size: 16px; font-weight: bold;">${pixel.name}</span><br>${pixel.description}<br>Refractive Index: ${pixel.refractiveIndex}<br>Extinction Coefficient: ${pixel.extinctionCoefficient}`;
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