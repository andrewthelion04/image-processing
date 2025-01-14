// variabile globale
let originalImageData = null;
const executionTimes = {};
let grayscaleConverted = false; // variabila pentru a verifica daca conversia a fost deja efectuata

// functie pentru a inregistra timpul unei etape
function logExecutionTime(stage, startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    executionTimes[stage] = duration.toFixed(2); // salveaza durata in milisecunde
    console.log(`${stage} a durat ${duration.toFixed(2)} ms.`);
    updateResultsDisplay(stage, duration);
}

// functie pentru afisarea rezultatelor in browser
function updateResultsDisplay(stage, duration) {
    const resultsList = document.getElementById('results-list');
    const resultItem = document.createElement('li');
    resultItem.textContent = `${stage}: ${duration.toFixed(2)} ms`;
    resultsList.appendChild(resultItem);
}

// functie pentru obtinerea json-ului de la dog ceo api
async function fetchDogImage() {
    const startTime = performance.now(); // inregistram timpul de inceput
    grayscaleConverted = false; // resetam variabila pentru conversie
    try {
        const response = await fetch('https://dog.ceo/api/breeds/image/random');
        if (!response.ok) throw new Error(`http error: ${response.status}`);
        const dogData = await response.json();
        logExecutionTime('Obtinere imagine de la Dog API', startTime); // logam timpul de executie
        return dogData;
    } catch (error) {
        console.error("a aparut o eroare la obtinerea imaginii:", error);
    }
}

// functie pentru afisarea datelor si desenarea imaginii in canvas
async function displayDogData() {
    const startTime = performance.now();
    const dogData = await fetchDogImage();
    if (dogData) {
        const imageUrl = dogData.message;
        const breedInfo = imageUrl.split("/")[4].replace("-", " ");
        document.getElementById('breed-info').textContent = breedInfo;

        const dogImage = document.getElementById('dog-image');
        dogImage.src = imageUrl;
        dogImage.style.display = 'block';

        drawImageOnCanvas(imageUrl);
    }
    logExecutionTime('Afisare JSON', startTime);
}

// functie pentru desenarea imaginii in canvas
function drawImageOnCanvas(imageUrl) {
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.crossOrigin = "anonymous";

    img.onload = () => {
        // latimea dorita pentru imaginea din canvas
        const canvasWidth = 250; // poti ajusta aceasta valoare
        const aspectRatio = img.height / img.width;
        const canvasHeight = canvasWidth * aspectRatio; // calculam inaltimea in functie de raportul de aspect

        // setam dimensiunile canvasului pentru a fi proportionale
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // curatam canvasul inainte de a desena imaginea
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // desenam imaginea pe canvas cu dimensiunile ajustate
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        console.log("imagine desenata pe canvas.");

        // salvam datele originale imediat dupa desenare
        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        console.log("imaginea originala a fost salvata.");
    };

    img.src = imageUrl;
}

// functie pentru oglindirea imaginii (mirror)
function mirrorImageOnCanvas() {
    return new Promise((resolve) => { // returnam o promisiune pentru sincronizare
        const startTime = performance.now(); // inregistram timpul de inceput
        const canvas = document.getElementById('image-canvas');
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { width, height, data } = imageData;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width / 2; x++) {
                const leftIndex = (y * width + x) * 4;
                const rightIndex = (y * width + (width - x - 1)) * 4;

                for (let i = 0; i < 4; i++) {
                    const temp = data[leftIndex + i];
                    data[leftIndex + i] = data[rightIndex + i];
                    data[rightIndex + i] = temp;
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        console.log("imaginea a fost oglindita.");

        const endTime = performance.now();
        const duration = endTime - startTime;
        logExecutionTime('Oglindire imagine', startTime); // logam timpul de executie pentru oglindire
        resolve(duration); // rezolvam promisiunea cu durata procesului de oglindire
    });
}

// functie pentru conversia imaginii in histograma limitata
function convertToGrayscaleAsync() {
    return new Promise((resolve) => { // returnam o promisiune pentru sincronizare
        if (grayscaleConverted) {
            console.log("conversia la escala de gri a fost deja realizata.");
            resolve(0); // nu mai efectuam conversia daca a fost deja facuta
            return;
        }

        const startTime = performance.now(); // inregistram timpul de inceput
        const canvas = document.getElementById('image-canvas');
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { width, height, data } = imageData;

        const sliceHeight = Math.ceil(height / 4); // impartim imaginea in 4 felii
        let completedSlices = 0; // contor pentru a verifica cate feliute au fost procesate

        function processSlice(sliceIndex) {
            const startY = sliceIndex * sliceHeight;
            const endY = Math.min((sliceIndex + 1) * sliceHeight, height);

            for (let y = startY; y < endY; y++) {
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];

                    const gray = Math.floor((r + g + b) / 3); // average method
                    data[index] = gray;
                    data[index + 1] = gray;
                    data[index + 2] = gray;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            console.log(`felia ${sliceIndex + 1} procesata.`);

            completedSlices++; // incrementam contorul

            // daca toate feliile au fost procesate, rezolvam promisiunea
            if (completedSlices === 4) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                logExecutionTime('Conversie la escala de gri', startTime);
                console.log(`Conversia in scala de gri a durat ${duration.toFixed(2)} ms.`);
                grayscaleConverted = true; // setam variabila ca procesul sa nu se mai repete
                resolve(duration); // rezolvam promisiunea cu durata procesului de conversie
            }
        }

        // procesam fiecare felie cu un delay intre ele
        for (let i = 0; i < 4; i++) {
            setTimeout(() => processSlice(i), i * 1000);
        }
    });
}

// functia pentru procesarea completa a imaginii
document.getElementById('process-button').addEventListener('click', async () => {
    const startTime = performance.now(); // inregistram timpul de inceput

    // asteptam ca ambele procese (oglindire si conversie) sa se termine
    const mirrorDuration = await mirrorImageOnCanvas();
    const grayscaleDuration = await convertToGrayscaleAsync();

    // calculam timpul total pentru procesare
    const totalDuration = mirrorDuration + grayscaleDuration;
    logExecutionTime('Procesare completa imagine', startTime); // logam timpul complet de procesare
    console.log(`procesarea completa a imaginii a durat ${totalDuration.toFixed(2)} ms.`);
});

// evenimente pentru butoane
document.getElementById('revert-button').addEventListener('click', () => {
    if (!originalImageData) {
        alert("nu exista modificari de restaurat.");
        return;
    }

    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    grayscaleConverted = false;
    ctx.putImageData(originalImageData, 0, 0);
    console.log("imaginea originala a fost restaurata.");
});

document.getElementById('refresh-button').addEventListener('click', displayDogData);

// afisam datele la incarcarea paginii
document.addEventListener('DOMContentLoaded', displayDogData);
