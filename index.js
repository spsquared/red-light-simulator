window.addEventListener('error', (e) => {
    modal('An error occured:', `<span style="color: red;">${e.message}<br>${e.filename} ${e.lineno}:${e.colno}</span>`, false);
});

// modal
let acceptInputs = true;
const modalContainer = document.getElementById('modalContainer');
const modalBody = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const modalYes = document.getElementById('modalYes');
const modalNo = document.getElementById('modalNo');
const modalOk = document.getElementById('modalOk');
function modal(title, subtitle, confirmation = false) {
    if (!acceptInputs) return new Promise((resolve, reject) => reject('Modal already open'));
    acceptInputs = false;
    modalTitle.innerHTML = title;
    modalContent.innerHTML = subtitle;
    if (confirmation) {
        modalYes.style.display = '';
        modalNo.style.display = '';
        modalOk.style.display = 'none';
    } else {
        modalYes.style.display = 'none';
        modalNo.style.display = 'none';
        modalOk.style.display = '';
    }
    modalContainer.style.opacity = '1';
    modalContainer.style.pointerEvents = 'all';
    modalBody.style.transform = 'translateY(calc(50vh + 50%))';
    const hide = () => {
        modalContainer.style.opacity = '';
        modalContainer.style.pointerEvents = '';
        modalBody.style.transform = '';
        modalYes.onclick = null;
        modalNo.onclick = null;
        modalOk.onclick = null;
        acceptInputs = true;
    };
    return new Promise((resolve, reject) => {
        modalYes.onclick = (e) => {
            hide();
            resolve(true);
        };
        modalNo.onclick = (e) => {
            hide();
            resolve(false);
        };
        modalOk.onclick = (e) => {
            hide();
            resolve(true);
        };
        document.addEventListener('keydown', function cancel(e) {
            if (e.key == 'Escape') {
                hide();
                resolve(false);
                document.removeEventListener('keydown', cancel);
            }
        });
    });
};

// here to prevent crash because i want constants
const canvasResolution = parseInt(window.localStorage.getItem('resolution') ?? 800);