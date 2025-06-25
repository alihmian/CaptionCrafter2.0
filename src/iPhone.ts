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
    // iPhone values stored as *strings* exactly as user entered
    IPHONE16PROMAX?: string;
    IPHONE16PRO?: string;
    IPHONE16NORMAL?: string;
    IPHONE15PROMAX?: string;
    IPHONE15PRO?: string;
    IPHONE14NORMAL?: string;
    IPHONE13PROMAX?: string;
    IPHONE13PRO?: string;
    outputPath?: string;
    sentDocMsgIds?: number[];
}

type MyContext = HydrateFlavor<ConversationFlavor<Context & SessionFlavor<SessionData>>>;
type FieldContext = MyContext;
type FieldConversation = Conversation<MyContext, MyContext>;

// restrict field names to ONLY the iPhone keys so TypeScript stops whining
// (otherwise `mainMessageId` etc. would be allowed and the assignment below breaks)
export type iPhoneField = keyof Pick<SessionData,
    | "IPHONE16PROMAX"
    | "IPHONE16PRO"
    | "IPHONE16NORMAL"
    | "IPHONE15PROMAX"
    | "IPHONE15PRO"
    | "IPHONE14NORMAL"
    | "IPHONE13PROMAX"
    | "IPHONE13PRO">;

// --------------------------------------------------
//  Create the Bot
// --------------------------------------------------
const bot = new Bot<MyContext>("7312335799:AAGbEZhjEXv7WyXp9yRAsfWYvbQ3DqseCoM");

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
    IPHONE16PROMAX?: string;
    IPHONE16PRO?: string;
    IPHONE16NORMAL?: string;
    IPHONE15PROMAX?: string;
    IPHONE15PRO?: string;
    IPHONE14NORMAL?: string;
    IPHONE13PROMAX?: string;
    IPHONE13PRO?: string;

}

// function getOutputPath(ctx: MyContext): string {
//     return ctx.session.outputPath ?? `./OutPut/iPhone_post_${ctx.from!.id}.png`;
// }
function getOutputPath(
    ctx: Context & { from?: any; session?: Partial<SessionData> },
): string {
    const fallback = `./OutPut/iPhone_post_${ctx.from?.id ?? "anon"}.png`;
    // optional‑chain ⇒ never touches .outputPath if session is missing
    return (ctx as any).session?.outputPath ?? fallback;
}

function collectFormData(ctx: MyContext): FormData {
    // session may be undefined inside some conversation internals — be defensive
    const s: Partial<SessionData> | undefined = (ctx as any).session;
    return {
        IPHONE16PROMAX: s?.IPHONE16PROMAX,
        IPHONE16PRO: s?.IPHONE16PRO,
        IPHONE16NORMAL: s?.IPHONE16NORMAL,
        IPHONE15PROMAX: s?.IPHONE15PROMAX,
        IPHONE15PRO: s?.IPHONE15PRO,
        IPHONE14NORMAL: s?.IPHONE14NORMAL,
        IPHONE13PROMAX: s?.IPHONE13PROMAX,
        IPHONE13PRO: s?.IPHONE13PRO,
    };
}

// spawn the Python script to compose the image
async function updateiPhoneImage(ctx: MyContext) {
    const {
        IPHONE16PROMAX = "0",
        IPHONE16PRO = "0",
        IPHONE16NORMAL = "0",
        IPHONE15PROMAX = "0",
        IPHONE15PRO = "0",
        IPHONE14NORMAL = "0",
        IPHONE13PROMAX = "0",
        IPHONE13PRO = "0",

    } = ctx.session;

    const outputPath = getOutputPath(ctx);
    ctx.session.outputPath = outputPath;

    const args = [
        "./src/craft/iPhone.py",
        "--IPHONE16PROMAX",
        IPHONE16PROMAX,
        "--IPHONE16PRO",
        IPHONE16PRO,
        "--IPHONE16NORMAL",
        IPHONE16NORMAL,
        "--IPHONE15PROMAX",
        IPHONE15PROMAX,
        "--IPHONE15PRO",
        IPHONE15PRO,
        "--IPHONE14NORMAL",
        IPHONE14NORMAL,
        "--IPHONE13PROMAX",
        IPHONE13PROMAX,
        "--IPHONE13PRO",
        IPHONE13PRO,
        "--output_path",
        outputPath,
    ];

    log("Calling Python iPhone.py with args", args);
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
        fieldName: iPhoneField;
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

    await conversation.external(updateiPhoneImage);

    await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
}

