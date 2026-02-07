function setContentHeight() {
    height = window.innerHeight - document.getElementById("top-bar").offsetHeight;
    document.getElementById("main-content").style.maxHeight = `${height}px`;
}
window.addEventListener("load",setContentHeight);
window.addEventListener("resize",setContentHeight);

/**
 * @param {string} elemType
 * @param {{
 * elemClass?:string|string[],
 * elemId?:string,
 * innerText?:string,
 * attrs?:{},
 * eventListeners?:{},
 * children?:HTMLElement[]
 * }}
 * @returns {HTMLElement}
 */
function createElem(elemType,{elemClass,elemId,innerText,attrs,eventListeners,children}={}) {
    const elem = document.createElement(elemType);
    if (elemClass) {
        if (typeof elemClass === "string") {
            elem.classList.add(elemClass);
        } else {
            elemClass.forEach((v) => {elem.classList.add(v);});
        }
    }
    if (elemId) {
        elem.id = elemId;
    }
    if (innerText) {
        elem.innerText = innerText;
    }
    if (attrs) {
        for (const attrName in attrs) {
            elem[attrName] = attrs[attrName];
        }
    }
    if (eventListeners) {
        for (const eventName in eventListeners) {
            elem.addEventListener(eventName,eventListeners[eventName]);
        }
    }
    if (children) {
        for (const child of children) {
            elem.appendChild(child);
        }
    }
    return elem;
}

const tabSwitchContainer = document.getElementById("tab-switch-container");
for (const [tabId,tabName] of [
    ["import","Import"],
    ["config","Config"],
    ["milestones","Milestones"],
    ["tasks","Tasks"],
    ["upgrades","Upgrades"],
    ["operatorLevel","Operator Level"],
    ["mechanics","Mechanics"],
    ["paramPreset","Parameter Preset"],
    ["problems","Problems"],
    ["export","Export"]
]) {
    const tabChildren = [
        createElem("span",{innerText:tabName})
    ];
    if (tabId === "problems") {
        tabChildren.push(createElem("span",{
            elemId : "error-count-display"
        }))
        tabChildren[1].style.display = "none";
        tabChildren.push(createElem("span",{
            elemId : "warning-count-display"
        }))
        tabChildren[2].style.display = "none";
    }
    tabSwitchContainer.appendChild(createElem("button",{
        elemClass : "tab-switch",
        elemId : `tab-switch-${tabId}`,
        attrs : {
            type : "button"
        },
        eventListeners : {
            "click" : () => switchToTab(tabId)
        },
        children : tabChildren
    }));
}

let curTab;

/** @param {string} tab */
function switchToTab(tab) {
    curTab = tab;
    for (const tabButton of document.querySelectorAll(".tab-switch")) {
        tabButton.removeAttribute("active-tab");
        tabButton.removeAttribute("left-of-active");
        tabButton.removeAttribute("right-of-active");
    }
    for (const tabDiv of document.querySelectorAll(".content-tab")) {
        tabDiv.style.display = "none";
    }
    const curTabSwitch = document.getElementById(`tab-switch-${tab}`);
    curTabSwitch.setAttribute("active-tab","");
    curTabSwitch.previousElementSibling?.setAttribute("left-of-active","");
    curTabSwitch.nextElementSibling?.setAttribute("right-of-active","");
    document.getElementById(`tab-${tab}`).style.display = null;
}

let curScenarioHasUnsavedChanges = false;
let curScenarioPPHasUnsavedChanges = false;

/** @param {boolean} paramPreset */
function confirmImport(paramPreset) {
    if (!(paramPreset ? curScenarioPPHasUnsavedChanges : curScenarioHasUnsavedChanges)) {
        return true;
    }
    return confirm([
        `You have unexported changes in the current scenario${paramPreset ? " parameter preset" : ""}. `,
        "Are you sure you want to import a new one and overwrite these changes ?"
    ].join(""));
}

/**
 * @param {string} path
 * @param {(result:string) => void} callback
 * @returns {Promise<string>}
 */
async function fetchText(path) {
    r = await fetch(path);
    return await r.text();
}

/** @param {boolean} paramPreset */
function removeAutoSave(paramPreset) {
    localStorage.removeItem(`scenario${paramPreset ? "-pp" : ""}-autosave`);
    localStorage.removeItem(`scenario${paramPreset ? "-pp" : ""}-unsaved`);
}

const scenarioPresetImportContainer = document.getElementById("scenario-preset-import-container");
const scenarioPPPresetImportContainer = document.getElementById("scenario-pp-preset-import-container");
for (const [scenarioId,scenarioName] of [
    ["onboarding","Operator Badge"],
    ["default","Regular"],
    ["hard","Hard"],
    ["insane","Insane"],
    ["hexagonal","Hexagonal"],
    ["empty","Empty"]
]) {
    for (const [containerElem,fileName,func,scenarioPP] of [
        [
            scenarioPresetImportContainer,
            `${scenarioId}-scenario`,
            loadScenario,
            false
        ],
        [
            scenarioPPPresetImportContainer,
            `${scenarioId.charAt(0).toUpperCase()+scenarioId.slice(1)}ScenarioParameterPreset`,
            loadScenarioPP,
            true
        ]
    ]) {
        containerElem.appendChild(createElem("input",{
            attrs : {
                type : "button",
                value : scenarioName
            },
            eventListeners : {
                click : () => {
                    if (!confirmImport(scenarioPP)) {
                        return;
                    }
                    fetchText(`/assets/json/gameFiles/${fileName}.json`).then(
                        (r) => func(r,scenarioId !== "empty",`${scenarioName} Preset`)
                    );
                    removeAutoSave(scenarioPP);
                    if (scenarioPP) {
                        curScenarioPPHasUnsavedChanges = false;
                    } else {
                        curScenarioHasUnsavedChanges = false;
                    }
                }
            }
        }));
    }
}

let curConfirmBeforeDelete = true;
let curDoAutoSave = true;
let curColorMode = "RGB";
const curShapeDisplays = new Map();

document.getElementById("delete-confirm-toggle").addEventListener("change",function () {
    curConfirmBeforeDelete = this.checked;
});
document.getElementById("autosave-toggle").addEventListener("change",function () {
    curDoAutoSave = this.checked;
});
document.getElementById("color-mode-select").addEventListener("change",function () {
    curColorMode = this.value;
    for (const [k,v] of curShapeDisplays) {
        updateValue(v.container,v.key,v.container[v.key]);
    }
});

/**
 * @param {boolean} paramPreset
 * @returns {(this:HTMLInputElement) => void}
 */
function fileImportHandler(paramPreset) {

    /** @this HTMLInputElement */
    function inner() {
        if (this.files.length !== 1) {
            return;
        }
        if (!confirmImport(paramPreset)) {
            return;
        }
        this.files[0].text().then(
            (text) => (paramPreset ? loadScenarioPP : loadScenario)(
                text,
                false,
                `Custom Scenario${paramPreset ? " Parameter Preset" : ""}`
            )
        );
        removeAutoSave(paramPreset);
        if (paramPreset) {
            curScenarioPPHasUnsavedChanges = false;
        } else {
            curScenarioHasUnsavedChanges = false;
        }
    }
    return inner;
}
document.getElementById("scenario-file-import").addEventListener(
    "change",
    fileImportHandler(false)
);
document.getElementById("scenario-pp-file-import").addEventListener(
    "change",
    fileImportHandler(true)
);

class OptionalValueFormat_ {
    constructor(valueFormat,defaultValue) {
        this.valueFormat = valueFormat;
        this.defaultValue = defaultValue;
    }
}

class RestrictedValuesFormat_ {
    /** @param {*[]} allowedValues */
    constructor(allowedValues) {
        this.allowedValues = allowedValues;
    }
}

const noFormatCheck = Symbol();
const rewardObject = Symbol();
const costObject = Symbol();

const rewardTypes = [
    "BuildingReward",
    "IslandGroupReward",
    "MechanicReward",
    "WikiEntryReward",
    "BlueprintCurrencyReward",
    "ChunkLimitReward",
    "ResearchPointsReward"
];

const costTypes = [
    "ResearchPointsCost"
];

// just to make copy pasting from python easier
const str = "string";
const int = "number";
const float = "number";
const bool = "boolean";
const None = null;
const True = true;
const False = false;
function OptionalValueFormat(...args) {
    return new OptionalValueFormat_(...args);
}
function RestrictedValuesFormat(...args) {
    return new RestrictedValuesFormat_(...args);
}

