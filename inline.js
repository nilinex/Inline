Hooks.once("init", () => {
	
    if (!document.getElementById("dnd-translator-font")) {
        const link = document.createElement("link");
        link.id = "dnd-translator-font";
        link.rel = "stylesheet";
        link.href ="https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2&display=swap";
		document.head.appendChild(link);
    }
	
	if (!document.getElementById("dnd-translator-styles")) {
        const styleElement = document.createElement("style");
        styleElement.id = "dnd-translator-styles";
        styleElement.innerHTML = `
            .lang-label-Known { color: #4b69ff; font-weight: bold; margin-right: 4px; }
            .lang-label-NOKnown { color: #a01a1a; margin-right: 4px; }
            .translation { color: #555; margin-right: 4px; }
        `;
        document.head.appendChild(styleElement);
    }

    game.settings.register("Inline", "unknownLanguageStyle", {
        name: "Стиль неизвестного языка",
        hint: "Выберите, как будет выглядеть текст на языке, который персонаж не знает.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "gibberish": 	"Случайные символы",
            "aaaaa": 		"Заменять на ***",
            "critsandfails":"Перевод от critsandfails_dnd_ekb"
        },
        default: "gibberish"
    });

//originalText 	 - текст из паттерна
//targetLanguage - язык из паттерна
//style 		 - стиль из настроек
//isKnown	 	 - результат проверки знания языка (true для гм)
    CONFIG.TextEditor.enrichers.push({
        pattern: /~\((?<language>[^)]+)\)(?<text>.*?)~/g,
        enricher: async (match, options) => {
            const targetLanguage = match.groups.language.trim().toLowerCase();
            const originalText = match.groups.text.trim();
            const style = game.settings.get("Inline", "unknownLanguageStyle");	
			const isKnown = game.user.isGM || (game.user.character?.system?.traits?.languages?.labels?.languages || []).some(l => l.toLowerCase() === targetLanguage);
			return createLanguageSpan(originalText, isKnown, targetLanguage, style);
        }
    });
});
const baseTextShadow = "-1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000, 1px 1px 1px #000";
function createLanguageSpan(originalText, isKnown, targetLanguage, style) {
    const UPtargetLanguage = targetLanguage.charAt(0).toUpperCase() + targetLanguage.slice(1);
	const span = document.createElement("span");
    const langKey = langMap[targetLanguage] ?? "nofind";
    if (langKey === "common") {
        span.innerHTML = `<i class="lang-label-Known">(${UPtargetLanguage})</i> ${originalText}`;
        return span;
    } 
	if (style !== "critsandfails" || (style === "critsandfails" && langKey === "nofind")) {
        if (isKnown) {
            span.innerHTML = `<i class="lang-label-Known">(${UPtargetLanguage})</i> ${originalText}`;
        } else {
			if (style === "critsandfails" && langKey === "nofind") style = game.settings.settings.get("Inline.unknownLanguageStyle").default;
            let hiddenText = formatBasicHiddenText(originalText, style);
            span.innerHTML = `<i class="lang-label-NOKnown">(Неизвестный язык)</i> ${hiddenText}`;
        }
        return span;
    }
	const translationData = applyDndTranslator(originalText, langKey);
	if (langKey === "thief"){
		if (isKnown) {
            span.innerHTML = `<i class="lang-label-Known">(${UPtargetLanguage})</i> <i class="translation">[${translationData.sounds}]</i> ${originalText}`;
        } else {
            span.innerHTML = `<span>${translationData.thiefUnknown}</span>`;
        }
        return span;
	} else if (isKnown) {
		span.innerHTML = `<i class="lang-label-Known">(${UPtargetLanguage})</i> <i class="translation">[${translationData.sounds}]</i> ${originalText}`;
    } else {
		const glyphStyle = `color: ${translationData.color}; text-shadow: ${baseTextShadow}; font-family: 'Noto Sans Symbols 2'; letter-spacing: 1px;`;
		span.innerHTML = `<i class="lang-label-NOKnown">(Неизвестный язык)</i> <span style="${glyphStyle}">${translationData.glyphs}</span>`;	
    }
    return span;
}

function formatBasicHiddenText(text, style) {
    if (style === "aaaaa") return text.replace(/[^\s\.,!\?]/g, "*");
    if (style === "gibberish") {
        const chars = "abcdefghijklmnopqrstuvwxyz1234567890#%&";
        return text.split('').map(char => /[ \.,!\?]/.test(char) ? char : chars[Math.floor(Math.random() * chars.length)]).join('');
    }
    return text;
}

