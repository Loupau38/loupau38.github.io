import json
import typing

class Element:

    def __init__(
        self,
        type:str,
        *,
        class_:str|None=None,
        text:str|None=None,
        id:str|None=None,
        children:list[typing.Union["Element",str]]|None=None
    ):
        self.type = type
        self.attrs = dict[str,str]()
        self.classes = set[str]()
        self.children = list[Element|str]()

        if class_ is not None:
            self.classes.add(class_)
        if text is not None:
            self.children.append(text)
        if id is not None:
            self.attrs["id"] = id
        if children is not None:
            self.children.extend(children)

    def clone(self) -> "Element":
        new = Element(self.type)
        new.attrs = self.attrs.copy()
        new.classes = self.classes.copy()
        new.children = [e if isinstance(e,str) else e.clone() for e in self.children]
        return new

    def toHTML(self) -> str:

        attrs = {}
        if len(self.classes) > 0:
            attrs["class"] = " ".join(self.classes)
        attrs.update(self.attrs)

        result = f"<{self.type}" + "".join(f" {k}=\"{v}\"" for k,v in attrs.items()) + ">"
        for e in self.children:
            result += e if isinstance(e,str) else e.toHTML()
        result += f"</{self.type}>"
        return result

def genDocs(libraryName:str,basePagePath:str,docsPath:str,outputPath:str) -> None:

    def getTypeLink(elemType:str|list|dict) -> Element:
        if isinstance(elemType,list):
            finalElems = []
            for i,elem in enumerate(elemType):
                if i != 0:
                    finalElems.append(Element("span",text=" | "))
                finalElems.append(getTypeLink(elem))
            return Element("span",children=finalElems)
        if isinstance(elemType,dict):
            finalElems = []
            for i,elem in enumerate(elemType["a"]):
                if i != 0:
                    finalElems.append(Element("span",text=", "))
                finalElems.append(getTypeLink(elem))
            return Element("span",children=[
                getTypeLink(elemType["n"]),
                Element("span",text="["),
                Element("span",children=finalElems),
                Element("span",text="]")
            ])
        if elemType.startswith(libraryName+"."):
            elemType = elemType.replace(libraryName+".","")
            anchorElem = Element("a",text=elemType)
            if elemType.startswith("pygamePIL"):
                elemType = "pygamePIL"
            anchorElem.attrs["href"] = "#" + elemType.replace("\"","&quot;")
            return anchorElem
        return Element("span",text=elemType)

    def getQuickLinks(path:list[str],elems:list[str]) -> Element:
        container = Element("div",class_="quick-links")
        linksContainer = Element("ul")
        for elem in sorted(elems,key=lambda e: e.lower()):
            link = Element("a",text=elem)
            link.attrs["href"] = "#" + ".".join(path+[elem])
            linksContainer.children.append(Element("li",children=[link]))
        container.children.append(linksContainer)
        return container

    def processElem(elemObj:dict,elemPath:list[str],fromModule:str|None) -> Element:

        elemFullInfoContainer = Element("div")
        infoContainer = Element("div",class_="indented")

        if elemObj.get("mute"):
            infoContainer.children.append(Element("p",text="\u24d8 This class is mutable."))

        if "d" in elemObj:
            elemDesc = elemObj["d"]
            if not elemObj.get("nop"):
                elemDesc += "."
            infoContainer.children.append(Element("p",children=[elemDesc]))

        elemType = elemObj["t"]
        elemName = elemObj["n"]

        transferredModuleName = elemName if elemType == "module" else None

        paramReprs = []

        if "params" in elemObj:

            paramsContainer = Element("ul")

            for paramObj in elemObj["params"]:

                if paramObj == "*":
                    paramReprs.append(Element("span",text="*"))
                    continue

                paramContainer = Element("li")

                paramNameRaw = paramObj["n"]
                paramType = paramObj["t"]
                paramDescRaw = paramObj.get("d")
                paramDefaultRaw = paramObj.get("def")

                paramContainer.children.append(Element("span",class_="code-def",text=paramNameRaw))

                paramRepr = Element("span")
                paramRepr.children.append(Element("span",text=f"{paramNameRaw}: "))
                paramRepr.children.append(getTypeLink(paramType))
                if paramDefaultRaw is not None:
                    paramRepr.children.append(Element("span",text=" = "))
                    paramRepr.children.append(getTypeLink(paramDefaultRaw))
                paramReprs.append(paramRepr)

                paramContainer.children.append(Element("span",text=" : "))
                paramDescElem = Element("span")
                if paramDescRaw is not None:
                    paramDesc = paramDescRaw
                    if not paramObj.get("nop"):
                        paramDesc += "."
                    paramDescElem.children.append(paramDesc)
                paramContainer.children.append(paramDescElem)

                paramsContainer.children.append(paramContainer)

            infoContainer.children.append(Element("h3",text="Parameters"))
            infoContainer.children.append(paramsContainer)

        if "attrs" in elemObj:

            attrsContainer = Element("div")
            attrsNames = []
            attrsPath = elemPath + [elemName]

            for attrObj in elemObj["attrs"]:

                attrNameRaw = attrObj["n"]
                attrType = attrObj["t"]
                attrDescRaw = attrObj.get("d")
                attrDefaultRaw = attrObj.get("def")
                attrsNames.append(attrNameRaw)

                if attrType in ["module","class","dataclass","func","classmethod"]:
                    attrsContainer.children.append(processElem(attrObj,attrsPath,transferredModuleName))
                    continue

                attrHeader = Element("span")
                if transferredModuleName is not None:
                    attrHeader.children.append(Element("span",text=".".join(attrsPath)+"."))
                attrHeader.children.append(Element("span",text=f"{attrNameRaw}: "))
                attrHeader.children.append(getTypeLink(attrType))
                if attrDefaultRaw is not None:
                    attrHeader.children.append(Element("span",text=" = "))
                    attrHeader.children.append(getTypeLink(attrDefaultRaw))
                if elemType == "dataclass":
                    paramReprs.append(attrHeader.clone())

                attrHeaderContainer = Element("div",class_="code-def",id=".".join(attrsPath+[attrNameRaw]))
                attrHeaderContainer.children.append(attrHeader)
                attrsContainer.children.append(attrHeaderContainer)
                attrDescElem = Element("p",class_="indented")
                if attrDescRaw is not None:
                    attrDesc = attrDescRaw
                    if not attrObj.get("nop"):
                        attrDesc += "."
                    attrDescElem.children.append(attrDesc)
                attrsContainer.children.append(attrDescElem)

            if elemType != "module":
                infoContainer.children.append(Element("h3",text=f"{"Parameters/" if elemType == "dataclass" else ""}Attributes"))
                attrsContainer.classes.add("indented")

            if len(attrsNames) > 0:
                infoContainer.children.insert(0,getQuickLinks(attrsPath,attrsNames))

            infoContainer.children.append(attrsContainer)

        if elemType == "module":

            moduleName = ".".join(elemPath+[elemName])
            elemFullInfoContainer.children.append(Element("h2",text=moduleName,id=moduleName))

        elif elemType in ["class","dataclass","func","classmethod"]:

            elemId = ".".join(elemPath+[elemName])
            elemHeader = Element("div",class_="code-def",id=elemId)

            elemHeader.children.append(Element("span",class_="italics",text="def" if elemType == "func" else elemType))
            elemHeader.children.append(Element("span",text=f" {elemName if fromModule is None else elemId}("))

            if (elemType == "class") and ("p" in elemObj) and (elemObj.get("params") is None):
                elemHeader.children.append(getTypeLink(elemObj["p"]))
            else:
                for paramIndex,paramRepr in enumerate(paramReprs):
                    if paramIndex != 0:
                        elemHeader.children.append(Element("span",text=", "))
                    elemHeader.children.append(paramRepr)

            sepElem = Element("span",text=")")

            if elemType in ["func","classmethod"]:
                sepElem.children[0] += " -&gt; "
                elemHeader.children.append(sepElem)
                elemHeader.children.append(getTypeLink(elemObj["r"]))
            else:
                elemHeader.children.append(sepElem)

            elemFullInfoContainer.children.append(elemHeader)

            if (elemType == "class") and ("p" in elemObj) and ("params" in elemObj):
                infoContainer.children.insert(0,Element("p",children=[
                    Element("span",text="\u24d8 This class inherits from "),
                    Element("span",class_="code-def",children=[getTypeLink(elemObj["p"])])
                ]))

        elemFullInfoContainer.children.append(infoContainer)

        return elemFullInfoContainer

    def processAutoLinks(docs:str) -> str:
        splits = docs.split("[[")
        result = splits[0]
        for split in splits[1:]:
            link, *other = split.split("]]")
            result += f"<a class=\"code-def\" href=\"#{link}\">{link}</a>"
            result += "]]".join(other)
        return result

    with open(basePagePath,encoding="utf-8") as f:
        basePage = f.read()

    with open(docsPath,encoding="utf-8") as f:
        rawDocs = json.load(f)

    docsDiv = Element("div")
    moduleNames = []

    for moduleObj in rawDocs:
        moduleNames.append(moduleObj["n"])
        docsDiv.children.append(processElem(moduleObj,[],None))
    docsDiv.children.insert(0,getQuickLinks([],moduleNames))

    generatedDocs = processAutoLinks(docsDiv.toHTML())

    with open(outputPath,"w",encoding="utf-8") as f:
        f.write(basePage.replace("GENERATED_DOCS",generatedDocs))

if __name__ == "__main__":
    genDocs(
        "shapez2",
        "./assets/html/spz2PythonDocs.html",
        "./assets/json/spz2PythonDocs.json",
        "./shapez2-python/index.html"
    )