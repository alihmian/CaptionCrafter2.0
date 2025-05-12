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
const bot = new grammy_1.Bot("7905922993:AAEIiBckDZ_3M9THlrAYpi6Y1xfzLLeaIM4");
bot.use((0, grammy_1.session)({
    initial: () => ({
        sentDocMsgIds: [],
    }),
    storage: new storage_file_1.FileAdapter({ dirName: "./sessions" }),
}));
bot.use((0, conversations_1.conversations)());
bot.use((0, hydrate_1.hydrate)());
// function getOutputPath(ctx: MyContext): string {
//     return ctx.session.outputPath ?? `./OutPut/crypto_post_${ctx.from!.id}.png`;
// }
function getOutputPath(ctx) {
    const fallback = `./OutPut/crypto_post_${ctx.from?.id ?? "anon"}.png`;
    // optional‑chain ⇒ never touches .outputPath if session is missing
    return ctx.session?.outputPath ?? fallback;
}
function collectFormData(ctx) {
    // session may be undefined inside some conversation internals — be defensive
    const s = ctx.session;
    return {
        Bitcoin: s?.Bitcoin,
        Ethereum: s?.Ethereum,
        Tether: s?.Tether,
        Ripple: s?.Ripple,
        BinanceCoin: s?.BinanceCoin,
        Solana: s?.Solana,
        USD_Coin: s?.USD_Coin,
        Dogecoin: s?.Dogecoin,
    };
}
// spawn the Python script to compose the image
async function updatecryptoImage(ctx) {
    const { Bitcoin = "0", Ethereum = "0", Tether = "0", Ripple = "0", BinanceCoin = "0", Solana = "0", USD_Coin = "0", Dogecoin = "0", } = ctx.session;
    const outputPath = getOutputPath(ctx);
    ctx.session.outputPath = outputPath;
    const args = [
        "./src/craft/crypto.py",
        "--Bitcoin",
        Bitcoin,
        "--Ethereum",
        Ethereum,
        "--Tether",
        Tether,
        "--Ripple",
        Ripple,
        "--BinanceCoin",
        BinanceCoin,
        "--Solana",
        Solana,
        "--USD_Coin",
        USD_Coin,
        "--Dogecoin",
        Dogecoin,
        "--output_path",
        outputPath,
    ];
    log("Calling Python crypto.py with args", args);
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
    await conversation.external(updatecryptoImage);
    await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
}
// --------------------------------------------------
//  Menu builder
// --------------------------------------------------
function buildFormMenu(conversation, data) {
    return (conversation
        .menu("form")
        .text(data.Bitcoin ? "بیت‌کوین" : "بیت‌کوین", (ctx) => ctx.conversation.enter("BitcoinConversation"))
        .row()
        .text(data.Ethereum ? "اتریوم " : "اتریوم ", (ctx) => ctx.conversation.enter("EthereumConversation"))
        .row()
        .text(data.Tether ? "تتر " : "تتر ", (ctx) => ctx.conversation.enter("TetherConversation"))
        .row()
        .text(data.Ripple ? "ریپل " : "ریپل ", (ctx) => ctx.conversation.enter("RippleConversation"))
        .row()
        .text(data.BinanceCoin ? "بایننس‌کوین " : "بایننس‌کوین ", (ctx) => ctx.conversation.enter("BinanceCoinConversation"))
        .row()
        .text(data.Solana ? "سولانا " : "سولانا ", (ctx) => ctx.conversation.enter("SolanaConversation"))
        .row()
        .text(data.USD_Coin ? "یواس‌دی کوین" : "یواس‌دی کوین", (ctx) => ctx.conversation.enter("USD_CoinConversation"))
        .row()
        .text(data.USD_Coin ? "دوج کوین" : "دوج کوین", (ctx) => ctx.conversation.enter("DogecoinConversation"))
        .row()
        .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
        .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation")));
}
// --------------------------------------------------
//  Conversation generators for each crypto field
// --------------------------------------------------
function createcryptoConversation(fieldName, prompt) {
    return async function (conversation, ctx) {
        await handleFieldInput(conversation, ctx, { fieldName, promptMessage: prompt }, buildFormMenu);
    };
}
const BitcoinConversation = createcryptoConversation("Bitcoin", "لطفا مقدار بیت‌کوین را وارد کنید");
const EthereumConversation = createcryptoConversation("Ethereum", "لطفا مقدار اتریوم را وارد کنید");
const TetherConversation = createcryptoConversation("Tether", "لطفا مقدار تتر را وارد کنید");
const RippleConversation = createcryptoConversation("Ripple", "لطفا مقدار ریپل را وارد کنید");
const BinanceCoinConversation = createcryptoConversation("BinanceCoin", "لطفا مقدار بایننس‌کوین را وارد کنید");
const SolanaConversation = createcryptoConversation("Solana", "لطفا مقدار سولانا را وارد کنید");
const USD_CoinConversation = createcryptoConversation("USD_Coin", "لطفا مقدار یواس‌دی کوین را وارد کنید");
const DogecoinConversation = createcryptoConversation("Dogecoin", "لطفا مقدار دوج کوین را وارد کنید");
// clear form conversation
async function clearFormConversation(conversation, ctx) {
    await ctx.answerCallbackQuery();
    await conversation.external((ctx) => {
        ctx.session.Bitcoin = ctx.session.Ethereum = ctx.session.Tether = ctx.session.Ripple = ctx.session.BinanceCoin = ctx.session.Solana = ctx.session.USD_Coin = undefined;
        ctx.session.sentDocMsgIds = [];
    });
    const clearedMenu = buildFormMenu(conversation, collectFormData(ctx));
    await ctx.editMessageMedia({ type: "photo", media: new grammy_1.InputFile("./assets/crypto_TEMPLATE.png") });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
}
async function finishConversation(conversation, ctx) {
    var _a;
    await conversation.external(updatecryptoImage); // ← add this line
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
bot.use((0, conversations_1.createConversation)(BitcoinConversation, "BitcoinConversation"));
bot.use((0, conversations_1.createConversation)(EthereumConversation, "EthereumConversation"));
bot.use((0, conversations_1.createConversation)(TetherConversation, "TetherConversation"));
bot.use((0, conversations_1.createConversation)(RippleConversation, "RippleConversation"));
bot.use((0, conversations_1.createConversation)(BinanceCoinConversation, "BinanceCoinConversation"));
bot.use((0, conversations_1.createConversation)(SolanaConversation, "SolanaConversation"));
bot.use((0, conversations_1.createConversation)(USD_CoinConversation, "USD_CoinConversation"));
bot.use((0, conversations_1.createConversation)(DogecoinConversation, "DogecoinConversation"));
bot.use((0, conversations_1.createConversation)(clearFormConversation, "clearFormConversation"));
bot.use((0, conversations_1.createConversation)(finishConversation, "finishConversation"));
// --------------------------------------------------
//  Stand‑alone menu instance (needed for /start)
// --------------------------------------------------
exports.formMenu = new menu_1.Menu("form", { onMenuOutdated: false })
    .text((ctx) => collectFormData(ctx).Bitcoin ? "بیت‌کوین" : "بیت‌کوین", (ctx) => ctx.conversation.enter("BitcoinConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Ethereum ? "اتریوم " : "اتریوم ", (ctx) => ctx.conversation.enter("EthereumConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Tether ? "تتر " : "تتر ", (ctx) => ctx.conversation.enter("TetherConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Ripple ? "ریپل " : "ریپل ", (ctx) => ctx.conversation.enter("RippleConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).BinanceCoin ? "بایننس‌کوین " : "بایننس‌کوین ", (ctx) => ctx.conversation.enter("BinanceCoinConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Solana ? "سولانا " : "سولانا ", (ctx) => ctx.conversation.enter("SolanaConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).USD_Coin ? "یواس‌دی کوین" : "یواس‌دی کوین", (ctx) => ctx.conversation.enter("USD_CoinConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).USD_Coin ? "دوج کوین" : "دوج کوین", (ctx) => ctx.conversation.enter("DogecoinConversation"))
    .row()
    .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
    .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"));
bot.use(exports.formMenu);
// --------------------------------------------------
//  /start
// --------------------------------------------------
bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const outputPath = `./OutPut/crypto_post_${userId}.png`;
    ctx.session.outputPath = outputPath;
    const sentMsg = await ctx.replyWithPhoto(new grammy_1.InputFile("./assets/CRYPTO_TEMPLATE.png"), { reply_markup: exports.formMenu });
    ctx.session.mainMessageId = sentMsg.message_id;
    log("Bot started for", userId);
});
bot.catch((err) => log("Global error", err));
bot.api.setMyCommands([
    { command: "start", description: "رباتو روشن کن!" },
]);
bot.start();
log("Bot running …");
