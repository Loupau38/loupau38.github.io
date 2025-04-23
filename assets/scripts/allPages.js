let title = document.querySelector("title");
title.textContent += " - loupau38.github.io";

if (window.location.pathname != "/") {
    const backButton = document.createElement("a");
    let backButtonLink = document.currentScript.getAttribute("backButtonLink");
    if (backButtonLink == null) {
        backButtonLink = window.location.pathname.split("/").slice(0,-2).join("/") + "/";
    }
    backButton.href = backButtonLink;
    backButton.innerText = "<";
    backButton.id = "backButton";
    document.body.insertAdjacentElement("afterbegin",backButton);
}