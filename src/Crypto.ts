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
    // crypto values stored as *strings* exactly as user entered
    Bitcoin?: string;
    Ethereum?: string;
    Tether?: string;
    Ripple?: string;
    BinanceCoin?: string;
    Solana?: string;
    USD_Coin?: string;
    Dogecoin?: string;
    outputPath?: string;
    sentDocMsgIds?: number[];
}

type MyContext = HydrateFlavor<ConversationFlavor<Context & SessionFlavor<SessionData>>>;
type FieldContext = MyContext;
type FieldConversation = Conversation<MyContext, MyContext>;

// restrict field names to ONLY the crypto keys so TypeScript stops whining
// (otherwise `mainMessageId` etc. would be allowed and the assignment below breaks)
export type cryptoField = keyof Pick<SessionData,
    | "Bitcoin"
    | "Ethereum"
    | "Tether"
    | "Ripple"
    | "BinanceCoin"
    | "Solana"
    | "USD_Coin"
    | "Dogecoin">;

// --------------------------------------------------
//  Create the Bot
// --------------------------------------------------
const bot = new Bot<MyContext>("7905922993:AAEIiBckDZ_3M9THlrAYpi6Y1xfzLLeaIM4");

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
    Bitcoin?: string;
    Ethereum?: string;
    Tether?: string;
    Ripple?: string;
    BinanceCoin?: string;
    Solana?: string;
    USD_Coin?: string;
    Dogecoin?: string;

}

// function getOutputPath(ctx: MyContext): string {
//     return ctx.session.outputPath ?? `./OutPut/crypto_post_${ctx.from!.id}.png`;
// }
function getOutputPath(
    ctx: Context & { from?: any; session?: Partial<SessionData> },
): string {
    const fallback = `./OutPut/crypto_post_${ctx.from?.id ?? "anon"}.png`;
    // optional‑chain ⇒ never touches .outputPath if session is missing
    return (ctx as any).session?.outputPath ?? fallback;
}

function collectFormData(ctx: MyContext): FormData {
    // session may be undefined inside some conversation internals — be defensive
    const s: Partial<SessionData> | undefined = (ctx as any).session;
    return {
        Bitcoin: s?.Bitcoin,
        Ethereum: s?.Ethereum,
        Tether: s?.Tether,
        Ripple: s?.Ripple,
        BinanceCoin: s?.BinanceCoin,
        Solana: s?.Solana,
        USD_Coin: s?.USD_Coin,
        Dogecoin: s?.Dogecoin,
    };
}

// spawn the Python script to compose the image
async function updatecryptoImage(ctx: MyContext) {
    const {
        Bitcoin = "0",
        Ethereum = "0",
        Tether = "0",
        Ripple = "0",
        BinanceCoin = "0",
        Solana = "0",
        USD_Coin = "0",
        Dogecoin = "0",

    } = ctx.session;

    const outputPath = getOutputPath(ctx);
    ctx.session.outputPath = outputPath;

    const args = [
        "./src/craft/crypto.py",
        "--Bitcoin",
        Bitcoin,
        "--Ethereum",
        Ethereum,
        "--Tether",
        Tether,
        "--Ripple",
        Ripple,
        "--BinanceCoin",
        BinanceCoin,
        "--Solana",
        Solana,
        "--USD_Coin",
        USD_Coin,
        "--Dogecoin",
        Dogecoin,
        "--output_path",
        outputPath,
    ];

    log("Calling Python crypto.py with args", args);
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
        fieldName: cryptoField;
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

    await conversation.external(updatecryptoImage);

    await ctx.editMessageReplyMarkup({ reply_markup: updatedMenu });
}

// --------------------------------------------------
//  Menu builder
// --------------------------------------------------
function buildFormMenu(conversation: Conversation<MyContext, any>, data: FormData) {
    return (
        conversation
            .menu("form")
            .text(data.Bitcoin ? "بیت‌کوین" : "بیت‌کوین", (ctx) => ctx.conversation.enter("BitcoinConversation"))
            .row()
            .text(data.Ethereum ? "اتریوم " : "اتریوم ", (ctx) => ctx.conversation.enter("EthereumConversation"))
            .row()
            .text(data.Tether ? "تتر " : "تتر ", (ctx) => ctx.conversation.enter("TetherConversation"))
            .row()
            .text(data.Ripple ? "ریپل " : "ریپل ", (ctx) => ctx.conversation.enter("RippleConversation"))
            .row()
            .text(data.BinanceCoin ? "بایننس‌کوین " : "بایننس‌کوین ", (ctx) => ctx.conversation.enter("BinanceCoinConversation"))
            .row()
            .text(data.Solana ? "سولانا " : "سولانا ", (ctx) => ctx.conversation.enter("SolanaConversation"))
            .row()
            .text(data.USD_Coin ? "یواس‌دی کوین" : "یواس‌دی کوین", (ctx) => ctx.conversation.enter("USD_CoinConversation"))
            .row()
            .text(data.USD_Coin ? "دوج کوین" : "دوج کوین", (ctx) => ctx.conversation.enter("DogecoinConversation"))
            .row()
            .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
            .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"))
    );
}