const thiefWordsDict = {
    "золото": { 	cant: "железо", 			glyph: "⌘" }, "серебро": { 				cant: "камень", 		glyph: "⌫" }, 
    "отмычки": { 	cant: "палки", 				glyph: "⌬" }, "яд": { 					cant: "масло", 			glyph: "⌭" }, 
    "кинжал": { 	cant: "столовый прибор", 	glyph: "⌮" }, "ограбить": { 			cant: "чистка", 		glyph: "⌯" }, 
    "украсть": { 	cant: "новинка", 			glyph: "⌰" }, "цель": { 				cant: "полуорк", 		glyph: "⌱" }, 
    "трюк": { 		cant: "твист", 				glyph: "⌲" }, "смерть": { 				cant: "мороз", 			glyph: "⌳" }, 
    "убийство": { 	cant: "подарок", 			glyph: "⌴" }, "скрыть оружие": { 		cant: "принаряжаемся", 	glyph: "⌵" }, 
    "магия": { 		cant: "петь", 				glyph: "⌶" }, "очаровать": { 			cant: "поцелуй", 		glyph: "⌷" }, 
    "стража": { 	cant: "плащи", 				glyph: "⌸" }, "тюрьма": { 				cant: "отдыхает", 		glyph: "⌹" }, 
    "скупщик": { 	cant: "кузнец", 			glyph: "⌺" }, "грим": { 				cant: "штукатурка", 	glyph: "⌻" }, 
    "калтропы": { 	cant: "гнездо ворона", 		glyph: "⌼" }, "карманник": { 			cant: "чистильщик", 	glyph: "⌽" }, 
    "мошенник": { 	cant: "повар", 				glyph: "⌾" }, "игра": { 				cant: "обед", 			glyph: "⌿" }, 
    "карты": { 		cant: "бумажки", 			glyph: "⍀" }, "кости": { 				cant: "кастет", 		glyph: "⍁" }, 
    "ставки": { 	cant: "еда", 				glyph: "⍂" }, "напоить": { 				cant: "гольшом", 		glyph: "⍃" }, 
    "ранить": { 	cant: "боком", 				glyph: "⍄" }, "казнить": { 				cant: "танец", 			glyph: "⍅" }, 
    "добыча": { 	cant: "берлога", 			glyph: "⍆" }, "магический предмет": { 	cant: "кусок железа", 	glyph: "⍇" }
};

const visualStyles = {
    infernal: 	{ c: "#ff6600"}, abyssal: 	{ c: "#cc00ff"},
    dwarf: 		{ c: "#ffdd88"}, giant: 	{ c: "#ffdd88"},
    gnome: 		{ c: "#ff99ff"}, goblin: 	{ c: "#88ff88"},
    orc: 		{ c: "#ff5555"}, primordial:{ c: "#ffdd88"},
    elf: 		{ c: "#88ffcc"}, sylvan: 	{ c: "#88ffcc"},
    drow: 		{ c: "#ff88ff"}, dragon: 	{ c: "#ffdd44"},
    celestial: 	{ c: "#aaffff"}, thief: 	{ c: "#ffdd77"},
    deep: 		{ c: "#44ccff"}
};

