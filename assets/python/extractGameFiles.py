import shapez2
import json
import os

GAME_VERSION = shapez2.versions.LATEST_GAME_VERSION
BASE_PATH = os.path.expandvars(f"%LOCALAPPDATA%low\\tobspr Games\\shapez 2\\basedata-v{GAME_VERSION}\\")
SCENARIOS_PATH = BASE_PATH + "scenarios\\"
SCENARIO_PRESETS_PATH = BASE_PATH + "scenario-parameter-presets\\"
IDENTIFIERS_PATH = BASE_PATH + "identifiers.json"

EXTRACT_PATH = "./assets/json/gameFiles/"

for folderPath in (SCENARIOS_PATH,SCENARIO_PRESETS_PATH):
    for dirEntry in os.scandir(folderPath):
        if dirEntry.is_file():
            with open(dirEntry.path,encoding="utf-8") as f1:
                rawObj = json.load(f1)
            savePaths = [EXTRACT_PATH+dirEntry.name]
            if dirEntry.name.lower().startswith("default"):
                savePaths.append(EXTRACT_PATH+dirEntry.name.replace("default","empty").replace("Default","Empty"))
            for savePath in savePaths:
                with open(savePath,"w",encoding="utf-8") as f2:
                    json.dump(rawObj,f2,ensure_ascii=True,indent=4)

with open(EXTRACT_PATH+"translations.json","w",encoding="utf-8") as f:
    json.dump({
        k : v.renderToRawString()
        for k,v in shapez2.translations._translations[shapez2.translations.Language.en_US].items()
    },f,ensure_ascii=False,indent=4)

with open(IDENTIFIERS_PATH,encoding="utf-8") as f:
    raw = json.load(f)

with open(EXTRACT_PATH+"identifiers.json","w",encoding="utf-8") as f:
    json.dump({
        "buildings" : raw["BuildingVariantIds"],
        "wikiEntries" : raw["WikiEntryIds"],
        "images" : raw["ImageIds"],
        "videos" : raw["VideoIds"],
        "icons" : raw["IconIds"]
    },f,ensure_ascii=False,indent=4)

with open(EXTRACT_PATH+"islands.json","w",encoding="utf-8") as f:
    json.dump([
        {
            "id" : ig.id,
            "name" : ig.title.translate().renderToRawString(),
            "islands" : [
                {
                    "id" : i.id,
                    "name" : i.title.translate().renderToRawString()
                }
                for i in ig.islands
            ]
        }
        for ig in shapez2.islands.allIslandGroups.values()
    ],f,ensure_ascii=False,indent=4)

print("remember to make empty scenario and param preset")