const shapeCostsFormat = [
    {
        "Shape" : str,
        "Amount" : int
    }
];

const costFormat = {
    "$type" : RestrictedValuesFormat(costTypes),
    "Amount" : OptionalValueFormat(int,None)
};

const rewardFormat = {
    "$type" : RestrictedValuesFormat(rewardTypes),
    "BuildingDefinitionGroupId" : OptionalValueFormat(str,None),
    "GroupId" : OptionalValueFormat(str,None),
    "MechanicId" : OptionalValueFormat(str,None),
    "EntryId" : OptionalValueFormat(str,None),
    "Amount" : OptionalValueFormat(int,None)
};

const posFormat = {
    "x" : OptionalValueFormat(int,0),
    "y" : OptionalValueFormat(int,0),
    "z" : OptionalValueFormat(int,0)
};

const scenarioFormat = {
    "FormatVersion" : RestrictedValuesFormat([2]),
    "GameVersion" : int,
    "UniqueId" : str,
    "IsTutorial" : OptionalValueFormat(bool,False),
    "SupportedGameModes" : [str],
    "NextScenarios" : [str],
    "ExampleShapes" : [str],
    "Title" : str,
    "Description" : str,
    "PreviewImageId" : str,
    "ResearchConfig" : {
        "BaseChunkLimitMultiplier" : int,
        "BaseBlueprintRewardMultiplier" : int,
        "MaxShapeLayers" : int,
        "InitialResearchPoints" : OptionalValueFormat(int,0),
        "ShapesConfigurationId" : str,
        "ColorSchemeConfigurationId" : str,
        "ResearchLevelsAreProgressive" : bool,
        "BlueprintCurrencyShapes" : [
            {
                "Shape" : str,
                "RequiredUpgradeIds" : [str],
                "RequiredMechanicIds" : [str],
                "Amount" : int
            }
        ],
        "IntroductionWikiEntryId" : str,
        "InitiallyUnlockedUpgrades" : [str],
        "TutorialConfig" : str
    },
    "Progression" : {
        "Levels" : {
            "Levels" : [
                {
                    "Definition" : {
                        "Id" : str,
                        "VideoId" : str,
                        "PreviewImageId" : str,
                        "Title" : str,
                        "Description" : str,
                        "WikiEntryId" : OptionalValueFormat(str,None),
                    },
                    "Lines" : {
                        "Lines" : [
                            {
                                "ReusedAtNextMilestone" : OptionalValueFormat(bool,False),
                                "ReusedAtNextMilestoneOffset" : OptionalValueFormat(int,0),
                                "ReusedAtSameMilestone" : OptionalValueFormat(bool,False),
                                "ReusedAtSameMilestoneOffset" : OptionalValueFormat(int,0),
                                "ReusedForPlayerLevel" : OptionalValueFormat(bool,False),
                                "StartingOffset" : OptionalValueFormat(int,0),
                                "Shapes" : shapeCostsFormat
                            }
                        ]
                    },
                    "Rewards" : {
                        "Rewards" : [rewardObject]
                    }
                }
            ]
        },
        "SideQuestGroups" : {
            "SideQuestGroups" : [
                {
                    "Title" : str,
                    "RequiredUpgradeIds" : [str],
                    "RequiredMechanicIds" : [str],
                    "SideQuests" : [
                        {
                            "Id" : str,
                            "IsFollowupForLevel" : OptionalValueFormat(bool,False),
                            "Rewards" : [rewardObject],
                            "Costs" : shapeCostsFormat
                        }
                    ]
                }
            ]
        },
        "SideUpgrades" : {
            "UpgradeCategories" : [str],
            "SideUpgrades" : [
                {
                    "Id" : str,
                    "PreviewImageId" : str,
                    "VideoId" : OptionalValueFormat(str,None),
                    "Title" : str,
                    "Description" : str,
                    "Hidden" : OptionalValueFormat(bool,False),
                    "Category" : str,
                    "RequiredUpgradeIds" : [str],
                    "RequiredMechanicIds" : [str],
                    "Rewards" : [rewardObject],
                    "Costs" : [costObject]
                }
            ]
        },
        "LinearUpgrades" : {
            "ConverterHubOutputCountUpgradeId" : OptionalValueFormat(str,None),
            "HubInputSizeUpgradeId" : str,
            "ShapeQuantityUpgradeId" : str,
            "SpeedsToLinearUpgradeMappings" : {
                "BeltSpeed" : str,
                "CutterSpeed" : str,
                "StackerSpeed" : str,
                "PainterSpeed" : str,
                "TrainSpeed" : str,
                "TrainCapacity" : str
            },
            "LinearUpgrades" : [
                {
                    "Id" : str,
                    "Title" : str,
                    "DisplayType" : int,
                    "Levels" : [
                        {
                            "Value" : int,
                            "Cost" : OptionalValueFormat(costObject,None)
                        }
                    ],
                    "RequiredUpgradeIds" : [str],
                    "RequiredMechanicIds" : [str],
                    "Category" : str
                }
            ]
        },
    },
    "StartingLocation" : {
        "InitialViewport" : {
            "PositionX" : OptionalValueFormat(float,0.0),
            "PositionY" : OptionalValueFormat(float,0.0),
            "Zoom" : OptionalValueFormat(float,0.0),
            "RotationDegrees" : OptionalValueFormat(float,0.0),
            "Angle" : OptionalValueFormat(float,0.0),
            "BuildingLayer" : OptionalValueFormat(int,0),
            "IslandLayer" : OptionalValueFormat(int,0),
            "ShowAllBuildingLayers" : bool,
            "ShowAllIslandLayers" : bool
        },
        "InitialIslands" : {
            "InitialIslands" : [
                {
                    "Position_GC" : posFormat,
                    "Rotation" : OptionalValueFormat(int,0),
                    "LayoutId" : str
                }
            ]
        },
        "FixedPatches" : {
            "FixedPatches" : [
                {
                    "Shape" : str,
                    "Position_LC" : posFormat,
                    "LocalTiles" : [posFormat]
                }
            ]
        },
        "StartingChunks" : {
            "StartingChunks" : [
                {
                    "SuperChunk" : OptionalValueFormat(posFormat,{"x":0,"y":0,"z":0}),
                    "GuaranteedShapePatches" : [str],
                    "GuaranteedColorPatches" : [str]
                }
            ]
        }
    },
    "PlayerLevelConfig" : {
        "IconicLevelShapes" : {
            "LevelShapes" : [str]
        },
        "IconicLevelShapeInterval" : int,
        "GoalLines" : [
            {
                "Id" : str,
                "Randomized" : OptionalValueFormat(bool,False),
                "RandomizedUseCrystals" : OptionalValueFormat(bool,False),
                "Shape" : OptionalValueFormat(str,None),
                "StartingAmount" : int,
                "ExponentialGrowthPercentPerLevel" : int,
                "RequiredUpgradeIds" : [str],
                "RequiredMechanicIds" : [str]
            }
        ],
        "Rewards" : [
            {
                "MinimumLevel" : OptionalValueFormat(int,0),
                "Rewards" : [rewardObject]
            }
        ]
    },
    "Mechanics" : {
        "Mechanics" : [
            {
                "Id" : str,
                "Title" : str,
                "Description" : str,
                "IconId" : str
            }
        ],
        "BuildingLayerMechanicIds" : [str],
        "IslandLayerMechanicIds" : [str],
        "IslandLayersUnlockOrder" : [int],
        "BlueprintsMechanicId" : str,
        "RailsMechanicId" : str,
        "IslandManagementMechanicId" : str,
        "PlayerLevelMechanicId" : str,
        "TrainHubDeliveryMechanicId" : str
    },
    "ConvertersConfig" : {
        "Configs" : {}
    },
    "ResearchStationConfig" : {
        "Recipes" : {}
    },
    "RailColorsConfig" : {
        "RailColors" : [
            {
                "Id" : {
                    "RailColorId" : str
                },
                "Tint" : str
            }
        ]
    },
    "ToolbarConfig" : noFormatCheck
};

