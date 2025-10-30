"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formMenu = void 0;
const grammy_1 = require("grammy");
const menu_1 = require("@grammyjs/menu");
const hydrate_1 = require("@grammyjs/hydrate");
const conversations_1 = require("@grammyjs/conversations");
const child_process_1 = require("child_process");
const storage_file_1 = require("@grammyjs/storage-file");
const acl_1 = require("./acl");
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
const bot = new grammy_1.Bot("7822307632:AAHAqLzycbOi89zp8fTc3jsPkLdY091a4oY");
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
    const fallback = `./OutPut/gold_post_${ctx.from?.id ?? "anon"}.png`;
    // optional‑chain ⇒ never touches .outputPath if session is missing
    return ctx.session?.outputPath ?? fallback;
}
function collectFormData(ctx) {
    // session may be undefined inside some conversation internals — be defensive
    const s = ctx.session;
    return {
        Gold: s?.Gold,
        Coin: s?.Coin,
        HalfCoin: s?.HalfCoin,
        QuarterCoin: s?.QuarterCoin,
        Gold18: s?.Gold18,
        Gold24: s?.Gold24,
        SaudiRiyal: s?.SaudiRiyal,
    };
}
// spawn the Python script to compose the image
async function updateCurrencyImage(ctx) {
    const { Gold = "0", Coin = "0", HalfCoin = "0", QuarterCoin = "0", Gold18 = "0", Gold24 = "0", SaudiRiyal = "0", } = ctx.session;
    const outputPath = getOutputPath(ctx);
    ctx.session.outputPath = outputPath;
    const args = [
        "./src/craft/gold.py",
        "--Gold",
        Gold,
        "--Coin",
        Coin,
        "--HalfCoin",
        HalfCoin,
        "--QuarterCoin",
        QuarterCoin,
        "--Gold18",
        Gold18,
        "--Gold24",
        Gold24,
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
        .text(data.Gold ? "مثقال طلا  " : " مثقال طلا ", (ctx) => ctx.conversation.enter("GoldConversation"))
        .row()
        .text(data.Coin ? "سکه " : "سکه ", (ctx) => ctx.conversation.enter("CoinConversation"))
        .row()
        .text(data.HalfCoin ? "نیم‌سکه " : "نیم‌سکه ", (ctx) => ctx.conversation.enter("HalfCoinConversation"))
        .row()
        .text(data.QuarterCoin ? "ربع‌سکه " : "ربع‌سکه ", (ctx) => ctx.conversation.enter("QuarterCoinConversation"))
        .row()
        .text(data.Gold18 ? "طلای ۱۸ عیار " : "طلای ۱۸ عیار ", (ctx) => ctx.conversation.enter("Gold18Conversation"))
        .row()
        .text(data.Gold24 ? "طلای ۲۴ عیار " : "طلای ۲۴ عیار ", (ctx) => ctx.conversation.enter("yuanConversation"))
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
const GoldConversation = createCurrencyConversation("Gold", "لطفا مقدار  مثقال طلا  را وارد کنید");
const CoinConversation = createCurrencyConversation("Coin", "لطفا مقدار سکه را وارد کنید");
const HalfCoinConversation = createCurrencyConversation("HalfCoin", "لطفا مقدار نیم‌سکه را وارد کنید");
const QuarterCoinConversation = createCurrencyConversation("QuarterCoin", "لطفا مقدار ربع‌سکه را وارد کنید");
const Gold18Conversation = createCurrencyConversation("Gold18", "لطفا مقدار طلای ۱۸ عیار را وارد کنید");
const yuanConversation = createCurrencyConversation("Gold24", "لطفا مقدار طلای ۲۴ عیار را وارد کنید");
// clear form conversation
async function clearFormConversation(conversation, ctx) {
    await ctx.answerCallbackQuery();
    await conversation.external((ctx) => {
        ctx.session.Gold = ctx.session.Coin = ctx.session.HalfCoin = ctx.session.QuarterCoin = ctx.session.Gold18 = ctx.session.Gold24 = ctx.session.SaudiRiyal = undefined;
        ctx.session.sentDocMsgIds = [];
    });
    const clearedMenu = buildFormMenu(conversation, collectFormData(ctx));
    await ctx.editMessageMedia({ type: "photo", media: new grammy_1.InputFile("./assets/GOLD_TEMPLATE.png") });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
}
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
// ---- Access Control Gate ----
bot.use(async (ctx, next) => {
    const uid = ctx.from?.id;
    if (!uid)
        return; // ignore updates without user
    // Always allow admins
    if ((0, acl_1.isAdmin)(uid))
        return next();
    // Allow non-admins to run *only* if they are in allowed list
    if ((0, acl_1.isAllowed)(uid))
        return next();
    // Optional: let unknown users see a short message and stop
    try {
        await ctx.reply("⛔️ You are not allowed to use this bot.");
    }
    catch { }
    return; // block
});
// --------------------------------------------------
//  Register conversations
// --------------------------------------------------
bot.use((0, conversations_1.createConversation)(GoldConversation, "GoldConversation"));
bot.use((0, conversations_1.createConversation)(CoinConversation, "CoinConversation"));
bot.use((0, conversations_1.createConversation)(HalfCoinConversation, "HalfCoinConversation"));
bot.use((0, conversations_1.createConversation)(QuarterCoinConversation, "QuarterCoinConversation"));
bot.use((0, conversations_1.createConversation)(Gold18Conversation, "Gold18Conversation"));
bot.use((0, conversations_1.createConversation)(yuanConversation, "yuanConversation"));
bot.use((0, conversations_1.createConversation)(clearFormConversation, "clearFormConversation"));
bot.use((0, conversations_1.createConversation)(finishConversation, "finishConversation"));
// --------------------------------------------------
//  Stand‑alone menu instance (needed for /start)
// --------------------------------------------------
exports.formMenu = new menu_1.Menu("form", { onMenuOutdated: false })
    .text((ctx) => collectFormData(ctx).Gold ? " مثقال طلا " : " مثقال طلا ", (ctx) => ctx.conversation.enter("GoldConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Coin ? "سکه " : "سکه ", (ctx) => ctx.conversation.enter("CoinConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).HalfCoin ? "نیم‌سکه " : "نیم‌سکه ", (ctx) => ctx.conversation.enter("HalfCoinConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).QuarterCoin ? "ربع‌سکه " : "ربع‌سکه ", (ctx) => ctx.conversation.enter("QuarterCoinConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Gold18 ? "طلای ۱۸ عیار " : "طلای ۱۸ عیار ", (ctx) => ctx.conversation.enter("Gold18Conversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Gold24 ? "طلای ۲۴ عیار " : "طلای ۲۴ عیار ", (ctx) => ctx.conversation.enter("yuanConversation"))
    .row()
    .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
    .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"));
bot.use(exports.formMenu);
// --------------------------------------------------
//  /start
// --------------------------------------------------
bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const outputPath = `./OutPut/gold_post_${userId}.png`;
    ctx.session.outputPath = outputPath;
    const sentMsg = await ctx.replyWithPhoto(new grammy_1.InputFile("./assets/GOLD_TEMPLATE.png"), { reply_markup: exports.formMenu });
    ctx.session.mainMessageId = sentMsg.message_id;
    log("Bot started for", userId);
});
bot.command("add", async (ctx) => {
    const adminId = ctx.from?.id;
    if (!adminId || !(0, acl_1.isAdmin)(adminId))
        return;
    // 1) If admin replied to a user's message: add that user
    const repliedUserId = ctx.message?.reply_to_message?.from?.id;
    if (repliedUserId) {
        const r = (0, acl_1.addAllowed)(repliedUserId);
        await ctx.reply(r.added ? `✅ Added ${repliedUserId}` : `ℹ️ ${r.reason}`);
        return;
    }
    // 2) Else parse an explicit numeric ID after the command
    const text = ctx.message?.text ?? "";
    const arg = text.replace(/^\/add(@\w+)?\s*/, "").trim(); // handles "/add" and "/add@YourBot"
    if (!arg) {
        await ctx.reply("Usage:\n• Reply to a user’s message and send /add\n• Or: /add <telegram_user_id>");
        return;
    }
    if (!/^\d+$/.test(arg)) {
        await ctx.reply("Provide a numeric Telegram user ID.");
        return;
    }
    const r = (0, acl_1.addAllowed)(arg);
    await ctx.reply(r.added ? `✅ Added ${arg}` : `ℹ️ ${r.reason}`);
});
bot.command("remove", async (ctx) => {
    const adminId = ctx.from?.id;
    if (!adminId || !(0, acl_1.isAdmin)(adminId))
        return;
    const repliedUserId = ctx.message?.reply_to_message?.from?.id;
    if (repliedUserId) {
        const r = (0, acl_1.removeAllowed)(repliedUserId);
        await ctx.reply(r.removed ? `🗑️ Removed ${repliedUserId}` : `ℹ️ ${r.reason}`);
        return;
    }
    const text = ctx.message?.text ?? "";
    const arg = text.replace(/^\/remove(@\w+)?\s*/, "").trim();
    if (!arg) {
        await ctx.reply("Usage:\n• Reply to a user’s message and send /remove\n• Or: /remove <telegram_user_id>");
        return;
    }
    if (!/^\d+$/.test(arg)) {
        await ctx.reply("Provide a numeric Telegram user ID.");
        return;
    }
    const r = (0, acl_1.removeAllowed)(arg);
    await ctx.reply(r.removed ? `🗑️ Removed ${arg}` : `ℹ️ ${r.reason}`);
});
bot.command("list", async (ctx) => {
    const adminId = ctx.from?.id;
    if (!adminId || !(0, acl_1.isAdmin)(adminId))
        return;
    const admins = (0, acl_1.listAdmins)();
    const allowed = (0, acl_1.listAllowed)();
    await ctx.reply([
        "👑 Admins:",
        admins.length ? admins.map(x => `• ${x}`).join("\n") : "  (none)",
        "",
        "✅ Allowed:",
        allowed.length ? allowed.map(x => `• ${x}`).join("\n") : "  (none)",
    ].join("\n"));
});
bot.api.setMyCommands([
    { command: "start", description: "رباتو روشن کن!" },
    { command: "list", description: "لیست آی‌دی افرادی که به بات دسترسی دارند." },
    { command: "remove", description: "با کمک آی‌دی دسترسی استفاده از بات رو بگیر." },
    { command: "add", description: "با کمک آی‌دی به بات دسترسی بده." },
]);
bot.catch((err) => log("Global error", err));
bot.start();
log("Bot running …");
