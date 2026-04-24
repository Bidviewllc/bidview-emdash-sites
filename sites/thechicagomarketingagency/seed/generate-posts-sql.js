// generate-posts-sql.js
// Converts hardcoded blog post HTML bodies to Portable Text JSON
// and outputs seed/insert-posts.sql with INSERT statements for ec_posts.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randKey() {
  return crypto.randomBytes(4).toString('hex');
}

/** Strip ALL HTML tags and decode basic entities, returning plain text. */
function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function makeBlock(style, text) {
  return {
    _type: 'block',
    _key: randKey(),
    style,
    children: [{ _type: 'span', _key: randKey(), text }],
  };
}

function makeListBlock(text) {
  return {
    _type: 'block',
    _key: randKey(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: randKey(), text }],
  };
}

/**
 * Converts a subset of HTML (p, h2, h3, ul/li) to a Portable Text array.
 * Inline tags (<strong>, <a>, <em>, etc.) are stripped — plain text only.
 */
function htmlToPortableText(html) {
  const blocks = [];

  // Normalise: collapse whitespace and newlines inside the HTML string
  const normalised = html.replace(/\s*\n\s*/g, ' ').trim();

  // We'll walk through the HTML tag by tag using a stateful regex approach.
  // Supported top-level tags: h2, h3, p, ul
  const topLevelPattern = /<(h2|h3|p|ul)([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = topLevelPattern.exec(normalised)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[0].slice(match[0].indexOf('>') + 1, match[0].lastIndexOf('<'));

    if (tag === 'h2') {
      blocks.push(makeBlock('h2', stripTags(inner)));
    } else if (tag === 'h3') {
      blocks.push(makeBlock('h3', stripTags(inner)));
    } else if (tag === 'p') {
      const text = stripTags(inner);
      if (text) blocks.push(makeBlock('normal', text));
    } else if (tag === 'ul') {
      // Extract each <li>
      const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = liPattern.exec(inner)) !== null) {
        const text = stripTags(liMatch[1]);
        if (text) blocks.push(makeListBlock(text));
      }
    }
  }

  return blocks;
}