const scenarioPPFormat = {
    "Version" : RestrictedValuesFormat(["1"]),
    "UniqueId" : str,
    "Title" : str,
    "Description" : str,
    "Parameters" : {
        "ScenarioId" : str,
        "MapGenerationParameters": {
            "FluidsSpawnPrimaryColors" : bool,
            "FluidsSpawnSecondaryColors" : bool,
            "FluidsSpawnTertiaryColors" : bool,
            "FluidPatchLikelinessPercent" : int,
            "FluidPatchBaseSize" : int,
            "FluidPatchSizeGrowPercentPerChunk" : int,
            "FluidPatchMaxSize" : int,
            "ShapePatchLikelinessPercent" : int,
            "ShapePatchBaseSize" : int,
            "ShapePatchSizeGrowPercentPerChunk" : int,
            "ShapePatchMaxSize" : int,
            "ShapePatchShapeColorfulnessPercent" : int,
            "ShapePatchRareShapeLikelinessPercent" : int,
            "ShapePatchVeryRareShapeLikelinessPercent" : int,
            "ShapePatchGenerationLikeliness" : [
                {
                    "GenerationType" : str,
                    "MinimumDistanceToOrigin" : int,
                    "LikelinessPerMille" : int
                }
            ]
        },
        "GameRuleParameters" : {
            "RuleIds" : [str]
        }
    }
};

class ScenarioDecodeError extends Error {}

/** @returns {{result:*,warnings:string[]}} */
function getValidObjWithFormat(obj,format) {

    const warningMsgs = [];

    function inner(obj,format) {

        let objType = typeof obj;
        if (Array.isArray(obj)) {
            objType = "array";
        }

        if (typeof format === "object") {

            if (Array.isArray(format)) {

                if (objType !== "array") {
                    throw new ScenarioDecodeError(`Incorrect object type (expected 'array' got '${objType}')`);
                }

                const newObj = [];
                const elemFormat = format[0];

                for (let i = 0; i < obj.length; i++) {
                    const newElem = inner(obj[i],elemFormat);
                    if (typeof newElem === "object") {
                        newElem.index_ = i;
                        newObj.push(newElem);
                    } else {
                        // create a wrapper object for primitives in lists so they are easier to work with
                        newObj.push({
                            index_ : i,
                            value : newElem
                        });
                    }
                }

                return newObj;
            }

            if (format instanceof RestrictedValuesFormat_) {

                if (!format.allowedValues.includes(obj)) {
                    throw new ScenarioDecodeError(`'${obj}' is not part of [${format.allowedValues}]`);
                }

                return obj;
            }

            // object

            if (objType !== "object") {
                throw new ScenarioDecodeError(`Incorrect object type (expected 'object' got '${objType}')`);
            }

            const newObj = {};

            for (const formatKey in format) {
                const formatValue = format[formatKey];

                const objValue = obj[formatKey];

                if (formatValue instanceof OptionalValueFormat_) {
                    if (objValue === undefined) {
                        newObj[formatKey] = formatValue.defaultValue;
                    } else if (objValue === formatValue.defaultValue) {
                        newObj[formatKey] = objValue;
                    } else {
                        newObj[formatKey] = inner(objValue,formatValue.valueFormat);
                    }
                } else {
                    if (objValue === undefined) {
                        throw new ScenarioDecodeError(`Missing dict key ('${formatKey}')`);
                    }
                    newObj[formatKey] = inner(objValue,formatValue);
                }
            }

            for (const key in obj) {
                if (format[key] === undefined) {
                    warningMsgs.push(`Skipping key '${key}'`);
                }
            }

            return newObj;

        }

        if (format === rewardObject) {

            const newObj = inner(obj,rewardFormat);

            for (const [rewardType,rewardKey] of [
                ["BuildingReward","BuildingDefinitionGroupId"],
                ["IslandGroupReward","GroupId"],
                ["MechanicReward","MechanicId"],
                ["WikiEntryReward","EntryId"],
                ["BlueprintCurrencyReward","Amount"],
                ["ChunkLimitReward","Amount"],
                ["ResearchPointsReward","Amount"]
            ]) {
                if ((newObj["$type"] === rewardType) && (newObj[rewardKey] === undefined)) {
                    throw new ScenarioDecodeError(`Missing '${rewardKey}' key in '${rewardType}'`);
                }
            }

            return newObj;
        }

        if (format === costObject) {

            const newObj = inner(obj,costFormat);

            for (const [costType,costKey] of [
                ["ResearchPointsCost","Amount"]
            ]) {
                if ((newObj["$type"] === costType) && (newObj[costKey] === undefined)) {
                    throw new ScenarioDecodeError(`Missing '${costKey}' key in '${costType}'`);
                }
            }

            return newObj;
        }

        if (format === noFormatCheck) {
            return obj;
        }

        if (((format === "null") && (obj !== null)) || (objType !== format)) {
            throw new ScenarioDecodeError(`Incorrect object type (expected '${format}' got '${objType}')`);
        }

        return obj;

    }

    return {
        result : inner(obj,format),
        warnings : warningMsgs
    };
}

/**
 * @param {string} rawObj
 * @param {string} objName
 * @param {HTMLElement} outputContainer
 * @returns {{valid:boolean,decodedObj?:*}}
 */
function decodeJSONWithFormat(rawObj,format,objName,outputContainer) {

    outputContainer.innerHTML = "";

    function outputError(msg) {
        outputContainer.appendChild(createElem("p",{
            elemClass : "error",
            innerText : `Failed to load '${objName}' : ${msg}`
        }));
    }

    let jsonParsed;
    try {
        jsonParsed = JSON.parse(rawObj);
    } catch (error) {
        if (error instanceof SyntaxError) {
            outputError(`Invalid JSON format : ${error.message}`);
            return {valid:false};
        }
        throw error;
    }

    let formatParsed;
    let warnings;
    try {
        ({result:formatParsed,warnings:warnings} = getValidObjWithFormat(jsonParsed,format));
    } catch (error) {
        if (error instanceof ScenarioDecodeError) {
            outputError(`Invalid object format : ${error.message}`);
            return {valid:false};
        }
        throw error;
    }

    if (warnings.length === 0) {
        outputContainer.appendChild(createElem("p",{
            elemClass : "success",
            innerText : `'${objName}' loaded successfully`
        }));
    } else {
        outputContainer.appendChild(createElem("p",{
            elemClass : "warning",
            innerText : `'${objName}' loaded with warnings :`
        }));
        for (const warning of warnings) {
            outputContainer.appendChild(createElem("p",{
                elemClass : "warning",
                innerText : warning
            }));
        }
    }

    return {valid:true,decodedObj:formatParsed};
}

let shapeViewer;
let translations;
let identifiers;
let islands;

const defaultGameMode = "RegularGameMode";
const quadShapesConfig = "DefaultShapesQuadConfiguration";
const hexShapesConfig = "DefaultShapesHexagonalConfiguration";
const defaultColorScheme = "DefaultColorSchemeRGBFlex";

let curScenario;
let curScenarioPP;
let curScenarioPPIdInput;
let curScenarioPPIdInputIsSuggested;
let curScenarioPPScenarioInput;
let curScenarioPPScenarioInputIsSuggested;

/**
 * @param {string} key
 * @returns {string}
 */
function getTranslation(key) {
    if (!key.startsWith("@")) {
        return key;
    }
    key = key.slice(1);
    return translations[key] ?? key
}

function updateProblemsDisplay() {
    for (const problemType of ["error","warning"]) {
        const countDisplay = document.getElementById(`${problemType}-count-display`);
        const displayHeader = document.getElementById(`${problemType}s-display-header`)
        const container = document.getElementById(`${problemType}s-display-container`);
        if (container.childElementCount === 0) {
            countDisplay.style.display = "none";
            displayHeader.style.display = "none";
        } else {
            countDisplay.style.display = null;
            countDisplay.innerText = container.childElementCount;
            displayHeader.style.display = null;
        }
    }
}

/**
 * @param {{
 * callback:(newValue) => {
 * problemType:boolean|null,
 * problemMsg?:string|() => string,
 * problemSource?:HTMLElement
 * }|undefined,
 * problemMsg?:() => string,
 * problemDisplay?:HTMLElement,
 * problemSource?:HTMLElement
 * }} data
 */
function executeValueUpdateEventListener(data,newValue) {

    const result = data.callback(newValue);

    if (result === undefined) {
        return;
    }

    if (data.problemDisplay !== undefined) {
        data.problemDisplay.remove();
        delete data.problemDisplay;
    }
    data.problemSource?.classList.remove("warning-source","error-source");

    if (result.problemType === null) {
        return;
    }

    const idString = result.problemType ? "error" : "warning";
    data.problemMsg = () => typeof result.problemMsg === "string" ? result.problemMsg : result.problemMsg();
    const problemDisplay = createElem("li",{
        elemClass : idString,
        innerText : data.problemMsg()
    });
    data.problemDisplay = problemDisplay;
    document.getElementById(`${idString}s-display-container`).appendChild(problemDisplay);

    result.problemSource.classList.add(`${idString}-source`);
    data.problemSource = result.problemSource;
}

