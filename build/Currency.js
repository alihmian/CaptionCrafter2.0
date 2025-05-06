"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formMenu = void 0;
const grammy_1 = require("grammy");
const menu_1 = require("@grammyjs/menu");
const hydrate_1 = require("@grammyjs/hydrate");
const conversations_1 = require("@grammyjs/conversations");
const child_process_1 = require("child_process");
const storage_file_1 = require("@grammyjs/storage-file");
// --------------------------------------------------
//  Utility
// --------------------------------------------------
const log = (...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]`, ...args);
};
// --------------------------------------------------
//  Create the Bot
// --------------------------------------------------
const bot = new grammy_1.Bot("7741875956:AAEkpMBl6mHGSN1VpARt610E8uazgzVZGYc");
bot.use((0, grammy_1.session)({
    initial: () => ({
        sentDocMsgIds: [],
    }),
    storage: new storage_file_1.FileAdapter({ dirName: "./sessions" }),
}));
bot.use((0, conversations_1.conversations)());
bot.use((0, hydrate_1.hydrate)());
// function getOutputPath(ctx: MyContext): string {
//     return ctx.session.outputPath ?? `./OutPut/currency_post_${ctx.from!.id}.png`;
// }
function getOutputPath(ctx) {
    const fallback = `./OutPut/currency_post_${ctx.from?.id ?? "anon"}.png`;
    // optional‑chain ⇒ never touches .outputPath if session is missing
    return ctx.session?.outputPath ?? fallback;
}
function collectFormData(ctx) {
    // session may be undefined inside some conversation internals — be defensive
    const s = ctx.session;
    return {
        Dollar: s?.Dollar,
        Euro: s?.Euro,
        Lira: s?.Lira,
        Dinar: s?.Dinar,
        Dirham: s?.Dirham,
        ChineseYuan: s?.ChineseYuan,
        SaudiRiyal: s?.SaudiRiyal,
    };
}
// spawn the Python script to compose the image
async function updateCurrencyImage(ctx) {
    const { Dollar = "0", Euro = "0", Lira = "0", Dinar = "0", Dirham = "0", ChineseYuan = "0", SaudiRiyal = "0", } = ctx.session;
    const outputPath = getOutputPath(ctx);
    ctx.session.outputPath = outputPath;
    const args = [
        "./src/craft/Currency.py",
        "--Dollar",
        Dollar,
        "--Euro",
        Euro,
        "--Lira",
        Lira,
        "--Dinar",
        Dinar,
        "--Dirham",
        Dirham,
        "--ChineseYuan",
        ChineseYuan,
        "--SaudiRiyal",
        SaudiRiyal,
        "--output_path",
        outputPath,
    ];
    log("Calling Python Currency.py with args", args);
    const result = (0, child_process_1.spawnSync)("python3", args, { stdio: "inherit" });
    if (result.error)
        log("Python error", result.error);
    // update inline image in bot message
    const mainMessageId = ctx.session.mainMessageId;
    if (mainMessageId) {
        try {
            await ctx.api.editMessageMedia(ctx.chat.id, mainMessageId, {
                type: "photo",
                media: new grammy_1.InputFile(outputPath),
            });
        }
        catch (e) {
            if (!(e.error_code === 400 && /not modified/i.test(e.description)))
                throw e;
        }
    }
}
// --------------------------------------------------
//  Shared handler for each text field
// --------------------------------------------------
async function handleFieldInput(conversation, ctx, options, buildMenu) {
    await ctx.answerCallbackQuery();
    const question = await ctx.reply(options.promptMessage);
    const cancelMenu = conversation.menu().text("کنسل", async (ctx) => {
        await ctx.api.deleteMessage(ctx.chat.id, question.message_id).catch(() => {
            /* ignore */
        });
        await ctx.menu.nav("form", { immediate: true });
        await conversation.halt();
    });
    await ctx.editMessageReplyMarkup({ reply_markup: cancelMenu });
    const value = await conversation.form.text({ action: (ctx) => ctx.deleteMessage() });
    // TYPESAFE assignment
    await conversation.external((ctx) => {
        ctx.session[options.fieldName] = value.trim();
    });
    const updatedMenu = buildMenu(conversation, collectFormData(ctx));
    await ctx.api.deleteMessage(ctx.chat.id, question.message_id).catch(() => {
        /* ignore */
    });
    await conversation.external(updateCurrencyImage);
    await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
}
// --------------------------------------------------
//  Menu builder
// --------------------------------------------------
function buildFormMenu(conversation, data) {
    return (conversation
        .menu("form")
        .text(data.Dollar ? "دلار ✅" : "دلار ❌", (ctx) => ctx.conversation.enter("dollarConversation"))
        .row()
        .text(data.Euro ? "یورو ✅" : "یورو ❌", (ctx) => ctx.conversation.enter("euroConversation"))
        .row()
        .text(data.Lira ? "لیر ✅" : "لیر ❌", (ctx) => ctx.conversation.enter("liraConversation"))
        .row()
        .text(data.Dinar ? "دینار ✅" : "دینار ❌", (ctx) => ctx.conversation.enter("dinarConversation"))
        .row()
        .text(data.Dirham ? "درهم ✅" : "درهم ❌", (ctx) => ctx.conversation.enter("dirhamConversation"))
        .row()
        .text(data.ChineseYuan ? "یوان چین ✅" : "یوان چین ❌", (ctx) => ctx.conversation.enter("yuanConversation"))
        .row()
        .text(data.SaudiRiyal ? "ریال سعودی ✅" : "ریال سعودی ❌", (ctx) => ctx.conversation.enter("riyalConversation"))
        .row()
        .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
        .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation")));
}
// --------------------------------------------------
//  Conversation generators for each currency field
// --------------------------------------------------
function createCurrencyConversation(fieldName, prompt) {
    return async function (conversation, ctx) {
        await handleFieldInput(conversation, ctx, { fieldName, promptMessage: prompt }, buildFormMenu);
    };
}
const dollarConversation = createCurrencyConversation("Dollar", "لطفا مقدار دلار را وارد کنید");
const euroConversation = createCurrencyConversation("Euro", "لطفا مقدار یورو را وارد کنید");
const liraConversation = createCurrencyConversation("Lira", "لطفا مقدار لیر را وارد کنید");
const dinarConversation = createCurrencyConversation("Dinar", "لطفا مقدار دینار را وارد کنید");
const dirhamConversation = createCurrencyConversation("Dirham", "لطفا مقدار درهم را وارد کنید");
const yuanConversation = createCurrencyConversation("ChineseYuan", "لطفا مقدار یوان چین را وارد کنید");
const riyalConversation = createCurrencyConversation("SaudiRiyal", "لطفا مقدار ریال سعودی را وارد کنید");
// clear form conversation
async function clearFormConversation(conversation, ctx) {
    await ctx.answerCallbackQuery();
    await conversation.external((ctx) => {
        ctx.session.Dollar = ctx.session.Euro = ctx.session.Lira = ctx.session.Dinar = ctx.session.Dirham = ctx.session.ChineseYuan = ctx.session.SaudiRiyal = undefined;
        ctx.session.sentDocMsgIds = [];
    });
    const clearedMenu = buildFormMenu(conversation, collectFormData(ctx));
    await ctx.editMessageMedia({ type: "photo", media: new grammy_1.InputFile("./assets/CURRENCY_TEMPLATE.png") });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
}
// // finish conversation – returns final file
// async function finishConversation(conversation: FieldConversation, ctx: MyContext) {
//     await ctx.answerCallbackQuery();
//     const outputPath = getOutputPath(ctx);
//     try {
//         const docMsg = await ctx.replyWithDocument(new InputFile(outputPath), { caption: "تصویر ایجاد شد" });
//         ctx.session.sentDocMsgIds?.push(docMsg.message_id);
//     } catch (e) {
//         log("cannot send doc", e);
//     }
// }
// Finish conversation: shows a summary and optionally performs final processing
// Finish conversation: shows a summary and then deletes the menu, sends final doc, and logs in channel
async function finishConversation(conversation, ctx) {
    var _a;
    await conversation.external(updateCurrencyImage); // ← add this line
    await ctx.answerCallbackQuery(); // first line of every button handler
    // 1) Gather final form data for logging or summarizing
    const finalData = await conversation.external((ctx) => collectFormData(ctx));
    const outputPath = getOutputPath(ctx);
    try {
        const docMsg = await ctx.replyWithDocument(new grammy_1.InputFile(outputPath), { caption: "فایل تصویر ایجاد شد" });
        // persist the message‑id
        (_a = ctx.session).sentDocMsgIds ?? (_a.sentDocMsgIds = []);
        ctx.session.sentDocMsgIds.push(docMsg.message_id);
    }
    catch (err) {
        console.error("Could not send final document to user:", err);
    }
    try {
        await ctx.api.sendDocument(-1002302354978, // your channel ID
        new grammy_1.InputFile(outputPath), {
            caption: `User @${ctx.from?.username} (ID: ${ctx.from?.id}) just finished their form!`,
        });
    }
    catch (err) {
        console.error("Could not send log to channel:", err);
    }
}
// --------------------------------------------------
//  Register conversations
// --------------------------------------------------
bot.use((0, conversations_1.createConversation)(dollarConversation, "dollarConversation"));
bot.use((0, conversations_1.createConversation)(euroConversation, "euroConversation"));
bot.use((0, conversations_1.createConversation)(liraConversation, "liraConversation"));
bot.use((0, conversations_1.createConversation)(dinarConversation, "dinarConversation"));
bot.use((0, conversations_1.createConversation)(dirhamConversation, "dirhamConversation"));
bot.use((0, conversations_1.createConversation)(yuanConversation, "yuanConversation"));
bot.use((0, conversations_1.createConversation)(riyalConversation, "riyalConversation"));
bot.use((0, conversations_1.createConversation)(clearFormConversation, "clearFormConversation"));
bot.use((0, conversations_1.createConversation)(finishConversation, "finishConversation"));
// --------------------------------------------------
//  Stand‑alone menu instance (needed for /start)
// --------------------------------------------------
exports.formMenu = new menu_1.Menu("form", { onMenuOutdated: false })
    .text((ctx) => collectFormData(ctx).Dollar ? "دلار ✅" : "دلار ❌", (ctx) => ctx.conversation.enter("dollarConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Euro ? "یورو ✅" : "یورو ❌", (ctx) => ctx.conversation.enter("euroConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Lira ? "لیر ✅" : "لیر ❌", (ctx) => ctx.conversation.enter("liraConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Dinar ? "دینار ✅" : "دینار ❌", (ctx) => ctx.conversation.enter("dinarConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Dirham ? "درهم ✅" : "درهم ❌", (ctx) => ctx.conversation.enter("dirhamConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).ChineseYuan ? "یوان چین ✅" : "یوان چین ❌", (ctx) => ctx.conversation.enter("yuanConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).SaudiRiyal ? "ریال سعودی ✅" : "ریال سعودی ❌", (ctx) => ctx.conversation.enter("riyalConversation"))
    .row()
    .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
    .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"));
bot.use(exports.formMenu);
// --------------------------------------------------
//  /start
// --------------------------------------------------
bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const outputPath = `./OutPut/currency_post_${userId}.png`;
    ctx.session.outputPath = outputPath;
    const sentMsg = await ctx.replyWithPhoto(new grammy_1.InputFile("./assets/CURRENCY_TEMPLATE.png"), { reply_markup: exports.formMenu });
    ctx.session.mainMessageId = sentMsg.message_id;
    log("Bot started for", userId);
});
bot.catch((err) => log("Global error", err));
bot.start();
log("Bot running …");
