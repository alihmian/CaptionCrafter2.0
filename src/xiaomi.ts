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
    // xiaomi values stored as *strings* exactly as user entered
    REDMINOTE14?: string;
    REDMINOTE13?: string;
    XIAOMIXIAOMI14TPRO?: string;
    XIAOMI14T?: string;
    POCOF6PRO?: string;
    POCOX7PRO?: string;
    POCOM6PRO?: string;
    GALAXYA06?: string;
    outputPath?: string;
    sentDocMsgIds?: number[];
}

type MyContext = HydrateFlavor<ConversationFlavor<Context & SessionFlavor<SessionData>>>;
type FieldContext = MyContext;
type FieldConversation = Conversation<MyContext, MyContext>;

// restrict field names to ONLY the xiaomi keys so TypeScript stops whining
// (otherwise `mainMessageId` etc. would be allowed and the assignment below breaks)
export type xiaomiField = keyof Pick<SessionData,
    | "REDMINOTE14"
    | "REDMINOTE13"
    | "XIAOMIXIAOMI14TPRO"
    | "XIAOMI14T"
    | "POCOF6PRO"
    | "POCOX7PRO"
    | "POCOM6PRO"
    | "GALAXYA06">;

// --------------------------------------------------
//  Create the Bot
// --------------------------------------------------
const bot = new Bot<MyContext>("7796118345:AAEO4yeA9uYMnP9aVEkz4zINXZsJ_krNaTo");

bot.use(
    session({
        initial: (): SessionData => ({
            sentDocMsgIds: [],
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
    REDMINOTE14?: string;
    REDMINOTE13?: string;
    XIAOMIXIAOMI14TPRO?: string;
    XIAOMI14T?: string;
    POCOF6PRO?: string;
    POCOX7PRO?: string;
    POCOM6PRO?: string;
    GALAXYA06?: string;

}

// function getOutputPath(ctx: MyContext): string {
//     return ctx.session.outputPath ?? `./OutPut/xiaomi_post_${ctx.from!.id}.png`;
// }
function getOutputPath(
    ctx: Context & { from?: any; session?: Partial<SessionData> },
): string {
    const fallback = `./OutPut/xiaomi_post_${ctx.from?.id ?? "anon"}.png`;
    // optional‑chain ⇒ never touches .outputPath if session is missing
    return (ctx as any).session?.outputPath ?? fallback;
}

function collectFormData(ctx: MyContext): FormData {
    // session may be undefined inside some conversation internals — be defensive
    const s: Partial<SessionData> | undefined = (ctx as any).session;
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
async function updatexiaomiImage(ctx: MyContext) {
    const {
        REDMINOTE14 = "0",
        REDMINOTE13 = "0",
        XIAOMIXIAOMI14TPRO = "0",
        XIAOMI14T = "0",
        POCOF6PRO = "0",
        POCOX7PRO = "0",
        POCOM6PRO = "0",
        GALAXYA06 = "0",

    } = ctx.session;

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
        fieldName: xiaomiField;
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

    await conversation.external(updatexiaomiImage);

    await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
}

// --------------------------------------------------
//  Menu builder
// --------------------------------------------------
function buildFormMenu(conversation: Conversation<MyContext, any>, data: FormData) {
    return (
        conversation
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
            .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"))
    );
}

// --------------------------------------------------
//  Conversation generators for each xiaomi field
// --------------------------------------------------
function createxiaomiConversation(fieldName: xiaomiField, prompt: string) {
    return async function (conversation: FieldConversation, ctx: MyContext) {
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
async function clearFormConversation(conversation: FieldConversation, ctx: FieldContext) {
    await ctx.answerCallbackQuery();

    await conversation.external((ctx) => {
        ctx.session.REDMINOTE14 = ctx.session.REDMINOTE13 = ctx.session.XIAOMIXIAOMI14TPRO = ctx.session.XIAOMI14T = ctx.session.POCOF6PRO = ctx.session.POCOX7PRO = ctx.session.POCOM6PRO = undefined;
        ctx.session.sentDocMsgIds = [];
    });

    const clearedMenu = buildFormMenu(conversation, collectFormData(ctx));
    await ctx.editMessageMedia({ type: "photo", media: new InputFile("./assets/xiaomi.png") });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
}


async function finishConversation(
    conversation: FieldConversation,
    ctx: MyContext
) {
    await conversation.external(updatexiaomiImage);   // ← add this line

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
// --------------------------------------------------
//  Register conversations
// --------------------------------------------------

bot.use(createConversation(REDMINOTE14Conversation, "REDMINOTE14Conversation"));
bot.use(createConversation(REDMINOTE13Conversation, "REDMINOTE13Conversation"));
bot.use(createConversation(XIAOMIXIAOMI14TPROConversation, "XIAOMIXIAOMI14TPROConversation"));
bot.use(createConversation
    (XIAOMI14TConversation, "XIAOMI14TConversation"));
bot.use(createConversation(POCOF6PROConversation, "POCOF6PROConversation"));
bot.use(createConversation(POCOX7PROConversation, "POCOX7PROConversation"));
bot.use(createConversation(POCOM6PROConversation, "POCOM6PROConversation"));
// bot.use(createConversation(GALAXYA06Conversation, "GALAXYA06Conversation"));
bot.use(createConversation(clearFormConversation, "clearFormConversation"));
bot.use(createConversation(finishConversation, "finishConversation"));

// --------------------------------------------------
//  Stand‑alone menu instance (needed for /start)
// --------------------------------------------------
export const formMenu = new Menu<MyContext>("form", { onMenuOutdated: false })
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

bot.use(formMenu);

// --------------------------------------------------
//  /start
// --------------------------------------------------

bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const outputPath = `./OutPut/xiaomi_post_${userId}.png`;
    ctx.session.outputPath = outputPath;

    const sentMsg = await ctx.replyWithPhoto(new InputFile("./assets/xiaomi.png"), { reply_markup: formMenu });
    ctx.session.mainMessageId = sentMsg.message_id;
    log("Bot started for", userId);
});

bot.catch((err) => log("Global error", err));

bot.api.setMyCommands([
    { command: "start", description: "رباتو روشن کن!" },
]);

bot.start();
log("Bot running …");