/**
 * @param {string} objKey
 * @param {string} adderId
 * @param {(newValue) => {
 * problemType:boolean|null,
 * problemMsg?:string|() => string,
 * problemSource?:HTMLElement
 * }|undefined} callback
 */
function addValueUpdateEventListener(
    containerObj,
    objKey,
    adderId,
    callback,
    initCall=false
) {

    if (containerObj._eventListeners === undefined) {
        containerObj._eventListeners = {};
    }
    if (containerObj._eventListeners[objKey] === undefined) {
        containerObj._eventListeners[objKey] = {};
    }
    containerObj._eventListeners[objKey][adderId] = {callback:callback};

    if (initCall) {
        executeValueUpdateEventListener(
            containerObj._eventListeners[objKey][adderId],
            containerObj[objKey]
        );
        updateProblemsDisplay();
    }
}

/** @param {string} objKey */
function updateValue(containerObj,objKey,newValue,paramPreset=false) {

    const oldValue = containerObj[objKey];
    containerObj[objKey] = newValue;

    const curEventListeners = containerObj._eventListeners?.[objKey];
    if (curEventListeners) {
        for (const id in curEventListeners) {
            executeValueUpdateEventListener(curEventListeners[id],newValue);
        }
    }

    updateProblemsDisplay();

    if (newValue !== oldValue) {
        if (paramPreset) {
            madeScenarioPPChange();
        } else {
            madeScenarioChange();
        }
    }
}

/**
 * @param {*[]} listObj
 * @param {string} adderId
 * @param {() => void} callback
 */
function addListUpdateEventListener(listObj,adderId,callback) {

    if (listObj._eventListeners === undefined) {
        listObj._eventListeners = {};
    }
    listObj._eventListeners[adderId] = callback;
}

function updateObjProblems(obj,remove=false) {

    function processObj(obj) {

        if ((typeof obj !== "object") || (obj === null)) {
            return;
        }

        if (Array.isArray(obj)) {
            for (const elem of obj) {
                processObj(elem);
            }
        } else {

            if ((remove) && (obj._onRemove !== undefined)) {
                for (const id in obj._onRemove) {
                    obj._onRemove[id]();
                }
            }

            for (const key in obj) {

                if (key === "_eventListeners") {
                    continue;
                }
                if (key === "_onRemove") {
                    continue;
                }

                const curEventListeners = obj._eventListeners?.[key];
                if (curEventListeners) {
                    for (const id in curEventListeners) {
                        const curData = curEventListeners[id];
                        if (remove) {
                            curData.problemDisplay?.remove();
                        } else {
                            if (curData.problemDisplay !== undefined) {
                                curData.problemDisplay.innerText = curData.problemMsg();
                            }
                        }
                    }
                }

                processObj(obj[key]);
            }
        }
    }

    processObj(obj);

    if (remove) {
        updateProblemsDisplay();
    }
}

/**
 * @param {*[]} listObj
 * @param {boolean} paramPreset
 */
function executeListUpdateEventListeners(listObj,paramPreset) {

    for (let i = 0; i < listObj.length; i++) {
        updateValue(listObj[i],"index_",i,paramPreset);
    }

    updateObjProblems(listObj);

    if (listObj._eventListeners !== undefined) {
        for (const id in listObj._eventListeners) {
            listObj._eventListeners[id]();
        }
    }

    if (paramPreset) {
        madeScenarioPPChange();
    } else {
        madeScenarioChange();
    }
}

/**
 * @param {*[]} listObj
 * @param {number} index
 */
function insertListElem(listObj,index,elem,paramPreset=false) {

    listObj.splice(index,0,elem);

    executeListUpdateEventListeners(listObj,paramPreset);
}

/** @param {*[]} listObj */
function addListElem(listObj,elem,paramPreset=false) {
    insertListElem(
        listObj,
        listObj.length,
        elem,
        paramPreset
    );
}

/**
 * @param {*[]} listObj
 * @param {number} index
 */
function swapListElemWithNext(listObj,index,paramPreset=false) {

    listObj.splice(index+1,0,listObj.splice(index,1)[0]);
}

/**
 * @param {string} adderId
 * @param {() => void} callback
 */
function addRemoveEventListener(containerObj,adderId,callback) {

    if (containerObj._onRemove == undefined) {
        containerObj._onRemove = {};
    }
    containerObj._onRemove[adderId] = callback;
}

/**
 * @param {*[]} listObj
 * @param {number} index 
 */
function removeListElem(listObj,index,paramPreset=false) {

    const removedObj = listObj.splice(index,1)[0];

    updateObjProblems(removedObj,true);

    executeListUpdateEventListeners(listObj,paramPreset);
}

/** @param {string} elemName */
function confirmDelete(elemName) {
    if (!curConfirmBeforeDelete) {
        return true;
    }
    return confirm([
        `Are you sure you want to delete this ${elemName} ?`,
        "Tip : you can disable this popup with the setting in the top right."
    ].join("\n"));
}

/**
 * @param {"keyValueList"
 * |"string"
 * |"suggestedValueString"
 * |"suggestedValuesString"
 * |"simpleList"
 * |"complexList"
 * |"shape"
 * |"number"
 * |"boolean"
 * } type
 * @param {{
 * elemClass?:string|string[],
 * constructNoValue?:() => HTMLElement[],
 * constructNewElem?:() => *,
 * constructWithValue?:(value,delButton:HTMLInputElement) => HTMLElement,
 * label?:string,
 * labelTooltip?:string,
 * containerObj?:*,
 * objKey?:string,
 * defaultSuggestedValue?:string,
 * suggestedValueSwitch?:(newValue:boolean) => void,
 * paramPreset?:boolean,
 * useTextArea?:boolean,
 * dataListId?:string,
 * problemType?:boolean,
 * acceptedValues?:string[],
 * problemMsg?:string|() => string,
 * innerElemName?:string,
 * shapeToProduce?:boolean,
 * verticalList?:boolean,
 * numberUnit?:string
 * }} options
 * @returns {HTMLElement|HTMLElement[]}
 */
