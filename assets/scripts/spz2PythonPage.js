const libraryName = "shapez2";

/**
 * @param {string} elemType
 * @param {string} elemClass
 * @param {string} elemText
 * @param {string} elemId
 * @param {HTMLElement[]} children
 * @returns {HTMLElement}
 */
function createElem(elemType,elemClass=null,elemText=null,elemId=null,children=null) {
    const elem = document.createElement(elemType);
    if (elemClass != null) {
        elem.classList.add(elemClass);
    }
    if (elemText != null) {
        elem.innerText = elemText;
    }
    if (elemId != null) {
        elem.id = elemId;
    }
    if (children != null) {
        for (const child of children) {
            elem.appendChild(child);
        }
    }
    return elem;
}

/** 
 * @param {string|object} elemType
 * @returns {HTMLAnchorElement|HTMLSpanElement}
*/
function getTypeLink(elemType) {
    if (typeof elemType == "object") {
        if (elemType.n == null) {
            const finalElems = [];
            for (let i = 0; i < elemType.length; i++) {
                const elem = elemType[i];
                if (i != 0) {
                    finalElems.push(createElem("span",null," | "));
                }
                finalElems.push(getTypeLink(elem));
            }
            return createElem("span",null,null,null,finalElems);
        } else {
            const finalElems = [];
            for (let i = 0; i < elemType.a.length; i++) {
                const elem = elemType.a[i];
                if (i != 0) {
                    finalElems.push(createElem("span",null,", "));
                }
                finalElems.push(getTypeLink(elem));
            }
            return createElem("span",null,null,null,[
                getTypeLink(elemType.n),
                createElem("span",null,"["),
                createElem("span",null,null,null,finalElems),
                createElem("span",null,"]")
            ]);
        }
    }
    else if (elemType.startsWith(libraryName+".")) {
        elemType = elemType.replace(libraryName+".","");
        const anchorElem = createElem("a",null,elemType);
        if (elemType.startsWith("pygamePIL")) {
            elemType = "pygamePIL";
        }
        anchorElem.href = "#" + elemType;
        return anchorElem;
    } else {
        return createElem("span",null,elemType);
    }
}

/**
 * @param {string[]} path
 * @param {string[]} elems
 * @returns {HTMLElement}
 */
function getQuickLinks(path,elems) {
    const container = createElem("div","quick-links");
    const linksContainer = createElem("ul");
    for (const elem of elems.sort((a,b) => {
        const lowerA = a.toLowerCase();
        const lowerB = b.toLowerCase();
        if (lowerA < lowerB) {
            return -1;
        }
        if (lowerA > lowerB) {
            return 1;
        }
        return 0;
    })) {
        const link = createElem("a",null,elem);
        link.href = "#" + path.concat(elem).join(".");
        linksContainer.appendChild(createElem("li",null,null,null,[link]));
    }
    container.appendChild(linksContainer);
    return container;
}

