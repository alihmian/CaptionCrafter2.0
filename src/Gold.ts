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
import {
    isAdmin,
    isAllowed,
    addAllowed,
    removeAllowed,
    listAllowed,
    listAdmins,
} from "./acl";


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
    // currency values stored as *strings* exactly as user entered
    Gold?: string;
    Coin?: string;
    HalfCoin?: string;
    QuarterCoin?: string;
    Gold18?: string;
    Gold24?: string;
    SaudiRiyal?: string;
    outputPath?: string;
    sentDocMsgIds?: number[];
}

type MyContext = HydrateFlavor<ConversationFlavor<Context & SessionFlavor<SessionData>>>;
type FieldContext = MyContext;
type FieldConversation = Conversation<MyContext, MyContext>;

// restrict field names to ONLY the currency keys so TypeScript stops whining
// (otherwise `mainMessageId` etc. would be allowed and the assignment below breaks)
export type CurrencyField = keyof Pick<SessionData,
    | "Gold"
    | "Coin"
    | "HalfCoin"
    | "QuarterCoin"
    | "Gold18"
    | "Gold24">;

// --------------------------------------------------
//  Create the Bot
// --------------------------------------------------
const bot = new Bot<MyContext>("7822307632:AAHAqLzycbOi89zp8fTc3jsPkLdY091a4oY");

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
    Gold?: string;
    Coin?: string;
    HalfCoin?: string;
    QuarterCoin?: string;
    Gold18?: string;
    Gold24?: string;
    SaudiRiyal?: string;
}

// function getOutputPath(ctx: MyContext): string {
//     return ctx.session.outputPath ?? `./OutPut/currency_post_${ctx.from!.id}.png`;
// }
function getOutputPath(
    ctx: Context & { from?: any; session?: Partial<SessionData> },
): string {
    const fallback = `./OutPut/gold_post_${ctx.from?.id ?? "anon"}.png`;
    // optional‑chain ⇒ never touches .outputPath if session is missing
    return (ctx as any).session?.outputPath ?? fallback;
}

function collectFormData(ctx: MyContext): FormData {
    // session may be undefined inside some conversation internals — be defensive
    const s: Partial<SessionData> | undefined = (ctx as any).session;
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
async function updateCurrencyImage(ctx: MyContext) {
    const {
        Gold = "0",
        Coin = "0",
        HalfCoin = "0",
        QuarterCoin = "0",
        Gold18 = "0",
        Gold24 = "0",
        SaudiRiyal = "0",
    } = ctx.session;

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
        fieldName: CurrencyField;
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

    await conversation.external(updateCurrencyImage);

    await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
}

// --------------------------------------------------
//  Menu builder
// --------------------------------------------------
function buildFormMenu(conversation: Conversation<MyContext, any>, data: FormData) {
    return (
        conversation
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
            .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"))
    );
}

// --------------------------------------------------
//  Conversation generators for each currency field
// --------------------------------------------------
function createCurrencyConversation(fieldName: CurrencyField, prompt: string) {
    return async function (conversation: FieldConversation, ctx: MyContext) {
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
async function clearFormConversation(conversation: FieldConversation, ctx: FieldContext) {
    await ctx.answerCallbackQuery();

    await conversation.external((ctx) => {
        ctx.session.Gold = ctx.session.Coin = ctx.session.HalfCoin = ctx.session.QuarterCoin = ctx.session.Gold18 = ctx.session.Gold24 = ctx.session.SaudiRiyal = undefined;
        ctx.session.sentDocMsgIds = [];
    });

    const clearedMenu = buildFormMenu(conversation, collectFormData(ctx));
    await ctx.editMessageMedia({ type: "photo", media: new InputFile("./assets/GOLD_TEMPLATE.png") });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
}

async function finishConversation(
    conversation: FieldConversation,
    ctx: MyContext
) {
    await conversation.external(updateCurrencyImage);   // ← add this line

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

// ---- Access Control Gate ----
bot.use(async (ctx, next) => {
    const uid = ctx.from?.id;
    if (!uid) return; // ignore updates without user

    // Always allow admins
    if (isAdmin(uid)) return next();

    // Allow non-admins to run *only* if they are in allowed list
    if (isAllowed(uid)) return next();

    // Optional: let unknown users see a short message and stop
    try {
        await ctx.reply("⛔️ You are not allowed to use this bot.");
    } catch { }
    return; // block
});


// --------------------------------------------------
//  Register conversations
// --------------------------------------------------

bot.use(createConversation(GoldConversation, "GoldConversation"));
bot.use(createConversation(CoinConversation, "CoinConversation"));
bot.use(createConversation(HalfCoinConversation, "HalfCoinConversation"));
bot.use(createConversation
    (QuarterCoinConversation, "QuarterCoinConversation"));
bot.use(createConversation(Gold18Conversation, "Gold18Conversation"));
bot.use(createConversation(yuanConversation, "yuanConversation"));
bot.use(createConversation(clearFormConversation, "clearFormConversation"));
bot.use(createConversation(finishConversation, "finishConversation"));

// --------------------------------------------------
//  Stand‑alone menu instance (needed for /start)
// --------------------------------------------------
export const formMenu = new Menu<MyContext>("form", { onMenuOutdated: false })
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

bot.use(formMenu);

// --------------------------------------------------
//  /start
// --------------------------------------------------

bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const outputPath = `./OutPut/gold_post_${userId}.png`;
    ctx.session.outputPath = outputPath;

    const sentMsg = await ctx.replyWithPhoto(new InputFile("./assets/GOLD_TEMPLATE.png"), { reply_markup: formMenu });
    ctx.session.mainMessageId = sentMsg.message_id;
    log("Bot started for", userId);
});




bot.command("add", async (ctx) => {
    const adminId = ctx.from?.id;
    if (!adminId || !isAdmin(adminId)) return;

    // 1) If admin replied to a user's message: add that user
    const repliedUserId = ctx.message?.reply_to_message?.from?.id;
    if (repliedUserId) {
        const r = addAllowed(repliedUserId);
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
    const r = addAllowed(arg);
    await ctx.reply(r.added ? `✅ Added ${arg}` : `ℹ️ ${r.reason}`);
});


bot.command("remove", async (ctx) => {
    const adminId = ctx.from?.id;
    if (!adminId || !isAdmin(adminId)) return;

    const repliedUserId = ctx.message?.reply_to_message?.from?.id;
    if (repliedUserId) {
        const r = removeAllowed(repliedUserId);
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
    const r = removeAllowed(arg);
    await ctx.reply(r.removed ? `🗑️ Removed ${arg}` : `ℹ️ ${r.reason}`);
});


bot.command("list", async (ctx) => {
    const adminId = ctx.from?.id;
    if (!adminId || !isAdmin(adminId)) return;

    const admins = listAdmins();
    const allowed = listAllowed();
    await ctx.reply(
        [
            "👑 Admins:",
            admins.length ? admins.map(x => `• ${x}`).join("\n") : "  (none)",
            "",
            "✅ Allowed:",
            allowed.length ? allowed.map(x => `• ${x}`).join("\n") : "  (none)",
        ].join("\n")
    );
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