function makeUIElem(type,options) {

    if (options.paramPreset === undefined) {
        options.paramPreset = false;
    }
    if (options.useTextArea === undefined) {
        options.useTextArea = false;
    }
    if (options.shapeToProduce === undefined) {
        options.shapeToProduce = true;
    }
    if (options.verticalList === undefined) {
        options.verticalList = false;
    }

    if (type === "keyValueList") {
        let computedElemClass;
        if (options.elemClass === undefined) {
            computedElemClass = "key-value-list";
        } else if (typeof options.elemClass === "string") {
            computedElemClass = [options.elemClass,"key-value-list"];
        } else {
            computedElemClass = options.elemClass.concat("kay-value-list");
        }
        return createElem("div",{
            elemClass : computedElemClass,
            children : options.constructNoValue()
        });
    }

    let labelElem;
    if (options.label !== undefined) {
        if (options.labelTooltip) {
            labelElem = createElem("abbr",{
                innerText : options.label,
                attrs : {title : options.labelTooltip}
            });
        } else {
            labelElem = createElem("span",{innerText:options.label});
        }
    }

    if ((type === "simpleList") || (type === "complexList")) {
        const referredToList = options.containerObj[options.objKey];
        function createListElem(value) {
            const delButton = createElem("input",{
                elemClass : "delete-button",
                attrs : {
                    type : "button",
                    value : "X"
                },
                eventListeners : {
                    "click" : () => {
                        if (!confirmDelete(options.innerElemName)) {
                            return;
                        }
                        removeListElem(
                            referredToList,
                            value.index_,
                            options.paramPreset
                        );
                    }
                }
            });
            const innerElem = options.constructWithValue(value,delButton);
            addRemoveEventListener(value,"standardUIUpdate",() => innerElem.remove());
            return innerElem;
        }
        return [
            labelElem,
            createElem("div",{
                elemClass : ["simple-list",options.verticalList ? "vertical" : "horizontal"],
                children : referredToList.map(
                    createListElem
                ).concat(createElem("input",{
                    elemClass : "list-add",
                    attrs : {
                        type : "button",
                        value : "+"
                    },
                    eventListeners : {
                        "click" : function () {
                            const newValue = options.constructNewElem();
                            addListElem(
                                referredToList,
                                newValue,
                                options.paramPreset
                            );
                            this.insertAdjacentElement(
                                "beforebegin",
                                createListElem(newValue)
                            );
                        }
                    }
                }))
            })
        ];
    }

    function curUpdateValue(newValue) {
        updateValue(
            options.containerObj,
            options.objKey,
            newValue,
            options.paramPreset
        );
    }

    /** @param {string} end */
    function concatProblemMsg(end) {
        function inner() {
            if (typeof options.problemMsg === "string") {
                return options.problemMsg + end;
            }
            return options.problemMsg() + end;
        }
        return inner;
    }

    const curStartingValue = options.containerObj[options.objKey];

    if (
        (type === "string")
        || (type === "suggestedValueString")
        || (type === "suggestedValuesString")
        || (type === "number")
        || (type === "boolean")
    ) {

        const inputElemAttrs = {};

        if (type === "number") {
            inputElemAttrs.type = "number";
        } else if (type === "boolean") {
            inputElemAttrs.type = "checkbox";
        } else if (!options.useTextArea) {
            inputElemAttrs.type = "text";
        }

        if (type === "boolean") {
            inputElemAttrs.checked = curStartingValue;
        } else {
            inputElemAttrs.value = curStartingValue;
        }

        const inputElem = createElem(
            options.useTextArea ? "textarea" : "input",
            {
                attrs : inputElemAttrs,
                eventListeners : {
                    "input" : function () {
                        let newValue;
                        if (type === "number") {
                            if (this.value === "") {
                                newValue = 0;
                            } else {
                                newValue = parseInt(this.value);
                            }
                        } else if (type === "boolean") {
                            newValue = this.checked;
                        } else {
                            newValue = this.value;
                        }
                        curUpdateValue(newValue);
                    }
                }
            }
        );

        const labelAndInputContainer = createElem("label",{
            children : (
                labelElem === undefined
                ? [inputElem]
                : [labelElem,inputElem]
            )
        });

        const finalElem = createElem("div",{
            elemClass : options.elemClass,
            children : [labelAndInputContainer]
        });

        if (type === "number") {
            addValueUpdateEventListener(
                options.containerObj,
                options.objKey,
                "standardOutOfRangeError",
                (newValue) => {
                    if ((newValue >= -(2**31)) && (newValue <= (2**31)-1)) {
                        return {problemType:null};
                    }
                    return {
                        problemType : true,
                        problemMsg : concatProblemMsg(" : number is outside the int32 range."),
                        problemSource : inputElem
                    }
                },
                true
            );
            if (options.numberUnit !== undefined) {
                labelAndInputContainer.appendChild(createElem("span",{
                    elemClass : "number-unit",
                    innerText : options.numberUnit
                }));
            }
        }

        if (
            (type === "string")
            || (type === "number")
            || (type === "boolean")
        ) {
            return [
                finalElem,
                inputElem
            ];
        }

        if (type === "suggestedValuesString") {

            inputElem.setAttribute("list",options.dataListId);

            if (options.problemType !== undefined) {
                addValueUpdateEventListener(
                    options.containerObj,
                    options.objKey,
                    "inDataListVerifier",
                    (newValue) => {
                        if (options.acceptedValues.includes(newValue)) {
                            return {problemType:null};
                        }
                        return {
                            problemType : options.problemType,
                            problemMsg : options.problemMsg,
                            problemSource : inputElem
                        };
                    },
                    true
                );
            }

            return finalElem;
        }

        const suggestedValueElem = createElem("input",{
            attrs : {
                type : "text",
                value : options.defaultSuggestedValue,
                readOnly : true
            }
        })

        let isSuggestedValue = curStartingValue === options.defaultSuggestedValue;

        if (isSuggestedValue) {
            inputElem.style.display = "none";
        } else {
            suggestedValueElem.style.display = "none";
        }

        const swicthToCustomIcon = "\u2699\ufe0f";
        const switchToSuggestedIcon = "\u{1f4a1}";
        const swicthToCustomText = "Switch to custom value";
        const switchToSuggestedText = "Switch to suggested value";
        const suggestedSwitchElem = createElem("input",{
            elemClass : "suggest-switch",
            attrs : {
                type : "button",
                value : isSuggestedValue ? swicthToCustomIcon : switchToSuggestedIcon,
                title : isSuggestedValue ? swicthToCustomText : switchToSuggestedText
            },
            eventListeners : {
                "click" : () => {
                    isSuggestedValue = !isSuggestedValue
                    if (isSuggestedValue) {
                        suggestedSwitchElem.value = swicthToCustomIcon;
                        suggestedSwitchElem.title = swicthToCustomText;
                        inputElem.style.display = "none";
                        suggestedValueElem.style.display = null;
                    } else {
                        suggestedSwitchElem.value = switchToSuggestedIcon;
                        suggestedSwitchElem.title = switchToSuggestedText;
                        suggestedValueElem.style.display = "none";
                        inputElem.style.display = null;
                    }
                    curUpdateValue(isSuggestedValue ? suggestedValueElem.value : inputElem.value);
                    options.suggestedValueSwitch?.(isSuggestedValue);
                }
            }
        });

        options.suggestedValueSwitch?.(isSuggestedValue);

        labelAndInputContainer.appendChild(suggestedValueElem);
        finalElem.appendChild(suggestedSwitchElem);

        return [
            finalElem,
            inputElem,
            suggestedValueElem
        ];
    }

    if (type === "shape") {

        const inputElem = createElem("input",{
            elemClass : "shape-code-input",
            attrs : {
                type : "text",
                value : curStartingValue
            },
            eventListeners : {
                "input" : function () {curUpdateValue(this.value);}
            }
        });
        const canvasElem = createElem("canvas",{
            attrs : {
                width : 50,
                height : 50
            }
        });

        const shapeDisplayKey = Symbol();
        curShapeDisplays.set(shapeDisplayKey,{container:options.containerObj,key:options.objKey});
        addRemoveEventListener(
            options.containerObj,
            "standardShapeDisplayRemove",
            () => curShapeDisplays.delete(shapeDisplayKey)
        );

        addValueUpdateEventListener(
            options.containerObj,
            options.objKey,
            "shapeRender",
            (newValue) => {

                const deducedShapesConfig = (
                    curScenario["ResearchConfig"]["ShapesConfigurationId"] === hexShapesConfig
                    ? "hex"
                    : "quad"
                );
                const validShapeCodeResult = shapeViewer.isShapeCodeValid(newValue,deducedShapesConfig);

                if (validShapeCodeResult.valid) {

                    shapeViewer.renderShape(
                        canvasElem.getContext("2d"),
                        50,
                        newValue,
                        deducedShapesConfig,
                        curColorMode.toLowerCase()
                    );

                    if (
                        (newValue.split(":")[0].length === (deducedShapesConfig === "hex" ? 12 : 8))
                        || (!options.shapeToProduce)
                    ) {
                        return {problemType:null};
                    }

                    return {
                        problemType : false,
                        problemMsg : concatProblemMsg(
                            " : The number of parts per layer doesn't match the current shapes configuration."
                        ),
                        problemSource : inputElem
                    };
                }

                return {
                    problemType : true,
                    problemMsg : concatProblemMsg(
                        ` : Invalid shape code : ${validShapeCodeResult.msg}.`
                    ),
                    problemSource : inputElem
                };
            },
            true
        );

        return createElem("div",{
            elemClass : "shape-and-preview-container",
            children : [
                inputElem,
                canvasElem
            ]
        });
    }
}

/**
 * @param {string} objKey
 * @param {string} dependencyObjKey
 * @param {string} label
 * @param {(dependency) => string} valueTransform
 * @param {string} eventListenerId
 * @returns {HTMLDivElement}
 */
function standardSingleDependencySuggestedString(
    containerObj,
    objKey,
    dependencyContainerObj,
    dependencyObjKey,
    label,
    valueTransform,
    eventListenerId,
    paramPreset=false,
    useTextArea=false
) {
    let isSuggested;
    const [containerElem,,suggestedElem] = makeUIElem("suggestedValueString",{
        label : label,
        containerObj : containerObj,
        objKey : objKey,
        defaultSuggestedValue : valueTransform(dependencyContainerObj[dependencyObjKey]),
        suggestedValueSwitch : (v) => {
            isSuggested = v;
        },
        paramPreset : paramPreset,
        useTextArea : useTextArea
    });
    addValueUpdateEventListener(
        dependencyContainerObj,
        dependencyObjKey,
        eventListenerId,
        (v) => {
            const newValue = valueTransform(v)
            suggestedElem.value = newValue;
            if (isSuggested) {
                updateValue(containerObj,objKey,newValue,paramPreset);
            }
        }
    );
    return containerElem;
}

