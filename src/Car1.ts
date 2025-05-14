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
import { FileAdapter } from "@grammyjs/storage-file";

// --------------------------------------------------
//  Utility
// --------------------------------------------------
const log = (...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]`, ...args);
};

// --------------------------------------------------
//  Session definition
// --------------------------------------------------
interface SessionData {
    mainMessageId?: number;
    // car values stored as *strings* exactly as user entered
    List1?: string;
    List2?: string;
    oneORtwo?: boolean;
    outputPath?: string;
    sentDocMsgIds?: number[];
}

type MyContext = HydrateFlavor<ConversationFlavor<Context & SessionFlavor<SessionData>>>;
type FieldContext = MyContext;
type FieldConversation = Conversation<MyContext, MyContext>;

// restrict field names to ONLY the car keys so TypeScript stops whining
// (otherwise `mainMessageId` etc. would be allowed and the assignment below breaks)
export type carField = keyof Pick<SessionData,
    | "List1"
    | "List2">;

// --------------------------------------------------
//  Create the Bot
// --------------------------------------------------
const bot = new Bot<MyContext>("7759166334:AAFulSQgFl2NuQnVBZTspPvjAnO45fSyRSo");

bot.use(
    session({
        initial: (): SessionData => ({
            sentDocMsgIds: [],
            oneORtwo: true,
        }),
        storage: new FileAdapter({ dirName: "./sessions" }),
    }),
);

bot.use(conversations());
bot.use(hydrate());

// --------------------------------------------------
//  Helpers
// --------------------------------------------------

interface FormData {
    List1?: string;
    List2?: string;
}

// function getOutputPath(ctx: MyContext): string {
//     return ctx.session.outputPath ?? `./OutPut/car_post_${ctx.from!.id}.png`;
// }
function getOutputPath(
    ctx: Context & { from?: any; session?: Partial<SessionData> },
): string {
    const fallback = `./OutPut/car1_post_${ctx.from?.id ?? "anon"}.png`;
    // optional‑chain ⇒ never touches .outputPath if session is missing
    return (ctx as any).session?.outputPath ?? fallback;
}

function collectFormData(ctx: MyContext): FormData {
    // session may be undefined inside some conversation internals — be defensive
    const s: Partial<SessionData> | undefined = (ctx as any).session;
    return {
        List1: s?.List1,
        List2: s?.List2,
    };
}

// spawn the Python script to compose the image
async function updatecarImage(ctx: MyContext) {
    const {
        List1 = "0",
        List2 = "0",
        oneORtwo = true,
    } = ctx.session;

    const outputPath = getOutputPath(ctx);
    ctx.session.outputPath = outputPath;

    let args: string[];
    if (oneORtwo) {
        args = [
            "./src/craft/car1.py",
            "--prices",
            List1,
            "--output_path",
            outputPath,
        ];
    } else {
        args = [
            "./src/craft/car2.py",
            "--prices",
            List2,
            "--output_path",
            outputPath,
        ];
    }

    log("Calling Python car.py with args", args);
    const result = spawnSync("python3", args, { stdio: "inherit" });
    if (result.error) log("Python error", result.error);

    // update inline image in bot message
    const mainMessageId = ctx.session.mainMessageId;
    if (mainMessageId) {
        try {
            await ctx.api.editMessageMedia(ctx.chat!.id, mainMessageId, {
                type: "photo",
                media: new InputFile(outputPath),
            });
        } catch (e: any) {
            if (!(e.error_code === 400 && /not modified/i.test(e.description))) throw e;
        }
    }
}

// --------------------------------------------------
//  Shared handler for each text field
// --------------------------------------------------
async function handleFieldInput<T extends MyContext>(
    conversation: Conversation<T, any>,
    ctx: T,
    options: {
        fieldName: carField;
        promptMessage: string;
    },
    buildMenu: (conversation: Conversation<T, any>, data: FormData) => any,
) {
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
        (ctx.session as SessionData)[options.fieldName] = value.trim();
    });

    const updatedMenu = buildMenu(conversation, collectFormData(ctx));

    await ctx.api.deleteMessage(ctx.chat!.id, question.message_id).catch(() => {
        /* ignore */
    });

    await conversation.external(updatecarImage);

    await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
}

// --------------------------------------------------
//  Menu builder
// --------------------------------------------------
function buildFormMenu(conversation: Conversation<MyContext, any>, data: FormData) {
    return (
        conversation
            .menu("form")
            .text(data.List1 ? "لیست  " : "لیست  ", (ctx) => ctx.conversation.enter("List1Conversation"))
            .row()
            // .text(data.List2 ? "لیست دوم " : "لیست دوم ", (ctx) => ctx.conversation.enter("List2Conversation"))
            // .row()
            .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
            .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"))
    );
}

// --------------------------------------------------
//  Conversation generators for each car field
// --------------------------------------------------
function createCarConversation(fieldName: carField, prompt: string, flagValue: boolean) {

    return async function (conversation: FieldConversation, ctx: MyContext) {
        await conversation.external((ctx) => {
            ctx.session.oneORtwo = flagValue;
        });
        await handleFieldInput(conversation, ctx, { fieldName, promptMessage: prompt }, buildFormMenu);
    };
}



const List1Conversation = createCarConversation("List1", "لطفا مقدار لیست  را وارد کنید", true);
const List2Conversation = createCarConversation("List2", "لطفا مقدار لیست دوم را وارد کنید", false);

// clear form conversation
// async function clearFormConversation(conversation: FieldConversation, ctx: FieldContext) {
//     await ctx.answerCallbackQuery();

//     await conversation.external((ctx) => {
//         ctx.session.List1 = ctx.session.List2 = ctx.session.List2 = undefined;
//         ctx.session.sentDocMsgIds = [];
//     });

//     const clearedMenu = buildFormMenu(conversation, collectFormData(ctx));
//     await ctx.editMessageMedia({ type: "photo", media: new InputFile("./assets/GOLD_TEMPLATE.png") });
//     await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
// }
async function clearFormConversation(
    conversation: FieldConversation,
    ctx: MyContext,
) {
    await ctx.answerCallbackQuery();

    await conversation.external(async (ctxExt) => {
        const ids = ctxExt.session.sentDocMsgIds ?? [];

        // delete previously sent doc messages, ignore errors
        for (const id of ids) {
            try {
                if (ctxExt.chat) {
                    await ctxExt.api.deleteMessage(ctxExt.chat.id, id);
                }
            } catch { }
        }

        // reset session (but keep the PNG on disk)
        ctxExt.session.sentDocMsgIds = [];
        ctxExt.session.List1 = ctxExt.session.List2 = undefined;
    });

    // rebuild the empty form
    const clearedMenu = buildFormMenu(conversation, collectFormData(ctx));
    await ctx.editMessageMedia({
        type: "photo",
        media: new InputFile("./assets/CAR1_TEMPLATE.png"),
    });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
}

// async function finishConversation(
//     conversation: FieldConversation,
//     ctx: MyContext
// ) {
//     await conversation.external(updatecarImage);   // ← add this line

//     await ctx.answerCallbackQuery();   // first line of every button handler

//     // 1) Gather final form data for logging or summarizing
//     const finalData = await conversation.external((ctx: MyContext) =>
//         collectFormData(ctx)
//     );

//     const outputPath = getOutputPath(ctx);
//     try {
//         const docMsg = await ctx.replyWithDocument(
//             new InputFile(outputPath),
//             { caption: "فایل تصویر ایجاد شد" }
//         );



//         // persist the message‑id
//         ctx.session.sentDocMsgIds ??= [];
//         ctx.session.sentDocMsgIds.push(docMsg.message_id);


//     } catch (err) {
//         console.error("Could not send final document to user:", err);
//     }


//     try {
//         await ctx.api.sendDocument(
//             -1002302354978, // your channel ID
//             new InputFile(outputPath),
//             {
//                 caption: `User @${ctx.from?.username} (ID: ${ctx.from?.id}) just finished their form!`,
//             }
//         );
//     } catch (err) {
//         console.error("Could not send log to channel:", err);
//     }


// }
async function finishConversation(
    conversation: FieldConversation,
    ctx: MyContext,
) {
    // Always acknowledge the button tap first
    await ctx.answerCallbackQuery();

    await conversation.external(async (ctxExt: MyContext) => {
        // 1) Render the image and gather final form data
        await updatecarImage(ctxExt);
        const finalData = collectFormData(ctxExt);  // sync or await if needed

        const outputPath = getOutputPath(ctxExt);

        // 2) Send the document to the user
        try {
            const docMsg = await ctxExt.replyWithDocument(
                new InputFile(outputPath),
                { caption: "فایل تصویر ایجاد شد" },
            );

            // Persist the message-id safely
            ctxExt.session.sentDocMsgIds ??= [];
            ctxExt.session.sentDocMsgIds.push(docMsg.message_id);
        } catch (err) {
            console.error("Could not send final document to user:", err);
        }

        // 3) Log the document in your channel
        try {
            await ctxExt.api.sendDocument(
                -1002302354978,                                  // channel ID
                new InputFile(outputPath),
                {
                    caption: `User @${ctxExt.from?.username} (ID: ${ctxExt.from?.id}) just finished their form!`,
                },
            );
        } catch (err) {
            console.error("Could not send log to channel:", err);
        }
    });
}

// --------------------------------------------------
//  Register conversations
// --------------------------------------------------

bot.use(createConversation(List1Conversation, "List1Conversation"));
bot.use(createConversation(List2Conversation, "List2Conversation"));
bot.use(createConversation(clearFormConversation, "clearFormConversation"));
bot.use(createConversation(finishConversation, "finishConversation"));

// --------------------------------------------------
//  Stand‑alone menu instance (needed for /start)
// --------------------------------------------------
export const formMenu = new Menu<MyContext>("form", { onMenuOutdated: false })
    .text((ctx) => collectFormData(ctx).List1 ? "لیست  " : "لیست  ", (ctx) => ctx.conversation.enter("List1Conversation"))
    .row()
    // .text((ctx) => collectFormData(ctx).List2 ? "لیست دوم " : "لیست دوم ", (ctx) => ctx.conversation.enter("List2Conversation"))
    // .row()
    .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
    .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"));

bot.use(formMenu);

// --------------------------------------------------
//  /start
// --------------------------------------------------

bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const outputPath = `./OutPut/car1_post_${userId}.png`;
    ctx.session.outputPath = outputPath;

    const sentMsg = await ctx.replyWithPhoto(new InputFile("./assets/CAR1_TEMPLATE.png"), { reply_markup: formMenu });
    ctx.session.mainMessageId = sentMsg.message_id;
    log("Bot started for", userId);
});

bot.catch((err) => log("Global error", err));

bot.api.setMyCommands([
    { command: "start", description: "رباتو روشن کن!" },
]);

bot.start();
log("Bot running …");
