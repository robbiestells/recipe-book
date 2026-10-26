// recipe-from-url: Supabase Edge Function for Mise en Place.
// Fetches a recipe page on the server (browsers can't read other sites directly)
// and pulls out the schema.org "Recipe" data most recipe sites embed for search engines.
// No AI and no API key needed. Signed-in users only (keep "Verify JWT" on), so the
// function can't be used as an open proxy.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!(await isSignedIn(req))) return json({ error: "signed_out" }, 401);

  let target: URL;
  try {
    const { url } = await req.json();
    target = new URL(String(url));
  } catch {
    return json({ error: "bad_url" });
  }
  if (!/^https?:$/.test(target.protocol) || isPrivateHost(target.hostname)) return json({ error: "bad_url" });

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  let res: Response;
  try {
    res = await fetch(target, {
      signal: ctl.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
      },
    });
  } catch {
    return json({ error: "unreachable" });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return json({ error: "unreachable", status: res.status });

  const html = (await res.text()).slice(0, 5_000_000);
  const recipe = findRecipe(html);
  if (!recipe) return json({ error: "no_recipe_data" });
  return json({ recipe: normalize(recipe, res.url || target.href) });
});

// ---------- extraction ----------

type Obj = Record<string, unknown>;

function findRecipe(html: string): Obj | null {
  const re = /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim().replace(/^<!--|-->$/g, "").replace(/[\u0000-\u001f]+/g, " "));
    } catch {
      continue;
    }
    const hit = walk(data, 0);
    if (hit) return hit;
  }
  return null;
}

function walk(node: unknown, depth: number): Obj | null {
  if (!node || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = walk(n, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  const o = node as Obj;
  const types = ([] as unknown[]).concat(o["@type"] ?? []).map(String);
  if (types.some((t) => t.toLowerCase() === "recipe")) return o;
  return walk(o["@graph"], depth + 1) || walk(o["mainEntity"], depth + 1) || walk(o["mainEntityOfPage"], depth + 1);
}

function normalize(r: Obj, source: string) {
  const list = (v: unknown) => ([] as unknown[]).concat(v ?? []);
  const keywords = typeof r.keywords === "string" ? r.keywords.split(",") : list(r.keywords).map(String);
  const tags = [...list(r.recipeCuisine).map(String), ...keywords]
    .map((t) => clean(t).toLowerCase())
    .filter((t) => t && t.length <= 24);
  const total = duration(r.totalTime) || sumDurations(r.prepTime, r.cookTime);
  return {
    title: clean(r.name),
    category: clean(list(r.recipeCategory)[0]),
    tags: [...new Set(tags)].slice(0, 4),
    servings: servings(r.recipeYield),
    time: total,
    ingredients: list(r.recipeIngredient ?? r.ingredients).map(clean).filter(Boolean),
    steps: instructions(r.recipeInstructions),
    source,
  };
}

function instructions(v: unknown): string[] {
  const out: string[] = [];
  const add = (n: unknown) => {
    if (!n) return;
    if (typeof n === "string") {
      // Some sites put every step in one HTML string.
      n.split(/<\/(?:p|li)>|<br\s*\/?>|\n+/i).map(clean).filter(Boolean).forEach((s) => out.push(s));
    } else if (Array.isArray(n)) n.forEach(add);
    else if (typeof n === "object") {
      const o = n as Obj;
      if (o.itemListElement) add(o.itemListElement);
      else add(o.text ?? o.name);
    }
  };
  add(v);
  return out;
}

function servings(v: unknown): number | null {
  for (const x of ([] as unknown[]).concat(v ?? [])) {
    const m = String(x).match(/\d+/);
    if (m) return Number(m[0]);
  }
  return null;
}

function minutes(v: unknown): number {
  const m = String(v ?? "").match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/i);
  if (!m) return 0;
  return (Number(m[1] || 0) * 24 + Number(m[2] || 0)) * 60 + Number(m[3] || 0);
}
function fmt(min: number): string | null {
  if (!min) return null;
  const h = Math.floor(min / 60), m = min % 60;
  return [h ? `${h} hr` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}
const duration = (v: unknown) => fmt(minutes(v));
const sumDurations = (a: unknown, b: unknown) => fmt(minutes(a) + minutes(b));

function clean(v: unknown): string {
  return String(v ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"').replace(/&frac12;/g, "½").replace(/&frac14;/g, "¼").replace(/&frac34;/g, "¾")
    .replace(/&deg;/g, "°").replace(/&ndash;|&mdash;/g, "-").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- safety ----------

// Only signed-in people may use the function. Checked here, not just with the
// dashboard's "Verify JWT" switch, because that switch doesn't apply to the
// newer publishable keys: the request's user token is confirmed with Supabase Auth.
async function isSignedIn(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization") ?? "";
  const base = Deno.env.get("SUPABASE_URL");
  const key = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!base || !/^Bearer\s+ey/i.test(auth)) return false; // user tokens are JWTs; a bare publishable key isn't
  try {
    const r = await fetch(`${base}/auth/v1/user`, { headers: { authorization: auth, apikey: key } });
    return r.ok;
  } catch {
    return false;
  }
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  const v4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (h.includes(":")) return h === "::1" || h === "::" || /^f[cd]/.test(h) || h.startsWith("fe80") || h.startsWith("::ffff:");
  return false;
}