/**
 * @param {string} idKey
 * @param {string} translationKey
 */
function standardTitleInput(containerObj,idKey,translationKey,paramPreset=false) {
    return standardTranslationPreview(
        standardSingleDependencySuggestedString(
            containerObj,
            "Title",
            containerObj,
            idKey,
            "Title",
            (id) => `@${translationKey}.${id}.title`,
            "standardTitleSuggest",
            paramPreset
        ),
        containerObj,
        "Title"
    );
}

/**
 * @param {string} idKey
 * @param {string} translationKey
 */
function standardDescriptionInput(containerObj,idKey,translationKey,paramPreset=false) {
    return standardTranslationPreview(
        standardSingleDependencySuggestedString(
            containerObj,
            "Description",
            containerObj,
            idKey,
            "Description",
            (id) => `@${translationKey}.${id}.description`,
            "standardDescriptionSuggest",
            paramPreset,
            true
        ),
        containerObj,
        "Description"
    );
}

/**
 * @param {HTMLDivElement} uiElem
 * @param {string} objKey
 */
function standardTranslationPreview(uiElem,containerObj,objKey) {
    const previewElem = createElem("code");
    const holder = createElem("span",{
        elemClass : "translation-preview",
        children : [
            createElem("span",{innerText:"→"}),
            previewElem
        ]
    });
    uiElem.appendChild(holder);
    addValueUpdateEventListener(
        containerObj,
        objKey,
        "standardTranslationPreview",
        (newValue) => {previewElem.innerText = getTranslation(newValue);},
        true
    );
    return uiElem;
}

/**
 * @param {string} rawScenarioText
 * @param {boolean} replaceId
 * @param {string} name
 */
function loadScenario(rawScenarioText,replaceId,name) {

    const {valid,decodedObj} = decodeJSONWithFormat(
        rawScenarioText,
        scenarioFormat,
        name,
        document.getElementById("scenario-import-output")
    );

    if (!valid) {
        return;
    }

    const defaultId = "your-name.scenario-name";

    if (replaceId) {
        decodedObj["UniqueId"] = defaultId;
    }

    if (decodedObj["SupportedGameModes"].length === 0) {
        decodedObj.supportedGameMode_ = "";
    } else {
        decodedObj.supportedGameMode_ = decodedObj["SupportedGameModes"][0].value
    }

    const toUpdateRewards = [];

    for (const milestone of decodedObj["Progression"]["Levels"]["Levels"]) {
        toUpdateRewards.push(milestone["Rewards"]);
    }
    for (const taskGroup of decodedObj["Progression"]["SideQuestGroups"]["SideQuestGroups"]) {
        for (const task of taskGroup["SideQuests"]) {
            toUpdateRewards.push(task);
        }
    }
    for (const sideUpgrade of decodedObj["Progression"]["SideUpgrades"]["SideUpgrades"]) {
        toUpdateRewards.push(sideUpgrade);
    }
    for (const OLReward of decodedObj["PlayerLevelConfig"]["Rewards"]) {
        toUpdateRewards.push(OLReward);
    }

    for (const rewardsContainer of toUpdateRewards) {
        const newObj = {
            buildings : [],
            islandGroups : [],
            mechanics : [],
            wikiEntries : [],
            blueprintPoints : 0,
            platformLimit : 0,
            researchPoints : 0
        };
        for (const reward of rewardsContainer["Rewards"]) {
            const rType = reward["$type"];
            if (rType === "BuildingReward") {
                newObj.buildings.push({
                    value : reward["BuildingDefinitionGroupId"]
                });
            } else if (rType === "IslandGroupReward") {
                newObj.islandGroups.push({
                    value : reward["GroupId"]
                });
            } else if (rType === "MechanicReward") {
                newObj.mechanics.push({
                    value : reward["MechanicId"]
                });
            } else if (rType === "WikiEntryReward") {
                newObj.wikiEntries.push({
                    value : reward["EntryId"]
                });
            } else if (rType === "BlueprintCurrencyReward") {
                newObj.blueprintPoints += reward["Amount"];
            } else if (rType === "ChunkLimitReward") {
                newObj.platformLimit += reward["Amount"];
            } else if (rType === "ResearchPointsReward") {
                newObj.researchPoints += reward["Amount"];
            }
        }
        rewardsContainer.rewards_ = newObj;
    }

    for (const sideUpgrade of decodedObj["Progression"]["SideUpgrades"]["SideUpgrades"]) {
        let curCost = 0;
        for (const costObj of sideUpgrade["Costs"]) {
            curCost += costObj["Amount"];
        }
        sideUpgrade.cost_ = curCost;
    }

    decodedObj["ToolbarConfig"] = "#include_raw:Scenarios/Shared/Toolbar/ToolbarConfig";

    if (curScenario !== undefined) {
        updateObjProblems(curScenario,true);
    }

    curScenario = decodedObj;

    const configTab = document.getElementById("tab-config");
    configTab.innerHTML = "";
    configTab.appendChild(makeUIElem("keyValueList",{
        elemClass : "main",
        constructNoValue : () => {

            addValueUpdateEventListener(
                curScenario,
                "UniqueId",
                "paramPresetTransfer",
                (newValue) => {
                    const suggestedPPId = newValue + "-parameter-preset";
                    curScenarioPPIdInput.value = suggestedPPId;
                    if (curScenarioPPIdInputIsSuggested) {
                        updateValue(curScenarioPP,"UniqueId",suggestedPPId,true);
                    }
                    const suggestedPPScenarioId = newValue;
                    curScenarioPPScenarioInput.value = suggestedPPScenarioId;
                    if (curScenarioPPScenarioInputIsSuggested) {
                        updateValue(curScenarioPP["Parameters"],"ScenarioId",suggestedPPScenarioId,true);
                    }
                },
                curScenarioPP !== undefined
            );

            const [idElem,idInput] = makeUIElem("string",{
                label : "ID",
                labelTooltip : "The ID used by the game to identify the scenario, so it has to be unique.",
                containerObj : curScenario,
                objKey : "UniqueId"
            });

            addValueUpdateEventListener(
                curScenario,
                "UniqueId",
                "nonUniqueWarning",
                (newValue) => {
                    if (newValue === defaultId) {
                        return {
                            problemType : false,
                            problemMsg : "The scenario ID is the default value, it can conflict with other scenarios made using this app.",
                            problemSource : idInput
                        };
                    }
                    return {problemType:null};
                },
                true
            );

            const [tutorialElem,tutorialInput] = makeUIElem("boolean",{
                label : "Tutorial",
                labelTooltip : "Whether to enable tutorial features when playing this scenario.",
                containerObj : curScenario,
                objKey : "IsTutorial"
            });

            addValueUpdateEventListener(
                curScenario,
                "IsTutorial",
                "nextScenariosWarning",
                (newValue) => {
                    if (curScenario["NextScenarios"].length === 0) {
                        return {problemType:null};
                    }
                    if (newValue) {
                        return {problemType:null};
                    }
                    return {
                        problemType : false,
                        problemMsg : "The followup scenarios won't be selectable as the scenario isn't marked as tutorial.",
                        problemSource : tutorialInput
                    };
                },
                true
            );

            addListUpdateEventListener(
                curScenario["NextScenarios"],
                "notTutorialWarning",
                () => updateValue(curScenario,"IsTutorial",curScenario["IsTutorial"])
            );

            const [maxShapeLayersElem,maxShapeLayersInput] = makeUIElem("number",{
                label : "Maximum shape layers",
                containerObj : curScenario["ResearchConfig"],
                objKey : "MaxShapeLayers",
                problemMsg : "Maximum shape layers"
            });

            addValueUpdateEventListener(
                curScenario["ResearchConfig"],
                "MaxShapeLayers",
                "invalidNumLayers",
                (newValue) => {
                    if (newValue > 0) {
                        return {problemType:null};
                    }
                    if (newValue === 0) {
                        return {
                            problemType : false,
                            problemMsg : "A max shape layers value of 0 will be interpreted as 4.",
                            problemSource : maxShapeLayersInput
                        }
                    }
                    return {
                        problemType : true,
                        problemMsg : "Max shape layers can't be negative.",
                        problemSource : maxShapeLayersInput
                    }
                },
                true
            );

            addValueUpdateEventListener(
                curScenario["ResearchConfig"],
                "ShapesConfigurationId",
                "shapeDisplaysUpdate",
                (v) => {
                    for (const [k,v] of curShapeDisplays) {
                        updateValue(v.container,v.key,v.container[v.key]);
                    }
                }
            );

            return [
                idElem,
                standardTitleInput(curScenario,"UniqueId","scenario"),
                standardDescriptionInput(curScenario,"UniqueId","scenario"),
                makeUIElem("suggestedValuesString",{
                    label : "Preview image",
                    containerObj : curScenario,
                    objKey : "PreviewImageId",
                    dataListId : "data-list-images",
                    problemType : true,
                    acceptedValues : identifiers["images"],
                    problemMsg : "Unknown scenario preview image ID."
                }),
                ...makeUIElem("simpleList",{
                    constructNewElem : () => ({value:""}),
                    constructWithValue : (container,delButton) => {
                        const shapeContainer = makeUIElem("shape",{
                            containerObj : container,
                            objKey : "value",
                            problemMsg : () => `Example shape #${container.index_+1}`,
                            shapeToProduce : false
                        });
                        const containerElem = createElem("div",{
                            elemClass : "content-elem",
                            children : [shapeContainer,delButton]
                        });
                        addValueUpdateEventListener(
                            container,
                            "index_",
                            "maxShowedShapes",
                            (newValue) => {
                                if (newValue < 5) {
                                    return {problemType:null};
                                }
                                return {
                                    problemType : false,
                                    problemMsg : () => [
                                        "Only 5 example shapes are showed ingame",
                                        `example shape #${container.index_+1} will be hidden.`
                                    ].join(", "),
                                    problemSource : containerElem
                                };
                            },
                            true
                        )
                        return containerElem;
                    },
                    label : "Example shapes",
                    containerObj : curScenario,
                    objKey : "ExampleShapes",
                    innerElemName : "example shape"
                }),
                makeUIElem("number",{
                    label : "Game version",
                    labelTooltip : "No effect ingame.",
                    containerObj : curScenario,
                    objKey : "GameVersion",
                    problemMsg : "Game version"
                })[0],
                tutorialElem,
                makeUIElem("suggestedValuesString",{
                    label : "Supported game mode",
                    containerObj : curScenario,
                    objKey : "supportedGameMode_",
                    dataListId : "data-list-game-modes",
                    problemType : true,
                    acceptedValues : [defaultGameMode],
                    problemMsg : "Unknown supported game mode ID."
                }),
                ...makeUIElem("simpleList",{
                    constructNewElem : () => ({value:""}),
                    constructWithValue : (container,delButton) => {
                        return createElem("div",{
                            elemClass : "simple-content-elem",
                            children : [
                                makeUIElem("string",{
                                    containerObj : container,
                                    objKey : "value"
                                })[0],
                                delButton
                            ]
                        });
                    },
                    label : "Followup scenarios",
                    labelTooltip : "Scenario IDs that you will be able to choose from when completing all milestones of this scenario.",
                    containerObj : curScenario,
                    objKey : "NextScenarios",
                    innerElemName : "followup scenario",
                    verticalList : true
                }),
                makeUIElem("number",{
                    label : "Blueprint points rewards multiplier",
                    labelTooltip : "Multiplies all BP points rewards in the scenario. Number is a percentage.",
                    containerObj : curScenario["ResearchConfig"],
                    objKey : "BaseBlueprintRewardMultiplier",
                    problemMsg : "BP points rewards multiplier",
                    numberUnit : "%"
                })[0],
                makeUIElem("number",{
                    label : "Platform limit rewards multiplier",
                    labelTooltip : "Multiplies all platform limit rewards in the scenario. Number is a percentage.",
                    containerObj : curScenario["ResearchConfig"],
                    objKey : "BaseChunkLimitMultiplier",
                    problemMsg : "Platform limit rewards multiplier",
                    numberUnit : "%"
                })[0],
                makeUIElem("number",{
                    label : "Initial research points",
                    labelTooltip : "Research points given when starting a save with this scenario.",
                    containerObj : curScenario["ResearchConfig"],
                    objKey : "InitialResearchPoints",
                    problemMsg : "Initial research points"
                })[0],
                maxShapeLayersElem,
                makeUIElem("suggestedValuesString",{
                    label : "Shapes configuration",
                    containerObj : curScenario["ResearchConfig"],
                    objKey : "ShapesConfigurationId",
                    dataListId : "data-list-shapes-configs",
                    problemType : true,
                    acceptedValues : [quadShapesConfig,hexShapesConfig],
                    problemMsg : "Unknown shapes configuration."
                }),
                makeUIElem("suggestedValuesString",{
                    label : "Color scheme",
                    labelTooltip : "Note : a color scheme isn't a color mode, it contains color modes.",
                    containerObj : curScenario["ResearchConfig"],
                    objKey : "ColorSchemeConfigurationId",
                    dataListId : "data-list-color-schemes",
                    problemType : true,
                    acceptedValues : [defaultColorScheme],
                    problemMsg : "Unknown color scheme."
                }),
                makeUIElem("boolean",{
                    label : "Progressive milestone shapes",
                    labelTooltip : [
                        "Checked : classic look of milestone shapes",
                        "Unchecked : milestone shapes are displayed on one line without arrows in between",
                        "This setting won't affect how milestone shapes are displayed in this app."
                    ].join(". "),
                    containerObj : curScenario["ResearchConfig"],
                    objKey : "ResearchLevelsAreProgressive"
                })[0],
                ...makeUIElem("simpleList",{
                    constructNewElem : () => ({
                        Shape : "",
                        RequiredUpgradeIds : [],
                        RequiredMechanicIds : [],
                        Amount : 0
                    }),
                    constructWithValue : (container,delButton) => {
                        return makeUIElem("keyValueList",{
                            elemClass : "content-elem",
                            constructNoValue : () => [
                                createElem("label",{
                                    children : [
                                        createElem("span",{innerText:"Shape"}),
                                        makeUIElem("shape",{
                                            containerObj : container,
                                            objKey : "Shape",
                                            problemMsg : () => `BP shape #${container.index_+1}`
                                        })
                                    ]
                                }),
                                makeUIElem("number",{
                                    label : "BP points",
                                    containerObj : container,
                                    objKey : "Amount",
                                    problemMsg : () => `BP shape #${container.index_+1} points reward`
                                })[0],
                                delButton
                            ]
                        });
                    },
                    label : "Blueprint shapes",
                    containerObj : curScenario["ResearchConfig"],
                    objKey : "BlueprintCurrencyShapes",
                    innerElemName : "blueprint shape"
                })
            ];
        }
    }));
}

