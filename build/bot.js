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
const log = (...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]`, ...args);
};
// ----------------------
// Create the Bot
// ----------------------
const bot = new grammy_1.Bot("8056950160:AAGIF7ColbOQH5wF6lhWC2HNAib5mb624K8");
// Use session, conversations, and hydration middleware
bot.use((0, grammy_1.session)({
    initial: () => ({
    // watermark: true
    }),
}));
bot.use((0, conversations_1.conversations)());
bot.use((0, hydrate_1.hydrate)());
// Returns current form data from the session with defaults for toggles and integers
function collectFormData(ctx) {
    return {
        Image: ctx.session.Image,
        Overline: ctx.session.Overline,
        MainHeadline: ctx.session.MainHeadline,
        Events: ctx.session.Events,
        // Event2: ctx.session.Event2,
        // Event3: ctx.session.Event3,
        // DynamicFontSize: ctx.session.DynamicFontSize ?? false,
        // watermark: ctx.session.watermark ?? true,
        // composed: ctx.session.composed ?? false,
        // DaysIntoFuture: ctx.session.DaysIntoFuture ?? 0,
        // overline_font_size_delta: ctx.session.overline_font_size_delta ?? 0,
        // main_headline_font_size_delta: ctx.session.main_headline_font_size_delta ?? 0,
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
    const userImagePath = ctx.session.ImagePath || "./assets/ZAMAN_EGTESAD_LOGO.png";
    const overlineText = ctx.session.Overline || " ";
    const mainHeadlineText = ctx.session.MainHeadline || " ";
    const events = ctx.session.Events || "";
    // const event2 = ctx.session.Event2 || "";
    // const event3 = ctx.session.Event3 || "";
    // const daysIntoFuture = ctx.session.DaysIntoFuture ?? 0;
    // const overlineFontDelta = ctx.session.overline_font_size_delta ?? 0;
    // const mainHeadlineFontDelta = ctx.session.main_headline_font_size_delta ?? 0;
    // For booleans that are store_true in argparse, only push the flag if true.
    // const dynamicFontSize = ctx.session.DynamicFontSize ?? false;
    // const watermark = ctx.session.watermark ?? true;
    // const composed = ctx.session.composed ?? false;
    // We'll produce the final image here.
    const outputPath = ctx.session.outputPath || `./OutPut/generated_post_image_${userId}.png`;
    // Build the argument list for the Python script. It uses argparse in the __main__ block.
    // The CLI usage is:
    // src/Craft/newspaper_template.py \
    //   --user_image_path PATH \
    //   --overline_text TEXT \
    //   --main_headline_text TEXT \
    //   --output_path PATH \
    //   [--event1_text TEXT] [--event2_text TEXT] [--event3_text TEXT] \
    //   [--days_into_future N] [--overline_font_size_delta N] [--main_headline_font_size_delta N]\
    //   [--dynamic_font_size] [--watermark] [--composed]
    const pythonScript = "./src/Craft/Post.py"; // Adjust if needed
    const args = [
        pythonScript,
        "--user_image_path", userImagePath,
        "--overline_text", overlineText,
        "--main_headline_text", mainHeadlineText,
        "--output_path", outputPath,
        // "--days_into_future", daysIntoFuture.toString(),
        // "--overline_font_size_delta", overlineFontDelta.toString(),
        // "--main_headline_font_size_delta", mainHeadlineFontDelta.toString(),
        "--events_text", events,
    ];
    // if (dynamicFontSize) {
    //     args.push("--dynamic_font_size");
    // }
    // if (watermark) {
    //     args.push("--watermark");
    // }
    // if (composed) {
    //     args.push("--composed");
    // }
    log("Calling Python script with args:", args);
    // spawnSync to run python3 script
    const result = (0, child_process_1.spawnSync)("python3", args, { stdio: "inherit" });
    if (result.error) {
        log("Error calling Python script:", result.error);
    }
    else {
        log("Python script executed successfully");
    }
    try {
        await ctx.api.editMessageMedia(ctx.chat.id, mainMessageId, {
            type: "photo",
            media: new grammy_1.InputFile(outputPath),
            caption: "Live updated newspaper",
        });
        log("Updated message media successfully.");
    }
    catch (error) {
        console.error("Failed to update newspaper image:", error);
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
        .text(data.Image ? "تصویر ✅" : "تصویر ❌", (ctx) => ctx.conversation.enter("imageConversation"))
        // Overline row (was Text1)
        .row()
        .text(data.Overline ? "روتیتر ✅ " : "روتیتر ❌", (ctx) => ctx.conversation.enter("overlineConversation"))
        .row()
        // MainHeadline row (was Text2)
        .text(data.MainHeadline ? "تیتر اصلی ✅" : "تیتر اصلی ❌", (ctx) => ctx.conversation.enter("mainHeadlineConversation"))
        .row()
        // Event1 (was Text3)
        .text(data.Events ? "رویداد ها ✅ " : "رویداد ها ❌", (ctx) => ctx.conversation.enter("eventsConversation"))
        // .row()
        // // Event2 (was Text4)
        // .text(
        //     data.Event2 ? "Event2: " + data.Event2 : "Event2 ❌",
        //     (ctx) => ctx.conversation.enter("event2Conversation")
        // )
        // .row()
        // // Event3 (was Text5)
        // .text(
        //     data.Event3 ? "Event3: " + data.Event3 : "Event3 ❌",
        //     (ctx) => { ctx.conversation.enter("event3Conversation") }
        // )
        .row()
        // Toggles row: DynamicFontSize -> Toggle1, watermark, composed
        // .text("DynFont: " + (data.DynamicFontSize ? "On" : "Off"), async (ctx) => {
        //     ctx.session.DynamicFontSize = !ctx.session.DynamicFontSize;
        //     const updatedData = collectFormData(ctx);
        //     const updatedMenu = buildFormMenu(ctx.conversation!, updatedData);
        //     await updateNewspaperImage(ctx);
        //     await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
        // })
        // .text("watermark: " + (data.watermark ? "On" : "Off"), async (ctx) => {
        //     ctx.session.watermark = !ctx.session.watermark;
        //     const updatedData = collectFormData(ctx);
        //     const updatedMenu = buildFormMenu(ctx.conversation!, updatedData);
        //     await updateNewspaperImage(ctx);
        //     await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
        // })
        // .text("composed: " + (data.composed ? "On" : "Off"), async (ctx) => {
        //     ctx.session.composed = !ctx.session.composed;
        //     const updatedData = collectFormData(ctx);
        //     const updatedMenu = buildFormMenu(ctx.conversation!, updatedData);
        //     await updateNewspaperImage(ctx);
        //     await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
        // })
        // .row()
        // // DaysIntoFuture row (was Int1)
        // .text("-", async (ctx) => {
        //     ctx.session.DaysIntoFuture = (ctx.session.DaysIntoFuture ?? 0) - 1;
        //     const updatedData = collectFormData(ctx);
        //     const updatedMenu = buildFormMenu(ctx.conversation!, updatedData);
        //     await updateNewspaperImage(ctx);
        //     await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
        // })
        // .text("Day: " + data.DaysIntoFuture, () => { })
        // .text("+", async (ctx) => {
        //     ctx.session.DaysIntoFuture = (ctx.session.DaysIntoFuture ?? 0) + 1;
        //     const updatedData = collectFormData(ctx);
        //     const updatedMenu = buildFormMenu(ctx.conversation!, updatedData);
        //     await updateNewspaperImage(ctx);
        //     await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
        // })
        // .row()
        // // overline_font_size_delta
        // .text("-", async (ctx) => {
        //     ctx.session.overline_font_size_delta = (ctx.session.overline_font_size_delta ?? 0) - 1;
        //     const updatedData = collectFormData(ctx);
        //     const updatedMenu = buildFormMenu(ctx.conversation!, updatedData);
        //     await updateNewspaperImage(ctx);
        //     await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
        // })
        // .text("overline: " + data.overline_font_size_delta, () => { })
        // .text("+", async (ctx) => {
        //     ctx.session.overline_font_size_delta = (ctx.session.overline_font_size_delta ?? 0) + 1;
        //     const updatedData = collectFormData(ctx);
        //     const updatedMenu = buildFormMenu(ctx.conversation!, updatedData);
        //     await updateNewspaperImage(ctx);
        //     await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
        // })
        // .row()
        // // main_headline_font_size_delta
        // .text("-", async (ctx) => {
        //     ctx.session.main_headline_font_size_delta = (ctx.session.main_headline_font_size_delta ?? 0) - 1;
        //     const updatedData = collectFormData(ctx);
        //     const updatedMenu = buildFormMenu(ctx.conversation!, updatedData);
        //     await updateNewspaperImage(ctx);
        //     await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
        // })
        // .text("main: " + data.main_headline_font_size_delta, () => { })
        // .text("+", async (ctx) => {
        //     ctx.session.main_headline_font_size_delta = (ctx.session.main_headline_font_size_delta ?? 0) + 1;
        //     const updatedData = collectFormData(ctx);
        //     const updatedMenu = buildFormMenu(ctx.conversation!, updatedData);
        //     await updateNewspaperImage(ctx);
        //     await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
        // })
        .row()
        // Final row for finishing or clearing the form
        // .text("Finish", (ctx) => ctx.conversation.enter("finishConversation"))
        .text("Clear", (ctx) => ctx.conversation.enter("clearFormConversation"));
}
// A generic helper that handles a field input (text or photo)
async function handleFieldInput(conversation, ctx, options, buildMenu) {
    // Build the current form menu
    const initialData = await conversation.external((ctx) => collectFormData(ctx));
    const initialMenu = buildMenu(conversation, initialData);
    // Send a prompt to the user
    const question = await ctx.reply(options.promptMessage);
    // Create a Cancel button so the user can abort the action
    const cancelMenu = conversation.menu().text("Cancel", async (ctx) => {
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
    await handleFieldInput(conversation, ctx, {
        fieldName: "Image",
        promptMessage: "Please send Image 1",
        waitType: "photo",
        processInput: async (ctx, photoMsg) => {
            const photos = photoMsg.message.photo;
            const largestPhoto = photos[photos.length - 1];
            if (!largestPhoto) {
                await ctx.reply("No photo found!");
                return null;
            }
            const fileId = largestPhoto.file_id;
            const localPath = "./assets/image_" + ctx.chatId + ".jpg";
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
    await handleFieldInput(conversation, ctx, {
        fieldName: "Overline",
        promptMessage: "Please send Overline text",
        waitType: "text",
    }, buildFormMenu);
}
// MainHeadline conversation (was text2)
async function mainHeadlineConversation(conversation, ctx) {
    await handleFieldInput(conversation, ctx, {
        fieldName: "MainHeadline",
        promptMessage: "Please send Main Headline text",
        waitType: "text",
    }, buildFormMenu);
}
// Events conversation 
async function eventsConversation(conversation, ctx) {
    await handleFieldInput(conversation, ctx, {
        fieldName: "Events",
        promptMessage: "Please send Event1 text",
        waitType: "text",
    }, buildFormMenu);
}
// // Event2 conversation (was text4)
// async function event2Conversation(
//     conversation: FieldConversation,
//     ctx: MyContext
// ) {
//     await handleFieldInput(conversation, ctx, {
//         fieldName: "Event2",
//         promptMessage: "Please send Event2 text",
//         waitType: "text",
//     }, buildFormMenu);
// }
// // Event3 conversation (was text5)
// async function event3Conversation(
//     conversation: FieldConversation,
//     ctx: MyContext
// ) {
//     await handleFieldInput(conversation, ctx, {
//         fieldName: "Event3",
//         promptMessage: "Please send Event3 text",
//         waitType: "text",
//     }, buildFormMenu);
// }
// Clear form conversation: resets the session data and updates the menu
async function clearFormConversation(conversation, ctx) {
    await conversation.external((ctx) => {
        ctx.session.Image = undefined;
        ctx.session.ImagePath = undefined;
        ctx.session.Overline = undefined;
        ctx.session.MainHeadline = undefined;
        ctx.session.Events = undefined;
        // ctx.session.Event2 = undefined;
        // ctx.session.Event3 = undefined;
        // ctx.session.DynamicFontSize = false;
        // ctx.session.watermark = true;
        // ctx.session.composed = false;
        // ctx.session.DaysIntoFuture = 0;
        // ctx.session.overline_font_size_delta = 0;
        // ctx.session.main_headline_font_size_delta = 0;
    });
    const clearedData = await conversation.external((ctx) => collectFormData(ctx));
    const clearedMenu = buildFormMenu(conversation, clearedData);
    // Optionally, reset the media to a default image (ensure the file exists)
    await ctx.editMessageMedia({
        type: "photo",
        media: new grammy_1.InputFile("./assets/ZAMAN_EGTESAD_LOGO.png"),
        caption: "Default image",
    });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
    log(`User ${ctx.from?.id} cleared the form.`);
}
// Finish conversation: shows a summary and optionally performs final processing
// Finish conversation: shows a summary and then deletes the menu, sends final doc, and logs in channel
async function finishConversation(conversation, ctx) {
    // 1) Gather final form data for logging or summarizing
    const finalData = await conversation.external((ctx) => collectFormData(ctx));
    // 2) Run updateNewspaperImage so the final image is generated
    //    (this ensures your Python script has produced the latest image).
    await conversation.external(async (ctx) => {
        await updateNewspaperImage(ctx);
    });
    // 3) Optionally send a summary message to the user (plain text).
    // 4) Delete the old menu message so it's gone from the chat
    const menuMsgId = ctx.session.mainMessageId;
    if (menuMsgId) {
        try {
            await ctx.api.deleteMessage(ctx.chat.id, menuMsgId);
        }
        catch (err) {
            console.error("Could not delete menu message:", err);
        }
    }
    // 5) Send the final generated image as a document to the user
    //    (Adjust caption as you wish.)
    const outputPath = ctx.session.outputPath || "./OutPut/Post_output.png";
    try {
        await ctx.replyWithDocument(new grammy_1.InputFile(outputPath), { caption: "Here is your final generated newspaper!" });
    }
    catch (err) {
        console.error("Could not send final document to user:", err);
    }
    // 6) Log the same document in your channel
    //    This sends a document message to channel ID -1002302354978
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
// ----------------------
// Register Conversations
// ----------------------
bot.use((0, conversations_1.createConversation)(imageConversation, "imageConversation"));
bot.use((0, conversations_1.createConversation)(overlineConversation, "overlineConversation"));
bot.use((0, conversations_1.createConversation)(mainHeadlineConversation, "mainHeadlineConversation"));
bot.use((0, conversations_1.createConversation)(eventsConversation, "eventsConversation"));
// bot.use(
//     createConversation(event2Conversation, "event2Conversation")
// );
// bot.use(
//     createConversation(event3Conversation, "event3Conversation")
// );
bot.use((0, conversations_1.createConversation)(clearFormConversation, "clearFormConversation"));
// bot.use(
//     createConversation(finishConversation, "finishConversation")
// );
// ----------------------
// Create Menus
// ----------------------
// The form menu is registered as "form" and used both in the conversation helper and here.
exports.formMenu = new menu_1.Menu("form")
    .text((ctx) => {
    const data = collectFormData(ctx);
    return data.Image ? "تصویر ✅" : "تصویر ❌";
}, (ctx) => ctx.conversation.enter("imageConversation"))
    .row()
    .text((ctx) => {
    const data = collectFormData(ctx);
    return data.Overline ? "روتیتر ✅ " : "روتیتر ❌";
}, (ctx) => ctx.conversation.enter("overlineConversation"))
    .row()
    .text((ctx) => {
    const data = collectFormData(ctx);
    return data.MainHeadline ? "تیتر اصلی ✅" : "تیتر اصلی ❌";
}, (ctx) => ctx.conversation.enter("mainHeadlineConversation"))
    .row()
    .text((ctx) => {
    const data = collectFormData(ctx);
    return data.Events ? "رویداد ها ✅ " : "رویداد ها ❌";
}, (ctx) => ctx.conversation.enter("eventsConversation"))
    // .row()
    // .text((ctx) => {
    //     const data = collectFormData(ctx);
    //     return data.Event2 ? "Event2: " + data.Event2 : "Event2 ❌";
    // }, (ctx) => ctx.conversation.enter("event2Conversation"))
    // .row()
    // .text((ctx) => {
    //     const data = collectFormData(ctx);
    //     return data.Event3 ? "Event3: " + data.Event3 : "Event3 ❌";
    // }, (ctx) => ctx.conversation.enter("event3Conversation"))
    // .row()
    // .text(
    //     (ctx) => "DynFont: " + (ctx.session.DynamicFontSize ? "On" : "Off"),
    //     async (ctx) => {
    //         ctx.session.DynamicFontSize = !ctx.session.DynamicFontSize;
    //         await updateNewspaperImage(ctx);
    //         await ctx.menu.update();  // Refreshes the current menu automatically
    //     }
    // )
    // .text(
    //     (ctx) => "watermark: " + (ctx.session.watermark ? "On" : "Off"),
    //     async (ctx) => {
    //         ctx.session.watermark = !ctx.session.watermark;
    //         await updateNewspaperImage(ctx);
    //         await ctx.menu.update();
    //     }
    // )
    // .text(
    //     (ctx) => "composed: " + (ctx.session.composed ? "On" : "Off"),
    //     async (ctx) => {
    //         ctx.session.composed = !ctx.session.composed;
    //         await updateNewspaperImage(ctx);
    //         await ctx.menu.update();
    //     }
    // )
    // .row()
    // .text("-", async (ctx) => {
    //     ctx.session.DaysIntoFuture = (ctx.session.DaysIntoFuture ?? 0) - 1;
    //     await updateNewspaperImage(ctx);
    //     await ctx.menu.update();
    // })
    // .text((ctx) => "Day: " + (ctx.session.DaysIntoFuture ?? 0), () => { })
    // .text("+", async (ctx) => {
    //     ctx.session.DaysIntoFuture = (ctx.session.DaysIntoFuture ?? 0) + 1;
    //     await updateNewspaperImage(ctx);
    //     await ctx.menu.update();
    // })
    // .row()
    // .text("-", async (ctx) => {
    //     ctx.session.overline_font_size_delta = (ctx.session.overline_font_size_delta ?? 0) - 10;
    //     await updateNewspaperImage(ctx);
    //     await ctx.menu.update();
    // })
    // .text((ctx) => "overline: " + (ctx.session.overline_font_size_delta ?? 0), () => { })
    // .text("+", async (ctx) => {
    //     ctx.session.overline_font_size_delta = (ctx.session.overline_font_size_delta ?? 0) + 10;
    //     await updateNewspaperImage(ctx);
    //     await ctx.menu.update();
    // })
    // .row()
    // .text("-", async (ctx) => {
    //     ctx.session.main_headline_font_size_delta = (ctx.session.main_headline_font_size_delta ?? 0) - 10;
    //     await updateNewspaperImage(ctx);
    //     await ctx.menu.update();
    // })
    // .text((ctx) => "main: " + (ctx.session.main_headline_font_size_delta ?? 0), () => { })
    // .text("+", async (ctx) => {
    //     ctx.session.main_headline_font_size_delta = (ctx.session.main_headline_font_size_delta ?? 0) + 10;
    //     await updateNewspaperImage(ctx);
    //     await ctx.menu.update();
    // })
    .row()
    // .text("Finish", (ctx) => ctx.conversation.enter("finishConversation"))
    .text("Clear", (ctx) => ctx.conversation.enter("clearFormConversation"));
// Register the menus
bot.use(exports.formMenu);
// ----------------------
// Command to Start the Bot
// ----------------------
bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const userSpecificPath = `./OutPut/generated_post_image_${userId}.png`;
    log(`User ${userId} started the bot`);
    ctx.session.outputPath = userSpecificPath;
    const sentMessage = await ctx.replyWithPhoto(new grammy_1.InputFile("./assets/ZAMAN_EGTESAD_LOGO.png"), { reply_markup: exports.formMenu });
    ctx.session.mainMessageId = sentMessage.message_id;
    log(`Sent initial menu and stored mainMessageId: ${sentMessage.message_id}`);
});
bot.api.setMyCommands([
    { command: "start", description: "رباتو روشن کن!" },
]);
bot.catch((err) => {
    log("Global error handler caught:", err);
});
bot.start();
console.log("Bot is running...");