/**
 * @param {object} elemObj
 * @param {string[]} elemPath
 * @param {string|null} fromModule
 * @returns {HTMLElement}
*/
function processElem(elemObj,elemPath,fromModule) {

    const elemFullInfoContainer = createElem("div");
    const infoContainer = createElem("div","indented");

    if (elemObj.mute) {
        infoContainer.appendChild(createElem("p",null,"\u24d8 This class is mutable."));
    }

    if (elemObj.d != null) {
        const elemDesc = createElem("p");
        elemDesc.innerHTML = elemObj.d;
        if (!elemObj.nop) {
            elemDesc.innerHTML += ".";
        }
        infoContainer.appendChild(elemDesc);
    }

    const elemType = elemObj.t;
    const elemName = elemObj.n;

    let transferredModuleName;
    if (elemType == "module") {
        transferredModuleName = elemName;
    } else {
        transferredModuleName = null;
    }

    const paramReprs = [];

    if (elemObj.params != null) {

        const paramsContainer = document.createElement("ul");

        for (const paramObj of elemObj.params) {

            if (paramObj == "*") {
                paramReprs.push(createElem("span",null,"*"));
                continue;
            }

            const paramContainer = document.createElement("li");

            const paramNameRaw = paramObj.n;
            const paramType = paramObj.t;
            const paramDescRaw = paramObj.d;
            const paramDefaultRaw = paramObj.def;

            paramContainer.appendChild(createElem("span","code-def",paramNameRaw));

            const paramRepr = document.createElement("span");
            paramRepr.appendChild(createElem("span",null,`${paramNameRaw}: `));
            paramRepr.appendChild(getTypeLink(paramType));
            if (paramDefaultRaw != null) {
                paramRepr.appendChild(createElem("span",null," = "));
                paramRepr.appendChild(getTypeLink(paramDefaultRaw));
            }
            paramReprs.push(paramRepr);

            paramContainer.appendChild(createElem("span",null," : "));
            const paramDesc = createElem("span");
            paramDesc.innerHTML = paramDescRaw;
            if (!paramObj.nop) {
                paramDesc.innerHTML += ".";
            }
            paramContainer.appendChild(paramDesc);

            paramsContainer.appendChild(paramContainer);
        }

        infoContainer.appendChild(createElem("h3",null,"Parameters"));
        infoContainer.appendChild(paramsContainer);
    }

    if (elemObj.attrs != null) {

        const attrsContainer = document.createElement("div");
        const attrsNames = [];
        const attrsPath = elemPath.concat(elemName);

        for (const attrObj of elemObj.attrs) {

            const attrNameRaw = attrObj.n;
            const attrType = attrObj.t;
            const attrDescRaw = attrObj.d;
            const attrDefaultRaw = attrObj.def;
            attrsNames.push(attrNameRaw);

            if (["module","class","dataclass","func","classmethod"].includes(attrType)) {
                attrsContainer.appendChild(processElem(attrObj,attrsPath,transferredModuleName));
                continue;
            }

            const attrHeader = document.createElement("span");
            if (transferredModuleName != null) {
                attrHeader.appendChild(createElem("span",null,attrsPath.join(".")+"."));
            }
            attrHeader.appendChild(createElem("span",null,`${attrNameRaw}: `));
            attrHeader.appendChild(getTypeLink(attrType));
            if (attrDefaultRaw != null) {
                attrHeader.appendChild(createElem("span",null," = "));
                attrHeader.appendChild(getTypeLink(attrDefaultRaw));
            }
            if (elemType == "dataclass") {
                paramReprs.push(attrHeader.cloneNode(true));
            }

            const attrHeaderContainer = createElem("div","code-def",null,attrsPath.concat(attrNameRaw).join("."));
            attrHeaderContainer.appendChild(attrHeader);
            attrsContainer.appendChild(attrHeaderContainer);
            const attrDesc = createElem("p","indented");
            attrDesc.innerHTML = attrDescRaw;
            if (!attrObj.nop) {
                attrDesc.innerHTML += ".";
            }
            attrsContainer.appendChild(attrDesc);
        }

        if (elemType != "module") {
            infoContainer.appendChild(createElem("h3",null,`${elemType == "dataclass" ? "Parameters/" : ""}Attributes`));
            attrsContainer.classList.add("indented");
        }

        if (attrsNames.length > 0) {
            infoContainer.insertAdjacentElement("afterbegin",getQuickLinks(attrsPath,attrsNames));
        }

        infoContainer.appendChild(attrsContainer);
    }

    if (elemType == "module") {

        const moduleName = elemPath.concat(elemName).join(".");
        elemFullInfoContainer.appendChild(createElem("h2",null,moduleName,moduleName));

    } else if (["class","dataclass","func","classmethod"].includes(elemType)) {

        const elemId = elemPath.concat(elemName).join(".");
        const elemHeader = createElem("div","code-def",null,elemId);

        elemHeader.appendChild(createElem("span","italics",elemType == "func" ? "def" : elemType))
        elemHeader.appendChild(createElem("span",null,` ${fromModule == null ? elemName : elemId}(`));

        if ((elemType == "class") && (elemObj.p != null) && (elemObj.params == null)) {
            elemHeader.appendChild(getTypeLink(elemObj.p));
        } else {

            for (let paramIndex = 0; paramIndex < paramReprs.length; paramIndex++) {
                const paramRepr = paramReprs[paramIndex];
                if (paramIndex != 0) {
                    elemHeader.appendChild(createElem("span",null,", "));
                }
                elemHeader.appendChild(paramRepr);
            }

        }

        const sepElem = createElem("span",null,")");

        if (["func","classmethod"].includes(elemType)) {
            sepElem.innerText += " -> ";
            elemHeader.appendChild(sepElem);
            elemHeader.appendChild(getTypeLink(elemObj.r));
        } else {
            elemHeader.appendChild(sepElem);
        }

        elemFullInfoContainer.appendChild(elemHeader);

        if ((elemType == "class") && (elemObj.p != null) && (elemObj.params != null)) {
            infoContainer.insertAdjacentElement("afterbegin",createElem("p",null,null,null,[
                createElem("span",null,"\u24d8 This class inherits from "),
                createElem("span","code-def",null,null,[getTypeLink(elemObj.p)])
            ]));
        }

    }

    elemFullInfoContainer.appendChild(infoContainer);

    return elemFullInfoContainer;
}

const docsDiv = document.getElementById("docs-content");

fetch("/assets/json/spz2PythonDocs.json").then((r) => r.json().then((v) => {
    const moduleNames = [];
    for (const moduleObj of v) {
        moduleNames.push(moduleObj.n);
        docsDiv.appendChild(processElem(moduleObj,[],null));
    }
    docsDiv.insertAdjacentElement("afterbegin",getQuickLinks([],moduleNames));

    for (const autolink of document.querySelectorAll(".autolink")) {
        const newLink = createElem("a","code-def",autolink.innerText);
        newLink.href = "#" + autolink.innerText;
        autolink.replaceWith(newLink);
    }
}));