/**
 * @param {string} rawScenarioPPText
 * @param {boolean} replaceId
 * @param {string} name
*/
function loadScenarioPP(rawScenarioPPText,replaceId,name) {

    const {valid,decodedObj} = decodeJSONWithFormat(
        rawScenarioPPText,
        scenarioPPFormat,
        name,
        document.getElementById("scenario-pp-import-output")
    );

    if (!valid) {
        return;
    }

    const defaultSuggestedId = curScenario["UniqueId"] + "-parameter-preset";
    const defaultSuggestedScenarioId = curScenario["UniqueId"];

    if (replaceId) {
        decodedObj["UniqueId"] = defaultSuggestedId;
        decodedObj["Parameters"]["ScenarioId"] = defaultSuggestedScenarioId;
    }

    if (curScenarioPP !== undefined) {
        updateObjProblems(curScenarioPP,true);
    }

    curScenarioPP = decodedObj;

    const paramPresetTab = document.getElementById("tab-paramPreset");
    paramPresetTab.innerHTML = "";
    paramPresetTab.appendChild(makeUIElem("keyValueList",{
        constructNoValue : () => {
            const [ppIdElem,,ppIdSuggestedElem] = makeUIElem("suggestedValueString",{
                label : "ID",
                labelTooltip : "The ID used by the game to identify the scenario parameter preset, so it has to be unique.",
                containerObj : curScenarioPP,
                objKey : "UniqueId",
                defaultSuggestedValue : defaultSuggestedId,
                suggestedValueSwitch : (newValue) => {
                    curScenarioPPIdInputIsSuggested = newValue;
                },
                paramPreset : true
            })
            curScenarioPPIdInput = ppIdSuggestedElem;
            const [scenarioIdElem,,scenarioIdSuggestedElem] = makeUIElem("suggestedValueString",{
                label : "Scenario",
                labelTooltip : "The ID of the scenario that will be used with this parameter preset.",
                containerObj : curScenarioPP["Parameters"],
                objKey : "ScenarioId",
                defaultSuggestedValue : defaultSuggestedScenarioId,
                suggestedValueSwitch : (newValue) => {
                    curScenarioPPScenarioInputIsSuggested = newValue;
                },
                paramPreset : true
            })
            curScenarioPPScenarioInput = scenarioIdSuggestedElem;
            return [
                ppIdElem,
                scenarioIdElem,
                standardTitleInput(curScenarioPP,"UniqueId","scenario-preset",true),
                standardDescriptionInput(curScenarioPP,"UniqueId","scenario-preset",true)
            ];
        }
    }));
}

