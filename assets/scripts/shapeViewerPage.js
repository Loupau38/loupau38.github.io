let shapeViewer;
import("/assets/scripts/shapeViewer.js").then((module) => {
    shapeViewer = module;
    resizeCanvas();
    updateDisplay();
});

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const shapeCodeInput = document.getElementById("shapeCode");
const shapesConfigSelect = document.getElementById("shapesConfig");
const colorModeSelect = document.getElementById("colorMode");
const errorMsgDiv = document.getElementById("errorMsg");
let totalSize;

function resizeCanvas() {
    totalSize = canvas.width = canvas.height = window.innerWidth * 0.3;
}

function updateDisplay() {
    const shapeCode = shapeCodeInput.value;
    const shapesConfig = shapesConfigSelect.value;
    const colorMode = colorModeSelect.value;
    const {valid,msg} = shapeViewer.isShapeCodeValid(shapeCode,shapesConfig);
    if (!valid) {
        errorMsgDiv.innerText = msg;
        errorMsgDiv.setAttribute("has-error","");
        return;
    }
    shapeViewer.renderShape(context,totalSize,shapeCode,shapesConfig,colorMode);
    errorMsgDiv.innerText = "Rendered shape";
    errorMsgDiv.removeAttribute("has-error");
}

addEventListener("resize",() => {
    resizeCanvas();
    updateDisplay();
});

shapeCodeInput.addEventListener("input",updateDisplay);
shapesConfigSelect.addEventListener("input",updateDisplay);
colorModeSelect.addEventListener("input",updateDisplay);