const charGlyphs = {
    infernal: {	а:"𝔄", б:"𝔅", в:"𝔇", г:"𝔈", д:"𝔉", е:"𝔊", ё:"𝔍", ж:"𝔎", з:"𝔏", и:"𝔐", й:"𝔑", к:"𝔒", л:"𝔓", м:"𝔔", н:"𝔖", о:"𝔗", 
				п:"𝔘", р:"𝔙", с:"𝕌", т:"𝔛", у:"𝔜", ф:"ℭ", х:"ℌ", ц:"ℑ", ч:"ℜ", ш:"ℨ", щ:"𝕋", ъ:"𝕴", ы:"𝕵", ь:"𝕶", э:"𝕷", ю:"𝕍", я:"𝕳"},
    dwarf: {	а:"ᚨ",б:"ᛒ",в:"ᚹ",г:"ᚷ",д:"ᛞ",е:"ᛖ",ё:"ᛟ",ж:"ᛃ",з:"ᛉ",и:"ᛁ",й:"ᛇ",к:"ᚲ",л:"ᛚ",м:"ᛗ",н:"ᚾ",о:"ᛟ",
				п:"ᛈ",р:"ᚱ",с:"ᛊ",т:"ᛏ",у:"ᚢ",ф:"ᚠ",х:"ᚺ",ц:"ᛋ",ч:"ᛍ",ш:"ᛎ",щ:"ᛯ",ъ:"ᛪ",ы:"ᛦ",ь:"ᛧ",э:"ᛠ",ю:"ᛡ",я:"ᛣ"},
    elf: {		а:"Ϟ",б:"ϟ",в:"Ϡ",г:"ϡ",д:"Ϣ",е:"ϣ",ё:"Ϥ",ж:"ϥ",з:"Ϧ",и:"ϧ",й:"Ϩ",к:"ϩ",л:"Ϫ",м:"ϫ",н:"Ϭ",о:"ϭ",
				п:"Ϯ",р:"ϯ",с:"ϰ",т:"ϱ",у:"ϲ",ф:"ϳ",х:"ϴ",ц:"ϵ",ч:"϶",ш:"Ϸ",щ:"ϸ",ъ:"Ϲ̇",ы:"Ϲ",ь:"Ϲ̈",э:"Ϻ",ю:"ϻ",я:"ϼ"},
    dragon: {	а:"𒀀", б:"𒀁", в:"𒀂", г:"𒃃", д:"𒀄", е:"𒀅", ё:"𒀆", ж:"𒀇", з:"𒀈", и:"𒀉", й:"𒀊", к:"𒀋", л:"𒀌", м:"𒀍", н:"𒀎", о:"𒀏", 
				п:"𒀐", р:"𒀑", с:"𒀒", т:"𒀓", у:"𒀔", ф:"𒀕", х:"𒀖", ц:"𒀗", ч:"𒀘", ш:"𒀙", щ:"𒀚", ъ:"𒀛", ы:"𒀜", ь:"𒀝", э:"𒀞", ю:"𒀟", я:"𒀠"},
    celestial: {а:"𐡀", б:"𐡁", в:"𐡅", г:"𐡂", д:"𐡃", е:"𐡄", ё:"𐡟", ж:"𐡆", з:"𐡈", и:"𐡉", й:"𐡝", к:"𐡊", л:"𐡋", м:"𐡌", н:"𐡍", о:"𐡏", 
				п:"𐡐", р:"𐡓", с:"𐡔", т:"𐡕", у:"𐡜", ф:"𐡗", х:"𐡘", ц:"𐡙", ч:"𐡞", ш:"𐡑", щ:"𐡇", ъ:"𐡎", ы:"𐡛", ь:"𐡛", э:"𐭪", ю:"𐭫", я:"𐭮"}
};

