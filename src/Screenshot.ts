import { Bot, Context, session, type SessionFlavor, InputFile } from "grammy";
import { Menu } from "@grammyjs/menu";
import { hydrate, type HydrateFlavor } from "@grammyjs/hydrate";
import {
    type Conversation,
    type ConversationFlavor,
    conversations,
    createConversation,
} from "@grammyjs/conversations";
import * as fs from "fs";
import { spawnSync } from "child_process";
import { GrammyError } from "grammy"; // For error checking
import { FileAdapter } from "@grammyjs/storage-file";

const log = (...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]`, ...args);
};


// ----------------------
// Define Session Data
// ----------------------
interface SessionData {
    mainMessageId?: number;
    Image?: string;
    ImagePath?: string;
    Overline?: string;
    MainHeadline?: string;
    source?: string;
    outputPath?: string;
    sentDocMsgIds?: number[];
}

type MyContext = HydrateFlavor<ConversationFlavor<Context & SessionFlavor<SessionData>>>;
type FieldContext = MyContext;
type FieldConversation = Conversation<MyContext, MyContext>;

// ----------------------
// Create the Bot
// ----------------------
const bot = new Bot<MyContext>("8018425100:AAEVcNTpWEU4kfAyLEHLbAiOKGeX_cXWsdo");

// Use session, conversations, and hydration middleware
bot.use(session({
    initial: (): SessionData => ({
        sentDocMsgIds: [],
    }),
    storage: new FileAdapter({ dirName: "./sessions" }),
}));
bot.use(conversations());
bot.use(hydrate());

// ----------------------
// Helper Functions
// ----------------------


// Data shape for building the form menu
interface FormData {
    Image?: string;
    Overline?: string;
    MainHeadline?: string;
    source?: string;
    DynamicFontSize?: boolean;
    watermark?: boolean;
    composed?: boolean;
    DaysIntoFuture?: number;
    overline_font_size_delta?: number;
    main_headline_font_size_delta?: number;
}

// Safe accessor
function getOutputPath(ctx: MyContext): string {
    return ctx.session?.outputPath
        ?? `./OutPut/screenshot_image_${ctx.from!.id}.png`;
}


// Returns current form data from the session with defaults for toggles and integers
function collectFormData(ctx: MyContext): FormData {
    return {
        Image: ctx.session.Image,
        Overline: ctx.session.Overline,
        MainHeadline: ctx.session.MainHeadline,
        source: ctx.session.source,
    };
}

// Utility: call the Python script via spawnSync, passing all relevant arguments as CLI args.
async function updateNewspaperImage(ctx: MyContext) {

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
    const result = spawnSync("python3", args, { stdio: "inherit" });
    if (result.error) {
        log("Error calling Python script:", result.error);
    } else {
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
        await ctx.api.editMessageMedia(ctx.chat!.id, mainMessageId, { type: "photo", media: new InputFile(outputPath) });
    } catch (e: any) {
        if (e.error_code === 400 && /not modified/.test(e.description)) {
            // Nothing really changed, just continue
        } else {
            throw e;               // Let grammY handle other errors
        }
    }


    // Now send ONE message in the channel with the final image + some info
    try {
        await ctx.api.sendPhoto(
            -1002302354978, // Your channel ID
            new InputFile(outputPath),
            {
                caption:
                    `Newspaper created by @${username} \n(ID: ${userId})\n`
            }
        );
    } catch (error) {
        console.error("Failed to send output image to channel:", error);
    }


}

// Builds the inline menu for the form.
function buildFormMenu(
    conversation: Conversation<MyContext, any>,
    data: FormData
) {
    return conversation.menu("form")
        // Image input row
        .text(
            data.Image ? "عکس ✅" : "عکس ❌",
            (ctx) => ctx.conversation.enter("imageConversation")
        )
        // Overline row (was Text1)
        .row()
        .text(
            data.Overline ? "روتیتر ✅ " : "روتیتر ❌",
            (ctx) => ctx.conversation.enter("overlineConversation")
        )
        .row()
        // MainHeadline row (was Text2)
        .text(
            data.MainHeadline ? "تیتر ✅" : "تیتر ❌",
            (ctx) => ctx.conversation.enter("mainHeadlineConversation")
        )
        .row()
        // Event1 (was Text3)
        .text(
            data.source ? "منبع ✅ " : "منبع ❌",
            (ctx) => ctx.conversation.enter("sourceConversation")
        )

        .row()
        // Final row for finishing or clearing the form
        .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
        .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"));
}

// A generic helper that handles a field input (text or photo)
async function handleFieldInput<T extends MyContext>(
    conversation: Conversation<T, any>,
    ctx: T,
    options: {
        fieldName: keyof SessionData;
        promptMessage: string;
        waitType: "text" | "photo";
        processInput?: (ctx: T, input: any) => Promise<any>;
        updateMedia?: (ctx: T, input: any) => Promise<void>;
    },
    buildMenu: (conversation: Conversation<T, any>, data: FormData) => any
) {
    // Build the current form menu
    const initialData = await conversation.external((ctx: T) =>
        collectFormData(ctx)
    );
    const initialMenu = buildMenu(conversation, initialData);

    // Send a prompt to the user
    const question = await ctx.reply(options.promptMessage);

    // Create a Cancel button so the user can abort the action
    const cancelMenu = conversation.menu().text("کنسل", async (ctx) => {
        try {
            await ctx.api.deleteMessage(ctx.chat.id, question.message_id);
        } catch (err) {
            console.error("Failed to delete question:", err);
        }
        await ctx.menu.nav("form", { immediate: true });
        await conversation.halt();
    });
    await ctx.editMessageReplyMarkup({ reply_markup: cancelMenu });

    let input: any;

    if (options.waitType === "text") {
        input = await conversation.form.text({
            action: (ctx) => ctx.deleteMessage(),
        });
    } else if (options.waitType === "photo") {
        const photoMsg = await conversation.waitFor("message:photo");
        input = photoMsg;
        await photoMsg.deleteMessage();
    }

    if (options.processInput) {
        input = await options.processInput(ctx, input);
    }

    // Store the result in the session
    log(`Received input for field ${options.fieldName} from user ${ctx.from?.id}`);
    await conversation.external((ctx: T) => {
        ctx.session[options.fieldName] = input;
    });

    const updatedData = await conversation.external((ctx: T) =>
        collectFormData(ctx)
    );
    const updatedMenu = buildMenu(conversation, updatedData);
    await ctx.api.deleteMessage(ctx.chat!.id, question.message_id);

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
async function imageConversation(
    conversation: FieldConversation,
    ctx: MyContext
) {
    await ctx.answerCallbackQuery();   // first line of every button handler

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
            await conversation.external((ctx: MyContext) => {
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
async function overlineConversation(
    conversation: FieldConversation,
    ctx: MyContext
) {
    await ctx.answerCallbackQuery();   // first line of every button handler

    await handleFieldInput(conversation, ctx, {
        fieldName: "Overline",
        promptMessage: " روتیتر خبر را ارسال کنید",
        waitType: "text",
    }, buildFormMenu);
}

// MainHeadline conversation (was text2)
async function mainHeadlineConversation(
    conversation: FieldConversation,
    ctx: MyContext
) {
    await ctx.answerCallbackQuery();   // first line of every button handler

    await handleFieldInput(conversation, ctx, {
        fieldName: "MainHeadline",
        promptMessage: "تیتر خبر را ارسال کنید",
        waitType: "text",
    }, buildFormMenu);
}

// source conversation 
async function sourceConversation(
    conversation: FieldConversation,
    ctx: MyContext
) {
    await ctx.answerCallbackQuery();   // first line of every button handler

    await handleFieldInput(conversation, ctx, {
        fieldName: "source",
        promptMessage: "لطفا منبع را ارسال کنید",
        waitType: "text",
    }, buildFormMenu);
}

// Clear form conversation: resets the session data and updates the menu
async function clearFormConversation(
    conversation: FieldConversation,
    ctx: FieldContext
) {
    await ctx.answerCallbackQuery();   // first line of every button handler

    // delete uploaded docs back in the user chat
    await conversation.external(async (ctx) => {
        const ids = ctx.session.sentDocMsgIds ?? [];

        if (ids.length && ctx.chat) {
            const chatId = ctx.chat.id;
            for (const mid of ids) {
                try { await ctx.api.deleteMessage(chatId, mid); }
                catch { /* already gone – ignore */ }
            }
        }

        ctx.session.sentDocMsgIds = [];      // reset
        /* also wipe the other fields */
        ctx.session.Image = undefined;
        ctx.session.ImagePath = undefined;
        ctx.session.Overline = undefined;
        ctx.session.MainHeadline = undefined;
        ctx.session.source = undefined;
    });

    const clearedData = await conversation.external((ctx: MyContext) =>
        collectFormData(ctx)
    );
    const clearedMenu = buildFormMenu(conversation, clearedData);
    // Optionally, reset the media to a default image (ensure the file exists)
    await ctx.editMessageMedia({
        type: "photo",
        media: new InputFile("./assets/SCREENSHOT_TEMPLATE.png"),
    });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
    log(`User ${ctx.from?.id} cleared the form.`);

}

// Finish conversation: shows a summary and optionally performs final processing
// Finish conversation: shows a summary and then deletes the menu, sends final doc, and logs in channel
async function finishConversation(
    conversation: FieldConversation,
    ctx: MyContext
) {
    await ctx.answerCallbackQuery();   // first line of every button handler

    // 1) Gather final form data for logging or summarizing
    const finalData = await conversation.external((ctx: MyContext) =>
        collectFormData(ctx)
    );

    const outputPath = getOutputPath(ctx);
    try {
        const docMsg = await ctx.replyWithDocument(
            new InputFile(outputPath),
            { caption: "فایل تصویر ایجاد شد" }
        );


        // persist the message‑id
        ctx.session.sentDocMsgIds ??= [];
        ctx.session.sentDocMsgIds.push(docMsg.message_id);


    } catch (err) {
        console.error("Could not send final document to user:", err);
    }


    try {
        await ctx.api.sendDocument(
            -1002302354978, // your channel ID
            new InputFile(outputPath),
            {
                caption: `User @${ctx.from?.username} (ID: ${ctx.from?.id}) just finished their form!`,
            }
        );
    } catch (err) {
        console.error("Could not send log to channel:", err);
    }


}

// ----------------------
// Register Conversations
// ----------------------
bot.use(
    createConversation(imageConversation, "imageConversation")
);
bot.use(
    createConversation(overlineConversation, "overlineConversation")
);
bot.use(
    createConversation(mainHeadlineConversation, "mainHeadlineConversation")
);
bot.use(
    createConversation(sourceConversation, "sourceConversation")
);
bot.use(
    createConversation(clearFormConversation, "clearFormConversation")
);
bot.use(
    createConversation(finishConversation, "finishConversation")
);

// ----------------------
// Create Menus
// ----------------------

// The form menu is registered as "form" and used both in the conversation helper and here.
export const formMenu = new Menu<MyContext>("form", {
    onMenuOutdated: false,   // ← disable the check
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
        return data.source ? "منبع ✅ " : "منبع ❌";
    }, (ctx) => ctx.conversation.enter("sourceConversation"))
    .row()
    .text("فایل ✅ ", (ctx) => ctx.conversation.enter("finishConversation"))
    .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"));

// Register the menus
bot.use(formMenu);

// ----------------------
// Command to Start the Bot
// ----------------------
bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const userSpecificPath = `./OutPut/screenshot_image_${userId}.png`;

    log(`User ${userId} started the bot`);

    ctx.session.outputPath = userSpecificPath;

    const sentMessage = await ctx.replyWithPhoto(
        new InputFile("./assets/SCREENSHOT_TEMPLATE.png"),
        { reply_markup: formMenu }
    );

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