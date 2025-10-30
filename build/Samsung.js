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
const bot = new grammy_1.Bot("7672479291:AAERy__DyH150jIA_pko4QKFEh-9yR-9ZAI");
bot.use((0, grammy_1.session)({
    initial: () => ({
        sentDocMsgIds: [],
    }),
    storage: new storage_file_1.FileAdapter({ dirName: "./sessions" }),
}));
bot.use((0, conversations_1.conversations)());
bot.use((0, hydrate_1.hydrate)());
// function getOutputPath(ctx: MyContext): string {
//     return ctx.session.outputPath ?? `./OutPut/Samsung_post_${ctx.from!.id}.png`;
// }
function getOutputPath(ctx) {
    const fallback = `./OutPut/Samsung_post_${ctx.from?.id ?? "anon"}.png`;
    // optional‑chain ⇒ never touches .outputPath if session is missing
    return ctx.session?.outputPath ?? fallback;
}
function collectFormData(ctx) {
    // session may be undefined inside some conversation internals — be defensive
    const s = ctx.session;
    return {
        GALAXYS25ULTRA: s?.GALAXYS25ULTRA,
        GALAXYS24ULTRA: s?.GALAXYS24ULTRA,
        GALAXYS23ULTRA: s?.GALAXYS23ULTRA,
        GALAXYS24FE: s?.GALAXYS24FE,
        GALAXYA56: s?.GALAXYA56,
        GALAXYA35: s?.GALAXYA35,
        GALAXYA16: s?.GALAXYA16,
        GALAXYA06: s?.GALAXYA06,
    };
}
// spawn the Python script to compose the image
async function updateSamsungImage(ctx) {
    const { GALAXYS25ULTRA = "0", GALAXYS24ULTRA = "0", GALAXYS23ULTRA = "0", GALAXYS24FE = "0", GALAXYA56 = "0", GALAXYA35 = "0", GALAXYA16 = "0", GALAXYA06 = "0", } = ctx.session;
    const outputPath = getOutputPath(ctx);
    ctx.session.outputPath = outputPath;
    const args = [
        "./src/craft/Samsung.py",
        "--GALAXYS25ULTRA",
        GALAXYS25ULTRA,
        "--GALAXYS24ULTRA",
        GALAXYS24ULTRA,
        "--GALAXYS23ULTRA",
        GALAXYS23ULTRA,
        "--GALAXYS24FE",
        GALAXYS24FE,
        "--GALAXYA56",
        GALAXYA56,
        "--GALAXYA35",
        GALAXYA35,
        "--GALAXYA16",
        GALAXYA16,
        "--GALAXYA06",
        GALAXYA06,
        "--output_path",
        outputPath,
    ];
    log("Calling Python Samsung.py with args", args);
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
    await conversation.external(updateSamsungImage);
    await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
}
// --------------------------------------------------
//  Menu builder
// --------------------------------------------------
function buildFormMenu(conversation, data) {
    return (conversation
        .menu("form")
        .text(data.GALAXYS25ULTRA ? "Galaxy S25 Ultra" : "Galaxy S25 Ultra", (ctx) => ctx.conversation.enter("GALAXYS25ULTRAConversation"))
        .row()
        .text(data.GALAXYS24ULTRA ? "Galaxy S24 Ultra" : "Galaxy S24 Ultra", (ctx) => ctx.conversation.enter("GALAXYS24ULTRAConversation"))
        .row()
        .text(data.GALAXYS23ULTRA ? "Galaxy S25 plus" : "Galaxy S25 plus", (ctx) => ctx.conversation.enter("GALAXYS23ULTRAConversation"))
        .row()
        .text(data.GALAXYS24FE ? "Galaxy S24 FE" : "Galaxy S24 FE", (ctx) => ctx.conversation.enter("GALAXYS24FEConversation"))
        .row()
        .text(data.GALAXYA56 ? "Galaxy A56 " : "Galaxy A56 ", (ctx) => ctx.conversation.enter("GALAXYA56Conversation"))
        .row()
        .text(data.GALAXYA35 ? "Galaxy A35" : "Galaxy A35", (ctx) => ctx.conversation.enter("GALAXYA35Conversation"))
        .row()
        .text(data.GALAXYA16 ? "Galaxy A16" : "Galaxy A16", (ctx) => ctx.conversation.enter("GALAXYA16Conversation"))
        .row()
        .text(data.GALAXYA16 ? "Galaxy A06" : "Galaxy A06", (ctx) => ctx.conversation.enter("GALAXYA06Conversation"))
        .row()
        .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
        .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation")));
}
// --------------------------------------------------
//  Conversation generators for each Samsung field
// --------------------------------------------------
function createSamsungConversation(fieldName, prompt) {
    return async function (conversation, ctx) {
        await handleFieldInput(conversation, ctx, { fieldName, promptMessage: prompt }, buildFormMenu);
    };
}
const GALAXYS25ULTRAConversation = createSamsungConversation("GALAXYS25ULTRA", "لطفا مقدار  Galaxy S25 Ultraرا وارد کنید");
const GALAXYS24ULTRAConversation = createSamsungConversation("GALAXYS24ULTRA", "لطفا مقدار Galaxy S24 Ultraرا وارد کنید");
const GALAXYS23ULTRAConversation = createSamsungConversation("GALAXYS23ULTRA", "لطفا مقدار Galaxy S25 plusرا وارد کنید");
const GALAXYS24FEConversation = createSamsungConversation("GALAXYS24FE", "لطفا مقدار Galaxy S24 FEرا وارد کنید");
const GALAXYA56Conversation = createSamsungConversation("GALAXYA56", "لطفا مقدار Galaxy A56 را وارد کنید");
const GALAXYA35Conversation = createSamsungConversation("GALAXYA35", "لطفا مقدار Galaxy A35را وارد کنید");
const GALAXYA16Conversation = createSamsungConversation("GALAXYA16", "لطفا مقدار Galaxy A16 را وارد کنید");
const GALAXYA06Conversation = createSamsungConversation("GALAXYA06", "لطفا مقدار Galaxy A06 را وارد کنید");
// clear form conversation
async function clearFormConversation(conversation, ctx) {
    await ctx.answerCallbackQuery();
    await conversation.external((ctx) => {
        ctx.session.GALAXYS25ULTRA = ctx.session.GALAXYS24ULTRA = ctx.session.GALAXYS23ULTRA = ctx.session.GALAXYS24FE = ctx.session.GALAXYA56 = ctx.session.GALAXYA35 = ctx.session.GALAXYA16 = undefined;
        ctx.session.sentDocMsgIds = [];
    });
    const clearedMenu = buildFormMenu(conversation, collectFormData(ctx));
    await ctx.editMessageMedia({ type: "photo", media: new grammy_1.InputFile("./assets/Samsung.png") });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
}
async function finishConversation(conversation, ctx) {
    var _a;
    await conversation.external(updateSamsungImage); // ← add this line
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
bot.use((0, conversations_1.createConversation)(GALAXYS25ULTRAConversation, "GALAXYS25ULTRAConversation"));
bot.use((0, conversations_1.createConversation)(GALAXYS24ULTRAConversation, "GALAXYS24ULTRAConversation"));
bot.use((0, conversations_1.createConversation)(GALAXYS23ULTRAConversation, "GALAXYS23ULTRAConversation"));
bot.use((0, conversations_1.createConversation)(GALAXYS24FEConversation, "GALAXYS24FEConversation"));
bot.use((0, conversations_1.createConversation)(GALAXYA56Conversation, "GALAXYA56Conversation"));
bot.use((0, conversations_1.createConversation)(GALAXYA35Conversation, "GALAXYA35Conversation"));
bot.use((0, conversations_1.createConversation)(GALAXYA16Conversation, "GALAXYA16Conversation"));
bot.use((0, conversations_1.createConversation)(GALAXYA06Conversation, "GALAXYA06Conversation"));
bot.use((0, conversations_1.createConversation)(clearFormConversation, "clearFormConversation"));
bot.use((0, conversations_1.createConversation)(finishConversation, "finishConversation"));
// --------------------------------------------------
//  Stand‑alone menu instance (needed for /start)
// --------------------------------------------------
exports.formMenu = new menu_1.Menu("form", { onMenuOutdated: false })
    .text((ctx) => collectFormData(ctx).GALAXYS25ULTRA ? "Galaxy S25 Ultra" : "Galaxy S25 Ultra", (ctx) => ctx.conversation.enter("GALAXYS25ULTRAConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).GALAXYS24ULTRA ? "Galaxy S24 Ultra" : "Galaxy S24 Ultra", (ctx) => ctx.conversation.enter("GALAXYS24ULTRAConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).GALAXYS23ULTRA ? "Galaxy S25 plus" : "Galaxy S25 plus", (ctx) => ctx.conversation.enter("GALAXYS23ULTRAConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).GALAXYS24FE ? "Galaxy S24 FE" : "Galaxy S24 FE", (ctx) => ctx.conversation.enter("GALAXYS24FEConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).GALAXYA56 ? "Galaxy A56 " : "Galaxy A56 ", (ctx) => ctx.conversation.enter("GALAXYA56Conversation"))
    .row()
    .text((ctx) => collectFormData(ctx).GALAXYA35 ? "Galaxy A35" : "Galaxy A35", (ctx) => ctx.conversation.enter("GALAXYA35Conversation"))
    .row()
    .text((ctx) => collectFormData(ctx).GALAXYA16 ? "Galaxy A16" : "Galaxy A16", (ctx) => ctx.conversation.enter("GALAXYA16Conversation"))
    .row()
    .text((ctx) => collectFormData(ctx).GALAXYA16 ? "Galaxy A06" : "Galaxy A06", (ctx) => ctx.conversation.enter("GALAXYA06Conversation"))
    .row()
    .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
    .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"));
bot.use(exports.formMenu);
// --------------------------------------------------
//  /start
// --------------------------------------------------
bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const outputPath = `./OutPut/Samsung_post_${userId}.png`;
    ctx.session.outputPath = outputPath;
    const sentMsg = await ctx.replyWithPhoto(new grammy_1.InputFile("./assets/Samsung.png"), { reply_markup: exports.formMenu });
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