const fantasySounds = {
    infernal: {	а:"kha",б:"ba",в:"vakh",г:"gar",д:"dakh",е:"ekh",ё:"iokh",ж:"zhak",з:"zhar",и:"ikh",й:"yikh",к:"khor",л:"lakh",м:"makh",н:"nakh",о:"okh",
				п:"pakh",р:"rakh",с:"sakh",т:"thak",у:"ukh",ф:"fakh",х:"khra",ц:"tsakh",ч:"chak",ш:"shakh",щ:"shrak",ъ:"",ы:"ykh",ь:"",э:"ekh",ю:"yukh",я:"yakh"},
    abyssal: {	а:"grr",б:"brru",в:"vrru",г:"grru",д:"drru",е:"eh",ё:"ioh",ж:"zhrr",з:"zrr",и:"ih",й:"irh",к:"krru",л:"lrru",м:"mrru",н:"nrru",о:"oh",
				п:"prru",р:"rrra",с:"srru",т:"trru",у:"uh",ф:"frru",х:"khrra",ц:"tsrru",ч:"chrru",ш:"shrru",щ:"shrrra",ъ:"",ы:"rru",ь:"",э:"eh",ю:"rru",я:"rra"},
    dwarf: {	а:"ar",б:"bar",в:"var",г:"gar",д:"dur",е:"er",ё:"or",ж:"zor",з:"zur",и:"ir",й:"ir",к:"kar",л:"lor",м:"mor",н:"nar",о:"or",
				п:"par",р:"ruk",с:"skar",т:"tor",у:"ur",ф:"far",х:"khar",ц:"kar",ч:"chor",ш:"shar",щ:"shor",ъ:"",ы:"yr",ь:"",э:"er",ю:"ur",я:"ar"},
    gnome: {	а:"li",б:"bi",в:"vi",г:"gi",д:"di",е:"e",ё:"io",ж:"zhi",з:"zi",и:"i",й:"yi",к:"ki",л:"li",м:"mi",н:"ni",о:"o",
				п:"pi",р:"ri",с:"si",т:"ti",у:"u",ф:"fi",х:"hi",ц:"tsi",ч:"chi",ш:"shi",щ:"shi",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"},
    goblin: {	а:"ak",б:"bak",в:"vak",г:"gak",д:"dak",е:"ek",ё:"ok",ж:"zhak",з:"zak",и:"ik",й:"ik",к:"kak",л:"lak",м:"mak",н:"nak",о:"ok",
				п:"pak",р:"rak",с:"sak",т:"tak",у:"uk",ф:"fak",х:"khak",ц:"tsak",ч:"chak",ш:"shak",щ:"shak",ъ:"",ы:"yk",ь:"",э:"ek",ю:"uk",я:"yak"},
    orc: {		а:"ug",б:"bug",в:"vug",г:"gug",д:"dug",е:"eg",ё:"og",ж:"zhug",з:"zug",и:"ig",й:"ig",к:"kug",л:"lug",м:"mug",н:"nug",о:"og",
				п:"pug",р:"rug",с:"sug",т:"tug",у:"ug",ф:"fug",х:"khug",ц:"tsug",ч:"chug",ш:"shug",щ:"shug",ъ:"",ы:"ug",ь:"",э:"eg",ю:"ug",я:"ag"},
    primordial: {а:"rum",б:"brum",в:"vrum",г:"grum",д:"drum",е:"em",ё:"om",ж:"zhum",з:"zum",и:"im",й:"ir",к:"krum",л:"lum",м:"mum",н:"num",о:"om",
				п:"prum",р:"rrum",с:"sum",т:"trum",у:"um",ф:"frum",х:"khrum",ц:"tsum",ч:"chum",ш:"shum",щ:"shum",ъ:"",ы:"um",ь:"",э:"em",ю:"um",я:"am"},
    giant: {	а:"gor",б:"bar",в:"var",г:"gor",д:"dor",е:"e",ё:"o",ж:"zor",з:"zor",и:"i",й:"i",к:"kar",л:"lor",м:"mor",н:"nar",о:"o",
				п:"par",р:"ruk",с:"skar",т:"tor",у:"ur",ф:"far",х:"khor",ц:"kar",ч:"chor",ш:"shor",щ:"shor",ъ:"",ы:"ur",ь:"",э:"e",ю:"ur",я:"ar"},
    elf: {		а:"ae",б:"bhel",в:"vhel",г:"ghel",д:"dhel",е:"e",ё:"eo",ж:"zhel",з:"zel",и:"i",й:"yi",к:"khel",л:"lae",м:"mael",н:"nael",о:"o",
				п:"phel",р:"rael",с:"sae",т:"thel",у:"u",ф:"fael",х:"hael",ц:"tsel",ч:"chel",ш:"shel",щ:"shael",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"yae"},
    sylvan: {	а:"thal",б:"bhi",в:"vhi",г:"ghi",д:"dhi",е:"ei",ё:"eio",ж:"zhil",з:"zil",и:"il",й:"yil",к:"khi",л:"llyn",м:"mhi",н:"nhi",о:"o",
				п:"phi",р:"rhi",с:"si",т:"thi",у:"u",ф:"fhi",х:"hwi",ц:"tsi",ч:"chi",ш:"shyi",щ:"shyi",ъ:"",ы:"wy",ь:"",э:"ei",ю:"yul",я:"yath"},
    drow: {		а:"dha",б:"bha",в:"vha",г:"gha",д:"dha",е:"e",ё:"eo",ж:"zha",з:"za",и:"i",й:"yi",к:"kha",л:"lha",м:"mha",н:"nha",о:"o",
				п:"pha",р:"rha",с:"ssa",т:"tha",у:"u",ф:"fha",х:"kha",ц:"tsa",ч:"cha",ш:"ssha",щ:"sshae",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"yha"},
    dragon: {	а:"dra",б:"gra",в:"sva",г:"gar",д:"dar",е:"ess",ё:"ios",ж:"zha",з:"zar",и:"iss",й:"ir",к:"kar",л:"lar",м:"mar",н:"nar",о:"oss",
				п:"par",р:"rra",с:"sar",т:"tar",у:"ur",ф:"far",х:"khar",ц:"tsar",ч:"char",ш:"sshar",щ:"sshar",ъ:"",ы:"yr",ь:"",э:"er",ю:"sur",я:"ar"},
    deep: {		а:"glu",б:"blu",в:"vlu",г:"gru",д:"dlu",е:"eh",ё:"eoh",ж:"zhu",з:"zu",и:"ih",й:"yih",к:"klu",л:"llu",м:"mlu",н:"nlu",о:"oh",
				п:"plu",р:"rru",с:"slu",т:"tlu",у:"uh",ф:"flu",х:"khu",ц:"tslu",ч:"chlu",ш:"shlu",щ:"shlu",ъ:"",ы:"u",ь:"",э:"eh",ю:"ulu",я:"alu"},
    celestial: {а:"ael",б:"bael",в:"vael",г:"gael",д:"dael",е:"el",ё:"eol",ж:"zhael",з:"zael",и:"iel",й:"yiel",к:"kael",л:"lael",м:"mael",н:"nael",о:"ol",
				п:"pael",р:"rael",с:"sael",т:"tael",у:"uel",ф:"fael",х:"hael",ц:"tsael",ч:"chael",ш:"shael",щ:"shael",ъ:"",ы:"yel",ь:"",э:"el",ю:"yuel",я:"yael"}
};

const langMap = {
    "инфернальный": "infernal", "бездна": "abyssal", 		"бездны": "abyssal",
    "дварфийский": "dwarf", 	"великаний": "giant", 		"гномий": "gnome",
    "гоблинский": "goblin", 	"орочий": "orc", 			"первичный": "primordial",
    "эльфийский": "elf", 		"сильван": "sylvan", 		"подземный": "drow",
    "драконий": "dragon", 		"глубинная речь": "deep", 	"глубинный": "deep", 
    "небесный": "celestial", 	"воровской жаргон": "thief","воровской": "thief",
    "всеобщий": "common"
};

function getGlyphDict(key) {
    if (["elf", "sylvan", "drow"].includes(key)) return charGlyphs.elf;
    if (["infernal", "abyssal", "deep"].includes(key)) return charGlyphs.infernal;
    if (["dwarf", "giant", "gnome", "goblin", "orc", "primordial"].includes(key)) return charGlyphs.dwarf;
    if (key === "dragon") return charGlyphs.dragon;
    if (key === "celestial") return charGlyphs.celestial;
    return null;
}

function applyDndTranslator(text, dictKey) {
    const style = visualStyles[dictKey];
    
    if (dictKey === "thief") {
        let thiefUnknown = text;
        let thiefKnownSounds = text;
        const runeStyle = `color: ${style.c}; text-shadow: ${baseTextShadow}; font-family: 'Noto Sans Symbols 2';`;

        for (let [ruWord, data] of Object.entries(thiefWordsDict)) {
            let regex = new RegExp(`(?<![а-яёА-ЯЁ])${ruWord}(?![а-яёА-ЯЁ])`, "gi");
            thiefUnknown = thiefUnknown.replace(regex, `${data.cant} (<span style="${runeStyle}">${data.glyph}</span>)`);
            thiefKnownSounds = thiefKnownSounds.replace(regex, data.cant);
        }
        return { thiefUnknown, sounds: thiefKnownSounds, color: style.c };
    }

    const soundDict = fantasySounds[dictKey];
    const glyphDict = getGlyphDict(dictKey);
    let finalGlyphs = "";
    let finalSounds = [];
    let currentWordSound = "";

    for (let char of text) {
        if (/[ \.,!\?\n]/.test(char)) {
            finalGlyphs += char;
            if (currentWordSound) { finalSounds.push(currentWordSound.slice(0, 6)); currentWordSound = ""; }
            finalSounds.push(char);
            continue;
        }
        let lower = char.toLowerCase();
        finalGlyphs += (glyphDict && glyphDict[lower]) ? glyphDict[lower] : char;
        currentWordSound += (soundDict && soundDict[lower]) ? soundDict[lower] : char;
    }
    if (currentWordSound) finalSounds.push(currentWordSound.slice(0, 6));

    return { 
        glyphs: finalGlyphs, 
        sounds: finalSounds.join("").replace(/\s+/g, " ").trim(),
        color: style.c
    };
}