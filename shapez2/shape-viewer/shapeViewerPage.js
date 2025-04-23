let shapeViewer;
import("/assets/scripts/shapeViewer.js").then((module) => {
    shapeViewer = module;
    resizeCanvas();
    updateDisplay();
});

const shapeTypes = {
    "quad" : {
        "color" : ["C","R","S","W","c"],
        "nocolor" : ["P","-"]
    },
    "hex" : {
        "color" : ["H","G","F","c"],
        "nocolor" : ["P","-"]
    }
};

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

function isShapeCodeValid(shapeCode,shapesConfig) {
    const layers = shapeCode.split(":");
    const layersLen = layers[0].length;
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
        const layer = layers[layerIndex];
        if (layer == "") {
            return {valid:false,msg:`Layer ${layerIndex+1} is empty`};
        }
        if (layer.length%2 != 0) {
            return {valid:false,msg:`Layer ${layerIndex+1} doesn't have an even length`};
        }
        if (layer.length != layersLen) {
            return {valid:false,msg:`Layer ${layerIndex+1} isn't the expected length (${layersLen})`};
        }
        let nextIsColor;
        for (let charIndex = 0; charIndex < layer.length; charIndex++) {
            const char = layer[charIndex];
            if (charIndex%2 == 0) {
                if (shapeTypes[shapesConfig]["color"].includes(char)) {
                    nextIsColor = true;
                } else if (shapeTypes[shapesConfig]["nocolor"].includes(char)) {
                    nextIsColor = false;
                } else {
                    return {valid:false,msg:`Invalid shape : ${char}`};
                }
            } else {
                if (nextIsColor) {
                    if (!(char in shapeViewer.baseColors)) {
                        return {valid:false,msg:`Invalid color : ${char}`};
                    }
                } else {
                    if (char != "-") {
                        return {valid:false,msg:`Color in layer ${layerIndex+1} at character ${charIndex+1} must be '-'`};
                    }
                }
            }
            
        }
    }
    return {valid:true,msg:""};
}

function updateDisplay() {
    const shapeCode = shapeCodeInput.value;
    const shapesConfig = shapesConfigSelect.value;
    const colorMode = colorModeSelect.value;
    const {valid,msg} = isShapeCodeValid(shapeCode,shapesConfig);
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