// --------------------------------------------------
//  Menu builder
// --------------------------------------------------
function buildFormMenu(conversation: Conversation<MyContext, any>, data: FormData) {
    return (
        conversation
            .menu("form")
            .text(data.IPHONE16PROMAX ? "16 Pro Max" : "16 Pro Max", (ctx) => ctx.conversation.enter("IPHONE16PROMAXConversation"))
            .row()
            .text(data.IPHONE16PRO ? "16 Pro " : "16 Pro ", (ctx) => ctx.conversation.enter("IPHONE16PROConversation"))
            .row()
            .text(data.IPHONE16NORMAL ? "16 Normal " : "16 Normal ", (ctx) => ctx.conversation.enter("IPHONE16NORMALConversation"))
            .row()
            .text(data.IPHONE15PROMAX ? "15 Pro Max " : "15 Pro Max ", (ctx) => ctx.conversation.enter("IPHONE15PROMAXConversation"))
            .row()
            .text(data.IPHONE15PRO ? "15 Pro " : "15 Pro ", (ctx) => ctx.conversation.enter("IPHONE15PROConversation"))
            .row()
            .text(data.IPHONE14NORMAL ? "14 Normal " : "14 Normal ", (ctx) => ctx.conversation.enter("IPHONE14NORMALConversation"))
            .row()
            .text(data.IPHONE13PROMAX ? "13 Pro Max " : "13 Pro Max ", (ctx) => ctx.conversation.enter("IPHONE13PROMAXConversation"))
            .row()
            .text(data.IPHONE13PROMAX ? "13 Pro " : "13 Pro ", (ctx) => ctx.conversation.enter("IPHONE13PROConversation"))
            .row()
            .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
            .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"))
    );
}

// --------------------------------------------------
//  Conversation generators for each iPhone field
// --------------------------------------------------
function createiPhoneConversation(fieldName: iPhoneField, prompt: string) {
    return async function (conversation: FieldConversation, ctx: MyContext) {
        await handleFieldInput(conversation, ctx, { fieldName, promptMessage: prompt }, buildFormMenu);
    };
}

const IPHONE16PROMAXConversation = createiPhoneConversation("IPHONE16PROMAX", "لطفا مقدار   iPhone 16 Pro Max  را وارد کنید");
const IPHONE16PROConversation = createiPhoneConversation("IPHONE16PRO", "لطفا مقدار iPhone 16 Pro را وارد کنید");
const IPHONE16NORMALConversation = createiPhoneConversation("IPHONE16NORMAL", "لطفا مقدار iPhone 16 Normal را وارد کنید");
const IPHONE15PROMAXConversation = createiPhoneConversation("IPHONE15PROMAX", "لطفا مقدار iPhone 15 Pro Max را وارد کنید");
const IPHONE15PROConversation = createiPhoneConversation("IPHONE15PRO", "لطفا مقدار iPhone 15 Pro را وارد کنید");
const IPHONE14NORMALConversation = createiPhoneConversation("IPHONE14NORMAL", "لطفا مقدار iPhone 14 Normal را وارد کنید");
const IPHONE13PROMAXConversation = createiPhoneConversation("IPHONE13PROMAX", "لطفا مقدار iPhone 13 Pro Max  را وارد کنید");
const IPHONE13PROConversation = createiPhoneConversation("IPHONE13PRO", "لطفا مقدار iPhone 13 Pro  را وارد کنید");