/** Escape single quotes for SQL string literals. */
function sqlStr(value) {
  if (value === null || value === undefined) return 'NULL';
  return "'" + String(value).replace(/'/g, "''") + "'";
}

// ─── Post Data ────────────────────────────────────────────────────────────────

const posts = [
  {
    slug: 'how-chicago-businesses-can-dominate-local-search-2026',
    title: 'How Chicago Businesses Can Dominate Local Search in 2026',
    excerpt:
      'Local search in Chicago is more competitive than ever, but most businesses are leaving serious money on the table with basic, fixable mistakes. This guide walks you through exactly what it takes to rank at the top of Google when Chicago customers are searching for what you sell.',
    meta_title: 'Dominate Chicago Local Search in 2026 | SEO Guide',
    meta_description:
      'Learn the exact local SEO strategies Chicago businesses need to rank higher on Google in 2026. Practical tips, no fluff.',
    body: '<h2>Local Search in Chicago Is a Different Beast</h2><p>Chicago has 77 official community areas, over 2.7 million residents, and a business density that rivals any major city in the country. When someone in Lincoln Park searches for "accountant near me," they\'re not looking for results from Naperville. Google knows this, and so should you.</p><p>The good news? Most of your competitors are still doing the basics wrong. That means you have a real window to pull ahead, and it doesn\'t require a massive budget to do it.</p><h2>Start With Your Google Business Profile</h2><p>Your Google Business Profile (GBP) is the single most important asset you have in local search. If it\'s incomplete, you\'re invisible to a huge chunk of your potential customers. Make sure every section is filled out, your hours are current, and your primary category is as specific as possible.</p><p>Don\'t just pick "Restaurant." Pick "Italian Restaurant" or "Deep Dish Pizza Restaurant." Specificity wins.</p><h2>NAP Consistency Is Not Optional</h2><p>NAP stands for Name, Address, Phone number. Google cross-references your business information across dozens of directories, social profiles, and data aggregators. If your address shows "W. Wacker Dr." in one place and "West Wacker Drive" in another, that inconsistency creates confusion for Google\'s algorithm.</p><h2>Build Locally Relevant Content</h2><p>Google rewards content that demonstrates local relevance. That means writing blog posts that mention specific neighborhoods, referencing local events, and creating pages that speak directly to Chicago customers, not a national audience.</p><h2>Reviews Are Your Most Underrated Ranking Factor</h2><p>Google has confirmed that review quantity, recency, and quality all factor into local rankings. A business with 200 Google reviews and a 4.6-star average will almost always outrank a competitor with 12 reviews and a 4.8 average.</p><h2>Your Website Still Has to Do Its Job</h2><p>Local SEO isn\'t just about Google Business Profile. Your actual website needs to be technically sound. That means fast load times under 2.5 seconds on mobile, proper title tags and meta descriptions, schema markup for your business type, and a clearly crawlable site structure.</p>',
  },
  {
    slug: 'real-cost-of-digital-marketing-in-chicago',
    title: 'The Real Cost of Digital Marketing in Chicago',
    excerpt:
      "Most Chicago agencies won't publish their pricing, which makes it hard to know if you're getting a fair deal or getting taken. This post breaks down what digital marketing actually costs in Chicago so you can make smart decisions with your budget.",
    meta_title: 'Digital Marketing Cost in Chicago | 2026 Pricing Guide',
    meta_description:
      'What does digital marketing really cost in Chicago? See real pricing ranges for SEO, PPC, social media, and web design from a local agency.',
    body: "<h2>Why Pricing Is So Hard to Find</h2><p>You've probably tried to get a quote from a digital marketing agency in Chicago and hit a wall. No pricing pages, no ballpark figures, just a form asking you to schedule a call.</p><h2>SEO Services</h2><p>Basic local SEO package: $500 to $1,500 per month. Mid-tier SEO retainer: $1,500 to $4,000 per month. Enterprise or multi-location SEO: $4,000 to $15,000+ per month.</p><h2>Pay-Per-Click Advertising</h2><p>Google Ads and Meta Ads management fees are separate from your actual ad spend. Most Chicago agencies charge either a flat monthly fee or a percentage of ad spend, usually 15 to 20 percent.</p><h2>Web Design and Development</h2><p>Template-based websites: $2,500 to $6,000. Custom designed websites: $8,000 to $25,000. Large-scale or e-commerce builds: $25,000 to $100,000+.</p><h2>What Should a Small Chicago Business Budget?</h2><p>Plan to spend at least $2,500 to $4,000 per month across SEO, content, and maybe one paid channel. Anything less and you're unlikely to see measurable results within 6 to 12 months.</p>",
  },
  {
    slug: 'google-business-profile-optimization-chicago-companies',
    title: 'Google Business Profile Optimization for Chicago Companies',
    excerpt:
      "Your Google Business Profile is often the first thing a Chicago customer sees before they ever reach your website, and most profiles are set up in 10 minutes and never touched again. Here's how to turn yours into a lead-generating asset.",
    meta_title: 'Google Business Profile Optimization for Chicago | Guide',
    meta_description:
      'Step-by-step guide to optimizing your Google Business Profile for Chicago local search. More visibility, more calls, more customers.',
    body: '<h2>Your GBP Is Your Digital Front Door</h2><p>When someone searches for a business in Chicago, the local map pack shows up before organic results. That map pack is powered almost entirely by Google Business Profile signals.</p><h2>Fill Out Every Single Field</h2><p>Google rewards completeness. Most profiles are maybe 60 to 70 percent filled out.</p><h2>Photos Drive Clicks</h2><p>Profiles with photos receive 42 percent more requests for directions and 35 percent more website clicks than those without.</p><h2>Get Consistent Reviews</h2><p>Reviews are one of the strongest ranking signals in local search. You need volume, recency, and quality.</p><h2>Post Updates Regularly</h2><p>Google Posts are underused by almost every Chicago business. These are short updates that show up on your profile in search results.</p>',
  },
  {
    slug: 'why-chicago-restaurants-need-strong-online-presence',
    title: 'Why Chicago Restaurants Need a Strong Online Presence',
    excerpt:
      "Chicago's restaurant scene is one of the most competitive in the country, and a great dining room isn't enough anymore if customers can't find you online.",
    meta_title: 'Why Chicago Restaurants Need a Strong Online Presence',
    meta_description:
      'Chicago restaurants live and die by their online presence. Learn what actually drives diners to your door in 2026.',
    body: "<h2>The Chicago Restaurant Market Is Unforgiving</h2><p>Chicago has over 7,000 restaurants. You can have an incredible chef, a beautiful space, and still struggle to fill seats if you're invisible online.</p><h2>Google Search Is Where the Decision Starts</h2><p>\"Best Italian restaurant in River North.\" \"Brunch spots near Wicker Park.\" These are real searches happening thousands of times a day in Chicago.</p><h2>Online Reviews Can Make or Break a Restaurant</h2><p>A Harvard Business School study found that a one-star increase on Yelp translates to a 5 to 9 percent increase in revenue for independent restaurants.</p><h2>Social Media Drives Discovery for Food</h2><p>Chicago's food Instagram scene is real and active. Neighborhood food bloggers, local influencers, and regular diners share photos that get thousands of views.</p>",
  },
  {
    slug: 'top-10-chicago-neighborhoods-where-local-seo-matters-most',
    title: 'Top 10 Chicago Neighborhoods Where Local SEO Matters Most',
    excerpt:
      'Not every Chicago neighborhood is the same when it comes to local search competition. This breakdown looks at 10 neighborhoods where local SEO can make a direct, measurable difference.',
    meta_title: 'Top 10 Chicago Neighborhoods for Local SEO | 2026 Guide',
    meta_description:
      'Which Chicago neighborhoods have the highest local SEO opportunity? A practical guide for businesses targeting specific areas.',
    body: '<h2>Why Neighborhood-Level SEO Works in Chicago</h2><p>Chicago isn\'t a monolith. It\'s a city of distinct neighborhoods with their own identities, customer bases, and search behaviors.</p><h2>1. River North</h2><p>One of the densest commercial neighborhoods in the city and one of the highest-competition zones for local search.</p><h2>2. Wicker Park and Bucktown</h2><p>High concentration of independent retailers, restaurants, fitness studios, and creative businesses.</p><h2>3. Lincoln Park</h2><p>An affluent, established demographic with strong spending power.</p><h2>4. Logan Square</h2><p>Logan Square has grown into one of Chicago\'s most visited neighborhoods over the past decade.</p><h2>5. The Loop and West Loop</h2><p>The Loop powers daytime searches. The West Loop has become one of the city\'s premier dining destinations.</p>',
  },
  {
    slug: 'what-does-an-seo-company-actually-do',
    title: 'What Does an SEO Company Actually Do?',
    excerpt:
      'Most business owners have hired or considered hiring an SEO company without fully understanding what they actually do all day. This guide breaks down the real work behind SEO.',
    meta_title: 'What Does an SEO Company Actually Do?',
    meta_description:
      "Curious what an SEO company actually does with your money? Here's a plain-English breakdown of the real work behind search engine optimization.",
    body: "<h2>They Start by Auditing Your Current Situation</h2><p>Before anything else, a good SEO company looks at where you stand. This means running a technical audit of your website to find problems that are stopping search engines from properly reading your pages.</p><h2>They Research the Keywords Your Customers Use</h2><p>Keyword research is the foundation of every SEO strategy. A good agency doesn't just guess at what people search for.</p><h2>They Fix Technical Problems on Your Site</h2><p>Technical SEO is the unglamorous work that makes everything else possible. If Google can't crawl your site properly, your content doesn't matter.</p><h2>They Build and Optimize Your Content</h2><p>Content is how you answer the questions your customers are already asking.</p><h2>They Build Authority Through Links</h2><p>Google treats links from other websites as votes of confidence. The more reputable sites that link to yours, the more Google trusts you.</p><h2>They Track, Report, and Adjust</h2><p>Good SEO companies are obsessive about data. Every month, you should get a report showing your keyword rankings, organic traffic, and conversions from organic search.</p>",
  },
  {
    slug: 'how-much-should-you-spend-on-marketing-in-2026',
    title: 'How Much Should You Spend on Marketing in 2026?',
    excerpt:
      'Marketing budgets are one of the most common sources of anxiety for business owners, mostly because no one gives them a straight answer.',
    meta_title: 'How Much Should You Spend on Marketing in 2026?',
    meta_description:
      "No vague percentages. Here's a real breakdown of marketing budgets for small and mid-size businesses in 2026.",
    body: "<h2>The Percentage Rule Is a Starting Point, Not an Answer</h2><p>The U.S. Small Business Administration recommends allocating 7 to 8 percent of revenue to marketing if you're under $5 million in annual revenue.</p><h2>Growth Stage Changes Everything</h2><p>A business that launched 18 months ago needs to spend more than a 10-year-old business with a full client roster.</p><h2>Industry Matters More Than Most People Admit</h2><p>A dental practice competes in a local market of maybe 10 to 15 direct competitors. A SaaS company might compete against 200 alternatives.</p><h2>How to Allocate What You Spend</h2><p>SEO and content: 30 to 35 percent. Paid advertising: 25 to 30 percent. Website and design: 10 to 15 percent.</p><h2>The Real Question Is Cost Per Acquisition</h2><p>If a new client is worth $5,000 over their lifetime and you can acquire them for $300 in marketing spend, you should be spending as much as you possibly can at that rate.</p>",
  },
  {
    slug: 'seo-vs-ppc-which-is-right-for-your-business',
    title: 'SEO vs PPC: Which Is Right for Your Business?',
    excerpt:
      'SEO and PPC both drive traffic from search engines, but they work completely differently and serve different business needs.',
    meta_title: 'SEO vs PPC: Which Is Right for Your Business?',
    meta_description:
      "SEO builds long-term traffic. PPC gets you leads fast. Here's how to decide which one your business actually needs right now.",
    body: "<h2>The Core Difference</h2><p>SEO is the process of improving your website so it ranks organically in search results. PPC means you pay Google directly every time someone clicks your ad.</p><h2>The Time Factor</h2><p>SEO takes time. Most businesses see significant organic traffic growth between months 6 and 12. PPC is immediate.</p><h2>The Cost Picture</h2><p>SEO typically costs $1,000 to $5,000 per month. PPC costs vary wildly by industry. A Google Ads click in Chicago home services can run $8 to $25.</p><h2>When PPC Makes More Sense</h2><p>Choose PPC when you need results quickly, you have a time-sensitive offer, or you're a new business with no organic rankings yet.</p><h2>When SEO Makes More Sense</h2><p>Choose SEO when you're playing a long game and your margins can support a 6 to 12 month investment period.</p><h2>The Case for Doing Both</h2><p>Most established businesses do best with both channels running simultaneously. PPC fills your pipeline now while SEO builds your long-term foundation.</p>",
  },
  {
    slug: '7-signs-your-website-is-costing-you-customers',
    title: '7 Signs Your Website Is Costing You Customers',
    excerpt:
      "Most business owners assume that if their website is live it's doing its job. But a website that looks outdated or works poorly can actively drive customers to your competitors.",
    meta_title: '7 Signs Your Website Is Costing You Customers',
    meta_description:
      'Is your website quietly turning away potential customers? Here are 7 warning signs that your site is costing you business.',
    body: "<h2>1. Your Site Loads in More Than 3 Seconds</h2><p>Google's data shows that 53 percent of mobile users abandon a site that takes longer than 3 seconds to load.</p><h2>2. It Doesn't Look Right on a Phone</h2><p>More than 60 percent of web traffic now comes from mobile devices.</p><h2>3. Your Contact Information Is Hard to Find</h2><p>Your phone number should be in the header of every page. Your contact form should never be more than one click away.</p><h2>4. The Design Looks Like It's from 2015</h2><p>People judge a website's credibility in about 50 milliseconds according to research from Carleton University.</p><h2>5. There Are No Clear Calls to Action</h2><p>Every core page on your site should have one clear primary action. Not five. One.</p><h2>6. You Have No Social Proof</h2><p>People trust other people more than they trust businesses. Reviews, testimonials, case studies are the signals that tell a skeptical visitor that real customers have been happy.</p><h2>7. Google Can't Find You</h2><p>A website that search engines can't find is invisible to potential customers who don't already know your name.</p>",
  },
  {
    slug: 'how-to-measure-marketing-roi-without-a-data-science-degree',
    title: 'How to Measure Marketing ROI Without a Data Science Degree',
    excerpt:
      "Tracking marketing ROI sounds complicated until you understand what you're actually trying to measure. This guide walks you through the core metrics that matter.",
    meta_title: 'How to Measure Marketing ROI Without a Data Science Degree',
    meta_description:
      "You don't need to be a data scientist to track marketing ROI. Here's a practical guide to the metrics that actually matter.",
    body: "<h2>Start With the Only Number That Really Matters</h2><p>Revenue attributed to marketing minus the cost of marketing, divided by the cost of marketing. That's ROI.</p><h2>Set Up Google Analytics 4 First</h2><p>GA4 is free, and it's the starting point for understanding where your website traffic comes from.</p><h2>Use UTM Parameters for Everything You Pay For</h2><p>A UTM parameter is a tag you add to a URL that tells GA4 where the traffic came from.</p><h2>Track Cost Per Lead by Channel</h2><p>Once you know how many leads came from each channel last month, divide your spend by the number of leads. That's your cost per lead.</p><h2>Don't Forget Customer Lifetime Value</h2><p>Cost per lead is only half the picture. A lead that becomes a $500 customer is worth less than a lead that becomes a $5,000 customer.</p><h2>Set a Monthly Review Rhythm</h2><p>Block 30 minutes on the first Monday of every month. Pull your GA4 report, your Google Ads report, and whatever report your marketing agency sends you.</p>",
  },
];

// ─── Generate SQL ─────────────────────────────────────────────────────────────

const lines = [
  '-- Auto-generated by generate-posts-sql.js',
  '-- Insert 10 blog posts into ec_posts',
  '',
];

for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  const id = i + 1;
  const portableText = htmlToPortableText(post.body);
  const bodyJson = JSON.stringify(portableText);

  lines.push(
    `INSERT INTO ec_posts (id, slug, status, title, excerpt, body, meta_title, meta_description, published_at) VALUES (`,
    `  ${id},`,
    `  ${sqlStr(post.slug)},`,
    `  'published',`,
    `  ${sqlStr(post.title)},`,
    `  ${sqlStr(post.excerpt)},`,
    `  ${sqlStr(bodyJson)},`,
    `  ${sqlStr(post.meta_title)},`,
    `  ${sqlStr(post.meta_description)},`,
    `  datetime('now')`,
    `);`,
    ''
  );
}

const outputPath = path.join(__dirname, 'insert-posts.sql');
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`Done. Wrote ${posts.length} posts to ${outputPath}`);