// --------------------------------------------------
//  Conversation generators for each crypto field
// --------------------------------------------------
function createcryptoConversation(fieldName: cryptoField, prompt: string) {
    return async function (conversation: FieldConversation, ctx: MyContext) {
        await handleFieldInput(conversation, ctx, { fieldName, promptMessage: prompt }, buildFormMenu);
    };
}

const BitcoinConversation = createcryptoConversation("Bitcoin", "لطفا مقدار بیت‌کوین را وارد کنید");
const EthereumConversation = createcryptoConversation("Ethereum", "لطفا مقدار اتریوم را وارد کنید");
const TetherConversation = createcryptoConversation("Tether", "لطفا مقدار تتر را وارد کنید");
const RippleConversation = createcryptoConversation("Ripple", "لطفا مقدار ریپل را وارد کنید");
const BinanceCoinConversation = createcryptoConversation("BinanceCoin", "لطفا مقدار بایننس‌کوین را وارد کنید");
const SolanaConversation = createcryptoConversation("Solana", "لطفا مقدار سولانا را وارد کنید");
const USD_CoinConversation = createcryptoConversation("USD_Coin", "لطفا مقدار یواس‌دی کوین را وارد کنید");
const DogecoinConversation = createcryptoConversation("Dogecoin", "لطفا مقدار دوج کوین را وارد کنید");

// clear form conversation
async function clearFormConversation(conversation: FieldConversation, ctx: FieldContext) {
    await ctx.answerCallbackQuery();

    await conversation.external((ctx) => {
        ctx.session.Bitcoin = ctx.session.Ethereum = ctx.session.Tether = ctx.session.Ripple = ctx.session.BinanceCoin = ctx.session.Solana = ctx.session.USD_Coin = undefined;
        ctx.session.sentDocMsgIds = [];
    });

    const clearedMenu = buildFormMenu(conversation, collectFormData(ctx));
    await ctx.editMessageMedia({ type: "photo", media: new InputFile("./assets/crypto_TEMPLATE.png") });
    await ctx.editMessageReplyMarkup({ reply_markup: clearedMenu });
}


async function finishConversation(
    conversation: FieldConversation,
    ctx: MyContext
) {
    await conversation.external(updatecryptoImage);   // ← add this line

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

bot.use(createConversation(BitcoinConversation, "BitcoinConversation"));
bot.use(createConversation(EthereumConversation, "EthereumConversation"));
bot.use(createConversation(TetherConversation, "TetherConversation"));
bot.use(createConversation
    (RippleConversation, "RippleConversation"));
bot.use(createConversation(BinanceCoinConversation, "BinanceCoinConversation"));
bot.use(createConversation(SolanaConversation, "SolanaConversation"));
bot.use(createConversation(USD_CoinConversation, "USD_CoinConversation"));
bot.use(createConversation(DogecoinConversation, "DogecoinConversation"));
bot.use(createConversation(clearFormConversation, "clearFormConversation"));
bot.use(createConversation(finishConversation, "finishConversation"));

// --------------------------------------------------
//  Stand‑alone menu instance (needed for /start)
// --------------------------------------------------
export const formMenu = new Menu<MyContext>("form", { onMenuOutdated: false })
    .text((ctx) => collectFormData(ctx).Bitcoin ? "بیت‌کوین" : "بیت‌کوین", (ctx) => ctx.conversation.enter("BitcoinConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Ethereum ? "اتریوم " : "اتریوم ", (ctx) => ctx.conversation.enter("EthereumConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Tether ? "تتر " : "تتر ", (ctx) => ctx.conversation.enter("TetherConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Ripple ? "ریپل " : "ریپل ", (ctx) => ctx.conversation.enter("RippleConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).BinanceCoin ? "بایننس‌کوین " : "بایننس‌کوین ", (ctx) => ctx.conversation.enter("BinanceCoinConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).Solana ? "سولانا " : "سولانا ", (ctx) => ctx.conversation.enter("SolanaConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).USD_Coin ? "یواس‌دی کوین" : "یواس‌دی کوین", (ctx) => ctx.conversation.enter("USD_CoinConversation"))
    .row()
    .text((ctx) => collectFormData(ctx).USD_Coin ? "دوج کوین" : "دوج کوین", (ctx) => ctx.conversation.enter("DogecoinConversation"))
    .row()
    .text("فایل ✅", (ctx) => ctx.conversation.enter("finishConversation"))
    .text("🧹", (ctx) => ctx.conversation.enter("clearFormConversation"));

bot.use(formMenu);

// --------------------------------------------------
//  /start
// --------------------------------------------------

bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const outputPath = `./OutPut/crypto_post_${userId}.png`;
    ctx.session.outputPath = outputPath;

    const sentMsg = await ctx.replyWithPhoto(new InputFile("./assets/CRYPTO_TEMPLATE.png"), { reply_markup: formMenu });
    ctx.session.mainMessageId = sentMsg.message_id;
    log("Bot started for", userId);
});

bot.catch((err) => log("Global error", err));

bot.api.setMyCommands([
    { command: "start", description: "رباتو روشن کن!" },
]);

bot.start();
log("Bot running …");
