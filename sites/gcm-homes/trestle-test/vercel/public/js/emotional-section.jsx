// ===== Emotional Weight Section — 4 layout variants =====
// Tweakable via Tweaks panel: centered | split | fullbleed | bottomCard

const EMOTION_BG = "https://images.unsplash.com/photo-1578624495146-f78dc655eae6?fm=jpg&q=80&w=2800&auto=format&fit=crop";

const EMOTION_COPY = {
  h1: "You're Not Just Buying A Home.",
  h2: "You're Choosing A Life.",
  p: "The skiing, the beaches, the trails, the community — people don't move to Incline Village for the square footage. They move here because something about this place got under their skin. The right home makes it real.",
};

function EmotionalSection({ layout = "centered" }) {
  if (layout === "split") return <EmotionSplit />;
  if (layout === "fullbleed") return <EmotionFullbleed />;
  if (layout === "bottomCard") return <EmotionBottomCard />;
  return <EmotionCentered />;
}

// 1) Centered (current) — translucent card centered over the photo
function EmotionCentered() {
  return (
    <section className="emotion" data-screen-label="03 Emotional Weight">
      <div className="emotion__bg" style={{ backgroundImage: `url(${EMOTION_BG})` }} />
      <div className="emotion__veil" data-comment-anchor="de83a1b261-div-154-9" />
      <div className="emotion__card">
        <h2 className="emotion__h">{EMOTION_COPY.h1}<br /><em>{EMOTION_COPY.h2}</em></h2>
        <div className="h-rule" />
        <p className="emotion__p">{EMOTION_COPY.p}</p>
      </div>
    </section>
  );
}

// 2) Split — photo on left, navy panel on right
function EmotionSplit() {
  return (
    <section className="emotion-split" data-screen-label="03 Emotional Weight">
      <div className="emotion-split__photo" style={{ backgroundImage: `url(${EMOTION_BG})` }} />
      <div className="emotion-split__panel">
        <span className="eyebrow" style={{ color: "var(--orange)" }}>THE TAHOE LIFE</span>
        <h2 className="emotion-split__h">
          {EMOTION_COPY.h1}<br /><em>{EMOTION_COPY.h2}</em>
        </h2>
        <div style={{ width: 48, height: 2, background: "var(--orange)" }} />
        <p className="emotion-split__p">{EMOTION_COPY.p}</p>
        <a className="reality__link" href="#" style={{ marginTop: 8 }}>
          SEE THE COMMUNITY <Icon.ArrowRight />
        </a>
      </div>
    </section>
  );
}

// 3) Full-bleed — copy directly on the photo, no card
function EmotionFullbleed() {
  return (
    <section className="emotion emotion--fb" data-screen-label="03 Emotional Weight">
      <div className="emotion__bg" style={{ backgroundImage: `url(${EMOTION_BG})` }} />
      <div className="emotion__veil emotion__veil--fb" data-comment-anchor="de83a1b261-div-154-9" />
      <div className="emotion-fb__copy">
        <h2 className="emotion-fb__h">
          {EMOTION_COPY.h1}<br /><em>{EMOTION_COPY.h2}</em>
        </h2>
        <div className="h-rule" />
        <p className="emotion-fb__p">{EMOTION_COPY.p}</p>
      </div>
    </section>
  );
}

// 4) Bottom card — slim caption strip pinned to the bottom of the image
function EmotionBottomCard() {
  return (
    <section className="emotion emotion--bc" data-screen-label="03 Emotional Weight">
      <div className="emotion__bg" style={{ backgroundImage: `url(${EMOTION_BG})` }} />
      <div className="emotion__veil emotion__veil--bc" data-comment-anchor="de83a1b261-div-154-9" />
      <div className="emotion-bc__card">
        <div className="emotion-bc__left">
          <h2 className="emotion-bc__h">
            {EMOTION_COPY.h1} <em>{EMOTION_COPY.h2}</em>
          </h2>
        </div>
        <div className="emotion-bc__right">
          <p className="emotion-bc__p">{EMOTION_COPY.p}</p>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { EmotionalSection });
