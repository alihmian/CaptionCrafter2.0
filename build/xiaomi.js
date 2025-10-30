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
const bot = new grammy_1.Bot("7796118345:AAEO4yeA9uYMnP9aVEkz4zINXZsJ_krNaTo");
bot.use((0, grammy_1.session)({
    initial: () => ({
        sentDocMsgIds: [],
    }),
    storage: new storage_file_1.FileAdapter({ dirName: "./sessions" }),
}));
bot.use((0, conversations_1.conversations)());
bot.use((0, hydrate_1.hydrate)());
// function getOutputPath(ctx: MyContext): string {
//     return ctx.session.outputPath ?? `./OutPut/xiaomi_post_${ctx.from!.id}.png`;
// }
function getOutputPath(ctx) {
    const fallback = `./OutPut/xiaomi_post_${ctx.from?.id ?? "anon"}.png`;
    // optional‑chain ⇒ never touches .outputPath if session is missing
    return ctx.session?.outputPath ?? fallback;
}
function collectFormData(ctx) {
    // session may be undefined inside some conversation internals — be defensive
    const s = ctx.session;
    return {
        REDMINOTE14: s?.REDMINOTE14,
        REDMINOTE13: s?.REDMINOTE13,
        XIAOMIXIAOMI14TPRO: s?.XIAOMIXIAOMI14TPRO,
        XIAOMI14T: s?.XIAOMI14T,
        POCOF6PRO: s?.POCOF6PRO,
        POCOX7PRO: s?.POCOX7PRO,
        POCOM6PRO: s?.POCOM6PRO,
        GALAXYA06: s?.GALAXYA06,
    };
}
// spawn the Python script to compose the image
async function updatexiaomiImage(ctx) {
    const { REDMINOTE14 = "0", REDMINOTE13 = "0", XIAOMIXIAOMI14TPRO = "0", XIAOMI14T = "0", POCOF6PRO = "0", POCOX7PRO = "0", POCOM6PRO = "0", GALAXYA06 = "0", } = ctx.session;
    const outputPath = getOutputPath(ctx);
    ctx.session.outputPath = outputPath;
    const args = [
        "./src/craft/xiaomi.py",
        "--REDMINOTE14",
        REDMINOTE14,
        "--REDMINOTE13",
        REDMINOTE13,
        "--XIAOMIXIAOMI14TPRO",
        XIAOMIXIAOMI14TPRO,
        "--XIAOMI14T",
        XIAOMI14T,
        "--POCOF6PRO",
        POCOF6PRO,
        "--POCOX7PRO",
        POCOX7PRO,
        "--POCOM6PRO",
        POCOM6PRO,
        "--GALAXYA06",
        GALAXYA06,
        "--output_path",
        outputPath,
    ];
    log("Calling Python xiaomi.py with args", args);
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
    await conversation.external(updatexiaomiImage);
    await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
}
// --------------------------------------------------
//  Menu builder
// --------------------------------------------------
function buildFormMenu(conversation, data) {
    return (conversation
        .menu("form")
        .text(data.REDMINOTE14 ? "Redmi Note 14" : "Redmi Note 14", (ctx) => ctx.conversation.enter("REDMINOTE14Conversation"))
        .row()
        .text(data.REDMINOTE13 ? "Redmi Note 13" : "Redmi Note 13", (ctx) => ctx.conversation.enter("REDMINOTE13Conversation"))
        .row()
        .text(data.XIAOMIXIAOMI14TPRO ? "Xiaomi 14T Pro" : "Xiaomi 14T Pro", (ctx) => ctx.conversation.enter("XIAOMIXIAOMI14TPROConversation"))
        .row()
        .text(data.XIAOMI14T ? "Xiaomi 14T" : "Xiaomi 14T", (ctx) => ctx.conversation.enter("XIAOMI14TConversation"))
        .row()
        .text(data.POCOF6PRO ? "Poco F6 Pro " : "Poco F6 Pro ", (ctx) => ctx.conversation.enter("POCOF6PROConversation"))
        .row()
        .text(data.POCOX7PRO ? "Poco X7 Pro" : "Poco X7 Pro", (ctx) => ctx.conversation.enter("POCOX7PROConversation"))
        .row()
        .text(data.POCOM6PRO ? "Poco M6 Pro" : "Poco M6 Pro", (ctx) => ctx.conversation.enter("POCOM6PROConversation"))
        .row()
        // .text(data.POCOM6PRO ? "Galaxy A06" : "Galaxy A06", (ctx) => ctx.conversation.enter("GALAXYA06Conversation"))
        // .row()
        .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
        .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation")));
}
// --------------------------------------------------
//  Conversation generators for each xiaomi field
// --------------------------------------------------
function createxiaomiConversation(fieldName, prompt) {
    return async function (conversation, ctx) {
        await handleFieldInput(conversation, ctx, { fieldName, promptMessage: prompt }, buildFormMenu);
    };
}
const REDMINOTE14Conversation = createxiaomiConversation("REDMINOTE14", "لطفا مقدار  Redmi Note 14را وارد کنید");
const REDMINOTE13Conversation = createxiaomiConversation("REDMINOTE13", "لطفا مقدار Redmi Note 13را وارد کنید");
const XIAOMIXIAOMI14TPROConversation = createxiaomiConversation("XIAOMIXIAOMI14TPRO", "لطفا مقدار Xiaomi 14T Proرا وارد کنید");
const XIAOMI14TConversation = createxiaomiConversation("XIAOMI14T", "لطفا مقدار Xiaomi 14Tرا وارد کنید");
const POCOF6PROConversation = createxiaomiConversation("POCOF6PRO", "لطفا مقدار Poco F6 Pro را وارد کنید");
const POCOX7PROConversation = createxiaomiConversation("POCOX7PRO", "لطفا مقدار Poco X7 Proرا وارد کنید");
const POCOM6PROConversation = createxiaomiConversation("POCOM6PRO", "لطفا مقدار Poco M6 Pro را وارد کنید");
// const GALAXYA06Conversation = createxiaomiConversation("GALAXYA06", "لطفا مقدار Galaxy A06 را وارد کنید");
// clear form conversation
async function clearFormConversation(conversation, ctx) {
    await ctx.answerCallbackQuery();
    await conversation.external((ctx) => {
        ctx.session.REDMINOTE14 = ctx.session.REDMINOTE13 = ctx.session.XIAOMIXIAOMI14TPRO = ctx.session.XIAOMI14T = ctx.session.POCOF6PRO = ctx.session.POCOX7PRO = ctx.session.POCOM6PRO = undefined;
        ctx.session.sentDocMsgIds = [];
    });
    const clearedMenu = buildFormMenu(conversation, collectFormData(ctx));
    await ctx.editMessageMedia({ type: "photo", media: new grammy_1.InputFile("./assets/xiaomi.png") });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
}
async function finishConversation(conversation, ctx) {
    var _a;
    await conversation.external(updatexiaomiImage); // ← add this line
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
    // 1) Never send deny messages outside DMs
    const chatType = ctx.chat?.type; // 'private' | 'group' | 'supergroup' | 'channel'
    const isDM = chatType === "private";
    // For channels, there is usually no ctx.from; skip entirely.
    if (chatType === "channel")
        return; // do nothing in channels
    const uid = ctx.from?.id;
    if (!uid)
        return; // ignore updates without a user
    // 2) Allow admins/allowed everywhere
    if ((0, acl_1.isAdmin)(uid) || (0, acl_1.isAllowed)(uid))
        return next();
    // 3) Block silently in groups/supergroups, show message only in DMs
    if (isDM) {
        try {
            await ctx.reply("⛔️ You are not allowed to use this bot.");
        }
        catch { }
    }
    return; // block
});
// --------------------------------------------------
//  Register conversations
// --------------------------------------------------
bot.use((0, conversations_1.createConversation)(REDMINOTE14Conversation, "REDMINOTE14Conversation"));
bot.use((0, conversations_1.createConversation)(REDMINOTE13Conversation, "REDMINOTE13Conversation"));
bot.use((0, conversations_1.createConversation)(XIAOMIXIAOMI14TPROConversation, "XIAOMIXIAOMI14TPROConversation"));
bot.use((0, conversations_1.createConversation)(XIAOMI14TConversation, "XIAOMI14TConversation"));
bot.use((0, conversations_1.createConversation)(POCOF6PROConversation, "POCOF6PROConversation"));
bot.use((0, conversations_1.createConversation)(POCOX7PROConversation, "POCOX7PROConversation"));
bot.use((0, conversations_1.createConversation)(POCOM6PROConversation, "POCOM6PROConversation"));
// bot.use(createConversation(GALAXYA06Conversation, "GALAXYA06Conversation"));
bot.use((0, conversations_1.createConversation)(clearFormConversation, "clearFormConversation"));
bot.use((0, conversations_1.createConversation)(finishConversation, "finishConversation"));
// --------------------------------------------------
//  Stand‑alone menu instance (needed for /start)
// --------------------------------------------------
exports.formMenu = new menu_1.Menu("form", { onMenuOutdated: false })
    .text((ctx) => collectFormData(ctx).REDMINOTE14 ? "Redmi Note 14" : "Redmi Note 14", (ctx) => ctx.conversation.enter("REDMINOTE14Conversation"))
    .row()
    .text((ctx) => collectFormData(ctx).REDMINOTE13 ? "Redmi Note 13" : "Redmi Note 13", (ctx) => ctx.conversation.enter("REDMINOTE13Conversation"))
    .row()
    .text((ctx) => collectFormData(ctx).XIAOMIXIAOMI14TPRO ? "Xiaomi 14T Pro" : "Xiaomi 14T Pro", (ctx) => ctx.conversation.enter("XIAOMIXIAOMI14TPROConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).XIAOMI14T ? "Xiaomi 14T" : "Xiaomi 14T", (ctx) => ctx.conversation.enter("XIAOMI14TConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).POCOF6PRO ? "Poco F6 Pro " : "Poco F6 Pro ", (ctx) => ctx.conversation.enter("POCOF6PROConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).POCOX7PRO ? "Poco X7 Pro" : "Poco X7 Pro", (ctx) => ctx.conversation.enter("POCOX7PROConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).POCOM6PRO ? "Poco M6 Pro" : "Poco M6 Pro", (ctx) => ctx.conversation.enter("POCOM6PROConversation"))
    .row()
    // .text((ctx) => collectFormData(ctx).POCOM6PRO ? "Galaxy A06" : "Galaxy A06", (ctx) => ctx.conversation.enter("GALAXYA06Conversation"))
    // .row()
    .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
    .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"));
bot.use(exports.formMenu);
// --------------------------------------------------
//  /start
// --------------------------------------------------
bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const outputPath = `./OutPut/xiaomi_post_${userId}.png`;
    ctx.session.outputPath = outputPath;
    const sentMsg = await ctx.replyWithPhoto(new grammy_1.InputFile("./assets/xiaomi.png"), { reply_markup: exports.formMenu });
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
