fetch("https://static-api.shapez2.com/news.json").then((res) => {
    res.json().then((out) => {
        displayContent(out);
    });
});

function parseMessageText(text) {
    text = text.replaceAll("<b>","<strong>").replaceAll("</b>","</strong>");
    colorSplits = text.split("<color=");
    newText = colorSplits[0];
    colorSplits.slice(1).forEach((split) => {
        newText += '<span style="color: ' + split.slice(0,7) + ';"' + split.slice(7);
    });
    newText.replace("</color>","</span>");
    return newText;
}

function displayContent(rawContent) {

    document.getElementById("loading-text").remove();

    const news = rawContent["News"];

    for (let newsIndex = 0; newsIndex < news.length; newsIndex++) {
        const newsItem = news[newsIndex];

        const mainDiv = document.createElement("div");
        mainDiv.classList.add("newsItem","content-box");

        const newsHeaderDiv = document.createElement("div");
        newsHeaderDiv.classList.add("newsHeader");

        const newsIdDiv = document.createElement("div");
        newsIdDiv.classList.add("newsId");
        newsIdDiv.innerText = "ID : " + newsItem["Id"];
        newsHeaderDiv.appendChild(newsIdDiv);

        const newsDateDiv = document.createElement("div");
        newsDateDiv.classList.add("newsDate");
        newsDateDiv.innerText = "Date : " + new Date(Date.parse(newsItem["Date"])).toLocaleString();
        newsHeaderDiv.appendChild(newsDateDiv);

        mainDiv.appendChild(newsHeaderDiv);

        const newsContentDiv = document.createElement("div");
        newsContentDiv.classList.add("newsContent");

        const messagesDiv = document.createElement("div");
        messagesDiv.classList.add("newsMessages");

        for (const [msgLang,msgText] of Object.entries(newsItem["Message"])) {

            const messageDiv = document.createElement("div");
            messageDiv.classList.add("newsMessage");

            const msgLangDiv = document.createElement("div");
            msgLangDiv.classList.add("msgLang");
            msgLangDiv.innerText = msgLang;
            messageDiv.appendChild(msgLangDiv);

            const msgTextDiv = document.createElement("div");
            msgTextDiv.classList.add("msgText");
            msgTextDiv.innerHTML = parseMessageText(msgText);
            messageDiv.appendChild(msgTextDiv);

            messagesDiv.appendChild(messageDiv);
        }

        newsContentDiv.appendChild(messagesDiv);

        const restrictionsDiv = document.createElement("div");
        restrictionsDiv.classList.add("newsRestrict");

        const langsOnlyDiv = document.createElement("div");
        langsOnlyDiv.classList.add("langsOnly");

        const langsOnlyHeaderDiv = document.createElement("div");
        langsOnlyHeaderDiv.classList.add("langsOnlyHeader");
        langsOnlyHeaderDiv.innerText = "Languages :";
        langsOnlyDiv.appendChild(langsOnlyHeaderDiv);

        const newsLangsOnly = newsItem["LanguagesOnly"];
        if (newsLangsOnly == undefined || newsLangsOnly.length == 0) {
            langsOnlyHeaderDiv.innerText += " All";
        } else {
            newsLangsOnly.forEach((lang) => {
                const langRetrictDiv = document.createElement("div");
                langRetrictDiv.classList.add("langRestrict");
                langRetrictDiv.innerText = lang;
                langsOnlyDiv.appendChild(langRetrictDiv);
            });
        }

        restrictionsDiv.appendChild(langsOnlyDiv);

        const versionsOnlyDiv = document.createElement("div");
        versionsOnlyDiv.classList.add("versionsOnly");

        const versionsOnlyHeaderDiv = document.createElement("div");
        versionsOnlyHeaderDiv.classList.add("versionsOnlyHeader");
        versionsOnlyHeaderDiv.innerText = "Game Versions :";
        versionsOnlyDiv.appendChild(versionsOnlyHeaderDiv);

        const newsVersionsOnly = newsItem["GameVersionsOnly"];
        if (newsVersionsOnly == undefined || newsVersionsOnly.length == 0) {
            versionsOnlyHeaderDiv.innerText += " All";
        } else {
            newsVersionsOnly.forEach((lang) => {
                const versionRestrictDiv = document.createElement("div");
                versionRestrictDiv.classList.add("versionRestrict");
                versionRestrictDiv.innerText = lang;
                versionsOnlyDiv.appendChild(versionRestrictDiv);
            });
        }

        restrictionsDiv.appendChild(versionsOnlyDiv);

        newsContentDiv.appendChild(restrictionsDiv);

        mainDiv.appendChild(newsContentDiv);

        const newsFooterDiv = document.createElement("div");
        newsFooterDiv.classList.add("newsFooter");

        const newsLinkDiv = document.createElement("div");
        newsLinkDiv.classList.add("newsLink");

        const newsLink = newsItem["Link"];
        if (newsLink == undefined) {
            newsLinkDiv.innerText = "No Associated Link";
        } else {
            const newsLinkAnchor = document.createElement("a");
            newsLinkAnchor.href = newsLink;
            newsLinkAnchor.target = "_blank"
            newsLinkAnchor.innerText = "Associated Link"
            newsLinkDiv.appendChild(newsLinkAnchor);
        }

        newsFooterDiv.appendChild(newsLinkDiv);

        const newsPopupDiv = document.createElement("div");
        newsPopupDiv.classList.add("newsPopup");
        newsPopupDiv.innerText = "Showed as popup : " + (newsItem["ShowAsPopup"] ? "Yes" : "No");
        newsFooterDiv.appendChild(newsPopupDiv);

        mainDiv.appendChild(newsFooterDiv);

        document.body.appendChild(mainDiv);

    }

}