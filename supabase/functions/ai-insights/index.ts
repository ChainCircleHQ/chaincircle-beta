// AI insights Edge Function — Phase 8.
//
// Single endpoint that returns one of four kinds of AI-generated output:
//   - reputation     → personalized tips based on the user's rep stats
//   - recommendations → 3 circles to join, matched to user's profile
//   - summary         → weekly digest of the user's ChainCircle activity
//   - chat            → free-form Q&A about the product (low priority, stubbed)
//
// Provider: Anthropic. Set ANTHROPIC_API_KEY as a Supabase function secret.
// Falls back to a structured "API not configured" response if missing —
// the frontend renders a graceful state explaining how to enable it.
//
// Caching: each response is keyed and cached; TTL varies by kind.

import { supabaseAdmin } from "../_shared/supabase.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5";

// TTLs per kind (seconds). Reputation tips invalidate on any new contribution,
// so short TTL. Recommendations change on new public circles — medium TTL.
const TTL = {
    reputation: 60 * 60,          // 1 hour
    recommendations: 60 * 60 * 6, // 6 hours
    summary: 60 * 60 * 24 * 6,    // 6 days
    chat: 60 * 10,                // 10 minutes
};

type Kind = keyof typeof TTL;

const CORS_HEADERS: HeadersInit = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
    // Browsers preflight any POST carrying Authorization + Content-Type headers.
    // Without a 2xx OPTIONS response, every call from chaincircle.org fails CORS.
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    try {
        return await handle(req);
    } catch (e) {
        return json({ error: (e as Error).message, stack: (e as Error).stack?.split("\n").slice(0, 6) }, 500);
    }
});

async function handle(req: Request): Promise<Response> {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);

    const body = await req.json().catch(() => ({}));
    const kind = body.kind as Kind;
    const address: string | undefined = body.address?.toLowerCase?.();
    const prompt: string | undefined = body.prompt; // for chat kind

    if (!kind || !(kind in TTL)) {
        return json({ error: "kind must be one of: reputation, recommendations, summary, chat" }, 400);
    }

    const db = supabaseAdmin();
    const cacheKey = buildCacheKey(kind, address, prompt);

    // Try cache first
    const { data: cached } = await db
        .from("ai_insights_cache")
        .select("payload, created_at, model")
        .eq("key", cacheKey)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
    if (cached) {
        return json({ ...cached.payload, cached: true, cached_at: cached.created_at, model: cached.model });
    }

    // Not configured → gracefully degrade
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
        return json({
            configured: false,
            message: "AI insights are not yet configured. The project owner needs to set ANTHROPIC_API_KEY as a Supabase function secret.",
        });
    }

    // Build context + prompt
    let context: unknown = {};
    let systemPrompt = "";
    let userPrompt = "";

    if (kind === "reputation") {
        if (!address) return json({ error: "address required for reputation" }, 400);
        context = await buildReputationContext(db, address);
        systemPrompt = SYS_REPUTATION;
        userPrompt = `User stats (JSON):\n${JSON.stringify(context, null, 2)}\n\nGive 2–3 short, specific insights. Respond ONLY with valid JSON matching this schema: ${SCHEMA_REPUTATION}`;
    } else if (kind === "recommendations") {
        if (!address) return json({ error: "address required for recommendations" }, 400);
        context = await buildRecommendationContext(db, address);
        systemPrompt = SYS_RECOMMENDATIONS;
        userPrompt = `User and open-circle info (JSON):\n${JSON.stringify(context, null, 2)}\n\nPick up to 3 open circles that match this user. Respond ONLY with valid JSON matching this schema: ${SCHEMA_RECOMMENDATIONS}`;
    } else if (kind === "summary") {
        if (!address) return json({ error: "address required for summary" }, 400);
        context = await buildSummaryContext(db, address);
        systemPrompt = SYS_SUMMARY;
        userPrompt = `Activity in the last 7 days (JSON):\n${JSON.stringify(context, null, 2)}\n\nRespond ONLY with valid JSON matching this schema: ${SCHEMA_SUMMARY}`;
    } else if (kind === "chat") {
        if (!prompt) return json({ error: "prompt required for chat" }, 400);
        systemPrompt = SYS_CHAT;
        userPrompt = prompt;
    }

    // Call Anthropic
    const aiRes = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
        }),
    });
    if (!aiRes.ok) {
        const errText = await aiRes.text();
        return json({ error: `Anthropic ${aiRes.status}: ${errText.slice(0, 300)}` }, 502);
    }
    const aiBody = await aiRes.json();
    const text = aiBody?.content?.[0]?.text ?? "";

    // For structured kinds, parse the JSON the model returned. If parse
    // fails, return the raw text as a fallback so the UI can still show it.
    let payload: Record<string, unknown> = { text };
    if (kind !== "chat") {
        try {
            const jsonStr = extractJson(text);
            payload = JSON.parse(jsonStr);
        } catch {
            payload = { raw: text, parse_error: true };
        }
    }
    payload.configured = true;

    // Write cache
    await db.from("ai_insights_cache").upsert({
        key: cacheKey,
        kind,
        subject: address ?? null,
        payload,
        model: MODEL,
        expires_at: new Date(Date.now() + TTL[kind] * 1000).toISOString(),
    }, { onConflict: "key" });

    return json({ ...payload, cached: false, model: MODEL });
}