// clear form conversation
async function clearFormConversation(conversation: FieldConversation, ctx: FieldContext) {
    await ctx.answerCallbackQuery();

    await conversation.external((ctx) => {
        ctx.session.IPHONE16PROMAX = ctx.session.IPHONE16PRO = ctx.session.IPHONE16NORMAL = ctx.session.IPHONE15PROMAX = ctx.session.IPHONE15PRO = ctx.session.IPHONE14NORMAL = ctx.session.IPHONE13PROMAX = undefined;
        ctx.session.sentDocMsgIds = [];
    });

    const clearedMenu = buildFormMenu(conversation, collectFormData(ctx));
    await ctx.editMessageMedia({ type: "photo", media: new InputFile("./assets/iPhone_TEMPLATE.png") });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
}


async function finishConversation(
    conversation: FieldConversation,
    ctx: MyContext
) {
    await conversation.external(updateiPhoneImage);   // ← add this line

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

bot.use(createConversation(IPHONE16PROMAXConversation, "IPHONE16PROMAXConversation"));
bot.use(createConversation(IPHONE16PROConversation, "IPHONE16PROConversation"));
bot.use(createConversation(IPHONE16NORMALConversation, "IPHONE16NORMALConversation"));
bot.use(createConversation
    (IPHONE15PROMAXConversation, "IPHONE15PROMAXConversation"));
bot.use(createConversation(IPHONE15PROConversation, "IPHONE15PROConversation"));
bot.use(createConversation(IPHONE14NORMALConversation, "IPHONE14NORMALConversation"));
bot.use(createConversation(IPHONE13PROMAXConversation, "IPHONE13PROMAXConversation"));
bot.use(createConversation(IPHONE13PROConversation, "IPHONE13PROConversation"));
bot.use(createConversation(clearFormConversation, "clearFormConversation"));
bot.use(createConversation(finishConversation, "finishConversation"));

// --------------------------------------------------
//  Stand‑alone menu instance (needed for /start)
// --------------------------------------------------
export const formMenu = new Menu<MyContext>("form", { onMenuOutdated: false })
    .text((ctx) => collectFormData(ctx).IPHONE16PROMAX ? "16 Pro Max" : "16 Pro Max", (ctx) => ctx.conversation.enter("IPHONE16PROMAXConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).IPHONE16PRO ? "16 Pro " : "16 Pro ", (ctx) => ctx.conversation.enter("IPHONE16PROConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).IPHONE16NORMAL ? "16 Normal " : "16 Normal ", (ctx) => ctx.conversation.enter("IPHONE16NORMALConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).IPHONE15PROMAX ? "15 Pro Max " : "15 Pro Max ", (ctx) => ctx.conversation.enter("IPHONE15PROMAXConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).IPHONE15PRO ? "15 Pro " : "15 Pro ", (ctx) => ctx.conversation.enter("IPHONE15PROConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).IPHONE14NORMAL ? "14 Normal " : "14 Normal ", (ctx) => ctx.conversation.enter("IPHONE14NORMALConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).IPHONE13PROMAX ? "13 Pro Max " : "13 Pro Max ", (ctx) => ctx.conversation.enter("IPHONE13PROMAXConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).IPHONE13PROMAX ? "13 Pro " : "13 Pro ", (ctx) => ctx.conversation.enter("IPHONE13PROConversation"))
    .row()
    .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
    .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"));

bot.use(formMenu);

// --------------------------------------------------
//  /start
// --------------------------------------------------

bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const outputPath = `./OutPut/iPhone_post_${userId}.png`;
    ctx.session.outputPath = outputPath;

    const sentMsg = await ctx.replyWithPhoto(new InputFile("./assets/iPhone_TEMPLATE.png"), { reply_markup: formMenu });
    ctx.session.mainMessageId = sentMsg.message_id;
    log("Bot started for", userId);
});

bot.catch((err) => log("Global error", err));

bot.api.setMyCommands([
    { command: "start", description: "رباتو روشن کن!" },
]);

bot.start();
log("Bot running …");
