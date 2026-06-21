const elem = document.createElement("a");
elem.textContent = "Click here if the auto redirect doesn't work";
elem.href = document.currentScript.getAttribute("redirectLink");;
document.body.appendChild(elem);
elem.click();