// ---------- Context builders (tailored reads from Supabase) ----------

async function buildReputationContext(db: ReturnType<typeof supabaseAdmin>, address: string) {
    const { data: rep } = await db.from("user_reputation").select("*").eq("address", address).maybeSingle();
    return {
        address,
        reputation: rep,
        tier_thresholds: { Bronze: 500, Silver: 700, Gold: 850 },
        rules: {
            on_time_payment: 15,
            streak_bonus_every_5: 50,
            complete_circle: 250,
            payout_received: 25,
            subsequent_circle: 100,
            late_penalty: -75,
        },
    };
}

async function buildRecommendationContext(db: ReturnType<typeof supabaseAdmin>, address: string) {
    const { data: rep } = await db.from("user_reputation").select("*").eq("address", address).maybeSingle();
    const { data: userCircles } = await db
        .from("circle_members")
        .select("circle_id")
        .eq("user_address", address);
    const joinedIds = new Set((userCircles ?? []).map((m) => m.circle_id));
    const { data: open } = await db
        .from("circles_with_counts")
        .select("circle_id,name,goal_type,contribution_amount,duration_months,member_cap,member_count,frequency,status")
        .eq("status", 0)
        .order("created_block", { ascending: false })
        .limit(30);
    const candidates = (open ?? []).filter((c) => !joinedIds.has(c.circle_id) && c.member_count < c.member_cap);
    return {
        user: {
            address,
            tier: rep?.tier ?? "None",
            score: rep?.score ?? 0,
            circles_completed: rep?.circles_completed ?? 0,
        },
        candidates: candidates.slice(0, 20).map((c) => ({
            id: c.circle_id,
            name: c.name,
            goal_type: c.goal_type,
            contribution_amount_cusd: Number(c.contribution_amount || 0) / 1e6,
            duration_months: c.duration_months,
            seats_left: c.member_cap - c.member_count,
            frequency: c.frequency === 1 ? "weekly" : "monthly",
        })),
    };
}

async function buildSummaryContext(db: ReturnType<typeof supabaseAdmin>, address: string) {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [{ data: contribs }, { data: payouts }] = await Promise.all([
        db.from("contributions").select("amount, circle_id, block_timestamp").eq("user_address", address).gte("block_timestamp", since),
        db.from("payouts").select("amount, circle_id, block_timestamp").eq("recipient_address", address).gte("block_timestamp", since),
    ]);
    return {
        address,
        window_days: 7,
        contributions: (contribs ?? []).map((c) => ({ ...c, amount_cusd: Number(c.amount || 0) / 1e6 })),
        payouts: (payouts ?? []).map((p) => ({ ...p, amount_cusd: Number(p.amount || 0) / 1e6 })),
    };
}

// ---------- Prompts / schemas ----------

const SYS_REPUTATION = `You are ChainCircle's reputation coach. You write short, encouraging, concrete tips based on a user's savings-circle activity on a rotating-credit testnet dApp. Tone: warm, specific, never generic. Reference the exact numbers. No filler ("just" / "simply"). No emojis. No URLs.`;
const SCHEMA_REPUTATION = `{"insights":[{"title":"...","body":"...","cta":"...optional..."}]}`;

const SYS_RECOMMENDATIONS = `You are ChainCircle's matchmaker. Pick the circles that best fit this user's tier, completed count, and implied interests. Prioritize circles with seats-left ≥ 2. Prefer mid-range amounts for newer users, larger amounts for Silver/Gold. Never recommend more than 3.`;
const SCHEMA_RECOMMENDATIONS = `{"recommendations":[{"circle_id":N,"reason":"one-sentence why"}]}`;

const SYS_SUMMARY = `You are ChainCircle's weekly digest. Summarize the user's last 7 days of activity in 2 short sentences plus a single stat line. Tone: friendly, factual.`;
const SCHEMA_SUMMARY = `{"headline":"...","body":"...","stat":{"label":"...","value":"..."}}`;

const SYS_CHAT = `You are ChainCircle's support assistant. Keep answers under 3 sentences. If asked about account-specific data, point the user at the relevant tab (Dashboard / Circle / Profile / Leaderboard). No URLs.`;

// ---------- helpers ----------

function buildCacheKey(kind: Kind, address?: string, prompt?: string): string {
    if (kind === "chat") {
        const hash = simpleHash(prompt || "");
        return `${kind}:${address ?? "anon"}:${hash}`;
    }
    return `${kind}:${address ?? "anon"}`;
}

function simpleHash(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
}

// Models sometimes wrap JSON in ``` or chat commentary. Extract the first {...} block.
function extractJson(s: string): string {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start < 0 || end < 0 || end <= start) return s;
    return s.slice(start, end + 1);
}

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body, null, 2), {
        status,
        headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
}
