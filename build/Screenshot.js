"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.formMenu = void 0;
const grammy_1 = require("grammy");
const menu_1 = require("@grammyjs/menu");
const hydrate_1 = require("@grammyjs/hydrate");
const conversations_1 = require("@grammyjs/conversations");
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const storage_file_1 = require("@grammyjs/storage-file");
const acl_1 = require("./acl");
const log = (...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]`, ...args);
};
// ----------------------
// Create the Bot
// ----------------------
const bot = new grammy_1.Bot("8018425100:AAEVcNTpWEU4kfAyLEHLbAiOKGeX_cXWsdo");
// Use session, conversations, and hydration middleware
bot.use((0, grammy_1.session)({
    initial: () => ({
        sentDocMsgIds: [],
    }),
    storage: new storage_file_1.FileAdapter({ dirName: "./sessions" }),
}));
bot.use((0, conversations_1.conversations)());
bot.use((0, hydrate_1.hydrate)());
// Safe accessor
function getOutputPath(ctx) {
    return ctx.session?.outputPath
        ?? `./OutPut/screenshot_image_${ctx.from.id}.png`;
}
// Returns current form data from the session with defaults for toggles and integers
function collectFormData(ctx) {
    return {
        Image: ctx.session.Image,
        Overline: ctx.session.Overline,
        MainHeadline: ctx.session.MainHeadline,
        source: ctx.session.source,
    };
}
// Utility: call the Python script via spawnSync, passing all relevant arguments as CLI args.
async function updateNewspaperImage(ctx) {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    log(`Generating image for user ${username} (${userId})`);
    // Safely check if mainMessageId is set
    const mainMessageId = ctx.session.mainMessageId;
    if (!mainMessageId) {
        log("No mainMessageId stored in session yet!");
        return;
    }
    // Gather needed info from the session
    const userImagePath = ctx.session.ImagePath || "./assets/void.png";
    const overlineText = ctx.session.Overline || " ";
    const mainHeadlineText = ctx.session.MainHeadline || " ";
    const source = ctx.session.source || "";
    // We'll produce the final image here.
    const outputPath = getOutputPath(ctx);
    const pythonScript = "./src/craft/screenshot.py"; // Adjust if needed
    const args = [
        pythonScript,
        "--user_image_path", userImagePath,
        "--overline_text", overlineText,
        "--main_headline_text", mainHeadlineText,
        "--output_path", outputPath,
        "--source_text", source,
    ];
    log("Calling Python script with args:", args);
    // spawnSync to run python3 script
    const result = (0, child_process_1.spawnSync)("python3", args, { stdio: "inherit" });
    if (result.error) {
        log("Error calling Python script:", result.error);
    }
    else {
        log("Python script executed successfully");
    }
    // try {
    //     await ctx.api.editMessageMedia(ctx.chat!.id, mainMessageId, {
    //         type: "photo",
    //         media: new InputFile(outputPath),
    //     });
    //     log("Updated message media successfully.");
    // } catch (error) {
    //     console.error("Failed to update newspaper image:", error);
    // }
    try {
        await ctx.api.editMessageMedia(ctx.chat.id, mainMessageId, { type: "photo", media: new grammy_1.InputFile(outputPath) });
    }
    catch (e) {
        if (e.error_code === 400 && /not modified/.test(e.description)) {
            // Nothing really changed, just continue
        }
        else {
            throw e; // Let grammY handle other errors
        }
    }
    // Now send ONE message in the channel with the final image + some info
    try {
        await ctx.api.sendPhoto(-1002302354978, // Your channel ID
        new grammy_1.InputFile(outputPath), {
            caption: `Newspaper created by @${username} \n(ID: ${userId})\n`
        });
    }
    catch (error) {
        console.error("Failed to send output image to channel:", error);
    }
}
// Builds the inline menu for the form.
function buildFormMenu(conversation, data) {
    return conversation.menu("form")
        // Image input row
        .text(data.Image ? "عکس ✅" : "عکس ❌", (ctx) => ctx.conversation.enter("imageConversation"))
        // Overline row (was Text1)
        .row()
        .text(data.Overline ? "روتیتر ✅ " : "روتیتر ❌", (ctx) => ctx.conversation.enter("overlineConversation"))
        .row()
        // MainHeadline row (was Text2)
        .text(data.MainHeadline ? "تیتر ✅" : "تیتر ❌", (ctx) => ctx.conversation.enter("mainHeadlineConversation"))
        .row()
        // Event1 (was Text3)
        .text(data.source ? "سورس ✅ " : "سورس ❌", (ctx) => ctx.conversation.enter("sourceConversation"))
        .row()
        // Final row for finishing or clearing the form
        .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
        .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"));
}
// A generic helper that handles a field input (text or photo)
async function handleFieldInput(conversation, ctx, options, buildMenu) {
    // Build the current form menu
    const initialData = await conversation.external((ctx) => collectFormData(ctx));
    const initialMenu = buildMenu(conversation, initialData);
    // Send a prompt to the user
    const question = await ctx.reply(options.promptMessage);
    // Create a Cancel button so the user can abort the action
    const cancelMenu = conversation.menu().text("کنسل", async (ctx) => {
        try {
            await ctx.api.deleteMessage(ctx.chat.id, question.message_id);
        }
        catch (err) {
            console.error("Failed to delete question:", err);
        }
        await ctx.menu.nav("form", { immediate: true });
        await conversation.halt();
    });
    await ctx.editMessageReplyMarkup({ reply_markup: cancelMenu });
    let input;
    if (options.waitType === "text") {
        input = await conversation.form.text({
            action: (ctx) => ctx.deleteMessage(),
        });
    }
    else if (options.waitType === "photo") {
        const photoMsg = await conversation.waitFor("message:photo");
        input = photoMsg;
        await photoMsg.deleteMessage();
    }
    if (options.processInput) {
        input = await options.processInput(ctx, input);
    }
    // Store the result in the session
    log(`Received input for field ${options.fieldName} from user ${ctx.from?.id}`);
    await conversation.external((ctx) => {
        ctx.session[options.fieldName] = input;
    });
    const updatedData = await conversation.external((ctx) => collectFormData(ctx));
    const updatedMenu = buildMenu(conversation, updatedData);
    await ctx.api.deleteMessage(ctx.chat.id, question.message_id);
    if (options.waitType === "photo" && options.updateMedia) {
        await options.updateMedia(ctx, input);
    }
    // Now also call the python function to update image
    // Wrap in conversation.external so session is guaranteed.
    await conversation.external(async (ctx) => {
        await updateNewspaperImage(ctx);
    });
    await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
    log(`Field ${options.fieldName} processed and image updated.`);
}
// ----------------------
// Conversation Handlers
// ----------------------
// Image conversation
async function imageConversation(conversation, ctx) {
    await ctx.answerCallbackQuery(); // first line of every button handler
    await handleFieldInput(conversation, ctx, {
        fieldName: "Image",
        promptMessage: " عکس پست را ارسال کنید",
        waitType: "photo",
        processInput: async (ctx, photoMsg) => {
            const photos = photoMsg.message.photo;
            const largestPhoto = photos[photos.length - 1];
            if (!largestPhoto) {
                await ctx.reply("No photo found!");
                return null;
            }
            const fileId = largestPhoto.file_id;
            const localPath = "./UserImages/image_" + ctx.chatId + ".jpg";
            const fileInfo = await ctx.api.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${fileInfo.file_path}`;
            const response = await fetch(fileUrl);
            if (!response.ok) {
                await ctx.reply("Failed to download the photo!");
                return null;
            }
            fs.writeFileSync(localPath, Buffer.from(await response.arrayBuffer()));
            await conversation.external((ctx) => {
                ctx.session.ImagePath = localPath;
            });
            return fileId;
        },
        updateMedia: async (ctx, fileId) => {
            await ctx.editMessageMedia({
                type: "photo",
                media: fileId,
                caption: "Image 1 updated",
            });
        },
    }, buildFormMenu);
}
// Overline conversation (was text1)
async function overlineConversation(conversation, ctx) {
    await ctx.answerCallbackQuery(); // first line of every button handler
    await handleFieldInput(conversation, ctx, {
        fieldName: "Overline",
        promptMessage: " روتیتر خبر را ارسال کنید",
        waitType: "text",
    }, buildFormMenu);
}
// MainHeadline conversation (was text2)
async function mainHeadlineConversation(conversation, ctx) {
    await ctx.answerCallbackQuery(); // first line of every button handler
    await handleFieldInput(conversation, ctx, {
        fieldName: "MainHeadline",
        promptMessage: "تیتر خبر را ارسال کنید",
        waitType: "text",
    }, buildFormMenu);
}
// source conversation 
async function sourceConversation(conversation, ctx) {
    await ctx.answerCallbackQuery(); // first line of every button handler
    await handleFieldInput(conversation, ctx, {
        fieldName: "source",
        promptMessage: "لطفا سورس را ارسال کنید",
        waitType: "text",
    }, buildFormMenu);
}
// Clear form conversation: resets the session data and updates the menu
async function clearFormConversation(conversation, ctx) {
    await ctx.answerCallbackQuery(); // first line of every button handler
    // delete uploaded docs back in the user chat
    await conversation.external(async (ctx) => {
        const ids = ctx.session.sentDocMsgIds ?? [];
        if (ids.length && ctx.chat) {
            const chatId = ctx.chat.id;
            for (const mid of ids) {
                try {
                    await ctx.api.deleteMessage(chatId, mid);
                }
                catch { /* already gone – ignore */ }
            }
        }
        ctx.session.sentDocMsgIds = []; // reset
        /* also wipe the other fields */
        ctx.session.Image = undefined;
        ctx.session.ImagePath = undefined;
        ctx.session.Overline = undefined;
        ctx.session.MainHeadline = undefined;
        ctx.session.source = undefined;
    });
    const clearedData = await conversation.external((ctx) => collectFormData(ctx));
    const clearedMenu = buildFormMenu(conversation, clearedData);
    // Optionally, reset the media to a default image (ensure the file exists)
    await ctx.editMessageMedia({
        type: "photo",
        media: new grammy_1.InputFile("./assets/SCREENSHOT_TEMPLATE.png"),
    });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
    log(`User ${ctx.from?.id} cleared the form.`);
}
// Finish conversation: shows a summary and optionally performs final processing
// Finish conversation: shows a summary and then deletes the menu, sends final doc, and logs in channel
async function finishConversation(conversation, ctx) {
    var _a;
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
// ----------------------
// Register Conversations
// ----------------------
bot.use((0, conversations_1.createConversation)(imageConversation, "imageConversation"));
bot.use((0, conversations_1.createConversation)(overlineConversation, "overlineConversation"));
bot.use((0, conversations_1.createConversation)(mainHeadlineConversation, "mainHeadlineConversation"));
bot.use((0, conversations_1.createConversation)(sourceConversation, "sourceConversation"));
bot.use((0, conversations_1.createConversation)(clearFormConversation, "clearFormConversation"));
bot.use((0, conversations_1.createConversation)(finishConversation, "finishConversation"));
// ----------------------
// Create Menus
// ----------------------
// The form menu is registered as "form" and used both in the conversation helper and here.
exports.formMenu = new menu_1.Menu("form", {
    onMenuOutdated: false, // ← disable the check
})
    .text((ctx) => {
    const data = collectFormData(ctx);
    return data.Image ? "عکس ✅" : "عکس ❌";
}, (ctx) => ctx.conversation.enter("imageConversation"))
    .row()
    .text((ctx) => {
    const data = collectFormData(ctx);
    return data.Overline ? "روتیتر ✅ " : "روتیتر ❌";
}, (ctx) => ctx.conversation.enter("overlineConversation"))
    .row()
    .text((ctx) => {
    const data = collectFormData(ctx);
    return data.MainHeadline ? "تیتر ✅" : "تیتر ❌";
}, (ctx) => ctx.conversation.enter("mainHeadlineConversation"))
    .row()
    .text((ctx) => {
    const data = collectFormData(ctx);
    return data.source ? "سورس ✅ " : "سورس ❌";
}, (ctx) => ctx.conversation.enter("sourceConversation"))
    .row()
    .text("فایل ✅ ", (ctx) => ctx.conversation.enter("finishConversation"))
    .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"));
// Register the menus
bot.use(exports.formMenu);
// ----------------------
// Command to Start the Bot
// ----------------------
bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const userSpecificPath = `./OutPut/screenshot_image_${userId}.png`;
    log(`User ${userId} started the bot`);
    ctx.session.outputPath = userSpecificPath;
    const sentMessage = await ctx.replyWithPhoto(new grammy_1.InputFile("./assets/SCREENSHOT_TEMPLATE.png"), { reply_markup: exports.formMenu });
    ctx.session.mainMessageId = sentMessage.message_id;
    log(`Sent initial menu and stored mainMessageId: ${sentMessage.message_id}`);
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
bot.catch((err) => {
    log("Global error handler caught:", err);
});
bot.start();
console.log("Bot is running...");
