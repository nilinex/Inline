Hooks.once("init", () => {
    // Делаем название категории в настройках красивым
    foundry.utils.mergeObject(game.i18n.translations, { "PACKAGE.Inline": "Inline Tools" });

    // 1. Регистрация настроек
    game.settings.register("Inline", "unknownLanguageStyle", {
        name: "Стиль неизвестного языка",
        hint: "Выберите, как будет выглядеть текст на языке, который персонаж не знает.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "gibberish": "Случайные символы",
            "aaaaa": "Заменять на АААА"
        },
        default: "gibberish"
    });

    // 2. Энричер для Таблиц ^^#?1d6?ИмяТаблицы^^
    CONFIG.TextEditor.enrichers.push({
        pattern: /\^\^#(?:\?(?<number>\d+d?\d*)\?)?(?<tableName>.*?)\^\^/g,
        enricher: async (match, options) => {
            const number = match.groups.number || "1";
            const tableName = match.groups.tableName;
            try {
                const roll = new Roll(number);
                const numberToDraw = await roll.roll();
                const table = await findTable(tableName);
                const results = await table.drawMany(Number(numberToDraw.total), { displayChat: false });
                
                let resultArray = [];
                for (const result of results.results) {
                    let resultContent = (parseInt(game.version) >= 13) ? await result.getHTML() : result.getChatText();
                    resultArray.push(resultContent);
                }

                const span = document.createElement("span");
                span.innerHTML = await TextEditor.enrichHTML(formatResult(resultArray), { async: true });
                return span;
            } catch (error) {
                const span = document.createElement("span");
                span.style.color = "red";
                span.innerText = `[Ошибка таблицы: ${tableName}]`;
                return span;
            }
        }
    });

    // 3. Энричер для Языков ~~(Язык)Текст~~
    CONFIG.TextEditor.enrichers.push({
        pattern: /~~(?:\((?<language>.*?)\))(?<text>.*?)~~/g,
        enricher: async (match, options) => {
            const targetLanguage = match.groups.language.trim().toLowerCase();
            const originalText = match.groups.text.trim();
            
            if (game.user.isGM) return createLanguageSpan(originalText, match.groups.language, true);

            const activeToken = canvas.tokens?.controlled[0];
            const actor = activeToken?.actor || game.user.character;
            
            if (!actor) {
                const style = game.settings.get("Inline", "unknownLanguageStyle");
                return createLanguageSpan(formatHiddenText(originalText, style), match.groups.language, false, "Выберите токен!");
            }

            // Динамическая проверка через лейблы (как вы и хотели)
            const knownLanguages = actor.system.traits?.languages?.labels?.languages || [];
            const knowsLanguage = knownLanguages.some(l => l.toLowerCase() === targetLanguage);

            if (knowsLanguage) {
                return createLanguageSpan(originalText, match.groups.language, true);
            } else {
                const style = game.settings.get("Inline", "unknownLanguageStyle");
                return createLanguageSpan(formatHiddenText(originalText, style), match.groups.language, false);
            }
        }
    });
});

// --- Вспомогательные функции ---

async function findTable(name) {
    let table = game.tables.getName(name);
    if (!table) {
        const pack = game.packs.find((p) => p.metadata.type === "RollTable" && !!p.index.getName(name));
        if (pack) {
            let entry = pack.index.getName(name);
            table = await pack.getDocument(entry._id);
        }
    }
    if (!table) throw new Error(`Таблица "${name}" не найдена.`);
    return table;
}

function formatResult(result) {
    return result.map(i => i.trim().replace(/[\r\n\t\f\v]/g, '').replace(/\s+/g, ' ')).join(" ");
}

function createLanguageSpan(text, langName, isKnown, customHint = "") {
    const span = document.createElement("span");
    if (isKnown) {
        span.innerHTML = `<i style="color: #4b69ff; font-weight: bold;">(${langName})</i> ${text}`;
        span.title = customHint || `Вы знаете ${langName}`;
    } else {
        span.innerHTML = `<i style="color: #a01a1a;">(Неизвестный язык)</i> <span style="font-family: monospace; filter: blur(0.5px); opacity: 0.8;">${text}</span>`;
        span.title = customHint || `Вы не знаете ${langName}`;
    }
    return span;
}

function formatHiddenText(text, style) {
    if (style === "aaaaa") return text.replace(/[^\s]/g, "A");
    if (style === "gibberish") {
        const chars = "abcdefghijklmnopqrstuvwxyz1234567890#%&";
        return text.split('').map(char => char === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)]).join('');
    }
    return text;
}