function encodeObjWithFormat(obj,format) {

    if (typeof format === "object") {

        if (Array.isArray(format)) {
            return obj.map((objElem) => encodeObjWithFormat(objElem,format[0]));
        }

        if (format instanceof RestrictedValuesFormat_) {
            return obj;
        }

        // object

        const newObj = {};

        for (const formatKey in format) {
            const formatValue = format[formatKey];
            const objValue = obj[formatKey];

            if (formatValue instanceof OptionalValueFormat_) {
                if ((objValue === undefined) || (objValue === formatValue.defaultValue)) {
                    continue;
                }
                newObj[formatKey] = encodeObjWithFormat(objValue,formatValue.valueFormat);
            } else {
                newObj[formatKey] = encodeObjWithFormat(objValue,formatValue);
            }
        }

        return newObj;
    }

    if (format === rewardObject) {
        return encodeObjWithFormat(obj,rewardFormat);
    }

    if (format === costObject) {
        return encodeObjWithFormat(obj,costFormat);
    }

    if (format === noFormatCheck) {
        return obj;
    }

    if (typeof obj === "object") { // a primitive that was wrapped because it's in a list
        console.assert(obj.value !== undefined,"primitive wrapper doesn't have a value");
        return obj.value;
    }

    return obj;
}

function encodeJSONWithFormat(obj,format) {
    return JSON.stringify(encodeObjWithFormat(obj,format),null,4);
}

function exportScenario() {

    curScenario["SupportedGameModes"] = [
        {
            value : curScenario.supportedGameMode_
        }
    ];

    const toUpdateRewards = [];

    for (const milestone of curScenario["Progression"]["Levels"]["Levels"]) {
        toUpdateRewards.push(milestone["Rewards"]);
    }
    for (const taskGroup of curScenario["Progression"]["SideQuestGroups"]["SideQuestGroups"]) {
        for (const task of taskGroup["SideQuests"]) {
            toUpdateRewards.push(task);
        }
    }
    for (const sideUpgrade of curScenario["Progression"]["SideUpgrades"]["SideUpgrades"]) {
        toUpdateRewards.push(sideUpgrade);
    }
    for (const OLReward of curScenario["PlayerLevelConfig"]["Rewards"]) {
        toUpdateRewards.push(OLReward);
    }

    for (const rewardsContainer of toUpdateRewards) {
        const rewardObj = rewardsContainer.rewards_;
        const newObj = [];
        for (const building of rewardObj.buildings) {
            newObj.push({
                "$type" : "BuildingReward",
                "BuildingDefinitionGroupId" : building.value
            });
        }
        for (const islandGroup of rewardObj.islandGroups) {
            newObj.push({
                "$type" : "IslandGroupReward",
                "GroupId" : islandGroup.value
            });
        }
        for (const mechanic of rewardObj.mechanics) {
            newObj.push({
                "$type" : "MechanicReward",
                "MechanicId" : mechanic.value
            });
        }
        for (const wikiEntry of rewardObj.wikiEntries) {
            newObj.push({
                "$type" : "WikiEntryReward",
                "EntryId" : wikiEntry.value
            });
        }
        if (rewardObj.blueprintPoints !== 0) {
            newObj.push({
                "$type" : "BlueprintCurrencyReward",
                "Amount" : rewardObj.blueprintPoints
            });
        }
        if (rewardObj.platformLimit !== 0) {
            newObj.push({
                "$type" : "ChunkLimitReward",
                "Amount" : rewardObj.platformLimit
            });
        }
        if (rewardObj.researchPoints !== 0) {
            newObj.push({
                "$type" : "ResearchPointsReward",
                "Amount" : rewardObj.researchPoints
            });
        }
        rewardsContainer["Rewards"] = newObj;
    }

    for (const sideUpgrade of curScenario["Progression"]["SideUpgrades"]["SideUpgrades"]) {
        sideUpgrade["Costs"] = [{
            "$type" : "ResearchPointsCost",
            "Amount" : sideUpgrade.cost_
        }];
    }

    return encodeJSONWithFormat(curScenario,scenarioFormat);
}

function exportScenarioPP() {
    return encodeJSONWithFormat(curScenarioPP,scenarioPPFormat)
}

/**
 * @param {string} content
 * @param {string} fileName
 */
function downloadFile(content,fileName) {
    const fileURL = URL.createObjectURL(new Blob([content],{type:"application/json"}));
    createElem("a",{attrs:{
        href : fileURL,
        download : fileName
    }}).click();
    URL.revokeObjectURL(fileURL);
}

document.getElementById("scenario-export").addEventListener("click",() => {
    downloadFile(exportScenario(),curScenario["UniqueId"]+".json");
    curScenarioHasUnsavedChanges = false;
    localStorage.setItem("scenario-unsaved","false");
});
document.getElementById("scenario-pp-export").addEventListener("click",() => {
    downloadFile(exportScenarioPP(),curScenarioPP["UniqueId"]+".json");
    curScenarioPPHasUnsavedChanges = false;
    localStorage.setItem("scenario-pp-unsaved","false");
});

document.getElementById("scenario-autosave-remove").addEventListener("click",() => {
    removeAutoSave(false);
    alert("Scenario autosave removed.");
});
document.getElementById("scenario-pp-autosave-remove").addEventListener("click",() => {
    removeAutoSave(true);
    alert("Scenario parameter preset autosave removed.");
});

async function startup() {
    shapeViewer = await import("/assets/scripts/shapeViewer.js");
    translations = await (await fetch("/assets/json/gameFiles/translations.json")).json()
    identifiers = await (await fetch("/assets/json/gameFiles/identifiers.json")).json()
    islands = await (await fetch("/assets/json/gameFiles/islands.json")).json()

    document.body.appendChild(createElem("datalist",{
        elemId : "data-list-images",
        children : identifiers["images"].map((img) => createElem("option",{
            attrs : {value:img}
        }))
    }));
    document.body.appendChild(createElem("datalist",{
        elemId : "data-list-game-modes",
        children : [createElem("option",{
            attrs : {value:defaultGameMode}
        })]
    }));
    document.body.appendChild(createElem("datalist",{
        elemId : "data-list-shapes-configs",
        children : [
            createElem("option",{
                attrs : {value:quadShapesConfig}
            }),
            createElem("option",{
                attrs : {value:hexShapesConfig}
            })
        ]
    }));
    document.body.appendChild(createElem("datalist",{
        elemId : "data-list-color-schemes",
        children : [createElem("option",{
            attrs : {value:defaultColorScheme}
        })]
    }));

    loadScenario(
        await fetchText("/assets/json/gameFiles/default-scenario.json"),
        true,
        "Regular Preset"
    );
    const prevSessionScenario = localStorage.getItem("scenario-autosave");
    if (prevSessionScenario) {
        loadScenario(prevSessionScenario,false,"Previous Session Scenario");
        curScenarioHasUnsavedChanges = localStorage.getItem("scenario-unsaved") === "true";
    }

    loadScenarioPP(
        await fetchText("/assets/json/gameFiles/DefaultScenarioParameterPreset.json"),
        true,
        "Regular Preset"
    );
    const prevSessionScenarioPP = localStorage.getItem("scenario-pp-autosave");
    if (prevSessionScenarioPP) {
        loadScenarioPP(prevSessionScenarioPP,false,"Previous Session Scenario Parameter Preset");
        curScenarioPPHasUnsavedChanges = localStorage.getItem("scenario-pp-unsaved") === "true";
    }

    document.getElementById("loading-text").style.display = "none";
    switchToTab("config");
}
startup().then();

function madeScenarioChange() {
    curScenarioHasUnsavedChanges = true;
    if (curDoAutoSave) {
        localStorage.setItem("scenario-autosave",exportScenario());
        localStorage.setItem("scenario-unsaved","true");
    }
}

function madeScenarioPPChange() {
    curScenarioPPHasUnsavedChanges = true;
    if (curDoAutoSave) {
        localStorage.setItem("scenario-pp-autosave",exportScenarioPP());
        localStorage.setItem("scenario-pp-unsaved","true");
    }
}