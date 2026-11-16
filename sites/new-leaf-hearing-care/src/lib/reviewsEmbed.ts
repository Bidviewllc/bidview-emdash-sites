/**
 * Server-rendered Google reviews carousel for the homepage and the two location pages.
 * Replaces the Elfsight widget: reviews come from D1 (kept current by the reviews-sync
 * Worker) with src/reviews/reviews.json as the fallback, so every review is in the HTML
 * at request time and no third-party script is loaded.
 */
import reviewsData from "../reviews/reviews.json";
import { getLocationReviews } from "./reviews-reader.mjs";

export type ReviewLocation = "arvada" | "littleton";

const MAX_REVIEWS = 20;
const MARKER = "<!-- NL_REVIEWS_EMBED -->";

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// The stored timeAgo freezes on older reviews, so derive the label from publishedAt at render.
function freshness(publishedAt: string | undefined, fallback: string): string {
  const t = publishedAt ? Date.parse(publishedAt) : NaN;
  if (Number.isNaN(t)) return fallback;
  const days = Math.max(0, Math.floor((Date.now() - t) / 86400000));
  const n = (v: number, u: string) => `${v} ${u}${v === 1 ? "" : "s"} ago`;
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 14) return n(days, "day");
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return n(weeks, "week");
  const months = Math.floor(days / 30.44);
  if (months < 18) return n(months, "month");
  return n(Math.floor(days / 365.25), "year");
}

async function getDb(): Promise<any> {
  try {
    return ((await import("cloudflare:workers")) as { env?: { DB?: unknown } }).env?.DB ?? null;
  } catch {
    return null;
  }
}

const GOOGLE_G =
  '<svg class="nl-rv__g" viewBox="0 0 48 48" width="16" height="16" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

const CSS = `<style>
.nl-rv{position:relative;width:100%;max-width:1280px;margin:0 auto;font-family:inherit}
.nl-rv__viewport{position:relative}
.nl-rv__track{display:flex;gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;scrollbar-width:none;padding:2px}
.nl-rv__track::-webkit-scrollbar{display:none}
.nl-rv__card{flex:0 0 calc((100% - 80px) / 5);min-width:0;scroll-snap-align:start;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;padding:22px 20px;border:1px solid rgba(17,17,17,.1);border-radius:20px;background:transparent;color:#111;text-align:left}
@media (max-width:1280px){.nl-rv__card{flex-basis:calc((100% - 60px) / 4)}}
@media (max-width:1024px){.nl-rv__card{flex-basis:calc((100% - 40px) / 3)}}
@media (max-width:768px){.nl-rv__card{flex-basis:calc((100% - 20px) / 2)}}
@media (max-width:560px){.nl-rv__card{flex-basis:100%}}
.nl-rv__head{display:flex;align-items:center;gap:10px}
.nl-rv__avatar{position:relative;overflow:hidden;flex:0 0 40px;width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--primary,#6fa943);color:#fff;font-weight:600;font-size:16px}
.nl-rv__avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.nl-rv__avatar--accent{background:var(--accent,#6b4fb3)}
.nl-rv__who{min-width:0}
.nl-rv__name{margin:0;font-size:15px;font-weight:700;line-height:1.25;color:#111;overflow-wrap:anywhere}
.nl-rv__meta{margin:2px 0 0;display:flex;align-items:center;gap:6px;font-size:12.5px;line-height:1.2;color:rgba(17,17,17,.6)}
.nl-rv__g{flex:none}
.nl-rv__stars{margin:0;color:#fcbf02;font-size:18px;letter-spacing:2px;line-height:1}
.nl-rv__text{margin:0;font-size:15px;line-height:1.5;color:#111;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
.nl-rv__card.is-open .nl-rv__text{display:block;-webkit-line-clamp:unset;overflow:visible}
.nl-rv__more{align-self:flex-start;margin-top:auto;padding:0;border:0;background:none;box-shadow:none;color:#006dff;font:inherit;font-size:14px;line-height:1.4;cursor:pointer;text-transform:none;letter-spacing:0;min-height:0;display:none}
.nl-rv__more.is-needed{display:inline}
.nl-rv__more:hover,.nl-rv__more:focus{background:none;color:#0052c2;text-decoration:underline}
.nl-rv__arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:36px;height:36px;padding:0;border:0;border-radius:50%;background:rgba(17,17,17,.75);color:#fff;font-size:20px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:none}
.nl-rv__arrow:hover,.nl-rv__arrow:focus{background:#111;color:#fff}
.nl-rv__arrow--prev{left:-14px}.nl-rv__arrow--next{right:-14px}
.nl-rv__arrow[hidden]{display:none}
.nl-rv__dots{display:flex;justify-content:center;gap:8px;margin-top:18px}
.nl-rv__dot{width:8px;height:8px;padding:0;border:0;border-radius:50%;background:rgba(17,17,17,.2);cursor:pointer;min-height:0;box-shadow:none}
.nl-rv__dot.is-active{background:#111}
@media (max-width:1100px){.nl-rv__arrow--prev{left:-6px}.nl-rv__arrow--next{right:-6px}}
</style>`;

const JS = `<script>
(function(){
  var roots=document.querySelectorAll('[data-nl-rv]');
  roots.forEach(function(root){
    if(root.getAttribute('data-ready'))return;root.setAttribute('data-ready','1');
    var track=root.querySelector('.nl-rv__track'),cards=[].slice.call(track.children);
    var prev=root.querySelector('.nl-rv__arrow--prev'),next=root.querySelector('.nl-rv__arrow--next'),dotsBox=root.querySelector('.nl-rv__dots');
    function clamps(){cards.forEach(function(c){var t=c.querySelector('.nl-rv__text'),m=c.querySelector('.nl-rv__more');if(!t||!m)return;var open=c.classList.contains('is-open');if(open){m.classList.add('is-needed');return;}m.classList.toggle('is-needed',t.scrollHeight>t.clientHeight+1);});}
    cards.forEach(function(c){var m=c.querySelector('.nl-rv__more');if(!m)return;m.addEventListener('click',function(){var o=c.classList.toggle('is-open');m.textContent=o?'Show less':'Read more';m.setAttribute('aria-expanded',o?'true':'false');});});
    function perView(){var w=cards[0].getBoundingClientRect().width;return Math.max(1,Math.round(track.clientWidth/(w+20)));}
    function pages(){return Math.max(1,Math.ceil(cards.length/perView()));}
    function maxDots(){return Math.min(5,pages());}
    function pageIndex(){var max=track.scrollWidth-track.clientWidth;if(max<=0)return 0;var d=maxDots();return Math.min(d-1,Math.round(track.scrollLeft/max*(d-1)));}
    function renderDots(){dotsBox.innerHTML='';var d=maxDots();if(d<2){dotsBox.hidden=true;return;}dotsBox.hidden=false;for(var i=0;i<d;i++){(function(i){var b=document.createElement('button');b.type='button';b.className='nl-rv__dot';b.setAttribute('aria-label','Go to reviews '+(i+1));b.addEventListener('click',function(){var max=track.scrollWidth-track.clientWidth;track.scrollTo({left:d===1?0:max*i/(d-1),behavior:'smooth'});});dotsBox.appendChild(b);})(i);}update();}
    function update(){var max=track.scrollWidth-track.clientWidth;prev.hidden=track.scrollLeft<=2;next.hidden=track.scrollLeft>=max-2;var idx=pageIndex();[].forEach.call(dotsBox.children,function(b,i){b.classList.toggle('is-active',i===idx);});}
    prev.addEventListener('click',function(){track.scrollBy({left:-track.clientWidth,behavior:'smooth'});});
    next.addEventListener('click',function(){track.scrollBy({left:track.clientWidth,behavior:'smooth'});});
    track.addEventListener('scroll',function(){window.requestAnimationFrame(update);},{passive:true});
    function layout(){clamps();renderDots();}
    window.addEventListener('resize',layout);
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(layout);
    layout();
  });
})();
</script>`;

/** Render the carousel HTML for one location (empty string if there is nothing to show). */
export async function renderReviewsEmbed(location: ReviewLocation): Promise<string> {
  const db = await getDb();
  const data = await getLocationReviews(db, location, (reviewsData as Record<string, any>)[location]);
  const list = (data?.reviews ?? [])
    .filter((r: any) => r.text && String(r.text).trim() && Number(r.rating) >= 4)
    .slice(0, MAX_REVIEWS);
  if (!list.length) return "";

  const cards = list
    .map((r: any, i: number) => {
      const name = String(r.author || "Google user");
      const initial = esc(name.trim().charAt(0).toUpperCase() || "?");
      const photo = r.avatar ? `<img src="${esc(r.avatar)}" alt="" width="40" height="40" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : "";
      const avatar = `<span class="nl-rv__avatar${i % 2 ? " nl-rv__avatar--accent" : ""}" aria-hidden="true">${initial}${photo}</span>`;
      const rating = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
      return `<article class="nl-rv__card">
<div class="nl-rv__head">${avatar}<div class="nl-rv__who"><p class="nl-rv__name">${esc(name)}</p><p class="nl-rv__meta"><span>${esc(freshness(r.publishedAt, r.timeAgo))}</span>${GOOGLE_G}</p></div></div>
<p class="nl-rv__stars" role="img" aria-label="${rating} out of 5 stars">${"★".repeat(rating)}</p>
<p class="nl-rv__text">${esc(r.text)}</p>
<button type="button" class="nl-rv__more" aria-expanded="false">Read more</button>
</article>`;
    })
    .join("\n");

  return `${CSS}
<div class="nl-rv" data-nl-rv aria-label="Google reviews">
<div class="nl-rv__viewport">
<button type="button" class="nl-rv__arrow nl-rv__arrow--prev" aria-label="Previous reviews" hidden>&#8249;</button>
<div class="nl-rv__track">
${cards}
</div>
<button type="button" class="nl-rv__arrow nl-rv__arrow--next" aria-label="Next reviews">&#8250;</button>
</div>
<div class="nl-rv__dots" aria-label="Review pages"></div>
</div>
${JS}`;
}

/** Swap the shell's embed marker for the rendered carousel; leaves the shell untouched when empty. */
export async function injectReviewsEmbed(pageHtml: string, location: ReviewLocation): Promise<string> {
  if (!pageHtml.includes(MARKER)) return pageHtml;
  const html = await renderReviewsEmbed(location);
  return pageHtml.replace(MARKER, html);
}
